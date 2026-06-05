# Remove Mock Data Design

Date: 2026-06-05
Project: `meituan-vibe-mvp`
Scope: Remove all mock/demo data from runtime behavior while preserving usable empty/error states.

## Goal

Eliminate all fake runtime data from the app. When real data is unavailable, the product must show explicit empty states or failure states instead of fabricated content.

This change is intentionally not a "make everything fully production-ready" effort. It removes deceptive demo content and keeps the current real integrations as the only data sources.

## Non-Goals

- Do not add new third-party providers.
- Do not add persistence for rooms.
- Do not redesign the product flow.
- Do not guarantee that every screen always has data.

## Current Problems

The app currently mixes real APIs with multiple mock/demo fallbacks:

- Frontend hardcoded members are shown when real room members are unavailable.
- Frontend hardcoded album photos and seeded preference values create fake trip history.
- HTML still contains example room codes and mock invite behavior.
- Backend POI endpoints fall back to local mock POI data.
- Backend route planning falls back to local mock route generation.
- Default location is a fixed Beijing coordinate returned as if it were user context.

This makes the UI look functional even when no real data exists, which is misleading.

## Recommended Approach

Use a strict "real data only" model with explicit state handling:

1. Real backend responses are the only source of POIs, recommendations, route plans, room members, and user context.
2. Remove local mock datasets from runtime code paths.
3. Convert all former mock displays into one of:
   - empty state
   - loading state
   - inline error state
4. Keep the app interactive where possible, but never fabricate content.

This is preferred over hard failure because it preserves product honesty without collapsing the whole interface when one integration is unavailable.

## Design

### 1. Frontend Data Rules

The frontend must stop seeding runtime state with fake records.

Changes:

- Remove hardcoded `members` fallback data from `app.js`.
- Remove hardcoded `initialAlbumPhotos`.
- Remove any pre-populated history/notebook content that depends on mock records.
- Reset default preference fields that currently imply known user tastes or a fixed destination.
- Replace static HTML example content that can surface before JS hydration with neutral placeholders or empty containers.

Expected behavior:

- If no room members exist yet, the member area shows "等待成员加入" or equivalent empty copy.
- If no photos exist, the album/notebook surfaces a "暂无内容" state.
- If no route exists yet, route containers remain empty and instruct the user what to do next.

### 2. Frontend Error and Empty State Handling

Any place that previously silently fell back to fake data must now become explicit.

Changes:

- Bootstrap failures for location/recommendations/route planning should not hydrate mock results.
- Room creation/join flows must not switch to fake local room mode.
- Invite link/image generation must use current real room code only; if no room exists, show an error.
- History and notebook rendering must tolerate empty arrays and null content without filling in demo records.

UI policy:

- Use toast for transient failures.
- Use inline empty text for persistent no-data sections.
- Avoid console-only fallback logic that leaves the screen looking populated.

### 3. Backend API Rules

Backend routes must stop returning fabricated POI or route data.

Changes:

- `GET /api/pois` should no longer return a local static POI list. It should return an empty list when no real aggregated source is available.
- `GET /api/pois/search` should call the real provider and return either actual results or an empty list. No local mock search fallback.
- `POST /api/pois/recommendations` should return actual provider results or an empty list. No local mock recommendation fallback.
- `POST /api/route/plan` should:
  - use user-selected real POIs when provided
  - otherwise use real provider search results
  - if no candidate POIs are available, return a structured error or empty-route response instead of a mock route

Decision:

The route endpoint should prefer a structured empty response over HTTP 500 for "no route candidates". This keeps the frontend logic simpler and distinguishes "no data" from "server failure".

### 4. Default Location Handling

The current `/api/location/default` endpoint returns a fixed mock location. That should no longer masquerade as user context.

Preferred behavior:

- Return a neutral object that clearly represents "location unknown", or
- return a 404/empty payload and let the frontend request manual user input

Recommendation:

Return a neutral response shape with null coordinates and a label such as "未设置位置". This preserves API compatibility while removing fake geolocation.

### 5. Room and Member Semantics

Room APIs are currently real but ephemeral. That is acceptable for this scope because the problem is mock data, not persistence.

Required changes:

- Keep in-memory room storage for now.
- Remove any frontend branch that pretends room actions succeeded locally when backend room APIs are unavailable.
- Member rendering must be driven exclusively by backend room snapshots or empty state.

### 6. Tests

Tests should be updated around the new contract:

- Former smoke tests must no longer assume seeded UI data exists.
- Add coverage for empty POI lists and missing route results.
- Add coverage for no-member and no-photo states if current tests touch those screens.
- Add route/API tests that verify mock fallback is gone.

## Affected Files

Likely touch points:

- `app.js`
- `index.html`
- `real-api.js`
- `mock-api.js` (delete or leave unused, depending on import/test references)
- `server/routes/location.js`
- `server/routes/pois.js`
- `server/routes/route.js`
- `server/data/pois.js` (delete if no longer needed)
- `tests/static-smoke.mjs`
- any route-planning tests that currently load `mock-api.js`

## Risks

### Risk 1: Empty screens expose weak UX

Removing mock data will reveal places where the UI assumes content exists.

Mitigation:

- Add explicit empty copy for members, album, route, and recommendations.

### Risk 2: Real-provider instability reduces apparent functionality

Without fallback data, provider outages will be visible.

Mitigation:

- Differentiate "no results" from "request failed".
- Keep errors readable and actionable.

### Risk 3: Tests are tightly coupled to demo content

Existing tests may assume prefilled content.

Mitigation:

- Rewrite them to assert state transitions and empty-state rendering instead of seeded records.

## Implementation Plan Shape

Implementation should proceed in this order:

1. Remove backend mock fallbacks and define empty-response contracts.
2. Remove frontend fake seeded data.
3. Add frontend empty/error-state rendering.
4. Remove obsolete mock-only files/references.
5. Update tests to the new behavior.

## Acceptance Criteria

- No runtime screen displays fabricated members, POIs, route plans, album photos, room codes, or links.
- No backend route returns local mock POI or route data.
- Failed or empty real requests produce explicit empty/error UI, not fake content.
- The app remains navigable without crashing when real data is absent.
- Tests are updated to reflect the no-mock contract.
