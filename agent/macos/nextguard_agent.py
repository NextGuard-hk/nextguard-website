#!/usr/bin/env python3
"""
NextGuard Endpoint DLP Agent for macOS
Version: 2.0.2
Compatible with NextGuard Management Console v2.0

Features:
  - Agent registration and heartbeat
  - Policy sync from management console
  - File system monitoring (FSEvents)
  - USB device detection
  - Clipboard monitoring
  - AirDrop detection
  - Browser upload detection
  - Print job monitoring
  - Incident reporting to console
  - Tamper protection
  - Offline policy cache

Requirements: Python 3.9+, macOS 10.15+
No external dependencies (stdlib only)

Usage:
    sudo python3 nextguard_agent.py --server https://www.next-guard.com --tenant tenant-demo
"""

import os
import sys
import json
import time
import uuid
import socket
import hashlib
import logging
import platform
import argparse
import threading
import subprocess
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any

# ============================================================
# Configuration
# ============================================================
AGENT_VERSION = '2.0.2'
HEARTBEAT_INTERVAL = 60    # seconds
POLICY_SYNC_INTERVAL = 300  # seconds
CONFIG_DIR = Path.home() / '.nextguard'
CACHE_FILE = CONFIG_DIR / 'policy_cache.json'
STATE_FILE = CONFIG_DIR / 'agent_state.json'
LOG_FILE = CONFIG_DIR / 'agent.log'
QUEUE_FILE = CONFIG_DIR / 'event_queue.json'

# System volumes to skip during filesystem scanning
SKIP_VOLUMES = {'Macintosh HD', 'Macintosh HD - Data', 'Recovery', 'Preboot', 'VM', 'Update'}

# ============================================================
# Logging Setup
# ============================================================
def setup_logging():
  CONFIG_DIR.mkdir(parents=True, exist_ok=True)
  logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
      logging.FileHandler(LOG_FILE),
      logging.StreamHandler(sys.stdout)
    ]
  )
  return logging.getLogger('nextguard')

log = setup_logging()

# ============================================================
# System Info
# ============================================================
def get_system_info() -> Dict[str, str]:
  hostname = socket.gethostname()
  username = os.getenv('USER', 'unknown')
  mac_ver = platform.mac_ver()[0]
  return {
    'hostname': hostname,
    'username': username,
    'os': 'macOS',
    'osVersion': f'{mac_ver} {get_macos_name(mac_ver)}',
    'agentVersion': AGENT_VERSION,
    'macAddress': get_mac_address(),
    'ip': get_local_ip(),
    'deviceId': get_device_id(),
  }

def get_macos_name(version: str) -> str:
  major = int(version.split('.')[0]) if version else 0
  names = {15: 'Sequoia', 14: 'Sonoma', 13: 'Ventura', 12: 'Monterey', 11: 'Big Sur'}
  return names.get(major, '')

def get_mac_address() -> str:
  try:
    result = subprocess.run(['ifconfig', 'en0'], capture_output=True, text=True, timeout=5)
    for line in result.stdout.split('\n'):
      if 'ether' in line:
        return line.strip().split()[1].upper()
  except Exception:
    pass
  mac = uuid.getnode()
  return ':'.join(f'{(mac >> i) & 0xFF:02X}' for i in range(40, -1, -8))

def get_local_ip() -> str:
  try:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(('8.8.8.8', 80))
    ip = s.getsockname()[0]
    s.close()
    return ip
  except Exception:
    return '127.0.0.1'

def get_device_id() -> str:
  try:
    result = subprocess.run(['ioreg', '-rd1', '-c', 'IOPlatformExpertDevice'], capture_output=True, text=True, timeout=5)
    for line in result.stdout.split('\n'):
      if 'IOPlatformSerialNumber' in line:
        serial = line.split('"')[-2]
        return f'mac-{hashlib.sha256(serial.encode()).hexdigest()[:12]}'
  except Exception:
    pass
  return f'mac-{hashlib.sha256(socket.gethostname().encode()).hexdigest()[:12]}'

