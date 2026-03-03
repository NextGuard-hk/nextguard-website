// Agent Persistence Store - persists real agent registrations to /tmp
// This ensures agents survive Vercel serverless cold starts within the same instance
import * as fs from 'fs'
import { Agent, getStore } from '@/lib/multi-tenant-store'

const REAL_AGENTS_FILE = '/tmp/nextguard_real_agents.json'

// Load persisted real agents from /tmp
export function loadRealAgents(): Record<string, Agent> {
  try {
    if (fs.existsSync(REAL_AGENTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(REAL_AGENTS_FILE, 'utf8'))
      return data || {}
    }
  } catch (e) {
    console.error('loadRealAgents error:', e)
  }
  return {}
}

// Save a real agent to /tmp persistence
export function saveRealAgent(agent: Agent): void {
  try {
    const agents = loadRealAgents()
    agents[agent.id] = agent
    fs.writeFileSync(REAL_AGENTS_FILE, JSON.stringify(agents, null, 2))
  } catch (e) {
    console.error('saveRealAgent error:', e)
  }
}

// Merge persisted real agents into the in-memory store
// Call this before reading agents to ensure real agents are included
export function syncRealAgentsToStore(): void {
  const store = getStore()
  const realAgents = loadRealAgents()
  for (const [id, agent] of Object.entries(realAgents)) {
    // Real agents override seed data if same ID, or add new ones
    store.agents.set(id, agent)
  }
}

// Check if an agent ID is a seed/demo agent
const SEED_AGENT_IDS = new Set([
  'agent-mac-001', 'agent-mac-002', 'agent-mac-003', 'agent-mac-004', 'agent-mac-005',
  'agent-win-001', 'agent-win-002', 'agent-win-003', 'agent-win-004',
  'agent-linux-001',
  'agent-alpha-001', 'agent-alpha-002',
  'agent-beta-001'
])

export function isRealAgent(agentId: string): boolean {
  return !SEED_AGENT_IDS.has(agentId)
}
