# CV Generator — Remaining Roadmap

Ordered plan from the 2026-07-22 review. Done already: F1 (single schema source
of truth in `lib/cv/`), F3 (no translate-on-export; explicit translate button),
F5 (structured outputs + streaming chat), truncation warning, stable item ids,
shared path helpers, vitest suite, claim-evidence + coverage agents, F2
localStorage persistence.

## 1. Rate limiting on /api/cv/* — DONE (2026-07-25)
Postgres-backed fixed-window limiter (in-memory is useless on Vercel — isolated
instances). `lib/rateLimit.js` + migration `20260725000000_rate_limits.sql`
(already applied to the Supabase DB, which prod shares — no deploy step needed
beyond committing the file). Per-IP limits: AI routes 30/60s (shared bucket),
share POST 15/60s, share GET 120/60s. Fail-OPEN on DB error. Also fixed error
leaks: email + share now return generic messages, share got its missing
try/catch. Verified: 429 + Retry-After trips at the limit, fail-open confirmed.

## 2. Requirements-matching gap report (the killer feature)
Paste a job posting / tender requirements → extract requirements (reuse the
parse pattern) → match each against the competence matrix + experience
evidence → honest per-requirement verdict: met / partial / not met, with
evidence pointers and "don't claim more than X". This is the product's
mission made executable, and it needs nothing from the other items:
- New route `/api/cv/match` (forced tool use, findings-style schema)
- UI: paste box (raw-text panel already exists) + report panel; offer
  "add to competence matrix" per matched requirement
- The anti-overselling stance means the report must be comfortable
  outputting "not a match"

## 3. Azure AD auth (unblocks everything below)
The better-auth scaffold is done; register the app, set env vars, auth
activates via existing middleware. Verify /api/cv/* is covered.

## 4. Server-side persistence (after auth)
Saved CVs per user in Postgres. The localStorage draft format (versioned,
normalized via `normalizeCv`) is the migration source. Then the business
model: one master CV per consultant → tailored per-bid copies
(competences.projectLabel is already the hook for this).

## 5. Share-link hygiene (after auth)
Owner column on shared_cvs, expiry, revoke UI, view counter. GDPR: CVs are
personal data — retention policy + delete path. Enterprise clients will ask.

## 6. Quick wins (fit in anywhere)
- Prompt caching on the chat route (cache_control on the CV block in system)
- Telemetry: log agent-finding accept/dismiss + chat patch outcomes — tells
  you which agents earn their place and calibrates prompts
- Streaming indicator polish, error retry buttons

## 7. Cleanup sweep
- Dead components: ImportScreen, AgentsPanel, TipsPanel, components/form/*
  (verify unreferenced, then delete)
- Video: decide — wire storage (Supabase) or hide the panel; half-built UI
  undermines trust
- Bundle: lazy-load @react-pdf, docx, pdfjs-dist behind their actions
  (current main chunk ~2.7 MB)

## Known deferred issues
- Video profiles are not translated by the explicit translate button
  (client-only sections are never overwritten by AI results)
- Parse intentionally never overwrites the competence matrix
  (`keepSections: ['competences']` in App.jsx)
- `strict: true` is impossible on the full CV tool schema (API grammar-size
  limit) — normalizeCv() at the boundary is the guarantee instead
- react-pdf yoga race is worked around by serializing renders in
  `src/utils/renderPdf.js` — keep all PDF generation going through it

## Deploy reminder
`npm run build:cv-generator` from the repo root and commit
`public/cv-generator` together with source (MONOREPO.md convention).
