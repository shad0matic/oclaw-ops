# OpenClaw Model Hierarchy Research

**Date:** 19 February 2026  
**Author:** Kevin 🍌  
**Status:** Draft for review

---

## Executive Summary

With MiniMax M2.5 now available in OpenClaw at dirt-cheap pricing ($0.30/$1.20 per 1M tokens), we have an opportunity to dramatically reduce costs for high-volume agents while maintaining quality where it matters.

**Key finding:** MiniMax is ~17-21x cheaper than Opus and ranked #5 in intelligence benchmarks — a serious contender for workhorse tasks.

---

## Current Configuration

### Primary Model
- **anthropic/claude-opus-4-5** (alias: `opus45`)

### Fallback Chain
1. xai/grok-3
2. google/gemini-2.5-pro
3. openai/gpt-5.2

### Available Model Aliases
| Alias | Full Model ID |
|-------|---------------|
| opus46 | anthropic/claude-opus-4-6 |
| opus45 | anthropic/claude-opus-4-5 |
| sonnet | anthropic/claude-sonnet-4-5 |
| haiku | anthropic/claude-haiku-4-5 |
| gpt52 | openai/gpt-5.2 |
| codex | openai-codex/gpt-5.3-codex |
| grok3 | xai/grok-3 |
| gemini | google/gemini-2.5-pro |
| minimax | minimax/MiniMax-M2.5 |

---

## Model Pricing Comparison

### Per 1M Tokens (February 2026)

| Model | Input | Output | Blended (3:1) | Cost Tier |
|-------|-------|--------|---------------|-----------|
| Claude Opus 4.6 | $5.00 | $25.00 | $10.00 | 💰💰💰💰 Premium |
| Claude Opus 4.5 | $5.00 | $25.00 | $10.00 | 💰💰💰💰 Premium |
| Claude Sonnet 4.5 | $3.00 | $15.00 | $6.00 | 💰💰💰 High |
| GPT-5.2 | $1.75 | $14.00 | $4.81 | 💰💰💰 High |
| Grok-3 | $3.00 | $15.00 | $6.00 | 💰💰💰 High |
| Gemini 2.5 Pro | $1.25 | $10.00 | $3.44 | 💰💰 Mid |
| Claude Haiku 4.5 | $1.00 | $5.00 | $2.00 | 💰💰 Mid |
| Gemini 2.0 Flash | $0.10 | $0.40 | $0.18 | 💰 Budget |
| **MiniMax M2.5** | **$0.30** | **$1.20** | **$0.53** | 🆓 Dirt Cheap |

*Blended rate assumes 3:1 input to output ratio*

### Cost Multipliers vs MiniMax

| Model | Input Cost (×) | Output Cost (×) |
|-------|----------------|-----------------|
| Opus 4.5/4.6 | 17× | 21× |
| Sonnet 4.5 | 10× | 12.5× |
| GPT-5.2 | 5.8× | 11.7× |
| Grok-3 | 10× | 12.5× |
| Gemini 2.5 Pro | 4.2× | 8.3× |
| Haiku 4.5 | 3.3× | 4.2× |

---

## MiniMax M2.5 Deep Dive

### Intelligence Ranking
- **#5 out of 66 models** on Artificial Analysis Intelligence Index
- Score: **42** (average is 26)
- Open weights model (MIT license)
- Released February 2026

### Technical Specs
- Context window: **205K tokens**
- Reasoning: Yes
- Speed: **55.7 tokens/sec** (faster than average 52)
- Parameters: 230B total, 10B active (MoE architecture)

### Rate Limits
- **500 RPM** (requests per minute)
- **20M TPM** (tokens per minute)
- Very generous for high-volume work

### Prompt Caching
- Read: $0.03/M tokens (90% discount!)
- Write: $0.375/M tokens

### Considerations
- Somewhat verbose (56M tokens on benchmark vs 15M average)
- May need output length guidance in prompts
- Tool calling support needs verification

---

## Current Agent Assignments

