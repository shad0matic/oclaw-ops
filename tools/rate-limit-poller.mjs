#!/usr/bin/env node
/**
 * Provider Rate Limit Poller
 * 
 * Polls provider APIs to capture rate limit headers
 * and sends them to the dashboard.
 * 
 * Supports: Anthropic (default)
 * Future: OpenAI, Google, etc.
 */

import Anthropic from '@anthropic-ai/sdk';

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const DASHBOARD_URL = 'http://localhost:3000/api/dave/rate-limits';

// Provider header mappings for rate limits
const PROVIDER_HEADERS = {
  anthropic: {
    requests: {
      limit: 'anthropic-ratelimit-requests-limit',
      remaining: 'anthropic-ratelimit-requests-remaining',
      reset: 'anthropic-ratelimit-requests-reset',
    },
    inputTokens: {
      limit: 'anthropic-ratelimit-input-tokens-limit',
      remaining: 'anthropic-ratelimit-input-tokens-remaining',
      reset: 'anthropic-ratelimit-input-tokens-reset',
    },
    outputTokens: {
      limit: 'anthropic-ratelimit-output-tokens-limit',
      remaining: 'anthropic-ratelimit-output-tokens-remaining',
      reset: 'anthropic-ratelimit-output-tokens-reset',
    },
  },
  // Future: openai: { ... }, google: { ... }
};

// SDK clients
const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Extract rate limit info from response headers
 */
function extractRateLimits(headers, provider = 'anthropic') {
  const limits = [];
  const config = PROVIDER_HEADERS[provider];
  
  if (!config) {
    console.error(`Unknown provider: ${provider}`);
    return limits;
  }
  
  // Check for requests per minute (RPM)
  const rpmLimit = headers.get(config.requests.limit);
  if (rpmLimit) {
    limits.push({
      metricType: 'requests',
      limit: parseInt(rpmLimit, 10),
      remaining: parseInt(headers.get(config.requests.remaining) || '0', 10),
      resetAt: headers.get(config.requests.reset) 
        ? new Date(parseInt(headers.get(config.requests.reset), 10) * 1000).toISOString() 
        : undefined,
    });
  }
  
  // Check for input tokens per minute (ITPM)
  const itpmLimit = headers.get(config.inputTokens.limit);
  if (itpmLimit) {
    limits.push({
      metricType: 'input_tokens',
      limit: parseInt(itpmLimit, 10),
      remaining: parseInt(headers.get(config.inputTokens.remaining) || '0', 10),
      resetAt: headers.get(config.inputTokens.reset)
        ? new Date(parseInt(headers.get(config.inputTokens.reset), 10) * 1000).toISOString()
        : undefined,
    });
  }
  
  // Check for output tokens per minute (OTPM)
  const otpmLimit = headers.get(config.outputTokens.limit);
  if (otpmLimit) {
    limits.push({
      metricType: 'output_tokens',
      limit: parseInt(otpmLimit, 10),
      remaining: parseInt(headers.get(config.outputTokens.remaining) || '0', 10),
      resetAt: headers.get(config.outputTokens.reset)
        ? new Date(parseInt(headers.get(config.outputTokens.reset), 10) * 1000).toISOString()
        : undefined,
    });
  }
  
  return limits;
}

/**
 * Poll Anthropic API for rate limits using fetch (to get headers)
 */
async function pollAnthropic() {
  const timestamp = new Date().toISOString();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error(`[${timestamp}] ANTHROPIC_API_KEY not set`);
    return null;
  }
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    
    console.log(`[${timestamp}] Anthropic API status: ${response.status}`);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[${timestamp}] API error: ${errorBody.substring(0, 200)}`);
      return null;
    }
    
    // Extract rate limit headers
    const limits = extractRateLimits(response.headers, 'anthropic');
    
    if (limits.length > 0) {
      console.log(`[${timestamp}] Rate limits extracted:`, JSON.stringify(limits));
      return limits;
    } else {
      console.log(`[${timestamp}] No rate limit headers found in response`);
      // Debug: print all headers
      console.log('  All headers:');
      response.headers.forEach((value, key) => {
        console.log(`    ${key}: ${value}`);
      });
      return null;
    }
    
  } catch (error) {
    console.error(`[${timestamp}] Poll error:`, error.message);
    return null;
  }
}

/**
 * Send rate limit data to dashboard
 */
async function sendToDashboard(provider, limits) {
  try {
    const response = await fetch(DASHBOARD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        limits,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Dashboard error: ${response.status} - ${errorText}`);
      return false;
    }
    
    console.log('Successfully sent rate limits to dashboard');
    return true;
  } catch (error) {
    console.error('Failed to send to dashboard:', error.message);
    return false;
  }
}

/**
 * Main poll function
 */
async function poll() {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] Polling rate limits...`);
  
  // Poll Anthropic
  const limits = await pollAnthropic();
  
  if (limits && limits.length > 0) {
    await sendToDashboard('anthropic', limits);
  }
}

// Run immediately, then every POLL_INTERVAL_MS
console.log('Starting provider rate limit poller...');
console.log(`Poll interval: ${POLL_INTERVAL_MS / 1000}s`);
poll();
setInterval(poll, POLL_INTERVAL_MS);
