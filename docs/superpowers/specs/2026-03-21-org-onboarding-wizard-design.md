# Org Onboarding Wizard — Design Spec

## Overview

Redesign `app/signup/organization/page.tsx` from a single scrollable form into a clean 3-step wizard. The goal is a professional, brand-consistent application form that feels hand-crafted — not AI-generated. No decorative icons. Warm, grounded visual tone consistent with the existing EasyToGive design system.

---

## Design Decisions

### Structure: 3-step wizard
Single page replaced with three focused steps, each short enough to complete in under a minute. Step state lives in `OrgSignupInner` as `step: 1 | 2 | 3`.

**Step 1 — Your Organization**
Fields: org name, website (optional)

**Step 2 — Your Mission**
Fields: category selector (no icons), subcategory pills, EIN (shown conditionally based on `getEinConfig(category, subcategory)` — same logic as today, now displayed after category is selected on the same step), description textarea with "Fill with AI" plain-text link (no Sparkles icon)

**Step 3 — Contact & Connect**
Fields: contact name, email, GiveButter import (optional, no Download icon)

### Visual tone: Warm & Grounded
- Background: `#faf9f6` (existing token)
- Card: white with `border: 1.5px solid #e5e1d8`, `border-radius: 16px`, soft shadow
- Step indicators: numbered dots connected by a hairline — active dot filled `#1a7a4a`, inactive dots outlined `#ccc9c0`
- Headings: `font-display` (DM Serif Display), 22px, `#1a1a18`
- Body/labels: DM Sans, labels 12px semibold `#444`
- Inputs: `border: 1.5px solid #d8d4cc`, `border-radius: 8px`, height 42px, focus ring `#1a7a4a`
- Primary button: `#1a7a4a`, `border-radius: 8px`, height 42px, font-weight 600
- Back button: plain text link, no border, `color: #888`

### Icons: removed
All decorative icons are removed. `Loader2` is kept for loading spinners only.

| Removed | Replacement |
|---|---|
| `Building2` (logo) | Text "EasyToGive" styled with `font-display` in `#1a7a4a` |
| `Clock` (review notice) | Text only, no icon |
| `Download` (GiveButter section) | Section heading text only |
| `Users` (category card) | Card without icon |
| `Check` (selected state) | Green border + background on card, no check icon |
| `CheckCircle` (success screen) | Heading only, no icon circle |
| `AlertCircle` (error messages and GiveButter error inline) | Styled error text only |
| `CheckCircle` (GiveButter success inline) | Styled success text only, no icon |
| `Sparkles` (AI Fill) | Plain text button "Fill with AI" |

---

## Component Architecture

Single file: `app/signup/organization/page.tsx`. No new files needed.

**State changes:**
- Add `step: 1 | 2 | 3` (default: 1)
- Remove nothing — all existing state (`form`, `loading`, `error`, `einError`, `gbApiKey`, `gbImporting`, `gbError`, `gbSuccess`, `autofilling`, `autofillError`) is preserved

**Step navigation:**
- `handleContinue(nextStep)`: validates current step fields before advancing, sets `error` if invalid
- `handleBack()`: decrements `step`, clears `error`
- Step 1 validation: org name required; website URL format if provided
- Step 2 validation: category required; subcategory required when `subOptions.length > 1`; EIN format if provided and `einConfig.show`; EIN required if `einConfig.required`; description required
- Step 3 validation: contact name and email required; then calls existing `handleSubmit` logic

**Submission:**
- Submit button lives on Step 3 only
- On submit: runs Step 3 validation then the existing fetch to `/api/org/apply`
- Preview mode behavior unchanged

**Step indicator:**
```tsx
<div className="flex items-center">
  {[1, 2, 3].map((n, i) => (
    <React.Fragment key={n}>
      <div className={`step-dot ${step >= n ? 'active' : 'inactive'}`}>{n}</div>
      {i < 2 && <div className="step-line" />}
    </React.Fragment>
  ))}
</div>
```

---

## Step 1 Layout

```
[EasyToGive]             ← font-display green, top-left

Step dots: ● — ○ — ○

"Your organization"      ← font-display 22px
"Start with the basics."  ← 13px gray

[Organization name      ]
[Website (optional)     ]

"Applications are reviewed within 2–3 business days."  ← 11px gray, below fields

                    [Continue →]
```

---

## Step 2 Layout

```
Step dots: ● — ● — ○

"Your mission"
"What you do and who you serve."

[Category card: "Community" — no icon, selected state = green border + bg]
  [subcategory pills if subOptions.length > 1]

[EIN field — shown conditionally based on getEinConfig(category, subcategory)]
  Hint text below if einConfig.helper is set

"Brief description of your mission"    [Fill with AI]  [130/400]
[textarea 4 rows]

[← Back]                  [Continue →]
```

AI Fill button: plain `<button>` with `text-xs font-semibold` in `#1a7a4a`. Shows "Filling…" with `Loader2` spinner when `autofilling`.

---

## Step 3 Layout

```
Step dots: ● — ● — ●

"Contact & connect"
"Who we'll be in touch with."

[Your name (primary contact)]
[Email address              ]

── GiveButter (optional) ──
"Already on GiveButter? Paste your API key to auto-fill."
[API key input] [Import]

[← Back]        [Submit application]
```

Submit button: amber `#b45309` in preview mode, `#1a7a4a` otherwise — same as existing.

---

## Success Screen

Remove the icon circle entirely. Clean centered layout:

```
"Application submitted"   ← font-display 28px

"We received your application for [org name]."

"We'll review it and reach out within 2 business days. Once approved,
 we'll send an invite to [email]."

[Browse Organizations]
[Return to Home]
```

No `CheckCircle`. No `Clock`. No icon containers.

---

## Error Handling

Error messages: styled `<div>` with `background: #fef2f2`, `color: #dc2626`, `border-radius: 8px`, `padding: 10px 14px`, `font-size: 13px`. No `AlertCircle` icon.

EIN format errors: inline `<p>` below the input, same red color.

`errorRef.current.scrollIntoView` behavior preserved.

---

## Clarifications

- **GiveButter success state**: After a successful import on Step 3, stay on Step 3 — show the success message inline, no auto-advance. User submits manually.
- **Review notice**: Shown on Step 1 only (below the fields, before the Continue button). Not repeated on Steps 2 or 3.

---

## Preserved Behaviors

- `getEinConfig(category, subcategory)` logic unchanged
- `handleGbImport` logic unchanged; success/error state unchanged
- `handleAutofill` logic unchanged
- `autoSubcategory` single-option auto-select unchanged
- `isPreview` mode: amber submit button, shows `PreviewSuccessScreen` on success
- `AdminNotesPanel` and `PreviewBanner` usage unchanged
- Terms of Service / Privacy Policy footer on Step 3 (non-preview only)
- "Already listed? Sign in" link on Step 3 (non-preview only)
- Suspense wrapper in `OrgSignupPage` unchanged
- URL validation logic unchanged

---

## Out of Scope

- No backend changes
- No new API routes
- No database schema changes
- No changes to `PreviewSuccessScreen` layout (admin-facing, not donor-facing)
