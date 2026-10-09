# Document intelligence redesign

Status: implementation in progress. The local evidence model, separate identity/review states, additive storage, guarded metadata writes, and background migration are wired into the app. On-device OCR, a labeled evaluation corpus, confidence calibration, and measured Android library trials remain open; synthetic tests are not an accuracy benchmark.

## Objective

Recognize ordinary books without asking users to classify their whole library, while preventing unrelated catalog metadata from being applied to personal or other non-book documents. Reading must be available independently of analysis and network access.

## Findings in the current implementation

- `useDocumentReview.js` uses a narrow conjunction of embedded title, embedded author, filename agreement, and ISBN or page-count conditions. Missing embedded fields prevent normal books from passing.
- `importDocumentFile` in `useDeviceLibrarySync.js` uses embedded title/author during the first decision but does not retain them as evidence. A rejected book gets an empty author, and subsequent checks depend on that author. The recovery path therefore cannot recover information the initial decision discarded.
- Classification reduces content to a small text prefix. It does not preserve which page supplied an ISBN, whether the number belongs to this publication or a reference, or whether text extraction actually succeeded.
- Normalization removes non-Latin letters. English filename exclusions and page-count rules impose assumptions that do not generalize to other languages, short books, manuals, or scanned publications.
- `unclassified` immediately becomes a review item. Missing information, an unfinished analysis job, an extraction failure, an unknown identity, and a meaningful conflict are not separate states.
- Legacy migration alternately demotes PDFs and restores them from existing metadata or their old type. Existing metadata may itself be the mistaken result being investigated; it is not independent evidence.
- The background checker marks content checked even when there is no readable text, and uses a stored array position across an asynchronous write. It needs retry semantics and revision-safe persistence.
- There are multiple metadata match/merge paths. Exact title/author matching rejects legitimate variants, while catalog ranking also rewards cover/description availability, which does not prove identity.
- Personal-document keyword detection can confuse book subject matter with document purpose. An accounting textbook can contain invoice and account-number terminology.
- The current unit tests establish that rules behave as written. They do not measure recognition quality against a representative document collection.

## Separate decisions

Store these independently rather than extending the current `documentType` flag:

1. **Document kind:** book, non-book document, or unknown; with evidence, a decision source, and an engine version. The existing Personal document UI can map to the non-book lane, but the engine must not claim that every report or manual is private.
2. **Bibliographic identity:** unresolved, candidate, verified work, or verified edition. A book can be recognized without knowing its title or finding it online.
3. **Metadata permission:** local-only, verified-field application, or user-approved. Classification as a book alone does not authorize applying arbitrary catalog results.
4. **Analysis state:** queued, extracting, resolving, complete, retryable failure, or unsupported.
5. **Review state:** none, actionable conflict, deferred, or resolved. Unknown identity is not inherently an actionable conflict.

Each user choice has its own explicit override and revision. Manual undecided is a valid choice. Automation never replaces an override.

## Pipeline

### 1. Discover and make readable

Create or reuse one stable library record and make the source available for reading. Keep source locations separately from identity. Use inexpensive fingerprints for candidate deduplication and verify ambiguous matches with content hashes; do not block the first visible file on hashing the entire library.

Queue intelligence work separately from full reading-text extraction. A format switch changes visibility and schedules genuinely missing work, rather than clearing identity or classification.

### 2. Collect local evidence

Retain raw filename, path, embedded fields, extraction status, language/script, page count, outline, title-page candidates, copyright-page candidates, and identifiers with page/position provenance.

Start with a bounded sample: the first few pages, relevant outline targets, and selected later pages when needed. Expand the sample only when another page could resolve a specific question. Avoid treating an arbitrary HTML character prefix as a document sample.

When sampled pages have insufficient text, render selected pages and run on-device OCR. Record unreadable or unsupported text as an extraction limitation, never as proof that the file is a personal document. Cache OCR by file content and extractor version.

Keep extracted source facts separate from catalog facts and user edits. A title previously downloaded from a catalog cannot corroborate that same catalog's identity claim.

### 3. Infer document kind

Use a local evidence model that combines layout, publication structure, title/byline patterns, chapter continuity, copyright/imprint signals, form fields, transaction layouts, correspondence structure, and extraction quality. Filename and folder are weak supporting features.

Do not make an ISBN, a particular page count, or an exact filename mandatory. Missing evidence is different from contradictory evidence. Topic words alone must not classify a document.

Start with an interpretable feature-based model and a labeled corpus. Calibrate its decision policy on held-out documents. Compare a compact learned classifier against that baseline before selecting the production model; do not invent confidence percentages from arbitrary rule scores.

Use separate positive criteria for book and non-book decisions. Low evidence remains unknown. The engine should recognize, for example, an accounting textbook as a book and an invoice as a transaction document despite shared vocabulary.

### 4. Resolve the book's identity

Run catalog lookup only after sufficient local book evidence or an explicit user request. Search with extracted bibliographic fields or an identifier; do not send raw personal-document contents, paths, or account details to providers.

Retrieve several candidates rather than accepting the first search result. Verify candidates against the original local evidence: title/byline agreement, identifiers from the publication's own front matter, language, publisher, edition, publication date, and table-of-contents information when available. Model conflicting evidence and the gap between candidates.

Use Unicode-aware matching, name aliases, initials, subtitles, and edition qualifiers. Distinguish the work from the edition: matching a novel does not establish that a downloaded cover, ISBN, or publication year belongs to the user's edition.

Content comparison is useful only against content actually available from a legitimate source. Do not assume a metadata API provides the full book. An ISBN in a bibliography, a title mentioned in study notes, or an LLM's familiarity with a book is not sufficient proof of identity.

