
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REPETITION_THRESHOLD = 0.8;
const REPETITION_WINDOW = 10;
const TOKEN_VELOCITY_THRESHOLD = 10000;
const STUCK_LOOP_THRESHOLD = 3;
const SUB_AGENT_TIMEOUT_MINUTES = 15;

async function detectZombies() {
  const activeRuns = await prisma.runs.findMany({
    where: {
      status: 'running',
      zombie_status: 'none',
    },
  });

  for (const run of activeRuns) {
    const agentEvents = await prisma.agent_events.findMany({
      where: {
        session_key: run.session_key,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: REPETITION_WINDOW,
    });

    // Repetition Check
    if (agentEvents.length >= REPETITION_WINDOW) {
      const lastNOutputs = agentEvents.map((e) => e.detail?.output || '');
      const firstOutput = lastNOutputs[0];
      const similarCount = lastNOutputs.filter(
        (output) => similarity(firstOutput, output) > REPETITION_THRESHOLD
      ).length;

      if (similarCount >= REPETITION_WINDOW * REPETITION_THRESHOLD) {
        await flagAsZombie(run, 'repetition_check', {
          repeated_log: firstOutput,
          count: similarCount,
        });
        continue;
      }
    }

    // Token Velocity Check
    const recentEvents = await prisma.agent_events.findMany({
      where: {
        session_key: run.session_key,
        created_at: {
          gte: new Date(new Date().getTime() - 60000), // 1 minute ago
        },
      },
    });

    const tokensInLastMinute = recentEvents.reduce(
      (acc, e) => acc + (e.tokens_used || 0),
      0
    );

    if (tokensInLastMinute > TOKEN_VELOCITY_THRESHOLD) {
      const toolCallsInLastMinute = recentEvents.filter(
        (e) => e.event_type === 'tool_call'
      ).length;
      if (toolCallsInLastMinute === 0) {
        await flagAsZombie(run, 'token_velocity', {
          tokens_in_last_minute: tokensInLastMinute,
        });
        continue;
      }
    }

    // Stuck Loop Check
    const lastToolCalls = agentEvents
      .filter((e) => e.event_type === 'tool_call')
      .slice(0, STUCK_LOOP_THRESHOLD);

    if (lastToolCalls.length === STUCK_LOOP_THRESHOLD) {
      const firstToolCall = JSON.stringify(lastToolCalls[0].detail);
      const allSame = lastToolCalls.every(
        (call) => JSON.stringify(call.detail) === firstToolCall
      );
      if (allSame) {
        await flagAsZombie(run, 'stuck_loop', {
          tool_call: lastToolCalls[0].detail,
          count: STUCK_LOOP_THRESHOLD,
        });
        continue;
      }
    }

    // Sub-agent Timeout
    const startTime = new Date(run.started_at).getTime();
    const now = new Date().getTime();
    if ((now - startTime) / 60000 > SUB_AGENT_TIMEOUT_MINUTES) {
        await flagAsZombie(run, 'sub_agent_timeout', {
            duration_minutes: (now - startTime) / 60000,
        });
        continue;
    }
  }
}

async function flagAsZombie(run, heuristic, details) {
  await prisma.runs.update({
    where: {
      id: run.id,
    },
    data: {
      zombie_status: 'suspected',
    },
  });

  await prisma.zombie_events.create({
    data: {
      session_key: run.session_key,
      agent_id: run.agent_id,
      status: 'suspected',
      detection_heuristic: heuristic,
      details: details,
    },
  });

  console.log(`Flagged agent ${run.agent_id} in session ${run.session_key} as a suspected zombie.`);
}

function similarity(s1, s2) {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    const longerLength = longer.length;
    if (longerLength === 0) {
      return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
  }
  
  function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
  
    const costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i == 0) {
          costs[j] = j;
        } else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) {
        costs[s2.length] = lastValue;
      }
    }
    return costs[s2.length];
  }

detectZombies()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
