---
title: Switch component shows same color for both states
category: ui-bugs
tags:
  - shadcn-ui
  - css-variables
  - tailwind
  - switch-component
component: components/ui/switch.tsx
severity: medium
date_solved: 2026-01-06
---

# Problem

The Switch component in the admin locations table showed white/light gray for both checked and unchecked states, making it impossible to tell if a location was visible or hidden.

## Symptoms

- All toggle switches appeared the same color (white/light gray)
- Could not visually distinguish between visible and hidden locations
- Toggle still functioned correctly (API calls worked), just no visual feedback

# Root Cause

The shadcn/ui Switch component uses CSS variables for colors:

```typescript
// Original (broken)
"data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
```

These map to:
- `bg-primary` → `hsl(var(--primary))`
- `bg-input` → `hsl(var(--input))`

The CSS variables `--primary` and `--input` were either:
1. Not defined in the project's CSS
2. Both set to similar light colors

Without proper variable definitions, Tailwind falls back to default/missing values, resulting in both states appearing the same.

# Solution

Replace CSS variable references with explicit Tailwind colors:

```typescript
// Fixed
"data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-200"
```

**Full diff:**
```diff
- "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
+ "data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-200"
```

# Prevention

## When using shadcn/ui components

1. **Verify CSS variables are defined** - Check `globals.css` or your theme file for all required variables (`--primary`, `--input`, `--ring`, etc.)

2. **Test component states visually** - Toggle between states during development to verify visual feedback

3. **Consider explicit colors for critical UI** - For admin/dashboard components where clarity is essential, use explicit Tailwind colors instead of CSS variables

## shadcn/ui CSS variables checklist

If using the default shadcn theme, ensure these are defined:

```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --input: 214.3 31.8% 91.4%;
  /* ... other variables */
}
```

# Related

- shadcn/ui Switch docs: https://ui.shadcn.com/docs/components/switch
- Admin locations page: `app/admin/locations/page.tsx`
- Tailwind CSS variables: https://tailwindcss.com/docs/customizing-colors#using-css-variables
