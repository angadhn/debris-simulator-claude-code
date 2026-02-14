# Research Checkpoint

**Phase:** awaiting_confirmation
**Iteration:** 2
**Updated:** 2026-02-14T14:10:00Z

## Reasoning Notes

The user reported that the Cesium token isn't working and the Earth doesn't render. This is a code debugging task, not a research task. The research orchestrator framework doesn't really apply here — this is a straightforward software engineering issue.

**Root cause analysis:**

The problem is in `src/components/cesium/OrbitalViewer.tsx` at line 196. When `new Cesium.Viewer(container, options)` is called without specifying an `imageryProvider` or `baseLayerPicker`, CesiumJS 1.136 defaults to loading Cesium Ion's Bing Maps imagery. This requires a valid `Cesium.Ion.defaultAccessToken` to be set.

The token is read from `import.meta.env.VITE_CESIUM_ION_TOKEN` (line 180). If this env var isn't set in the deployment environment, the token is never set, and the default imagery provider fails to authenticate with Ion servers. Result: the globe renders but has no imagery tiles — appearing as a blank/dark sphere, or potentially failing to render entirely.

**Evidence:**
1. `.env.example` only has Space-Track credentials, NOT `VITE_CESIUM_ION_TOKEN`
2. `DEPLOYMENT.md` doesn't mention setting `VITE_CESIUM_ION_TOKEN` in Vercel
3. `vercel.json` has no env var configuration for the token
4. The code at line 183 explicitly allows running without a token (graceful skip), but doesn't provide an alternative imagery provider
5. CesiumJS 1.136 requires Ion auth for default imagery

**Two fix options:**
1. **Set the token in production** — requires the user to add `VITE_CESIUM_ION_TOKEN` to their Vercel/GH Pages environment variables. This is the "correct" fix since Cesium Ion provides high-quality Bing Maps imagery.
2. **Add a fallback imagery provider** — when no token is available, use a free provider like OpenStreetMap tiles (`Cesium.OpenStreetMapImageryProvider`) or a basic Earth texture. This makes the app work without any token but with lower-quality imagery.

The best approach is probably both: try Ion imagery with token, fall back to OSM when no token is available.

## Knowledge State
### Theme: Cesium Token Issue
- **Understanding:** Complete diagnosis — missing Ion token causes default imagery provider to fail
- **Confidence:** high
- **Key sources:** OrbitalViewer.tsx:174-255, .env.example, DEPLOYMENT.md, vite.config.ts
- **Contradictions:** CLAUDE.md says token is "optional but recommended" — it's actually required for Earth imagery to render

## Phase History
1. **repo_scan** (iteration 0) — Full repo scan completed. CLAUDE.md drafted.
2. **awaiting_confirmation** (iteration 1-2) — User reported Cesium token bug. Diagnosed root cause.

## Completed Work
- Diagnosed Cesium token issue
- Identified root cause: no fallback imagery when Ion token is missing
- Files created: [CLAUDE.md, docs/research/checkpoint.md]

## Open Questions
- Where is the site actually deployed? (GitHub Pages redirect to angadhn.com returns 404, Vercel URL unknown)
- Does the user want a code fix or just a diagnosis?

## Gaps Identified
- **Missing fallback imagery provider** (critical) — action: add OSM fallback in OrbitalViewer.tsx
- **Missing VITE_CESIUM_ION_TOKEN in .env.example** (moderate) — action: add to .env.example
- **Missing token setup in DEPLOYMENT.md** (minor) — action: document in deployment guide

## Next Steps
1. Report diagnosis to user
2. If user wants a fix, implement fallback imagery provider

## Budget
- Used: 2 / Max: 30