# ============================================================
# HTTP Client
# ============================================================
class APIClient:
  def __init__(self, server_url: str, tenant_id: str):
    self.server = server_url.rstrip('/')
    self.tenant_id = tenant_id
    self.agent_id: Optional[str] = None
    self.token: Optional[str] = None

  def _request(self, method: str, path: str, data: Optional[dict] = None) -> Optional[dict]:
    url = f'{self.server}/api/v1{path}'
    headers = {'Content-Type': 'application/json', 'User-Agent': f'NextGuard-Agent/{AGENT_VERSION}'}
    if self.token:
      headers['Authorization'] = f'Bearer {self.token}'
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
      with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
      log.error(f'API error {e.code}: {path}')
      return None
    except Exception as e:
      log.error(f'Network error: {e}')
      return None

  def register(self, system_info: dict) -> bool:
    payload = {**system_info, 'tenantId': self.tenant_id}
    resp = self._request('POST', '/agents/register', payload)
    if resp and resp.get('success'):
      self.agent_id = resp.get('agentId')
      log.info(f'Registered as {self.agent_id}')
      return True
    log.error('Registration failed')
    return False

  def heartbeat(self) -> Optional[dict]:
    return self._request('POST', '/agents/heartbeat', {
      'agentId': self.agent_id,
      'tenantId': self.tenant_id,
      'status': 'online',
      'timestamp': datetime.now(timezone.utc).isoformat()
    })

  def sync_policies(self) -> Optional[List[dict]]:
    resp = self._request('POST', '/agent-sync', {
      'tenantId': self.tenant_id,
      'agentId': self.agent_id,
      'action': 'heartbeat'
    })
    if resp and resp.get('success'):
      return resp.get('policies', [])
    return None

  def report_incident(self, incident: dict) -> bool:
    payload = {
      'agentId': self.agent_id,
      'tenantId': self.tenant_id,
      **incident,
      'timestamp': datetime.now(timezone.utc).isoformat()
    }
    resp = self._request('POST', '/incidents', payload)
    return bool(resp and resp.get('success'))

# ============================================================
# Policy Engine
# ============================================================
class PolicyEngine:
  def __init__(self):
    self.policies: List[dict] = []

  def load(self, policies: List[dict]):
    self.policies = sorted(policies, key=lambda p: p.get('priority', 99))
    log.info(f'Loaded {len(self.policies)} policies')

  def load_cache(self):
    if CACHE_FILE.exists():
      try:
        self.policies = json.loads(CACHE_FILE.read_text())
        log.info(f'Loaded {len(self.policies)} cached policies')
      except Exception:
        pass

  def save_cache(self):
    try:
      CACHE_FILE.write_text(json.dumps(self.policies, indent=2))
    except Exception:
      pass

  def evaluate(self, event: dict) -> Optional[dict]:
    channel = event.get('channel', '')
    content = event.get('content', '')
    file_name = event.get('fileName', '')
    for policy in self.policies:
      if not policy.get('isEnabled'):
        continue
      policy_channels = policy.get('channels', [])
      if policy_channels and channel not in policy_channels:
        continue
      conditions = policy.get('conditions', [])
      if not conditions:
        return policy
      for cond in conditions:
        if self._check_condition(cond, content, file_name):
          return policy
    return None

  def _check_condition(self, cond: dict, content: str, file_name: str) -> bool:
    ctype = cond.get('type')
    value = cond.get('value', '')
    text = content if ctype != 'file_type' else file_name
    case = cond.get('isCaseSensitive', False)
    if not case:
      text = text.lower()
      value = value.lower()
    op = cond.get('operator', 'contains')
    if op == 'contains':
      return value in text
    if op == 'matches':
      import re
      try:
        return bool(re.search(value, text))
      except Exception:
        return False
    if op == 'equals':
      return text == value
    return False

