import { test, expect } from '@playwright/test';

test.describe('API Routes', () => {
  test('GET /api/agents — returns agent list', async ({ request }) => {
    const res = await request.get('/api/agents');
    expect(res.status()).toBe(200);

    const agents = await res.json();
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);

    const agent = agents[0];
    expect(agent).toHaveProperty('agent_id');
    expect(agent).toHaveProperty('name');
    expect(agent).toHaveProperty('level');
    expect(agent).toHaveProperty('trust_score');
    expect(agent).toHaveProperty('status');
    expect(agent).toHaveProperty('last_active');
    expect(['idle', 'running', 'error']).toContain(agent.status);
  });

  test('GET /api/events — returns event list', async ({ request }) => {
    const res = await request.get('/api/events');
    expect(res.status()).toBe(200);

    const events = await res.json();
    expect(Array.isArray(events)).toBe(true);
  });

  test('GET /api/events?limit=5 — respects limit', async ({ request }) => {
    const res = await request.get('/api/events?limit=5');
    expect(res.status()).toBe(200);

    const events = await res.json();
    expect(events.length).toBeLessThanOrEqual(5);
  });

  test('GET /api/events?agent_id=main — filters by agent', async ({ request }) => {
    const res = await request.get('/api/events?agent_id=main');
    expect(res.status()).toBe(200);

    const events = await res.json();
    for (const event of events) {
      expect(event.agent_id).toBe('main');
    }
  });

  test('GET /api/runs — returns run list', async ({ request }) => {
    const res = await request.get('/api/runs');
    expect(res.status()).toBe(200);

    const runs = await res.json();
    expect(Array.isArray(runs)).toBe(true);
  });

  test('GET /api/runs — includes workflow name when runs exist', async ({ request }) => {
    const res = await request.get('/api/runs');
    const runs = await res.json();

    if (runs.length > 0) {
      expect(runs[0]).toHaveProperty('workflows');
    }
  });

  test('GET /api/runs?status=completed — filters by status', async ({ request }) => {
    const res = await request.get('/api/runs?status=completed');
    expect(res.status()).toBe(200);
  });

  test('GET /api/system/health — returns system metrics', async ({ request }) => {
    const res = await request.get('/api/system/health');
    expect(res.status()).toBe(200);

    const health = await res.json();
    expect(health).toHaveProperty('cpu');
    expect(health).toHaveProperty('memory');
    expect(health).toHaveProperty('disk');
    expect(health).toHaveProperty('db');
    expect(health).toHaveProperty('uptime');

    expect(typeof health.cpu.usage).toBe('number');
    expect(health.memory.total).toBeGreaterThan(0);
    expect(health.memory.used).toBeGreaterThan(0);
    expect(health.db.size).toBeGreaterThan(0);
  });
});
