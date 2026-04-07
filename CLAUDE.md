# Claude Code Instructions — MYB Payday Calculator

**Current version: v1.11**

---

## What this project is

The **Marylebone Pay Calculator** is a standalone Progressive Web App (PWA) for Chiltern Railways
Customer Experience Advisers (CEAs) at London Marylebone. Staff use it to enter their hours each
pay period and see estimated gross pay, deductions, and take-home pay — before their payslip arrives.

It is built to merge cleanly into the existing MYB Roster App (parent repo), matching its visual
design, coding conventions, and file structure exactly.

---

## Development phases

### Phase 1 — Manual calculator (current — this is where we are)

Staff enter their own hours each period. The app calculates gross pay, tax, NI, pension, and
estimated take-home pay. Standalone PWA with no link to the roster app or Firestore.

**Current file structure:**
```
payslip-app/
├── index.html          ← the entire app (HTML + CSS + JS in one file for now)
├── pay-service-worker.js ← PWA service worker
└── CLAUDE.md           ← this file
```

The single-file approach is intentional for Phase 1 — no build tools, no server. On merge
(Phase 2), this splits into `paycalc.html` + `paycalc.js`.

### Phase 2 — Merge into the roster app (planned)

The calculator moves into the main roster app repo alongside `index.html`, `admin.html`, etc.
At that point:
- `index.html` (this file) splits into `paycalc.html` (HTML + CSS only) + `paycalc.js` (all JS)
- Inline CSS is replaced by `<link rel="stylesheet" href="./shared.css?v=...">` 
- `roster-data.js` and `firebase-client.js` are imported rather than copied
- The grade selector gets wired to real contractual data for CES and Dispatch

**Target file structure after merge:**
```
roster-app/
├── index.html          ← main calendar view (unchanged)
├── admin.html          ← staff self-service + admin portal (unchanged)
├── app.js              ← JS for index.html
├── admin-app.js        ← JS for admin.html
├── roster-data.js      ← shared data + utility functions
├── firebase-client.js  ← Firebase init + Firestore helpers
├── shared.css          ← shared CSS variables + base styles
├── service-worker.js   ← main roster service worker (add paycalc files here)
├── pay-service-worker.js ← paycalc-specific service worker
├── manifest.json
├── paycalc.html        ← HTML shell + CSS link only (split from current index.html)
└── paycalc.js          ← all JS for paycalc (split from current index.html)
```

### Phase 3 — Auto-read shifts from Firestore (aspirational, do not build now)

Eventually the calculator may read a staff member's actual shifts from the roster rather than
requiring manual entry. See the Firestore section below for data patterns, for reference only.

---

## Architecture rules — never deviate

| Rule | Reason |
|------|--------|
| **Vanilla JS only** | No React, Vue, or any framework. No build step. Staff maintain this without a dev environment. |
| **No bundler** | External deps via CDN only. |
| **HTML+CSS in `.html`, all JS in `.js`** (after merge) | Linting, caching, readability. |
| **Import shared modules — never duplicate** | `roster-data.js` has the payday maths. Importing avoids drift. |
| **Offline-first** | Firestore is an enhancement. Never block rendering waiting for it. |
| **Mobile is primary** | All staff use this on Android phones. Test every change at 375px. |
| **No `alert()`** | Use `console.error()` for dev errors. No visible error text for recoverable failures. |
| **CSS variables for all colours** | Defined in `:root`. Never hardcode hex values. |
| **Semantic HTML** | `<nav>`, `<header>`, `<main>` — screen readers depend on these. |
| **`dvh`/`vh` order** | Always write `min-height: 100vh` first, then `min-height: 100dvh`. `dvh` must come last so modern browsers use it. |
| **All event handlers via `addEventListener`** | No inline `onclick`/`oninput` in HTML. Roster-app convention. |
| **`border-radius: 50px` for pill badges** | Never `50%` — it produces circles on short text. |

---

## Brand design system

### Colours — CSS variables in `:root`

Never write a hex value directly in a CSS rule. Use these variables only.