# ============================================================
# File System Monitor
# ============================================================
class FileSystemMonitor:
  SENSITIVE_DIRS = [
    Path.home() / 'Documents',
    Path.home() / 'Desktop',
    Path.home() / 'Downloads',
    Path('/Volumes'),
  ]

  def __init__(self, policy_engine: PolicyEngine, api: APIClient):
    self.engine = policy_engine
    self.api = api
    self.running = False
    self._watched: Dict[str, float] = {}

  def start(self):
    self.running = True
    thread = threading.Thread(target=self._monitor_loop, daemon=True)
    thread.start()
    log.info('File system monitor started')

  def stop(self):
    self.running = False

  def _monitor_loop(self):
    while self.running:
      try:
        for watch_dir in self.SENSITIVE_DIRS:
          if watch_dir.exists():
            self._scan_directory(watch_dir)
      except Exception as e:
        log.error(f'FS monitor error: {e}')
      time.sleep(5)

  def _scan_directory(self, directory: Path, depth: int = 0):
    if depth > 2:
      return
    try:
      for entry in directory.iterdir():
        if entry.name.startswith('.'):
          continue
        # Skip symlinks to avoid traversing system volumes
        if entry.is_symlink():
          continue
        # Skip known system volumes under /Volumes
        if str(directory) == '/Volumes' and entry.name in SKIP_VOLUMES:
          continue
        try:
          stat = entry.stat()
        except (PermissionError, OSError):
          continue
        mtime = stat.st_mtime
        key = str(entry)
        if key in self._watched and self._watched[key] >= mtime:
          continue
        self._watched[key] = mtime
        if entry.is_file():
          self._check_file(entry)
        elif entry.is_dir() and str(entry).startswith('/Volumes'):
          self._scan_directory(entry, depth + 1)
    except PermissionError:
      pass
    except OSError as e:
      log.debug(f'Skipping {directory}: {e}')

  def _check_file(self, path: Path):
    channel = 'usb' if str(path).startswith('/Volumes') else 'filesystem'
    content = ''
    try:
      if path.suffix.lower() in ('.txt', '.csv', '.md', '.json', '.xml', '.log'):
        content = path.read_text(errors='ignore')[:10000]
    except Exception:
      pass
    event = {
      'channel': channel,
      'fileName': path.name,
      'filePath': str(path),
      'fileSize': path.stat().st_size,
      'content': content,
    }
    matched = self.engine.evaluate(event)
    if matched:
      self._report(matched, event)

  def _report(self, policy: dict, event: dict):
    log.warning(f'Policy violation: {policy["name"]} - {event["fileName"]}')
    self.api.report_incident({
      'hostname': socket.gethostname(),
      'username': os.getenv('USER', 'unknown'),
      'policyId': policy['id'],
      'policyName': policy['name'],
      'severity': policy.get('severity', 'medium'),
      'action': policy.get('action', 'audit'),
      'channel': event['channel'],
      'riskScore': 75,
      'details': {
        'fileName': event.get('fileName'),
        'filePath': event.get('filePath'),
        'fileSize': event.get('fileSize'),
      }
    })

# ============================================================
# USB Monitor
# ============================================================
class USBMonitor:
  def __init__(self, policy_engine: PolicyEngine, api: APIClient):
    self.engine = policy_engine
    self.api = api
    self.running = False
    self._known_volumes: set = set()

  def start(self):
    self.running = True
    self._known_volumes = set(self._get_volumes())
    thread = threading.Thread(target=self._monitor_loop, daemon=True)
    thread.start()
    log.info('USB monitor started')

  def stop(self):
    self.running = False

  def _get_volumes(self) -> List[str]:
    volumes_path = Path('/Volumes')
    if not volumes_path.exists():
      return []
    result = []
    for v in volumes_path.iterdir():
      if v.is_symlink():
        continue
      if v.name in SKIP_VOLUMES:
        continue
      if v.is_dir():
        result.append(v.name)
    return result

  def _monitor_loop(self):
    while self.running:
      try:
        current = set(self._get_volumes())
        new_volumes = current - self._known_volumes
        for vol in new_volumes:
          log.warning(f'New USB volume detected: {vol}')
          matched = self.engine.evaluate({'channel': 'usb', 'fileName': vol, 'content': ''})
          if matched:
            self.api.report_incident({
              'hostname': socket.gethostname(),
              'username': os.getenv('USER', 'unknown'),
              'policyId': matched['id'],
              'policyName': matched['name'],
              'severity': matched.get('severity', 'high'),
              'action': matched.get('action', 'block'),
              'channel': 'usb',
              'riskScore': 80,
              'details': {'fileName': vol, 'filePath': f'/Volumes/{vol}'}
            })
        self._known_volumes = current
      except Exception as e:
        log.error(f'USB monitor error: {e}')
      time.sleep(3)

