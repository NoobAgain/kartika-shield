# KARTIKA SHIELD 2.1.0 — Automatic Buzzer & Narrative Intake

## Implemented
- Automatic periodic collection of public Indonesian-language Bluesky posts using the official public AppView search endpoint.
- Public profile enrichment (account creation date, followers, following) for layered local analysis.
- New `GET /buzzer/data` API and `buzzer-data` SSE event.
- Automatic browser-side ingestion and narrative analysis in the Deteksi Buzzer tab; manual CSV paste/import remains available.
- Source-post links displayed for analyst verification.
- Account pseudonyms use a local HMAC salt; raw DIDs are not returned to the browser.
- Region codes are only attached when a region name is mentioned in the post text; this is not account geolocation.
- Local browser storage retains up to 500 compact records. Collector keeps a bounded in-memory buffer. No MySQL.
- Added official-source references and scope/limitations in `REFERENSI_DETEKSI_BUZZER.md`.

## Source scope
This release automates Bluesky keyword search only. It does not monitor every Bluesky post, every social platform, or all public discourse. Results depend on the search index, keywords, language filter, time window, and API availability.

## Safety and interpretation
Text similarity, timing, hashtags, account age, or follower counts are correlation indicators only. They do not establish coordination, inauthenticity, identity, motive, affiliation, or wrongdoing. Human review of original posts and independent corroboration are required. Political criticism, opinions, journalism, advocacy, and peaceful protest are not automatically threats.

## Verification performed
- JavaScript syntax checks: Collector and Buzzer module passed.
- Unit engine: 66/66 passed.
- News analysis and public news tests: passed.
- Mini TV tests: passed.
- New automatic buzzer integration test: passed using a local mock Bluesky API response; it verifies collection, public profile fields, pseudonymization, source URL, explicit-text region provenance, and API schema. This is not a live Bluesky availability test.
- Dashboard build: passed (dist/kartika-shield.html).
- Local HTTP smoke test: `/` and `/health` returned HTTP 200; `/buzzer/data` returned the expected JSON schema; hidden salt file was not served.

## Not verified
- Live Bluesky API connectivity from the user's computer/network.
- Real-world coverage or detection accuracy.
- Browser visual integration on the user's machine.