### 5. Optional semantic assistance

For difficult cases, an on-device semantic model can propose page roles, titles, authors, or document-purpose labels from the bounded sample. An optional cloud resolver requires a clear product privacy choice before implementation and must never receive personal files by default.

Treat model output as candidate evidence. Require supporting page spans, validate claimed identifiers, and reject unsupported claims. Document text is data, not executable instructions. A model cannot directly update classification overrides or catalog metadata.

This stage is an extension point, not a dependency that blocks offline recognition or library access. Evaluate its measurable benefit before adding download size, latency, or operating cost.

### 6. Apply verified metadata

Create one metadata application service used by imports, background repair, rating updates, series discovery, and manual fetches. No writer bypasses it.

Store each field's value, source, verification state, evidence references, and previous value. Apply only justified fields: work-level identity may support title/author while edition year, cover, and series order remain unresolved. Ratings stay attached to the correct provider identity.

User edits win. Retain original filename and embedded data. Changing the handling type hides book-only metadata without destroying the evidence needed to undo a mistake.

### 7. Ask only useful questions

Keep Book / Personal document / Undecided filtering. Distinguish Undecided from Needs your help.

- A recognized book with unknown online identity appears as a book, keeps local details, and raises no mandatory review notice.
- A queued analysis or network failure stays a processing/retry state, not a user task.
- A low-information scan can remain Undecided and readable. Offer optional classification without repeatedly notifying the user.
- A material conflict produces a specific question: for example, two plausible identities with a title-page preview and the differing authors.

Retain the existing Decide later -> Profile bell -> Notifications flow for actionable review items. Notifications reference a document and decision revision. Resolving that decision from either Notifications or the edit page clears the item atomically.

## Storage and scheduling

Introduce `documentEvidence`, `documentDecisions`, `metadataCandidates`, and `intelligenceJobs` stores keyed by stable document identity. Keep reading progress and library records independent.

Jobs are durable, idempotent, resumable, and invalidated by content/extractor/engine versions. Distinguish no evidence, unsupported extraction, transient failure, and successful analysis. Retry only when its cause changes or a bounded backoff expires.

Start with one heavy extraction/OCR worker and bounded network concurrency; tune from device measurements. Prioritize the opened document and newly added files. Never retain a library array index across an await. Apply results by ID using an atomic revision check so a late job cannot overwrite an edit, resurrect a deleted file, or resolve an obsolete notification.

## Migration

Make schema migration additive and move analysis out of `getBooks()`. Preserve IDs, source files, reading position, collections, and explicit user decisions.

Mark old automatic classification and catalog fields as legacy claims with uncertain provenance. Do not treat them as verified evidence, and do not wipe or reclassify the whole library during a read.

Run the new engine in background shadow mode, compare proposed results, then enable application after evaluation. Repair old review notifications from the new review policy rather than simply marking every PDF as a book. Preserve deferred user choices and clear only review requests that the new decision actually resolves.

## Implementation order

1. **Evaluation corpus and diagnostics:** assemble consented or redistributable examples; label kind and known identity independently. Include the user's failing cases if supplied, without making progress depend on them. Record the old pipeline's outcomes.
2. **Data foundation:** additive stores, source provenance, explicit overrides, durable jobs, revision-checked writes, central metadata application gate.
3. **Fast evidence extraction:** reuse PDF.js and EPUB parsing; add page-aware sampling, Unicode normalization, retained embedded fields, and extraction-quality reporting. Add bounded native OCR for supported scripts.
4. **Document-kind engine:** implement and evaluate the local feature model; compare candidate models and calibrate the abstention policy. Connect the three existing filters to effective kind.
5. **Identity resolver:** candidate retrieval, work/edition distinction, contradiction handling, field-level verification, provider caches, and optional semantic-assistance interface.
6. **Review UX:** separate analysis status from actionable reviews; add previews and clear reasons; integrate notification lifecycle and manual choices.
7. **Shadow migration and rollout:** process existing libraries resumably, inspect disagreements, then enable verified application. Remove old classification/matching writers only after all entry points use the new pipeline.
8. **Android validation and delivery:** test realistic libraries and low-memory devices, crash/resume and format-switch scenarios; build and sync the tested implementation for Android Studio.

## Validation and release criteria

Measure book recognition, false personal classification, wrong identity application, review requests per 100 files, time until the first file is readable, background completion, memory, and battery impact separately.

The held-out corpus must include ordinary and scanned books, missing/incorrect PDF metadata, random filenames, short books, textbooks, manuals, multilingual works, personal financial and medical documents, public reports, lecture notes, and documents quoting or discussing books. Split related editions/templates across evaluation carefully to prevent leakage.

Require a material improvement over the current review burden without increasing wrong metadata application. Set numerical thresholds from the labeled baseline and device measurements; a passing synthetic unit test or a model's self-reported confidence is not an accuracy result. Report confidence intervals for measured error rates where the sample supports them.

Regression tests must prove: manual overrides win; unavailable text is retryable when evidence changes; duplicate jobs do not duplicate files; stale results cannot overwrite newer revisions; personal evidence never reaches catalog queries; format switching does not erase decisions; and notifications clear consistently across all resolution paths.

## Technical references

- Android on-device OCR and supported integration choices: https://developers.google.com/ml-kit/vision/text-recognition/v2/android
- Catalog search and work/edition data: https://openlibrary.org/dev/docs/api/search
- Identifier-based book lookup and edition-specific fields: https://openlibrary.org/dev/docs/api/books
