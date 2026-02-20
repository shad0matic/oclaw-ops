/**
 * Dave — The Accountant Agent: Model Pricing Configuration
 *
 * Prices are in USD per million tokens (input/output/cached)
 * Tier classification:
 *   1 = Budget models (MiniMax, GPT-4o-mini, Haiku)
 *   2 = Mid-tier models (Sonnet, GPT-4o, Gemini Pro)
 *   3 = Premium models (Opus, o1)
 */

export interface ModelPricing {
  inputPerMtok: number    // $ per million input tokens
  outputPerMtok: number   // $ per million output tokens
  cachedPerMtok?: number  // $ per million cached tokens (Anthropic)
  tier: 1 | 2 | 3
}

export interface AudioPricing {
  perMinute: number       // $ per minute of audio
  tier: 1 | 2 | 3
}

export type PricingEntry = ModelPricing | AudioPricing

// Pricing data as of Feb 2026 — update periodically
export const MODEL_PRICING: Record<string, Record<string, PricingEntry>> = {
  anthropic: {
    'claude-opus-4-5': {
      inputPerMtok: 15.00,
      outputPerMtok: 75.00,
      cachedPerMtok: 1.50,
      tier: 3,
    },
    'claude-sonnet-4-5': {
      inputPerMtok: 3.00,
      outputPerMtok: 15.00,
      cachedPerMtok: 0.30,
      tier: 2,
    },
    'claude-haiku-4-5': {
      inputPerMtok: 0.80,
      outputPerMtok: 4.00,
      cachedPerMtok: 0.08,
      tier: 1,
    },
    // Legacy models
    'claude-3-5-sonnet-20241022': {
      inputPerMtok: 3.00,
      outputPerMtok: 15.00,
      cachedPerMtok: 0.30,
      tier: 2,
    },
    'claude-3-opus-20240229': {
      inputPerMtok: 15.00,
      outputPerMtok: 75.00,
      cachedPerMtok: 1.50,
      tier: 3,
    },
    'claude-3-haiku-20240307': {
      inputPerMtok: 0.25,
      outputPerMtok: 1.25,
      cachedPerMtok: 0.03,
      tier: 1,
    },
  },

  openai: {
    'gpt-4o': {
      inputPerMtok: 2.50,
      outputPerMtok: 10.00,
      tier: 2,
    },
    'gpt-4o-mini': {
      inputPerMtok: 0.15,
      outputPerMtok: 0.60,
      tier: 1,
    },
    'gpt-4-turbo': {
      inputPerMtok: 10.00,
      outputPerMtok: 30.00,
      tier: 2,
    },
    'o1': {
      inputPerMtok: 15.00,
      outputPerMtok: 60.00,
      tier: 3,
    },
    'o1-mini': {
      inputPerMtok: 3.00,
      outputPerMtok: 12.00,
      tier: 2,
    },
    'whisper-1': {
      perMinute: 0.006,
      tier: 1,
    } as AudioPricing,
  },

  google: {
    'gemini-2.5-pro': {
      inputPerMtok: 1.25,
      outputPerMtok: 10.00,
      tier: 2,
    },
    'gemini-2.0-flash': {
      inputPerMtok: 0.10,
      outputPerMtok: 0.40,
      tier: 1,
    },
    'gemini-1.5-pro': {
      inputPerMtok: 1.25,
      outputPerMtok: 5.00,
      tier: 2,
    },
    'gemini-1.5-flash': {
      inputPerMtok: 0.075,
      outputPerMtok: 0.30,
      tier: 1,
    },
  },

  minimax: {
    'MiniMax-M2.5': {
      inputPerMtok: 0.15,
      outputPerMtok: 1.10,
      tier: 1,
    },
    'minimax-text-01': {
      inputPerMtok: 0.15,
      outputPerMtok: 1.10,
      tier: 1,
    },
  },

  xai: {
    'grok-2': {
      inputPerMtok: 2.00,
      outputPerMtok: 10.00,
      tier: 2,
    },
    'grok-2-mini': {
      inputPerMtok: 0.20,
      outputPerMtok: 1.00,
      tier: 1,
    },
  },

  deepseek: {
    'deepseek-chat': {
      inputPerMtok: 0.14,
      outputPerMtok: 0.28,
      tier: 1,
    },
    'deepseek-reasoner': {
      inputPerMtok: 0.55,
      outputPerMtok: 2.19,
      tier: 2,
    },
  },
}