```css
/* Brand */
--primary-blue:      #001e3c   /* Dark navy — headers, primary buttons */
--primary-blue-dark: #00152a   /* Deeper navy — hover on primary buttons */
--accent-gold:       #f5c800   /* Gold — highlights, active states, badges */
--accent-gold-dark:  #e6bb00   /* Darker gold — hover on gold buttons */

/* Shift / pay type colours — match the roster calendar exactly */
--orange:            #ff9800   /* Saturday / early-shift accent */
--orange-light:      #fff3e0
--blue-sky:          #1565c0   /* Late shift / Sunday */
--blue-light:        #e3f2fd
--rdw:               #c2185b   /* RDW (rest day worked) — magenta */
--rdw-light:         #fce4ec
--rdw-text:          #880e4f
--ot:                #5c6bc0   /* Overtime */
--ot-light:          #ede7f6
--green:             #43a047   /* Training / early shift */
--green-light:       #e8f5e9
--al:                #00897b   /* Annual leave */
--al-light:          #e0f2f1

/* Neutral */
--text-dark:         #333      /* Primary body text */
--text-mid:          #555      /* Secondary text, hints */
--text-light:        #999      /* Placeholder, metadata */
--text-faint:        #aaa      /* Very subtle — italic footnotes */
--border-light:      #e8e8e8
--border-mid:        #cccccc
--bg-light:          #f8f8f8
--bg-faint:          #f5f5f5

/* Semantic */
--error-red:         #d32f2f
--success-text:      #1b5e20

/* Radius */
--radius-lg:         14px   /* outer containers, header card */
--radius-md:         12px   /* standard cards, inputs */
--radius-sm:         8px    /* buttons, pills */

/* Elevation */
--shadow-1: 0 1px 4px rgba(0,0,0,0.10)
--shadow-2: 0 2px 12px rgba(0,30,60,0.12)
--shadow-3: 0 8px 32px rgba(0,0,0,0.18)

/* Typography */
--type-micro:  10px
--type-small:  12px
--type-body:   14px
--type-medium: 16px
--type-large:  18px
--type-xl:     24px
```

Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif`

### Colour conventions

- `--accent-gold` is for backgrounds and badges only — never for large body text
- `--green` / `--green-light` is reserved for the peer training badge and success feedback
- Interactive controls use `--primary-blue` (navy) or gold backgrounds, not green

---

## Key constants and data structures

### CONFIG (top of JS block)

```javascript
const CONFIG = {
  APP_VERSION:    '1.11',       // bump by 0.01 on every behaviour-changing commit
  ANCHOR_DATE:    new Date(2026, 1, 13),  // P48 payday (fixed reference point)
  PERIOD_DAYS:    28,
  PERIODS_PER_YR: 13,
  GRADE:          'CEA',        // static for now; grade selector scaffold in place
  CONTRACTED_HRS: 140,          // hours per 28-day period (CEA)
  LONDON_ALLOW:   276.16,       // London Allowance per period (legacy constant — use TAX_YEARS entry)
  FIRST_OFFSET:   -11,          // P37 — first period of 2025/26 (≈11 Apr 2025)
  LAST_OFFSET:     14,          // P62 — last period of 2026/27 (≈11 Mar 2027)
  TAX_YEARS: [
    { label: '2025/26', first: -11, last:  1, hppPaidJan: 2027, londonAllow: 276.16, londonAllowPre: 267.08 },
    { label: '2026/27', first:   2, last: 14, hppPaidJan: 2028, londonAllow: 276.16 },
    // ⚠️ Each April: add next year's entry, extend LAST_OFFSET by 13
  ],
};
```

`first` / `last` are offsets from P48 (the anchor). `offset = periodNum - 48`.

### GRADES

```javascript
const GRADES = {
  cea: { label: 'CEA', rate: 20.74, contr: 140, pension: 154.77 },
  // ces:      { label: 'CES',      rate: 0, contr: 0, pension: 0 }, // add when confirmed
  // dispatch: { label: 'Dispatch', rate: 0, contr: 0, pension: 0 }, // add when confirmed
};
```

The grade selector in Settings already exists in the UI (CEA active; CES and Dispatch disabled with
"coming soon"). When CES/Dispatch rates are confirmed, add their entries here and enable the options.

### Storage keys (SK)

```javascript
const SK = {
  rate:     'cea_rate',
  code:     'cea_code',
  sl:       'cea_sl',
  pension:  'cea_pension',
  setup:    'cea_setup_done',
  ytdPay:   'cea_ytd_pay',
  ytdTax:   'cea_ytd_tax',
  hppActual:'cea_hpp_actual',
  grade:    'cea_grade',
};
```

Per-period data uses `cea_p{periodNum}` as the key (e.g. `cea_p50`).

### Per-period data schema

```javascript
{
  satH, satM,       // Saturday contracted hours + minutes
  bhH, bhM,         // Bank Holiday Rostered hours + minutes (1.25×)
  bhOtH, bhOtM,     // Bank Holiday Overtime hours + minutes (1.25×)
  otH, otM,         // Unrostered Overtime hours + minutes (1.25×)
  rdwH, rdwM,       // Rest Day Worked hours + minutes (1.25×)
  sunH, sunM,       // Sunday Working hours + minutes (1.5×)
  boxH, boxM,       // Boxing Day Working hours + minutes (3×)
  peer,             // Peer Training days (each adds 2hrs at base rate)
  slSkip,           // boolean — true if student loan was NOT deducted this period
  otherAdj,         // signed £ amount — for absence offsets, corrections, "Other" payslip lines
}
```

### Tax / NI / SL thresholds

All stored per tax year in `TAX_BY_YEAR`, `NI_BY_YEAR`, `SL_BY_YEAR`, `SCOTTISH_TAX_BY_YEAR`.
Always look up by tax year label — never use a single global object.

**⚠️ Each April:** add new entries to all four objects. Extend `LAST_OFFSET` by 13.
Review after each Autumn Budget and Spring Statement.

---

## Pay calculation rules (CEA — Marylebone)

Confirmed against real Chiltern payslips (12 periods reviewed, May 2025–Mar 2026).

| Payslip line | Multiplier | App input |
|---|---|---|
| Ord Basic Pay @1.0 | 1.0× | Derived: `CONTRACTED_HRS − satCapped − bhCapped` |
| Ord Basic Pay @1.25 | 1.25× | Saturday Hours input |
| Bank Holiday Rostered 1.25 | 1.25× | Bank Holiday Hours input |
| Bank Holiday Overtime 1.25 | 1.25× | Bank Holiday Overtime input |
| Overtime 1.25 | 1.25× | Overtime input |
| RDW 1.25 | 1.25× | Rest Day Working input |
| RDW Sun 1.5 | 1.5× | Sunday Working input |
| Bank Holiday Overtime 3.0 | 3.0× | Boxing Day Working input (26 Dec only) |
| London Allowance | flat £/period | Resolved from `CONFIG.TAX_YEARS[n].londonAllow` |
| Smart RPS CR Scheme | salary sacrifice | Pension field in Settings |
| Holiday Pay Premium (HPP) | 7.69% of variable | HPP card estimate (or actual from January payslip) |

**London Allowance history:**
- P8–P28 (May–Sep 2025): £267.08 (stored as `londonAllowPre` in 2025/26 tax year)
- P36 onwards (Nov 2025–): £276.16

### Gross pay formula

```
gross = gBasicNorm + gBasicSat + gBankHol + gBhOt + gOvertime + gRdw + gSunday + gBoxing + gPeer + LONDON + otherAdj
sacGross = max(0, gross − pension)   // salary sacrifice reduces taxable and NI-able pay
```

### Tax calculation

- Standard codes (`nL`, `KnL`, `0T`, `NT`, `BR`, `D0`, `D1`): England/Wales bands
- `W1`/`M1`/`X` suffix: non-cumulative (per-period only)
- `S` prefix: Scottish Holyrood bands (full 6-band calculation)
- Cumulative PAYE: when YTD Taxable Pay + YTD Tax Paid are provided, uses HMRC's cumulative method

### Holiday Pay Premium (HPP)

Formula confirmed by Chiltern payroll (Marie Firby):
```
HPP = (gross − basic) × 4/52   (= 7.69%)
```
Variable pay includes: OT, RDW, Sunday, Boxing Day, Saturday uplift, London Allowance.
Excludes: basic pay, peer training, expenses, bonuses.

HPP accumulates across the tax year. Chiltern pay it as a lump sum every January.

### Back-pay calculator

- "Back pay from" always pre-set to the April period (pay anniversary is 1 April)
- Calculation runs from "back pay from" period up to and including "paid in" period
- Covers rate difference on all hour types + London Allowance difference
- "Apply new rate" button pushes new rate into Settings and marks itself as applied

---

## Version bumping — rules (read every session)

`APP_VERSION` in `index.html` is the single source of truth.

- **Increment by `0.01` on every commit that changes behaviour** — no exceptions
- **Always tell Gareth the new version number** in your response
- A PostToolUse hook auto-increments and reminds you if you forget
- The hook also syncs `pay-service-worker.js` — the browser detects a new SW only when that file changes byte-for-byte

**After merge** the parent repo requires 13 version string updates per commit. `paycalc.html` and
`paycalc.js` will add two new rows to that table.

---

## Service worker

The app uses `pay-service-worker.js` (separate from the main roster app's `service-worker.js`).

Update behaviour: shows a "Refresh now" banner when a new version is waiting. The user taps when
ready. Never auto-reload silently — staff may be mid-entry.

**After merge, add to `firebase.json`:**
```json
"headers": [
  {
    "source": "/pay-service-worker.js",
    "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
  }
]
```

**After merge, add to `service-worker.js`:**
```javascript
// Network-first list:
'./paycalc.html',
'./paycalc.js',

