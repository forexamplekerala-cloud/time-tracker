# Input Screen Design — Time Audit PWA (Light "Paper" Theme)

## Resolved decisions

| Decision | Answer |
|---|---|
| Target page | **Input/log screen** (core experience: "What actually happened today?" + Parse my day) |
| Theme | **Light "paper" theme** — journal/note feel. Dark mode deferred to post-Phase-1 |
| Design principle | **Monochrome chrome, meaningful color only**: UI chrome is ink-on-paper; color appears ONLY from the 5 locked categories. Category colors already fixed by `docs/visuals-spec.md` semantics |
| Typography | Geist Sans (UI), Geist Mono (durations, tabular numbers), 16px base / 1.6 line-height |
| Career constraint | No medical/ADHD *claims* in copy; ADHD-friendly is a UX quality, not positioning |

## Color tokens (implement as Tailwind/shadcn CSS variables later)

### Chrome (no hue)
- `bg: #FAF9F6` (warm paper), `surface: #FFFFFF`, `border: #E7E5E4`
- `text: #1C1917` (warm ink), `text-muted: #57534E`
- Primary button: `bg #1C1917`, `text #FAF9F6`
- Focus ring: `#2563EB`, 2px offset ring on all interactive elements

### Category ramp (light-tuned, AA-ish on white)
| Category | Fill | Soft bg | Text badge |
|---|---|---|---|
| Trading/Deep Work | `#16A34A` | `#DCFCE7` | `#166534` |
| Agency/Business | `#2563EB` | `#DBEAFE` | `#1D4ED8` |
| Life/Fuel (amber compromise — pure yellow fails contrast on light) | `#F59E0B` | `#FEF3C7` | `#B45309` |
| Distraction | `#DC2626` | `#FEE2E2` | `#B91C1C` |
| Unclear | `#A1A1AA` | `#F4F4F5` | `#52525B` |

## Screen spec (single column, `max-width: 480px`, phone-first, min padding 20px)

1. **Header**: muted stone date line, IST — "Friday, 4 September". No logo, no nav, no avatar. Right-aligned on the same line: tiny "LAST LOGGED" stamp (10px `#A8A29E` label + 12px mono `#78716C` time, 12h format) = today's latest `end_time` (fallback `start_time` → `created_at`); completely absent when nothing is logged today. Never a countdown/since-elapsed. Optional 1px `#E7E5E4` rule beneath closes the masthead.
2. **Prompt**: "What actually happened today?" — 18px, ink, sentence case. Only sentence on screen.
3. **Hero textarea**: `min-height 160px`, `16px/1.6`, auto-grow, white surface, `#E7E5E4` border, blue focus ring. Placeholder: a realistic rough example, e.g. "9 to 10 — 15 mins wasted, 30 mins study. 11 to 1 charts and backtesting…". Autofocus desktop only (mobile keyboard pop is jarring).
4. **Example chips** (tappable, INSERT text into textarea at cursor — never navigate away): "9–11 trading", "45 mins YouTube", "1:30 to 3 client work", "Last 1 hour mostly phone". Stone chips (`#F4F4F5` bg), ≥44px touch target, wrap to multiple rows as needed.
5. **Primary CTA**: `Parse my day` — full width, ink button, `disabled` + 50% opacity until textarea non-empty. **Single action on the page. No secondary buttons.**
6. **Navigation / Post-tap**: On tap -> Parsing state; after parse -> navigate to `/review`; after save -> route to dashboard.
## ADHD-friendly hard rules (this page)
- One job per screen; input box is the only hero element.
- No timers, counters, streaks, badges, progress rings, red dots — nothing that accumulates or nags.
- Transitions ≤ 150ms ease-out; respect `prefers-reduced-motion`; nothing animates while idle.
- Inline calm validation only (muted stone text); no modals, no toasts, no error red chrome.
- All interactive elements ≥44px; visible focus ring always.

## Implementation tasks (for the implementation agent)

1. Create `docs/design-input-screen.md` in the repo containing this spec verbatim (palette tables, layout spec, ADHD rules). Trim nothing semantic.
2. Add ONE line to `AGENTS.md` Doc Map: `- Before styling UI components -> read docs/design-input-screen.md`. Keep AGENTS.md <= 150 lines.
3. When `app/` is scaffolded (Next.js + Tailwind + shadcn/ui): map palette tokens to CSS custom properties in `app/globals.css` (both raw hex and `hsl()` channel form for shadcn theme vars), set Geist Sans + Geist Mono via `next/font`, and build the input page as a Server Component shell with a small client `LogInput` component (textarea state + chip insertion + submit navigation to future `/review`).
4. Do NOT fetch Gemini from this component — it will later POST to a server route (`/api/parse` placeholder is fine).
5. Out of scope: dark mode tokens, review screen design, dashboard styling, service worker work.

## Validation

1. Contrast check: `#57534E` on `#FAF9F6` and each category text-badge on its soft bg — target WCAG AA for body text.
2. Manual: on a phone viewport, the whole screen fits without scrolling; Parse button reachable one-handed.
3. Reduced motion: with OS reduced-motion on, no visible transitions.
4. Idle screen = zero motion, zero badges, zero red anywhere except category previews inside the textarea examples.
5. Cross-check against `docs/scope-guardrails.md`: nothing on screen resembles gamification or notifications.

## Open questions (non-blocking)
- App display name rendering: header shows date only for now; wordmark decision deferred.
- Dark mode: defer until Phase 1 validation metrics are met.

## Date policy (Phase 1)
- All Phase 1 logs are today-only, recorded against the server's IST date.
