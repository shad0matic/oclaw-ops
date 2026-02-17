# Minion Character Generation — Midjourney Prompts

**Purpose:** Generate isometric minion characters for MC dashboard Lab page
**Target size:** 40px height (resize after generation)
**Style:** Cute, isometric, game sprite, consistent across all agents

---

## Base Prompt Template

```
Isometric cute minion character, yellow pill-shaped body, 
[EYE_TYPE] goggles, blue overalls, [AGENT_TRAIT], 
game sprite style, 45 degree angle, clean edges, 
white background, Studio Ghibli cute aesthetic --v 6 --style raw
```

---

## Agent-Specific Prompts

### Kevin 🍌 (Lead Minion / Conductor)
```
Isometric cute minion character, yellow pill-shaped body, 
two-eye goggles, blue overalls, conductor costume with tails, 
holding conductor wand/baton, confident leader pose,
game sprite style, 45 degree angle, clean edges, 
white background, Studio Ghibli cute aesthetic --v 6 --style raw
```

### Bob 💻 (Coder)
```
Isometric cute minion character, yellow pill-shaped body, 
two-eye goggles, blue overalls, wearing headphones, 
coding vibe, nerdy expression, maybe holding laptop,
game sprite style, 45 degree angle, clean edges, 
white background, Studio Ghibli cute aesthetic --v 6 --style raw
```

### Nefario 🧪 (Scientist)
```
Isometric cute minion character, yellow pill-shaped body, 
two-eye goggles, blue overalls, white lab coat, 
mad scientist vibe, holding test tube or beaker,
game sprite style, 45 degree angle, clean edges, 
white background, Studio Ghibli cute aesthetic --v 6 --style raw
```

### Echo 🎙️ (Audio/Transcription)
```
Isometric cute minion character, yellow pill-shaped body, 
two-eye goggles, blue overalls, holding microphone, 
audio waves around head, podcaster vibe,
game sprite style, 45 degree angle, clean edges, 
white background, Studio Ghibli cute aesthetic --v 6 --style raw
```

### Mel 🚔 (Security/Watchdog)
```
Isometric cute minion character, yellow pill-shaped body, 
two-eye goggles, blue overalls, police cap, 
badge on chest, vigilant expression, security guard pose,
game sprite style, 45 degree angle, clean edges, 
white background, Studio Ghibli cute aesthetic --v 6 --style raw
```

### Stuart 🎸 (One-eye, Musical)
```
Isometric cute minion character, yellow pill-shaped body, 
ONE single eye goggle, blue overalls, 
holding small ukulele or guitar, musical vibe,
game sprite style, 45 degree angle, clean edges, 
white background, Studio Ghibli cute aesthetic --v 6 --style raw
```

### Dave 🤪 (Chaotic/Goofy)
```
Isometric cute minion character, yellow pill-shaped body, 
two-eye goggles, blue overalls, messy spiky hair, 
goofy excited expression, chaotic energy,
game sprite style, 45 degree angle, clean edges, 
white background, Studio Ghibli cute aesthetic --v 6 --style raw
```

### Phil 🧢 (Casual)
```
Isometric cute minion character, yellow pill-shaped body, 
two-eye goggles, blue overalls, baseball cap backwards, 
casual relaxed pose, friendly expression,
game sprite style, 45 degree angle, clean edges, 
white background, Studio Ghibli cute aesthetic --v 6 --style raw
```

### Smaug 🐉 (Dragon/Bookmarks)
```
Isometric cute minion character, yellow pill-shaped body, 
two-eye goggles, blue overalls, tiny dragon wings on back, 
maybe small scales pattern, treasure hoarder vibe,
game sprite style, 45 degree angle, clean edges, 
white background, Studio Ghibli cute aesthetic --v 6 --style raw
```

### Oracle 🔮 (Wisdom/Life Coach)
```
Isometric cute minion character, yellow pill-shaped body, 
two-eye goggles, blue overalls, mystical hood or cape, 
holding crystal ball, wise zen expression,
game sprite style, 45 degree angle, clean edges, 
white background, Studio Ghibli cute aesthetic --v 6 --style raw
```

### XReader 📰 (Deprecated, but just in case)
```
Isometric cute minion character, yellow pill-shaped body, 
two-eye goggles, blue overalls, holding newspaper or tablet, 
reader/researcher vibe, glasses over goggles,
game sprite style, 45 degree angle, clean edges, 
white background, Studio Ghibli cute aesthetic --v 6 --style raw
```

---

## Variation Prompts (Walking/States)

### Walking Pose (for sprite sheets)
Add to any agent prompt:
```
, walking pose, one foot forward, mid-stride
```

### Working Pose
Add to any agent prompt:
```
, sitting at desk, focused working, typing pose
```

### Idle/Relaxed Pose
Add to any agent prompt:
```
, standing relaxed, hands at sides, neutral happy expression
```

---

## Post-Generation Workflow

1. **Generate** 4 variations per agent (`--v 6`)
2. **Select** best one, upscale if needed
3. **Remove background** (Midjourney's white BG or use remove.bg)
4. **Resize** to 80×80px source (for 40px display with 2x clarity)
5. **Export** as WebP with transparency
6. **Save** to `dashboard/public/assets/isometric/characters/minions/[agent]_idle.webp`

---

## File Naming Convention

```
assets/isometric/characters/minions/
├── kevin_idle.webp
├── kevin_walk.webp      (sprite sheet, 4 frames)
├── kevin_work.webp
├── bob_idle.webp
├── bob_walk.webp
└── ... etc
```

---

## Tips

- **Consistency:** Once you get a style you like, use `--sref [image_url]` to maintain it
- **Variations:** Use `V1-V4` buttons to get variations of good outputs
- **Upscale:** Use `U1-U4` then "Upscale (Subtle)" for clean edges
- **Batch:** Generate all idle poses first, then walking, to maintain style

---

*Last updated: 17/02/2026*
