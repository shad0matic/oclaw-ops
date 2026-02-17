# Isometric Detailed View — Implementation Roadmap

**Date:** 17/02/2026
**Status:** Planning
**Target:** Lab page with full isometric office visualization

---

## Current State

### ✅ Assets We Have

**Flat Avatars** (300x300 webp) — need conversion to isometric:
- kevin, bob, nefario, phil, mel, dave, stuart, echo, smaug, xreader, main, spy_minion

**Room Backgrounds** (PNG):
- `rooms/` — nefario-lab, echo-studio, mel-police, bob-coding
- `lounge/` — seating, games, bathroom, bedroom, kitchen

**Furniture** (PNG):
- foosball, table-tennis

**Isometric Characters** (started):
- `characters/minions/bob_walk.webp` — 1 walking sprite

### ✅ Components We Have

- `isometric-office.tsx` — Simple room layout with agent positions
- `isometric-detailed.tsx` — Room-based layout (started, incomplete)
- Basic walking animation (bouncing avatar)

---

## Target Vision

```
┌────────────────────────────────────────────────────────────────────┐
│                        MINION HQ - DETAILED VIEW                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│   │  🧪 Lab     │  │  🎙️ Studio  │  │  🚔 Station │               │
│   │  (Nefario)  │  │  (Echo)     │  │  (Mel)      │               │
│   │    [🔬]     │  │    [🎤]     │  │    [📡]     │               │
│   └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                    │
│   ┌─────────────┐  ┌──────────────────────────────┐               │
│   │  💻 Code    │  │        🛋️ LOUNGE             │               │
│   │  (Bob)      │  │  ┌─────┐ ┌─────┐ ┌─────┐    │               │
│   │    [⌨️]     │  │  │sofa │ │pool │ │ping │    │               │
│   └─────────────┘  │  │ 🟡🟡│ │  🟡 │ │pong │    │               │
│                    │  └─────┘ └─────┘ └─────┘    │               │
│                    └──────────────────────────────┘               │
│                                                                    │
│   Status bar: 🟢 3 active | 🟡 5 idle | ⚫ 2 zombie               │
└────────────────────────────────────────────────────────────────────┘
```

---

## Roadmap

### Phase 1: Isometric Characters (Priority 🔴)

**Goal:** Convert flat avatars to isometric minion characters at 40px height

#### 1.1 Character Design Spec
- Height: **40px** (displayed), source: 80-120px for detail
- Style: Cute minion, isometric 45° angle
- States: idle, walking-left, walking-right, working

#### 1.2 Generation Method

**Option A: AI Generation (Midjourney/DALL-E)**
```
Prompt: "Isometric pixel art minion character, yellow pill-shaped body, 
blue goggles, cute style, 45 degree angle, transparent background, 
game sprite, {agent_trait}"

Agent traits:
- Kevin: chef hat, lead minion
- Bob: headphones, coder vibe
- Nefario: lab coat, scientist goggles
- Echo: microphone, audio waves
- Mel: police hat, badge
- Phil: baseball cap, casual
- Stuart: one eye, guitar
- Dave: fuzzy hair, playful
- Smaug: dragon wings/scales overlay
```

**Option B: Sprite Sheet Conversion**
- Use existing avatars as reference
- Generate sprite sheets via AI
- 4 directions × 4 frames = 16 sprites per character

#### 1.3 Deliverables
```
assets/isometric/characters/minions/
├── kevin/
│   ├── idle.webp        (40x40, single frame)
│   ├── walk_sheet.webp  (160x40, 4 frames)
│   └── work.webp        (40x40, single frame)
├── bob/
│   └── ...
└── [each agent]/
```

**Effort:** 2-3h (AI generation) or 1 day (manual pixel art)
**Assigned:** Boss (Midjourney) or spawn image-gen task

---

### Phase 2: Room Layout & Design

**Goal:** Design consistent room grid for the detailed view

#### 2.1 Grid System
```
- Canvas: 1200 × 800 px (responsive)
- Room tiles: 300 × 200 px (isometric diamond)
- Character scale: 40px height
- Ratio: Room fits 3-4 characters comfortably
```

#### 2.2 Room Types

| Room | Owner | Assets Needed | Status |
|------|-------|---------------|--------|
| Nefario's Lab | nefario | ✅ Have background | Need furniture |
| Echo's Studio | echo | ✅ Have background | Need equipment |
| Mel's Station | mel | ✅ Have background | Need desk |
| Bob's Corner | bob | ✅ Have background | Need setup |
| Main Lounge | shared | ✅ Have seating | Add minions |
| Games Room | shared | ✅ Have games | Add players |
| Kitchen | shared | ✅ Have kitchen | Optional |
| Graveyard | zombie | ❌ Need new | Create spooky corner |

#### 2.3 Room Sizing Adjustment
Current room PNGs are ~1000-1500px. Need to:
- Resize to fit 300×200 tiles, OR
- Adjust canvas to fit larger rooms

**Effort:** 1-2h layout design + 1h asset prep
**Assigned:** Bob (CSS/layout) + Boss (asset decisions)

