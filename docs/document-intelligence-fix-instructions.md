# Document intelligence audit and repair instructions

Date: 2026-10-08
Scope: code review and executable reproduction of current decision functions. No access to the user's installed phone database; individual file classifications remain unverified.

## Verdict

The implementation does not meet the document-intelligence redesign. It introduced some useful storage and revision checks, but connected restrictive application gates before completing the pipeline that establishes eligibility. Suppressing low-information review notices then made the stalled state invisible. Successful compilation and synthetic classifier tests did not establish that a newly imported PDF can reach metadata enrichment.

Do not fix this by removing all protection, declaring all PDFs books, requiring users to classify their library, or marking every unknown file for review.

## Confirmed failures

1. **Storage skips the very PDFs it needs to resolve.** `useMetadataBackfill.backfillLibraryMetadata` calls `canApplyCatalogMetadata` before invoking the search function. That gate requires verified-edition or user-approved identity for PDFs. Storage never calls the evidence collector or identity resolver. Progress advances before the skip, and skipped records have no diagnostic entry. The success toast can therefore report zero updates without any searches.
2. **The background worker uses the same application gate to find work.** `missingMetadataFields` returns an empty list for unverified PDFs. The old auto-metadata worker consequently sees no missing work. The separate resolver in `useBooks` runs from library loading, not as a shared import/manual/background workflow.
3. **The resolver cannot bootstrap common books.** `canSearchCatalog` requires an already classified local book with both display title and author, or an explicit user book choice. It excludes legacy-provisional books and recognized books without authors, even when a usable local identifier exists. Legacy analysis reads text and page count without recovering original embedded metadata and outline. Importing an unknown PDF clears its display author; retained evidence is not used to build a better query. Newly saved evidence does not itself enqueue resolution.
4. **Unknown becomes a terminal state.** Existing-document analysis selects only older engine versions. Readable but inconclusive text is stamped complete at engine version 1; unreadable samples are stamped needs-ocr/unsupported without an OCR worker. There is no content/extractor-based invalidation or queue-draining scheduler. The jobs store is currently bookkeeping, not a durable execution queue.
5. **An unsuccessful lookup suppresses future attempts.** `commitIdentity` writes `identityCheckedAt` for unresolved and conflicting results. `resolvePdfIdentities` excludes any record with that timestamp. Storage cannot force a new attempt. Network failures may also arrive as empty provider results, so the coordinator needs explicit outcome types.
6. **Verification and provider output disagree.** `candidateIsbns` expects isbn/isbn13/isbn10; the inspected common aggregator and browser fallback result shapes do not retain those fields. An edition gate is ineffective if provider adapters discard edition evidence. Exact normalized embedded-title/author equality rejects legitimate variants and bad embedded metadata. More than one verified candidate becomes conflict without grouping equivalent provider records or editions of one work.
7. **Review state is disconnected from identity conflicts.** `commitIdentity` changes identity status but not review state. `needsDocumentReview` additionally requires document kind unclassified, so a recognized book with two conflicting identities cannot appear. The current review UI only asks book versus personal; that cannot resolve which author/work is correct. Ordinary unknowns correctly avoid mandatory review, but have no effective automatic recovery.
8. **The field permission design is incomplete.** The dedicated identity commit can fill some work-level fields once, but general background refresh rejects verified-work. Existing merge/rating/series/manual paths still have separate write policies. A truthy placeholder cover is also treated as an existing value by `applyVerifiedMetadata`. `user-approved` is accepted by a gate but no identity approval writer was found in the inspected composables/components/plugins.
9. **Recognition is still a narrow heuristic.** Most structural markers examine only pages 1–4 and English patterns. Sampling does not expand toward relevant outline targets. Title/byline extraction is limited, the byline regex can accept ordinary prose, layout and page roles are absent, and no calibrated corpus evaluation preceded live migration. Full PDF extraction still happens before the import creates a record; the fast readable-first stage was not implemented.

## Direct reproduction results

Executed the actual pure modules using Node, without mocking their decision logic:

| Scenario | Current outcome |
| --- | --- |
| PDF with title, author, copyright, contents | Book; catalog search eligible; Storage metadata gate false |
| Same recognized book without display author | Catalog search false |
| PDF with verified-work identity | Storage metadata gate false |
| Two equivalent title/author candidates from providers | Identity conflict |
| Recognized book with identity conflict | No review item |
| Readable sparse title-page sample | Unclassified; analysis complete; review none |

## Required implementation sequence

### 1. Replace disconnected entry points with one coordinator

Create a document-intelligence coordinator with explicit operations such as `enqueueDocument(id, reason)`, `runDocument(id, options)`, and `refreshLibrary(options)`.

- Route import completion, app resume, changed content, explicit type changes, format-switch recovery, background metadata refresh, and Storage Update book details through it.
- Storage must await the requested run and obtain per-document outcomes. A force option invalidates applicable analysis/lookup attempts and caches, not manual overrides or verified source facts.
- Enqueue only after the source and evidence are saved. The coordinator reads the current record by ID at each stage; do not hold an array position across asynchronous work.
- Sequence: ensure source/evidence -> infer kind -> assess safe query eligibility -> retrieve candidates -> verify identity -> apply allowed fields -> publish outcome.
- Remove the private library-load resolver once callers are migrated. Do not leave two independent workers competing to enrich the same PDF.

### 2. Separate permission to search from permission to write

- `canAttemptIdentityLookup(document, evidence, trigger)` should inspect original evidence and query quality. Recognized books can search using a supported local publication identifier or usable title; an absent author must not be a universal veto. Title-only search is candidate discovery, never automatic proof.
- For unknown files, continue local analysis first. Allow candidate discovery only with sufficient publication evidence and bibliographic query fields. The bulk Storage button is not consent to send arbitrary personal filenames or contents to providers.
- Explicit per-file metadata search may authorize a bibliographic query after the user can see/edit it. It does not approve the returned identity.
- `allowedMetadataFields(identity, candidateEvidence, userOverrides)` controls writes separately. A verified work can receive justified work fields; edition year/ISBN/edition cover require edition evidence. Ratings require the correct provider identity. Series membership and order require their own support.
- All writers use one field application service with provenance and revision checks. Placeholder/generated covers are missing replaceable fields unless the user chose them.

### 3. Recover evidence and improve classification

- Preserve and reuse original embedded fields, outline, page text/layout, extraction version, and source fingerprint independently of catalog metadata.
- For legacy records, retrieve these from the stored source when missing; do not use previously downloaded author/title as corroborating evidence.
- Infer title/byline candidates from page layout and page roles, rather than requiring a literal standalone `by ...` paragraph or embedded author. Retain alternatives and source spans.
- Use bounded progressive sampling: initial pages, likely title/copyright/contents pages, relevant outline targets, and later continuity samples. Expand only to answer unresolved questions.
- Required multi-page policy: start with up to six opening pages plus representative pages near 25%, 50%, 75%, and the end; deduplicate page numbers and inspect all pages for shorter files. Add relevant contents/chapter-start targets within an initial budget of roughly 12 distinct pages. Treat these as starting engineering budgets to validate on devices, not calibrated accuracy thresholds. Expand the budget in bounded steps when another sample could resolve uncertainty.
- Use the sampled body pages in the actual classifier: chapter continuity, prose/layout consistency, repeated headings, and document structure must be assessed across the file. Do not collect later pages and then restrict nearly all inference to opening pages. Keep page-number/span provenance for each signal. Front-matter identity clues and body structure have different roles; an ISBN in a bibliography or an invoice example in a chapter is not evidence that the entire file is that publication or an invoice.
- Record which pages were inspected and why. If the selected opening pages are images, extract/OCR other selected pages too; do not declare the whole file unreadable from the cover alone. Keep OCR concurrency and render resolution bounded for Android memory.
- Add bounded on-device OCR for low-text samples; track unsupported scripts and extraction errors distinctly. A failed extractor is not proof of document type.
- Evaluate against independently labeled books, scanned books, reports, invoices, notes quoting books, multilingual works, and textbooks containing forms. Do not merely tune tests around the current regexes.

### 4. Implement durable retries and invalidation