// Alias map for model name normalization
export const MODEL_ALIASES: Record<string, { provider: string; model: string }> = {
  // Anthropic aliases
  'opus': { provider: 'anthropic', model: 'claude-opus-4-5' },
  'sonnet': { provider: 'anthropic', model: 'claude-sonnet-4-5' },
  'haiku': { provider: 'anthropic', model: 'claude-haiku-4-5' },
  'claude-sonnet': { provider: 'anthropic', model: 'claude-sonnet-4-5' },
  'claude-opus': { provider: 'anthropic', model: 'claude-opus-4-5' },
  'claude-haiku': { provider: 'anthropic', model: 'claude-haiku-4-5' },

  // OpenRouter / OpenClaw format
  'anthropic/claude-sonnet-4-5': { provider: 'anthropic', model: 'claude-sonnet-4-5' },
  'anthropic/claude-opus-4-5': { provider: 'anthropic', model: 'claude-opus-4-5' },
  'anthropic/claude-haiku-4-5': { provider: 'anthropic', model: 'claude-haiku-4-5' },
  'openai/gpt-4o': { provider: 'openai', model: 'gpt-4o' },
  'openai/gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini' },
  'google/gemini-2.5-pro': { provider: 'google', model: 'gemini-2.5-pro' },
  'google/gemini-2.0-flash': { provider: 'google', model: 'gemini-2.0-flash' },
  'xai/grok-2': { provider: 'xai', model: 'grok-2' },
  'deepseek/deepseek-chat': { provider: 'deepseek', model: 'deepseek-chat' },

  // Other aliases
  'gpt4o': { provider: 'openai', model: 'gpt-4o' },
  'gpt4o-mini': { provider: 'openai', model: 'gpt-4o-mini' },
  'gemini': { provider: 'google', model: 'gemini-2.5-pro' },
  'gemini-pro': { provider: 'google', model: 'gemini-2.5-pro' },
  'gemini-flash': { provider: 'google', model: 'gemini-2.0-flash' },
  'grok': { provider: 'xai', model: 'grok-2' },
  'deepseek': { provider: 'deepseek', model: 'deepseek-chat' },
  'minimax': { provider: 'minimax', model: 'MiniMax-M2.5' },
}

/**
 * Resolve a model identifier to provider + canonical model name
 */
export function resolveModel(modelInput: string): { provider: string; model: string } | null {
  // Check direct aliases first
  const aliased = MODEL_ALIASES[modelInput.toLowerCase()]
  if (aliased) return aliased

  // Try provider/model format
  if (modelInput.includes('/')) {
    const [provider, model] = modelInput.split('/', 2)
    if (MODEL_PRICING[provider]?.[model]) {
      return { provider, model }
    }
  }

  // Search all providers for exact match
  for (const [provider, models] of Object.entries(MODEL_PRICING)) {
    if (models[modelInput]) {
      return { provider, model: modelInput }
    }
  }

  // Try case-insensitive search
  const lower = modelInput.toLowerCase()
  for (const [provider, models] of Object.entries(MODEL_PRICING)) {
    for (const model of Object.keys(models)) {
      if (model.toLowerCase() === lower) {
        return { provider, model }
      }
    }
  }

  return null
}

/**
 * Get pricing for a model
 */
export function getPricing(modelInput: string): (PricingEntry & { provider: string; model: string }) | null {
  const resolved = resolveModel(modelInput)
  if (!resolved) return null

  const pricing = MODEL_PRICING[resolved.provider]?.[resolved.model]
  if (!pricing) return null

  return { ...pricing, ...resolved }
}

/**
 * Check if pricing is audio-based
 */
export function isAudioPricing(pricing: PricingEntry): pricing is AudioPricing {
  return 'perMinute' in pricing
}

/**
 * Check if pricing is token-based
 */
export function isModelPricing(pricing: PricingEntry): pricing is ModelPricing {
  return 'inputPerMtok' in pricing
}
