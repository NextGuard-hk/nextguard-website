#!/usr/bin/env python3
"""
NextGuard Endpoint DLP Agent for macOS
    Version: 2.0.5
    Compatible with NextGuard Management Console v2.0

Features:
    - Agent registration and heartbeat
    - Policy sync from management console (direct bundle API)
    - File system monitoring (FSEvents)
    - USB device detection
    - Clipboard monitoring
    - Real block enforcement (quarantine + clipboard clear)
    - Incident reporting to console

Requirements: Python 3.9+, macOS 10.15+
No external dependencies (stdlib only)

Usage:
    sudo python3 nextguard_agent.py --server https://www.next-guard.com --tenant tenant-demo
"""

import os
import sys
import json
import time
import re
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

AGENT_VERSION = '2.0.5'
HEARTBEAT_INTERVAL = 60
POLICY_SYNC_INTERVAL = 300
CONFIG_DIR = Path.home() / '.nextguard'
CACHE_FILE = CONFIG_DIR / 'policy_cache.json'
STATE_FILE = CONFIG_DIR / 'agent_state.json'
LOG_FILE = CONFIG_DIR / 'agent.log'
QUEUE_FILE = CONFIG_DIR / 'event_queue.json'
SKIP_VOLUMES = {'Macintosh HD', 'Macintosh HD - Data', 'Recovery', 'Preboot', 'VM', 'Update'}

def setup_logging():
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler(sys.stdout)])
    return logging.getLogger('nextguard')

log = setup_logging()

def enforce_block(path=None, channel=None, policy_name=''):
    """Enforce block action: quarantine file or clear clipboard."""
    try:
        if channel == 'clipboard':
            subprocess.run(['pbcopy'], input=b'[BLOCKED by NextGuard DLP]', timeout=5)
            log.warning(f'[BLOCKED] Clipboard cleared - {policy_name}')
        elif path and Path(path).exists():
            q_dir = CONFIG_DIR / 'quarantine'
            q_dir.mkdir(parents=True, exist_ok=True)
            src = Path(path)
            dst = q_dir / f'{src.name}.{int(time.time())}.blocked'
            src.rename(dst)
            log.warning(f'[BLOCKED] File quarantined: {src.name} -> {dst}')
    except Exception as e:
        log.error(f'Enforcement failed: {e}')

def get_system_info():
    hostname = socket.gethostname()
    username = os.getenv('USER', 'unknown')
    mac_ver = platform.mac_ver()[0]
    major = int(mac_ver.split('.')[0]) if mac_ver else 0
    names = {15: 'Sequoia', 14: 'Sonoma', 13: 'Ventura', 12: 'Monterey', 11: 'Big Sur'}
    os_name = names.get(major, '')
    try:
        r = subprocess.run(['ifconfig', 'en0'], capture_output=True, text=True, timeout=5)
        mac_addr = ''
        for line in r.stdout.split('\n'):
            if 'ether' in line: mac_addr = line.strip().split()[1].upper(); break
        if not mac_addr: mac_addr = ':'.join(f'{(uuid.getnode() >> i) & 0xFF:02X}' for i in range(40, -1, -8))
    except: mac_addr = ':'.join(f'{(uuid.getnode() >> i) & 0xFF:02X}' for i in range(40, -1, -8))
    try: s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); ip = s.getsockname()[0]; s.close()
    except: ip = '127.0.0.1'
    try:
        r = subprocess.run(['ioreg', '-rd1', '-c', 'IOPlatformExpertDevice'], capture_output=True, text=True, timeout=5)
        dev_id = ''
        for line in r.stdout.split('\n'):
            if 'IOPlatformSerialNumber' in line: dev_id = f'mac-{hashlib.sha256(line.split(chr(34))[-2].encode()).hexdigest()[:12]}'; break
        if not dev_id: dev_id = f'mac-{hashlib.sha256(hostname.encode()).hexdigest()[:12]}'
    except: dev_id = f'mac-{hashlib.sha256(hostname.encode()).hexdigest()[:12]}'
    return {'hostname': hostname, 'username': username, 'os': 'macOS', 'osVersion': f'{mac_ver} {os_name}',
            'agentVersion': AGENT_VERSION, 'macAddress': mac_addr, 'ip': ip, 'deviceId': dev_id}