---

### Phase 3: Animation System

**Goal:** Smooth character movement and interactions

#### 3.1 Animation States
```typescript
type AnimationState = 
  | 'idle'           // Standing still, slight bob
  | 'walking'        // Moving between rooms
  | 'working'        // At desk/station
  | 'playing'        // In games area
  | 'sleeping'       // Zombie state
```

#### 3.2 Movement System
```typescript
// Agent moves from current room → target room
// Path: direct line with easing
// Speed: ~2 seconds per room transition
// On arrival: switch to room-appropriate animation
```

#### 3.3 Sprite Animation
- Use CSS sprite sheet animation
- 4 frames @ 150ms = 0.6s walk cycle
- Flip sprite horizontally for direction

**Effort:** 2-3h
**Assigned:** Bob

---

### Phase 4: Data Integration

**Goal:** Wire real-time agent data to visualization

#### 4.1 Data Sources
```typescript
// From /api/agents/registry
interface AgentDisplay {
  id: string
  name: string
  status: 'active' | 'idle' | 'zombie'
  currentTask?: string
  room: RoomKey          // Computed from status
  position: { x, y }     // Computed from room
  animation: AnimState   // Computed from status
}
```

#### 4.2 Room Assignment Logic
```typescript
function assignRoom(agent: Agent): RoomKey {
  if (agent.status === 'zombie') return 'graveyard'
  if (agent.status === 'active') return agent.workspace || 'active-room'
  return 'lounge'  // idle agents chill
}
```

#### 4.3 Real-time Updates
- SWR polling every 5s
- Animate transitions when room changes
- Show task tooltip on hover

**Effort:** 1-2h
**Assigned:** Bob (already partially done)

---

### Phase 5: Interactions & Polish

**Goal:** Make it interactive and fun

#### 5.1 Click Interactions
- Click agent → Open agent detail panel
- Click room → Highlight room, show occupants
- Hover agent → Show current task tooltip

#### 5.2 Visual Polish
- Room labels (floating)
- Status indicators (colored glow)
- Day/night cycle (optional, ambient)
- Particle effects (optional, working sparks)

#### 5.3 Sound (Optional)
- Ambient office sounds
- Click feedback
- Status change chimes

**Effort:** 2-3h
**Assigned:** Bob

---

## Implementation Order

```
Week 1:
├── Day 1-2: Phase 1 — Generate isometric characters (Boss + AI)
├── Day 3: Phase 2 — Room layout finalization (Bob)
└── Day 4-5: Phase 3 — Animation system (Bob)

Week 2:
├── Day 1: Phase 4 — Data integration (Bob)
├── Day 2-3: Phase 5 — Interactions (Bob)
└── Day 4-5: Testing + polish
```

---

## Quick Start (Today)

### Step 1: Generate Test Character
Use Midjourney or DALL-E to create one isometric Kevin:
```
"Isometric pixel art style minion character, yellow pill body, 
blue overalls, chef hat, cute game sprite, 45 degree view, 
transparent background, 80x80 pixels, clean edges"
```

### Step 2: Test in Current View
Replace kevin.webp with isometric version, check 40px display

### Step 3: Iterate
Adjust prompt/style until consistent, then batch generate all agents

---

## Task Breakdown for MC

| # | Task | Agent | Effort | Deps |
|---|------|-------|--------|------|
| 1 | Generate isometric character sprites (all agents) | Boss/AI | 2-3h | - |
| 2 | Design room grid layout (1200×800 canvas) | Bob | 1h | - |
| 3 | Implement sprite sheet animation system | Bob | 2h | #1 |
| 4 | Wire agent status → room assignment | Bob | 1h | #2 |
| 5 | Add click interactions + tooltips | Bob | 2h | #3, #4 |
| 6 | Polish: labels, glow effects, transitions | Bob | 2h | #5 |

**Total: ~10-12h of work**

---

## Files to Create/Modify

```
dashboard/
├── public/assets/isometric/characters/minions/
│   ├── kevin_idle.webp      (new)
│   ├── kevin_walk.webp      (new, sprite sheet)
│   ├── bob_idle.webp        (new)
│   ├── bob_walk.webp        (exists, update)
│   └── ... (all agents)
├── src/components/dashboard/
│   ├── isometric-detailed.tsx  (major update)
│   ├── isometric-character.tsx (new, sprite animator)
│   └── isometric-room.tsx      (new, room component)
└── src/app/(dashboard)/lab/
    └── page.tsx                (minor update)
```

---

## Decision Points for Boss

1. **Character generation method?**
   - [ ] Midjourney (Boss does it)
   - [ ] DALL-E API (spawn task)
   - [ ] Commission pixel artist

2. **Room layout style?**
   - [ ] Grid (6 rooms in 2×3)
   - [ ] Freeform (scattered, more organic)
   - [ ] Single large office (one room, zones)

3. **Animation priority?**
   - [ ] Simple (idle + walk only)
   - [ ] Medium (+ working state)
   - [ ] Full (+ playing, sleeping, particles)

---

*Ready to start Phase 1 when you are!* 🍌
