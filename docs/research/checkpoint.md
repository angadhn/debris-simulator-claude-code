# Research Checkpoint

**Phase:** awaiting_confirmation
**Iteration:** 3
**Updated:** 2026-02-14T14:20:00Z

## Reasoning Notes

The user asks three questions: (1) Does the Cesium Ion token expire? (2) Isn't it already set? (3) Does it need refreshing each time?

**Answers from code analysis:**

1. **Does the token expire?** Cesium Ion access tokens do NOT expire by default. When you create a token on ion.cesium.com, it's a permanent API key unless you explicitly revoke it or set an expiration date. So if you had a working token before, it should still work.

2. **Isn't it already set?** Based on the codebase evidence:
   - `.env.example` does NOT include `VITE_CESIUM_ION_TOKEN` (only Space-Track creds)
   - `DEPLOYMENT.md` does NOT mention setting this token in Vercel
   - `README.md` line 46 mentions `VITE_CESIUM_ION_TOKEN=your_token_here` — so it's documented as needed but may not actually be configured in the deployed environment
   - There is no `.env` file committed (correctly — it's gitignored)
   - The Vercel dashboard environment variables are unknown to us — the user would need to check there
   - The code at `OrbitalViewer.tsx:183` silently skips token setup if the env var is missing

3. **Does it need refreshing?** No. Once set, it's permanent. But since it's a build-time env var (`VITE_` prefix means Vite inlines it at build time), the token must be available during the Vercel build step. If it's only set as a runtime env var but not available during build, it won't be baked into the JS bundle.

**Most likely scenario:** The token was never set in the Vercel deployment environment variables, or it's set as a server-side env var but not prefixed with `VITE_` so Vite doesn't inline it during the build.

**Recommended action:** I should offer to add a code-level fallback so the app works even without a token, AND tell the user to check their Vercel env vars. This is a "blocked on user info" situation — I need to know if they want a code fix.

## Knowledge State
### Theme: Cesium Token Issue
- **Understanding:** Complete — token doesn't expire, likely never configured in deployment
- **Confidence:** high
- **Key sources:** OrbitalViewer.tsx:174-255, .env.example, DEPLOYMENT.md, README.md:46, vite.config.ts
- **Contradictions:** README.md says to set the token but .env.example doesn't include it

## Phase History
1. **repo_scan** (iteration 0) — Full repo scan completed. CLAUDE.md drafted.
2. **awaiting_confirmation** (iteration 1-2) — User reported Cesium token bug. Diagnosed root cause.
3. **awaiting_confirmation** (iteration 3) — Answered user's token expiry questions. Waiting for direction.

## Completed Work
- Diagnosed Cesium token issue
- Identified root cause: no fallback imagery when Ion token is missing
- Answered token expiry/configuration questions
- Files created: [CLAUDE.md, docs/research/checkpoint.md]

## Open Questions
- Is VITE_CESIUM_ION_TOKEN set in the Vercel dashboard? (User needs to check)
- Does the user want a code fix (fallback imagery provider) or just needs to set the env var?

## Gaps Identified
- **Missing fallback imagery provider** (critical) — action: add OSM fallback in OrbitalViewer.tsx
- **Missing VITE_CESIUM_ION_TOKEN in .env.example** (moderate) — action: add to .env.example
- **Missing token setup in DEPLOYMENT.md** (minor) — action: document in deployment guide

## Next Steps
1. Wait for user to check Vercel env vars / confirm desired fix approach
2. If user wants code fix: implement fallback imagery provider in OrbitalViewer.tsx
3. Update .env.example and DEPLOYMENT.md to include token documentation

## Budget
- Used: 3 / Max: 30