- Persist stages, attempts, last error, next attempt time, content fingerprint, evidence/extractor version, engine version, and resolution version.
- Drain pending jobs on startup/resume and after enqueue. Recover interrupted leases and use bounded concurrency/backoff.
- Separate no candidates, provider unavailable, insufficient local evidence, ambiguous identity, and completed verification.
- Retry when new evidence/content/engine/provider availability changes, on bounded backoff for transient failures, or when the user explicitly requests refresh. Do not use the existence of `identityCheckedAt` as permanent exclusion.
- A stale commit requeues or schedules the current revision; deleted records terminate the job. Explicit user decisions always win.

### 5. Repair identity resolution and provider contracts

- Preserve provider IDs, work/edition IDs, validated identifiers, authors, language, publisher, dates, and provenance through adapters, normalization, aggregation, cache, and verification. Add contract tests for native and server/browser paths.
- Group equivalent provider records into one identity. Several sources agreeing on a work are corroboration; differing editions alone do not imply different works.
- Match subtitles, initials, aliases, reordered names, and edition qualifiers without accepting unrelated titles. Bad PDF embedded metadata is a fallible clue, not a mandatory exact-match veto.
- An identifier on an early page still needs role/context validation; books can cite another publication in a foreword. Keep work and edition decisions separate.
- Keep candidate discovery separate from identity approval. An explicit candidate selection records a revisioned user-approved identity, without equating a manual Book type choice with identity approval.

### 6. Make review and progress truthful

- Model review reason independently: document-kind conflict or identity conflict. A book may need identity clarification while remaining in the Book filter.
- Kind review offers Book / Personal document; identity review offers the actual candidates with title/author differences and local evidence, plus None of these and Decide later.
- Continue the Profile bell/deferred flow. Resolve the matching notification atomically from either the review page or a relevant manual edit. A type change alone must not silently claim an identity conflict was verified.
- Low-information unknowns remain readable, show the analysis limitation, and offer optional Retry analysis / Set type. Do not restore the notification flood.
- Storage reports analyzed, searched, updated, unchanged, deferred, skipped-personal, insufficient-evidence, and failed counts. Explain every skip. Never imply skipped files were searched or already complete.

### 7. Repair existing installations safely

- Increase the engine/resolver versions and enqueue records stranded by version 1, including completed-unclassified, unsupported scans, unresolved identityCheckedAt records, and legacy-provisional records.
- Invalidate only stale automation state; preserve source assets, IDs, reading progress, collections, and user overrides.
- Test migration on copies of representative old records. Use shadow classification comparisons before broad application; do not mass-promote unknowns or delete existing details.

## Acceptance tests required before delivery

1. Import a text PDF with no ISBN; without restart, classify it as a book, run a candidate query, verify the work, fill permitted missing fields, and create no unnecessary review.
2. Run Storage refresh on an unverified book PDF: prove the search spy is called and progress accounts for the result. Repeat after an unresolved lookup and after a network failure.
3. Recognize a book without embedded author using original page evidence; test a title-only query with both correct and incorrect candidates.
4. Keep an invoice personal and prove neither contents nor personal identifiers reach a provider. Keep notes quoting a book from inheriting that book's identity.
5. Treat equivalent provider candidates as one identity; surface distinct plausible identities as a review while kind remains Book.
6. Recover a version-1 stranded record, a crash-interrupted job, late-arriving source text, and a stale revision. Prove manual edits survive and deleted files stay deleted.
7. Force refresh changes lookup eligibility without erasing manual choices; format toggles never duplicate documents or erase decisions.
8. Confirm native provider payloads preserve identity evidence, and the same field permission rules hold across imports, auto refresh, Storage, series, ratings, and manual selection.
9. Measure recognition and erroneous metadata application on held-out documents, and test latency/memory on Android. Unit tests alone do not certify classification quality.
10. Test a book with blank/scanned opening pages and readable later chapters, a long preface with chapters beyond page 4, a textbook containing transaction examples, and a bibliography with other books' ISBNs. Assert that multiple page regions are inspected and that later-page structure affects classification without contaminating publication identity.

After these pass, run production generation, Capacitor sync, and Android debug compilation. Report any remaining test or device-validation gaps explicitly.
