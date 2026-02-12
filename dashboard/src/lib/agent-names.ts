// Agent display names and metadata
// Add new agents here as they join the minion roster

export interface AgentMeta {
  name: string;
  emoji: string;
  avatar: string; // filename in /assets/minion-avatars/
}

const AGENTS: Record<string, AgentMeta> = {
  main:    { name: 'Kevin',       emoji: '🍌', avatar: 'kevin.webp' },
  nefario: { name: 'Dr. Nefario', emoji: '🔬', avatar: 'nefario.webp' },
  bob:     { name: 'Bob',         emoji: '🎨', avatar: 'bob.webp' },
  xreader: { name: 'X Reader',    emoji: '📰', avatar: 'default.webp' },
  stuart:  { name: 'Stuart',      emoji: '🔒', avatar: 'default.webp' },
};

const DEFAULT_META: AgentMeta = {
  name: 'Minion',
  emoji: '👤',
  avatar: 'default.webp',
};

export function getAgent(agentId: string): AgentMeta & { id: string } {
  const meta = AGENTS[agentId] || { ...DEFAULT_META, name: agentId };
  return { id: agentId, ...meta };
}

export function getAgentName(agentId: string): string {
  return AGENTS[agentId]?.name || agentId;
}

export function getAgentAvatar(agentId: string): string {
  return `/assets/minion-avatars/${AGENTS[agentId]?.avatar || DEFAULT_META.avatar}`;
}