def convert_bundle_to_agent(bundle_policies):
    """Convert bundle format policies to agent-compatible format."""
    channel_map = {'file': 'filesystem', 'usb': 'usb', 'clipboard': 'clipboard',
                   'email': 'email', 'network': 'network', 'browser': 'browser_upload',
                   'cloud': 'cloud_storage', 'print': 'print'}
    result = []
    for bp in bundle_policies:
        conditions = []
        for pat in (bp.get('patterns') or []):
            if pat: conditions.append({'type': 'regex', 'value': pat, 'operator': 'matches', 'isCaseSensitive': False})
        for kw in (bp.get('keywords') or []):
            if kw: conditions.append({'type': 'keyword', 'value': kw, 'operator': 'contains', 'isCaseSensitive': False})
        channels = [channel_map.get(ch, ch) for ch in (bp.get('channels') or [])]
        action = bp.get('action', 'audit')
        result.append({
            'id': bp.get('id', ''),
            'name': bp.get('name', ''),
            'description': bp.get('description', ''),
            'tenantId': 'tenant-demo',
            'isEnabled': bp.get('enabled', True),
            'priority': bp.get('priority', 99),
            'channels': channels,
            'conditions': conditions,
            'action': action,
            'severity': bp.get('severity', 'medium'),
            'notifyUser': action == 'block',
            'notifyAdmin': True,
            'blockMessage': f'Blocked by policy: {bp.get("name", "")}' if action == 'block' else '',
            'version': bp.get('version', 1),
            'category': bp.get('category', ''),
            'complianceFramework': bp.get('complianceFramework', ''),
            'detectionMode': bp.get('detectionMode', 'traditional'),
        })
    return result

class APIClient:
    def __init__(self, server_url, tenant_id):
        self.server = server_url.rstrip('/')
        self.tenant_id = tenant_id
        self.agent_id = None
        self.token = None

    def _request(self, method, path, data=None):
        url = f'{self.server}/api/v1{path}'
        headers = {'Content-Type': 'application/json', 'User-Agent': f'NextGuard-Agent/{AGENT_VERSION}'}
        if self.token: headers['Authorization'] = f'Bearer {self.token}'
        body = json.dumps(data).encode() if data else None
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            log.error(f'API error {e.code}: {path}'); return None
        except Exception as e:
            log.error(f'Network error: {e}'); return None

    def register(self, system_info):
        payload = {**system_info, 'tenantId': self.tenant_id}
        resp = self._request('POST', '/agents/register', payload)
        if resp and resp.get('success'):
            self.agent_id = resp.get('agentId')
            self.token = resp.get('agentToken')
            log.info(f'Registered as {self.agent_id} (token: {"yes" if self.token else "no"})')
            return resp
        log.error('Registration failed')
        return {}

    def heartbeat(self):
        return self._request('POST', '/agents/heartbeat', {'agentId': self.agent_id, 'tenantId': self.tenant_id,
            'status': 'online', 'timestamp': datetime.now(timezone.utc).isoformat()})

    def sync_policies(self):
        """Fetch policies directly from bundle API - single source of truth."""
        resp = self._request('GET', '/policies/bundle', None)
        if resp and resp.get('success'):
            bundle = resp.get('bundle', {})
            policies = bundle.get('policies', [])
            if policies:
                agent_policies = convert_bundle_to_agent(policies)
                log.info(f'Synced {len(agent_policies)} policies from bundle API')
                return agent_policies
        # Fallback: try agent-sync endpoint
        resp2 = self._request('POST', '/agent-sync', {'tenantId': self.tenant_id, 'agentId': self.agent_id, 'action': 'heartbeat'})
        if resp2 and resp2.get('success'):
            return resp2.get('policies', [])
        return None

    def report_incident(self, incident):
        payload = {'agentId': self.agent_id, 'tenantId': self.tenant_id, **incident,
            'timestamp': datetime.now(timezone.utc).isoformat()}
        resp = self._request('POST', '/incidents', payload)
        return bool(resp and resp.get('success'))