| Agent | Role | Current Model | Monthly Cost Est.* |
|-------|------|---------------|-------------------|
| Kevin 🍌 | Main/Conductor | opus45 | $$$ (high interaction) |
| Dr. Nefario 🔬 | Research | sonnet | $$ |
| Oracle 🔮 | Life Coach | sonnet | $ |
| Echo 🔊 | Media Analysis | gemini | $$ (high volume) |
| Phil 🐊 | X/Twitter | gemini | $$ (high volume) |
| Bob 🎨 | UI/Frontend | gemini | $ |
| Stuart 🔒 | DB/Prisma | sonnet | $ |
| Smaug 🐉 | Monitoring | haiku | $ |
| Dave 💰 | Cost Watching | gemini-2.0-flash | ¢ |
| Mel 🚔 | Zombie Patrol | gemini-2.0-flash | ¢ |

*Rough estimates based on observed usage patterns*

---

## Proposed Model Hierarchy

### Tier 1: Strategic (Reasoning & Judgment)
**Models:** opus45, sonnet  
**Use for:** 
- Main session (Kevin) — delegation, memory, complex decisions
- Research agents needing deep analysis
- Tasks requiring nuanced understanding

**Agents:** Kevin, Dr. Nefario, Oracle, Stuart

### Tier 2: Capable Workhorse (Good Quality, Lower Cost)
**Models:** gemini, haiku  
**Use for:**
- Structured analysis
- Coding with review
- Moderate complexity tasks

**Agents:** (candidates for demotion from Tier 1 if performance holds)

### Tier 3: High-Volume Mechanical (Cost-Optimized)
**Model:** minimax  
**Use for:**
- Content extraction (transcripts, scraping)
- Structured data processing
- Repetitive tasks with clear inputs/outputs
- UI component generation

**Proposed Agents:** Phil, Echo, Bob

### Tier 4: Monitoring (Minimal Cost)
**Models:** gemini-2.0-flash, haiku  
**Use for:**
- Health checks
- Simple notifications
- Pattern detection

**Agents:** Smaug, Dave, Mel

---

## Recommended Changes

### Immediate (Low Risk)
```json
{
  "id": "phil",
  "model": "minimax/MiniMax-M2.5"
}
```
Phil's work is mechanical X scraping — perfect for MiniMax.

### After Testing
```json
{
  "id": "echo", 
  "model": "minimax/MiniMax-M2.5"
}
```
Echo does transcript extraction — structured, high-volume.

### Evaluate Carefully
```json
{
  "id": "bob",
  "model": "minimax/MiniMax-M2.5"
}
```
Bob does UI work — need to test code quality first.

---

## Estimated Savings

### Current (Phil + Echo + Bob on Gemini 2.5 Pro)
- Input: $1.25/M tokens
- Output: $10.00/M tokens

### Proposed (on MiniMax)
- Input: $0.30/M tokens (76% savings)
- Output: $1.20/M tokens (88% savings)

### Example Scenario
If these 3 agents process 10M input + 2M output tokens/month:
- **Before:** $12.50 + $20.00 = $32.50
- **After:** $3.00 + $2.40 = $5.40
- **Savings:** ~$27/month or **83%**

---

## Testing Plan

### Phase 1: Phil Migration
1. Switch Phil to MiniMax
2. Run standard X extraction tasks
3. Compare output quality vs Gemini
4. Monitor for tool calling issues

### Phase 2: Echo Migration  
1. If Phil succeeds, migrate Echo
2. Test transcript extraction quality
3. Verify structured output consistency

### Phase 3: Bob Evaluation
1. Generate sample UI components with MiniMax
2. Compare code quality to Gemini output
3. Decision: migrate or keep on higher tier

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| MiniMax tool calling issues | Medium | High | Test thoroughly before migration |
| Output quality degradation | Low | Medium | Keep Gemini as fallback |
| Verbose outputs increase cost | Medium | Low | Add output length constraints to prompts |
| Rate limiting at scale | Low | Low | Current limits (500 RPM) are generous |

---

## Action Items

- [ ] Test MiniMax with Phil's typical workload
- [ ] Benchmark tool calling reliability
- [ ] Create MiniMax-specific prompt templates (verbosity control)
- [ ] Set up A/B comparison for Echo tasks
- [ ] Document any quality issues observed

---

## Sources

- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [MiniMax Pricing](https://platform.minimax.io/docs/pricing/pay-as-you-go)
- [xAI/Grok Pricing](https://docs.x.ai/developers/models)
- [Google Vertex AI Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [Artificial Analysis - MiniMax M2.5](https://artificialanalysis.ai/models/minimax-m2-5)

---

*Report generated by Kevin 🍌 for Boss review*
