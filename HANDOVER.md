# Phase 2 Handover — MYB Pay Calculator → Roster App Integration

This document is the step-by-step guide for merging the standalone pay calculator into the main
MYB Roster App repo. Complete each step in order. Test after every step before moving on.

---

## Before you start

**Prerequisites:**
- The pay calculator at version ≥ v1.21 and working correctly as a standalone app
- The roster app repo checked out locally
- Both apps tested on a real Android device at 375px width

**Resolved decisions (previously open questions):**
- Period selector logic lives in `paycalc.js` — it calls `getPaydaysAndCutoffs()` from `roster-data.js`
- The calculator keeps its own `cea_p*` localStorage namespace, separate from the roster app
- Grade-specific `londonAllow` stays on `CONFIG.TAX_YEARS` entries (not on `GRADES`)
- Grade selector, once activated, sets a default rate from `GRADES[grade]` but lets staff override it

---

## Step 1 — Copy files into the roster app

Copy these files from `payslip-app/` into the root of the roster app repo:

```
payslip-app/index.html          → roster-app/paycalc.html
payslip-app/pay-service-worker.js → roster-app/pay-service-worker.js   (no rename needed)
payslip-app/pay-manifest.json   → roster-app/pay-manifest.json         (no rename needed)
payslip-app/icon-*.png          → roster-app/  (all six icon files)
```

Do **not** copy `CLAUDE.md` or `HANDOVER.md` — those stay in `payslip-app/` for reference.

---

## Step 2 — Split `paycalc.html` into HTML + JS

The current `index.html` is a single file with HTML, CSS, and JS all inline. After the copy,
split `paycalc.html` as follows.

### 2a — Extract all JavaScript

Cut everything inside the `<script>` tag (from `const CONFIG` to the final closing brace of the
`init()` call) and paste it into a new file: `roster-app/paycalc.js`.

Leave `paycalc.html` with an empty `<script>` replaced by:
```html
<script src="./paycalc.js?v=CURRENT_VERSION" defer></script>
```

The `?v=` cache-buster must match `APP_VERSION` — update it every time `paycalc.js` changes.

### 2b — Replace the inline `<style>` block

The `<style>` block in `paycalc.html` has two kinds of CSS:

**Move to `shared.css`** — CSS variables only (the entire `:root { }` block).
The roster app's `shared.css` already has some of these variables. Before copying, check for
conflicts — the pay calculator defines additional variables not in `shared.css`:

| Variable | Status |
|---|---|
| `--primary-blue`, `--accent-gold`, standard brand colours | Already in `shared.css` — skip |
| `--rdw`, `--rdw-light`, `--rdw-text`, `--ot`, `--ot-light` | Likely already there — check |
| `--status-ok`, `--status-update`, `--update-btn*` | May be new — add if missing |
| `--boxing-day-bg`, `--boxing-day-text`, `--notice-text` | Pay-calc specific — add to `shared.css` |

**Keep in `paycalc.html`** — all component styles below the `:root` block. These are specific to
the pay calculator UI and should not pollute `shared.css`.

Then replace the `<style>` block in `paycalc.html` with:
```html
<link rel="stylesheet" href="./shared.css?v=ROSTER_APP_VERSION">
<style>
  /* paycalc-specific styles only — no :root variables here */
  ...
</style>
```

---

## Step 3 — Update the `<head>` section of `paycalc.html`

### 3a — Remove the standalone PWA meta tags

These tags are needed for the standalone app but must be removed or updated for the merged version:

```html
<!-- REMOVE these — the roster app's index.html already handles these: -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="MYB Pay">

<!-- REMOVE — already in roster app's manifest.json: -->
<link rel="manifest" href="./pay-manifest.json">

<!-- REMOVE — service worker registration moves to a shared init block: -->
<script> /* SW registration */ </script>
```

### 3b — Update the `<title>`

```html
<title>Pay Calculator — MYB Roster</title>
```

### 3c — Keep these tags

```html
<meta charset="UTF-8">
<meta name="viewport" ...>   <!-- keep as-is -->
<meta name="theme-color" content="#001e3c">
<meta name="color-scheme" content="light">
```

---

## Step 4 — Add navigation back to the roster app

Add a "Back to roster" link at the top of the page, matching the roster app's nav pattern.

In `paycalc.html`, immediately after the opening `<body>` and before `.app-header`, add:

```html
<nav class="sub-nav" aria-label="Page navigation">
  <a href="./index.html" class="back-link">← Roster</a>
</nav>
```

Style it to match the existing nav style in the roster app's `shared.css`. If no `.back-link`
style exists yet, add it to `shared.css`:

```css
.back-link {
  display: inline-flex; align-items: center;
  color: var(--accent-gold); font-size: var(--type-body);
  text-decoration: none; padding: 8px 0;
}
.back-link:hover { text-decoration: underline; }
```

---

## Step 5 — Add a "Pay Calculator" link in the roster app nav

In the roster app's `index.html`, add a nav link to `paycalc.html`. Exact placement depends on
the roster app's current nav structure — add it alongside existing nav items (e.g. Admin, Settings).

```html
<a href="./paycalc.html" class="nav-link">Pay Calculator</a>
```

---

## Step 6 — Wire up authentication