class PolicyEngine:
    def __init__(self):
        self.policies = []

    def load(self, policies):
        self.policies = sorted(policies, key=lambda p: p.get('priority', 99))
        log.info(f'Loaded {len(self.policies)} policies')

    def load_cache(self):
        if CACHE_FILE.exists():
            try: self.policies = json.loads(CACHE_FILE.read_text()); log.info(f'Loaded {len(self.policies)} cached policies')
            except: pass

    def save_cache(self):
        try: CACHE_FILE.write_text(json.dumps(self.policies, indent=2))
        except: pass

    def evaluate(self, event):
        channel = event.get('channel', '')
        content = event.get('content', '')
        file_name = event.get('fileName', '')
        for policy in self.policies:
            if not policy.get('isEnabled'): continue
            pc = policy.get('channels', [])
            if pc and channel not in pc: continue
            conditions = policy.get('conditions', [])
            if not conditions: return policy
            for cond in conditions:
                if self._check(cond, content, file_name): return policy
        return None

    def _check(self, cond, content, file_name):
        ctype = cond.get('type'); value = cond.get('value', '')
        text = content if ctype != 'file_type' else file_name
        op = cond.get('operator', 'contains')
        if op == 'matches':
            try:
                flags = 0 if cond.get('isCaseSensitive', False) else re.IGNORECASE
                return bool(re.search(value, text, flags))
            except: return False
        if not cond.get('isCaseSensitive', False):
            text = text.lower(); value = value.lower()
        if op == 'contains': return value in text
        if op == 'equals': return text == value
        return False

class FileSystemMonitor:
    SENSITIVE_DIRS = [Path.home() / 'Documents', Path.home() / 'Desktop', Path.home() / 'Downloads', Path('/Volumes')]
    def __init__(self, engine, api): self.engine = engine; self.api = api; self.running = False; self._watched = {}
    def start(self): self.running = True; threading.Thread(target=self._loop, daemon=True).start(); log.info('File system monitor started')
    def stop(self): self.running = False
    def _loop(self):
        while self.running:
            try:
                for d in self.SENSITIVE_DIRS:
                    if d.exists(): self._scan(d)
            except Exception as e: log.error(f'FS monitor error: {e}')
            time.sleep(5)
    def _scan(self, directory, depth=0):
        if depth > 2: return
        try:
            for entry in directory.iterdir():
                if entry.name.startswith('.'): continue
                if entry.is_symlink(): continue
                if str(directory) == '/Volumes' and entry.name in SKIP_VOLUMES: continue
                try: st = entry.stat()
                except (PermissionError, OSError): continue
                key = str(entry)
                if key in self._watched and self._watched[key] >= st.st_mtime: continue
                self._watched[key] = st.st_mtime
                if entry.is_file(): self._check(entry)
                elif entry.is_dir() and str(entry).startswith('/Volumes'): self._scan(entry, depth + 1)
        except PermissionError: pass
        except OSError: pass
    def _check(self, path):
        channel = 'usb' if str(path).startswith('/Volumes') else 'filesystem'
        content = ''
        try:
            if path.suffix.lower() in ('.txt', '.csv', '.md', '.json', '.xml', '.log'):
                content = path.read_text(errors='ignore')[:10000]
        except: pass
        event = {'channel': channel, 'fileName': path.name, 'filePath': str(path), 'fileSize': path.stat().st_size, 'content': content}
        matched = self.engine.evaluate(event)
        if matched:
            log.warning(f'Policy violation: {matched["name"]} - {event["fileName"]}')
            if matched.get('action') == 'block': enforce_block(path=str(path), channel=channel, policy_name=matched['name'])
            self.api.report_incident({'hostname': socket.gethostname(), 'username': os.getenv('USER', 'unknown'),
                'policyId': matched['id'], 'policyName': matched['name'], 'severity': matched.get('severity', 'medium'),
                'action': matched.get('action', 'audit'), 'channel': channel, 'riskScore': 75,
                'details': {'fileName': event.get('fileName'), 'filePath': event.get('filePath'), 'fileSize': event.get('fileSize')}})

class USBMonitor:
    def __init__(self, engine, api): self.engine = engine; self.api = api; self.running = False; self._known = set()
    def start(self): self.running = True; self._known = set(self._vols()); threading.Thread(target=self._loop, daemon=True).start(); log.info('USB monitor started')
    def stop(self): self.running = False
    def _vols(self):
        p = Path('/Volumes')
        if not p.exists(): return []
        return [v.name for v in p.iterdir() if v.is_dir() and not v.is_symlink() and v.name not in SKIP_VOLUMES]
    def _loop(self):
        while self.running:
            try:
                cur = set(self._vols())
                for vol in cur - self._known:
                    log.warning(f'New USB volume: {vol}')
                    m = self.engine.evaluate({'channel': 'usb', 'fileName': vol, 'content': ''})
                    if m: self.api.report_incident({'hostname': socket.gethostname(), 'username': os.getenv('USER','unknown'),
                        'policyId': m['id'], 'policyName': m['name'], 'severity': m.get('severity','high'),
                        'action': m.get('action','block'), 'channel': 'usb', 'riskScore': 80, 'details': {'fileName': vol}})
                self._known = cur
            except Exception as e: log.error(f'USB error: {e}')
            time.sleep(3)