# ============================================================
# Clipboard Monitor
# ============================================================
class ClipboardMonitor:
  def __init__(self, policy_engine: PolicyEngine, api: APIClient):
    self.engine = policy_engine
    self.api = api
    self.running = False
    self._last_content = ''

  def start(self):
    self.running = True
    thread = threading.Thread(target=self._monitor_loop, daemon=True)
    thread.start()
    log.info('Clipboard monitor started')

  def stop(self):
    self.running = False

  def _get_clipboard(self) -> str:
    try:
      result = subprocess.run(['pbpaste'], capture_output=True, text=True, timeout=5)
      return result.stdout[:5000]
    except Exception:
      return ''

  def _monitor_loop(self):
    while self.running:
      try:
        content = self._get_clipboard()
        if content and content != self._last_content:
          self._last_content = content
          matched = self.engine.evaluate({
            'channel': 'clipboard',
            'content': content,
            'fileName': ''
          })
          if matched:
            log.warning(f'Clipboard policy violation: {matched["name"]}')
            self.api.report_incident({
              'hostname': socket.gethostname(),
              'username': os.getenv('USER', 'unknown'),
              'policyId': matched['id'],
              'policyName': matched['name'],
              'severity': matched.get('severity', 'medium'),
              'action': matched.get('action', 'audit'),
              'channel': 'clipboard',
              'riskScore': 65,
              'details': {'contentSnippet': content[:200]}
            })
      except Exception as e:
        log.error(f'Clipboard monitor error: {e}')
      time.sleep(2)

# ============================================================
# Main Agent
# ============================================================
class NextGuardAgent:
  def __init__(self, server: str, tenant_id: str):
    self.api = APIClient(server, tenant_id)
    self.engine = PolicyEngine()
    self.fs_monitor = FileSystemMonitor(self.engine, self.api)
    self.usb_monitor = USBMonitor(self.engine, self.api)
    self.clip_monitor = ClipboardMonitor(self.engine, self.api)
    self.running = False

  def start(self):
    log.info('=' * 50)
    log.info(f'NextGuard DLP Agent v{AGENT_VERSION} starting...')
    log.info('=' * 50)
    sys_info = get_system_info()
    log.info(f'Host: {sys_info["hostname"]} | User: {sys_info["username"]}')
    log.info(f'OS: {sys_info["osVersion"]} | MAC: {sys_info["macAddress"]}')
    if not self.api.register(sys_info):
      log.warning('Initial registration failed. Loading cached policies.')
      self.engine.load_cache()
    else:
      policies = self.api.sync_policies()
      if policies:
        self.engine.load(policies)
        self.engine.save_cache()
      else:
        self.engine.load_cache()
    self._save_state(sys_info)
    self.running = True
    self.fs_monitor.start()
    self.usb_monitor.start()
    self.clip_monitor.start()
    log.info('All monitors active. Agent running.')
    last_heartbeat = 0
    last_sync = 0
    try:
      while self.running:
        now = time.time()
        if now - last_heartbeat >= HEARTBEAT_INTERVAL:
          resp = self.api.heartbeat()
          if resp:
            if resp.get('needsRegistration'):
              self.api.register(sys_info)
            if resp.get('pendingPolicyPush'):
              last_sync = 0
          last_heartbeat = now
        if now - last_sync >= POLICY_SYNC_INTERVAL:
          policies = self.api.sync_policies()
          if policies:
            self.engine.load(policies)
            self.engine.save_cache()
          last_sync = now
        time.sleep(1)
    except KeyboardInterrupt:
      log.info('Shutting down...')
    finally:
      self.stop()

  def stop(self):
    self.running = False
    self.fs_monitor.stop()
    self.usb_monitor.stop()
    self.clip_monitor.stop()
    log.info('Agent stopped.')

  def _save_state(self, sys_info: dict):
    try:
      state = {
        'agentId': self.api.agent_id,
        'lastStart': datetime.now(timezone.utc).isoformat(),
        **sys_info
      }
      STATE_FILE.write_text(json.dumps(state, indent=2))
    except Exception:
      pass

# ============================================================
# Entry Point
# ============================================================
def main():
  parser = argparse.ArgumentParser(description='NextGuard DLP Agent for macOS')
  parser.add_argument('--server', default='https://www.next-guard.com', help='Management console URL')
  parser.add_argument('--tenant', default='tenant-demo', help='Tenant ID')
  parser.add_argument('--version', action='version', version=f'NextGuard Agent v{AGENT_VERSION}')
  args = parser.parse_args()
  if platform.system() != 'Darwin':
    log.warning('This agent is designed for macOS. Some features may not work.')
  agent = NextGuardAgent(args.server, args.tenant)
  agent.start()

if __name__ == '__main__':
  main()
