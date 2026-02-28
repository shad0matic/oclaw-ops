/**
 * Dave — The Accountant Agent
 *
 * Per-agent cost tracking, budget enforcement, and spend reporting.
 *
 * Usage:
 *   import { calculateTokenCost, logCost, getTodaySpend } from '@/lib/dave'
 */

// Pricing configuration
export {
  MODEL_PRICING,
  MODEL_ALIASES,
  resolveModel,
  getPricing,
  isAudioPricing,
  isModelPricing,
  type ModelPricing,
  type AudioPricing,
  type PricingEntry,
} from './pricing'

// Cost calculation
export {
  calculateTokenCost,
  calculateAudioCost,
  estimateCostCents,
  centsToUsd,
  centsToEur,
  getTierLabel,
  type TokenUsage,
  type AudioUsage,
  type CostBreakdown,
  type AudioCostBreakdown,
} from './cost-calculator'

// Database operations
export {
  ensureDaveTables,
  logCost,
  getTodaySpend,
  getAgentSpend,
  getPeriodSpend,
  getProviderTokens,
  getAllBudgets,
  getAgentBudget,
  setAgentBudget,
  pauseAgent,
  resumeAgent,
  checkBudgetStatus,
  type LogCostParams,
  type TodaySpendResult,
  type AgentSpendResult,
  type PeriodSpendResult,
  type ProviderTokens,
  type AgentBudget,
  type BudgetStatus,
} from './db'