The pay calculator currently has no login gate. In Phase 2, add a redirect at the top of
`paycalc.js` (before anything else runs):

```javascript
const currentUser = localStorage.getItem('rosterUser');
if (!currentUser) {
  window.location.href = './admin.html';
}
```

This uses the roster app's existing session — no new login logic needed.
Do **not** duplicate the login function from `admin-app.js`.

---

## Step 7 — Update the service worker

### 7a — Add paycalc files to `service-worker.js` (main roster SW)

In the roster app's `service-worker.js`, add to the network-first URLs list:
```javascript
'./paycalc.html',
'./paycalc.js',
```

And add to the assets-to-cache list:
```javascript
'./paycalc.html',
'./paycalc.js',
```

### 7b — Keep `pay-service-worker.js` running alongside the main SW

`pay-service-worker.js` handles the pay calculator's update-banner flow (the "Refresh now"
prompt). It stays separate from the main SW. No changes needed to `pay-service-worker.js` itself.

The SW registration script (currently inline in `index.html`) moves to `paycalc.html`:
```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./pay-service-worker.js')
      .catch(err => console.error('Pay SW registration failed:', err));
  }
</script>
```

---

## Step 8 — Update `firebase.json`

Add a `Cache-Control` header for `pay-service-worker.js` so the browser always fetches a fresh
copy (otherwise it caches the SW itself and updates are missed):

```json
{
  "hosting": {
    "headers": [
      {
        "source": "/pay-service-worker.js",
        "headers": [
          { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }
        ]
      }
    ]
  }
}
```

Merge this with the existing `headers` array — don't replace it.

---

## Step 9 — Update `manifest.json`

The roster app's `manifest.json` (or `manifest.webmanifest`) should get a shortcut entry for
the pay calculator, so users can launch it directly from their home screen shortcut:

```json
{
  "shortcuts": [
    {
      "name": "Pay Calculator",
      "short_name": "Pay Calc",
      "description": "Calculate your estimated pay",
      "url": "./paycalc.html",
      "icons": [{ "src": "./icon-192.png", "sizes": "192x192" }]
    }
  ]
}
```

The standalone `pay-manifest.json` is no longer needed after this — it can be removed once the
shortcut is confirmed working.

---

## Step 10 — Version string management

After merge, every behaviour-changing commit needs these version string updates:

| File | Location | What to update |
|---|---|---|
| `paycalc.html` | `<meta name="app-version" content="...">` (add this if not present) | APP_VERSION |
| `paycalc.js` | `CONFIG.APP_VERSION` at top | APP_VERSION |
| `pay-service-worker.js` | `APP_VERSION` at top | APP_VERSION (triggers browser SW update) |
| `paycalc.html` | `<script src="./paycalc.js?v=...">` | cache-buster version |
| `paycalc.html` | `<link rel="stylesheet" href="./shared.css?v=...">` | roster app version |
| Roster app `service-worker.js` | `CACHE_NAME` / version constant | roster app version |

The PostToolUse hook in the `payslip-app/` repo auto-increments `APP_VERSION` and syncs
`pay-service-worker.js`. This hook does **not** carry over to the roster app repo — you'll need
to manage version bumps manually, or create an equivalent hook in the roster app.

---

## Step 11 — Smoke test checklist

After completing all steps above, test the following before declaring the merge done:

**Navigation:**
- [ ] "Pay Calculator" link in the roster nav opens `paycalc.html`
- [ ] "← Roster" back link returns to `index.html`
- [ ] Not logged in → redirected to `admin.html`
- [ ] Logged in → pay calculator loads without errors

**Core functionality:**
- [ ] Period selector shows correct periods and paydays
- [ ] Entering hours calculates gross pay correctly
- [ ] Settings save and load correctly
- [ ] Back-pay calculator produces correct figures
- [ ] HPP card shows correct estimate

**PWA and offline:**
- [ ] App installs to home screen correctly
- [ ] App works offline after first load
- [ ] "Refresh now" update banner appears after a new version is deployed
- [ ] Tapping "Refresh now" reloads to the new version

**Compatibility:**
- [ ] Works correctly at 375px width (Android)
- [ ] Works correctly at 390px width (iPhone 14)
- [ ] Works correctly in Safari (iOS)
- [ ] Works correctly in Chrome (Android)
- [ ] Print layout renders cleanly

---

## What stays unchanged

These files are **not modified** during the Phase 2 merge:

- `roster-data.js` — the pay calculator imports from it, never writes to it
- `firebase-client.js` — Phase 3 only; not touched in Phase 2
- `index.html` (roster app's main page) — only add the nav link (Step 5)
- `admin.html` / `admin-app.js` — only add the nav link if desired

---

## Phase 3 — what comes after (do not build now)

Once Phase 2 is stable, Phase 3 can auto-read a staff member's shifts from Firestore rather than
requiring manual entry. See the Firestore section in `CLAUDE.md` for the data patterns.

Phase 3 prerequisites:
- Staff must be logged in (handled by Phase 2 auth)
- `firebase-client.js` must be imported in `paycalc.js`
- `getBaseShift(member, date)` from `roster-data.js` provides the base schedule
- Firestore `overrides` collection provides actuals
