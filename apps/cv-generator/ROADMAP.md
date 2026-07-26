# CV Generator — Remaining Roadmap

Ordered plan from the 2026-07-22 review. Done already: F1 (single schema source
of truth in `lib/cv/`), F3 (no translate-on-export; explicit translate button),
F5 (structured outputs + streaming chat), truncation warning, stable item ids,
shared path helpers, vitest suite, claim-evidence + coverage agents, F2
localStorage persistence, #1 rate limiting.

## Bilingual support — DONE (2026-07-25)
CV is stored per language: `cvByLang / metaByLang / feedbackByLang = { en, no }`.
Two independent header toggles: **Site** (uiLang, chrome only) and **CV**
(contentLang — viewed/edited/exported). Switching CV language is instant and
lossless. Translation is directional (`runTranslate(src, tgt)` in App.jsx):
translates one language INTO the other slot via `applyAiResult` (preserves the
target's hand-edits, surfaces conflicts as suggestions), never mutating the
source; cvType is synced across languages. Empty-language banner offers
"Translate from <other>". Export menus offer each language that has content
(per-language PDF/Word/Email; filenames get `_EN`/`_NO`). Draft bumped to v2
(both languages + both toggles) with automatic v1→v2 migration. Verified with a
live translation round-trip: EN untouched after translating to NO and back.
Deferred: bilingual share links (share still publishes the viewed language
only); staleness flag when source edited after translating.

## 1. Rate limiting on /api/cv/* — DONE (2026-07-25)
Postgres-backed fixed-window limiter (in-memory is useless on Vercel — isolated
instances). `lib/rateLimit.js` + migration `20260725000000_rate_limits.sql`
(already applied to the Supabase DB, which prod shares — no deploy step needed
beyond committing the file). Per-IP limits: AI routes 30/60s (shared bucket),
share POST 15/60s, share GET 120/60s. Fail-OPEN on DB error. Also fixed error
leaks: email + share now return generic messages, share got its missing
try/catch. Verified: 429 + Retry-After trips at the limit, fail-open confirmed.

## 2. Job tailoring / matching — DONE (2026-07-25)
Master CV + saved job "variants". A variant is a non-destructive presentation
over the master: hide items (by stable _id), reorder, and per-language text
overrides (rewritten summary + re-angled experience descriptions). Nothing is
deleted — excluded items live in the master and re-toggle instantly.
- Engine: `lib/cv/tailor.js` — `deriveTailoredCv(master, variant, lang)`,
  `emptyVariant`, `variantFromPlan` (validates every AI-referenced _id against
  the master, so a hallucinated id can't hide/mislabel anything). Pure + unit
  tested (`tailor.test.js`).
- Route: `/api/cv/tailor` (Sonnet, forced tool use, rate-limited). Realism
  guardrails in the system prompt: hide/reorder/re-emphasize only, never invent
  or alter facts, competence levels immutable, honest fit note with gaps.
  Verified live — it hid an irrelevant frontend role, rewrote the summary from
  real facts, and the fit note named genuine gaps rather than overselling.
- UI: header **Version** dropdown (Master / variants / "+ Tailor to a job…");
  `TailorPanel` modal (drop/paste role desc); `TailoringReview` left panel
  (include/exclude checkboxes + reasons, reorder ↑↓, skill-tag chips, summary +
  per-experience override textareas, fit note). Variant view LOCKS the main
  editor (pointer-events) — facts are edited in Master; a variant only curates.
- Persistence: draft v3 (`variants` + `activeVariantId`), migrates v2/v1.
- Trust guarantee is structural: every variant is a subset+reorder+emphasis of
  the SAME master facts, so two variants can't contradict each other.
Deferred: translating a variant's overrides into the other language (falls back
to master text there for now); manual drag-reorder (has ↑↓); per-variant agent
feedback (agents review the tailored view but feedback is stored per-language).

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