class ClipboardMonitor:
    def __init__(self, engine, api): self.engine = engine; self.api = api; self.running = False; self._last = ''
    def start(self): self.running = True; threading.Thread(target=self._loop, daemon=True).start(); log.info('Clipboard monitor started')
    def stop(self): self.running = False
    def _loop(self):
        while self.running:
            try:
                r = subprocess.run(['pbpaste'], capture_output=True, text=True, timeout=5)
                c = r.stdout[:5000]
                if c and c != self._last:
                    self._last = c
                    m = self.engine.evaluate({'channel': 'clipboard', 'content': c, 'fileName': ''})
                    if m:
                        log.warning(f'Clipboard policy violation: {m["name"]}')
                        if m.get('action') == 'block': enforce_block(channel='clipboard', policy_name=m['name'])
                        self.api.report_incident({'hostname': socket.gethostname(), 'username': os.getenv('USER','unknown'),
                            'policyId': m['id'], 'policyName': m['name'], 'severity': m.get('severity','medium'),
                            'action': m.get('action','audit'), 'channel': 'clipboard', 'riskScore': 65,
                            'details': {'contentSnippet': c[:200]}})
            except Exception as e: log.error(f'Clipboard error: {e}')
            time.sleep(2)

class NextGuardAgent:
    def __init__(self, server, tenant_id):
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

        # Step 1: Register with server
        reg_resp = self.api.register(sys_info)
        if not reg_resp:
            log.warning('Registration failed. Loading cached policies.')
            self.engine.load_cache()
        else:
            # Step 2: Always fetch latest policies from bundle API (single source of truth)
            log.info('Fetching latest policies from bundle API...')
            policies = self.api.sync_policies()
            if policies:
                self.engine.load(policies)
                self.engine.save_cache()
                log.info(f'Loaded {len(policies)} policies from bundle API')
            else:
                # Fallback to registration response policies
                reg_policies = reg_resp.get('policies', [])
                if reg_policies:
                    log.info(f'Using {len(reg_policies)} policies from registration')
                    self.engine.load(reg_policies)
                    self.engine.save_cache()
                else:
                    self.engine.load_cache()

        self._save_state(sys_info)
        self.running = True
        self.fs_monitor.start()
        self.usb_monitor.start()
        self.clip_monitor.start()
        log.info('All monitors active. Agent running.')

        last_hb = 0; last_sync = 0
        try:
            while self.running:
                now = time.time()
                if now - last_hb >= HEARTBEAT_INTERVAL:
                    resp = self.api.heartbeat()
                    if resp:
                        if resp.get('needsRegistration'): self.api.register(sys_info)
                        if resp.get('pendingPolicyPush'): last_sync = 0
                    last_hb = now
                if now - last_sync >= POLICY_SYNC_INTERVAL:
                    policies = self.api.sync_policies()
                    if policies: self.engine.load(policies); self.engine.save_cache()
                    last_sync = now
                time.sleep(1)
        except KeyboardInterrupt:
            log.info('Shutting down...')
        finally:
            self.stop()

    def stop(self):
        self.running = False; self.fs_monitor.stop(); self.usb_monitor.stop(); self.clip_monitor.stop()
        log.info('Agent stopped.')

    def _save_state(self, sys_info):
        try: STATE_FILE.write_text(json.dumps({'agentId': self.api.agent_id, 'lastStart': datetime.now(timezone.utc).isoformat(), **sys_info}, indent=2))
        except: pass

def main():
    parser = argparse.ArgumentParser(description='NextGuard DLP Agent for macOS')
    parser.add_argument('--server', default='https://www.next-guard.com', help='Management console URL')
    parser.add_argument('--tenant', default='tenant-demo', help='Tenant ID')
    parser.add_argument('--version', action='version', version=f'NextGuard Agent v{AGENT_VERSION}')
    args = parser.parse_args()
    if platform.system() != 'Darwin': log.warning('This agent is designed for macOS.')
    agent = NextGuardAgent(args.server, args.tenant)
    agent.start()

if __name__ == '__main__':
    main()
