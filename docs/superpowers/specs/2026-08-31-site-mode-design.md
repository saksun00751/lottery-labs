# Site mode: lottery / games / both

## Problem

The site currently always shows both lottery and games features. Some
deployments need to run as lottery-only or games-only — with the other
vertical completely inaccessible, not just hidden from navigation. An
operator must be able to pick the mode at deploy time.

## Goals

- Three modes: `lottery`, `games`, `both`.
- Mode is set per-deployment via an environment variable (build-time),
  matching the existing `NEXT_PUBLIC_ENABLE_*` feature-flag pattern in
  `src/config/env.public.ts`. No admin UI, no backend API involved.
- When a vertical is disabled, its nav entries disappear AND its routes
  are unreachable — typing the URL directly must not work.
- `both` mode preserves current behavior as closely as possible, plus a
  new tabbed home page.

## Non-goals

- Runtime/admin-configurable mode (would need a backend endpoint that
  doesn't exist yet).
- Changing anything about `/spin` — it's a wallet feature gated by its
  own `NEXT_PUBLIC_ENABLE_DIAMOND` flag, unrelated to this mode.
- Changing `/deposit`, `/withdraw`, `/profile`, `/history`, `/promotion`,
  `/referral`, `/contact` — these stay available in every mode.

## Config

`src/config/env.public.ts`: add

```ts
siteMode: z.enum(['lottery', 'games', 'both']).default('both'),
```

sourced from `NEXT_PUBLIC_SITE_MODE`. Default `'both'` so existing
deployments that don't set the var keep today's behavior unchanged.

New file `src/config/site-mode.ts`:

```ts
import { publicEnv } from './env.public';

export const lotteryEnabled = publicEnv.siteMode !== 'games';
export const gamesEnabled = publicEnv.siteMode !== 'lottery';
```

Every other piece of the feature reads these two booleans instead of
comparing `publicEnv.siteMode` strings directly.

## Route classification

- **Lottery routes**: `/lottery`, `/slip`, `/results`
- **Games routes**: `/games` (and all nested `/games/[type]`,
  `/games/[type]/[id]`)
- **Shared routes** (always reachable): everything else under `(main)`

## Navigation

`src/config/navigation.ts`:
- `/lottery`, `/slip`, `/results` items get `enabled: lotteryEnabled`
- `/games` item gets `enabled: gamesEnabled`

These already flow through the existing `visibleNavSections` filter, so
`Sidebar.tsx` needs no changes.

`bottomNavItems` becomes mode-aware:
- `lottery` or `both` → unchanged: home, lottery, deposit, slip, profile
- `games` → home, games, deposit, history, profile

## Route guarding

The project has no `middleware.ts` — locale routing is handled entirely
in `src/app/[locale]/layout.tsx`/page components. Guarding is therefore
done at the layout level, which runs for both direct URL hits and
client-side `<Link>` navigation (it's a Server Component):

- New `src/app/[locale]/(main)/games/layout.tsx`: if `!gamesEnabled`,
  call `redirect('/')`.
- Move `lottery`, `slip`, `results` into a new route group
  `src/app/[locale]/(main)/(lottery)/...` (route groups don't affect the
  URL) and add one `layout.tsx` there: if `!lotteryEnabled`, call
  `redirect('/')`.

## Home page

Extract two content blocks out of the current `HomeView.tsx`:

- `LotteryHomeSection` — today's `LotteryGroups` + `TodayLottery` block,
  unchanged.
- `GamesHomeSection` — reuses the per-type category-section-slider
  markup from `GamesView.tsx`. `CategorySection` is extracted out of
  `GamesView.tsx` into a shared component so both places render
  identical section/slider markup for each game type.

Composition by mode:

| Mode | Home content below quick actions |
|---|---|
| `lottery` | `LotteryHomeSection` directly (today's behavior, no tabs) |
| `games` | `GamesHomeSection` directly (no tabs) |
| `both` | Two tabs, "หวย" (default active) and "เกม", switching between `LotteryHomeSection` and `GamesHomeSection` |

Tab selection is plain local component state — not persisted across
page loads/sessions.

**Quick actions**: add a `/games` entry (existing `Gamepad2` icon
already used elsewhere), shown whenever `gamesEnabled` is true (i.e. in
`games` and `both` modes). Existing `/lottery`, `/slip`, `/results`
entries keep their existing `enabled: true` and are simply absent from
the array's effect when `lotteryEnabled` is false — filtered the same
way the other conditional quick actions (`promotion`, `referral`)
already are.

## Testing

- Manual verification in all three modes (set the env var, restart dev
  server):
  - Nav only shows the allowed vertical's entries.
  - Direct URL to a disabled vertical's route redirects to `/`.
  - Home page shows the right content/tabs per mode.
- No automated test suite exists for routing/nav in this repo currently;
  rely on manual verification, consistent with how other recent
  features in this repo have shipped.
