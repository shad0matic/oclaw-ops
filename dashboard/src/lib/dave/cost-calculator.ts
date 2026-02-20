/**
 * Dave — The Accountant Agent: Cost Calculator
 *
 * Calculates costs from token counts using the pricing configuration.
 * All costs are returned in cents to avoid floating point issues.
 */

import { getPricing, isModelPricing, isAudioPricing, type ModelPricing, type AudioPricing } from './pricing'

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cachedTokens?: number
}

export interface AudioUsage {
  durationMinutes: number
}

export interface CostBreakdown {
  /** Total cost in cents (USD) */
  totalCents: number
  /** Input token cost in cents */
  inputCents: number
  /** Output token cost in cents */
  outputCents: number
  /** Cached token cost in cents (if applicable) */
  cachedCents: number
  /** Model tier (1=budget, 2=mid, 3=premium) */
  tier: 1 | 2 | 3
  /** Provider name */
  provider: string
  /** Canonical model name */
  model: string
}

export interface AudioCostBreakdown {
  /** Total cost in cents (USD) */
  totalCents: number
  /** Duration in minutes */
  durationMinutes: number
  /** Model tier */
  tier: 1 | 2 | 3
  /** Provider name */
  provider: string
  /** Canonical model name */
  model: string
}

/**
 * Calculate cost for token-based API usage
 *
 * @param modelInput - Model identifier (e.g., 'claude-sonnet-4-5', 'anthropic/claude-opus-4-5', 'sonnet')
 * @param usage - Token counts
 * @returns Cost breakdown in cents, or null if model not found
 */
export function calculateTokenCost(
  modelInput: string,
  usage: TokenUsage
): CostBreakdown | null {
  const pricing = getPricing(modelInput)
  if (!pricing || !isModelPricing(pricing)) return null

  const { inputPerMtok, outputPerMtok, cachedPerMtok = 0, tier, provider, model } = pricing as ModelPricing & { provider: string; model: string }

  // Calculate costs per million tokens, convert to cents
  // Formula: (tokens / 1_000_000) * pricePerMtok * 100 (to get cents)
  const inputCents = Math.round((usage.inputTokens / 1_000_000) * inputPerMtok * 100)
  const outputCents = Math.round((usage.outputTokens / 1_000_000) * outputPerMtok * 100)
  const cachedCents = Math.round(((usage.cachedTokens ?? 0) / 1_000_000) * cachedPerMtok * 100)

  return {
    totalCents: inputCents + outputCents + cachedCents,
    inputCents,
    outputCents,
    cachedCents,
    tier,
    provider,
    model,
  }
}

/**
 * Calculate cost for audio-based API usage (e.g., Whisper)
 *
 * @param modelInput - Model identifier (e.g., 'whisper-1')
 * @param usage - Audio duration
 * @returns Cost breakdown in cents, or null if model not found
 */
export function calculateAudioCost(
  modelInput: string,
  usage: AudioUsage
): AudioCostBreakdown | null {
  const pricing = getPricing(modelInput)
  if (!pricing || !isAudioPricing(pricing)) return null

  const { perMinute, tier, provider, model } = pricing as AudioPricing & { provider: string; model: string }

  // Cost = duration * perMinute, convert to cents
  const totalCents = Math.round(usage.durationMinutes * perMinute * 100)

  return {
    totalCents,
    durationMinutes: usage.durationMinutes,
    tier,
    provider,
    model,
  }
}

/**
 * Quick cost estimate without full breakdown
 *
 * @param modelInput - Model identifier
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in cents, or 0 if model not found
 */
export function estimateCostCents(
  modelInput: string,
  inputTokens: number,
  outputTokens: number
): number {
  const result = calculateTokenCost(modelInput, { inputTokens, outputTokens })
  return result?.totalCents ?? 0
}

/**
 * Convert cents to USD string for display
 */
export function centsToUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Convert cents to EUR string (using approximate rate)
 */
export function centsToEur(cents: number, usdToEur: number = 0.92): string {
  return `€${((cents / 100) * usdToEur).toFixed(2)}`
}

/**
 * Get tier label for display
 */
export function getTierLabel(tier: 1 | 2 | 3): string {
  switch (tier) {
    case 1: return 'Budget'
    case 2: return 'Standard'
    case 3: return 'Premium'
  }
}