// ASSETS_TO_CACHE:
'./paycalc.html',
'./paycalc.js',
```

---

## Grade selector — handover notes for Phase 2

The grade selector UI is in place in the Settings card. CEA is the only active option.
CES and Dispatch are shown disabled with "coming soon".

**To activate a new grade:**
1. Add its entry to the `GRADES` constant (rate, contr, pension)
2. Enable the `<option>` in the `gradeSelect` HTML (remove `disabled`)
3. Wire the grade change handler to update default rate/contracted hours from `GRADES[grade]`
4. Add grade-specific `londonAllow` to `CONFIG.TAX_YEARS` entries if different from CEA

The grade value is stored in `localStorage` under `SK.grade` (`cea_grade`).

---

## Tax year system — maintenance

```javascript
CONFIG.TAX_YEARS = [
  { label: '2025/26', first: -11, last:  1, hppPaidJan: 2027, londonAllow: 276.16, londonAllowPre: 267.08 },
  { label: '2026/27', first:   2, last: 14, hppPaidJan: 2028, londonAllow: 276.16 },
];
```

`first` and `last` are offsets from P48 (13 Feb 2026 payday — the fixed anchor).

**Each April, add:**
- New entry in `CONFIG.TAX_YEARS` with confirmed `londonAllow`
- Update `londonAllowPre` to last year's `londonAllow` (for back-pay calculator pre-fill)
- New entries in `TAX_BY_YEAR`, `NI_BY_YEAR`, `SL_BY_YEAR`, `SCOTTISH_TAX_BY_YEAR`
- Extend `LAST_OFFSET` by 13

---

## Accessibility

- All interactive elements keyboard-accessible
- `aria-live="polite"` on dynamically updated elements
- `role="status"` on feedback divs
- Never suppress focus rings with `outline: none` — use `:focus-visible`
- All text must meet WCAG AA (4.5:1 for body, 3:1 for large/bold)

---

## Print CSS

Any new element added must have print rules. At minimum:
```css
@media print {
  .card { box-shadow: none; border: 1px solid #ccc; break-inside: avoid; }
  .btn-primary { display: none; }
}
```
Inputs and steppers are styled as plain text in print (see existing `@media print` block).

---

## Firestore data — Phase 3 reference only (do not build now)

All shift data lives in the `overrides` Firestore collection. Base roster from `roster-data.js`.

To get a staff member's actual shift on any date:
1. Call `getBaseShift(member, date)` → scheduled shift from the rotating roster
2. Check Firestore `overrides` for `{ memberName, date }` → if found, its `value` overrides

Override document shape:
```
date        "YYYY-MM-DD"
memberName  must match teamMembers[n].name exactly (case + punctuation)
type        "spare_shift"|"overtime"|"rdw"|"swap"|"annual_leave"|"correction"|"sick"
value       "HH:MM-HH:MM"|"AL"|"RD"|"SICK"
note        string (always present; "" if none)
createdAt   Firestore server timestamp
```

Shift value meanings:
- `"RD"` / `"OFF"` — rest day, not worked
- `"SPARE"` — standby, not yet assigned
- `"RDW"` — rest day worked (overtime)
- `"AL"` — annual leave
- `"SICK"` — absence (covers sickness, family emergency, any personal reason; display as "Absence", never "Sick")
- `"HH:MM-HH:MM"` — worked shift

---

## Authentication — Phase 2 onwards

Phase 1 has no login. Phase 2 uses the roster app's existing localStorage session:
```javascript
const currentUser = localStorage.getItem('rosterUser'); // "G. Miller"
```

Do not duplicate the login function from `admin-app.js`. If needed, redirect to `admin.html`.

---

## Open questions for Phase 2

- Which file owns period selector logic after merge — `paycalc.js` calling `getPaydaysAndCutoffs()`, or a shared utility?
- Should the calculator share the roster app's existing `localStorage` namespace, or keep its own `cea_p*` keys?
- Grade-specific `londonAllow`: should it be a field on `GRADES[grade]` per tax year, or stay on `CONFIG.TAX_YEARS`?
- After grade selector is activated for CES/Dispatch: should the grade drive the default hourly rate automatically, or let staff override it?

---

## How this app was built — working with Gareth

Gareth built the roster app through extended collaboration with Claude. He has strong operational
knowledge of railway rostering and is actively learning software development. Every session is both
a development session and a teaching session.

- **Explain decisions** — not just what, but why, what the alternative was, and what it enables
- **Plain language first** — explain new concepts before showing implementation
- **Name the pattern** — if using a design pattern, name it and say why it fits
- **Flag trade-offs** — briefly note what the other option was and why this was chosen
- **Never assume prior knowledge** of cloud services, authentication patterns, or backend concepts

The goal is that Gareth understands the codebase, not just that the codebase works.
