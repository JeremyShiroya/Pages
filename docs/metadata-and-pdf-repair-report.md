# Metadata and PDF repair report

Date: 9 October 2026

## What changed

The catalog metadata workflow was restored against the v1.3.1 baseline (`89dee89`) and improved. PDF sorting now runs independently on local document evidence. Sorting cannot write a book's title, author, cover, series, or reading progress. Catalog searches run only for files classified as books; a user can override that classification.

The PDF analyzer samples up to 12 pages, including interior and ending pages and useful outline targets. It combines publication structure with document-purpose evidence, including forms, letters, CVs, certificates, academic records, timetables, papers, notes, and business documents. It does not upload page text for catalog matching. Ambiguous or unreadable files can remain undecided.

Metadata candidates must match the book's title and, when available, its author. Matching permits common punctuation, subtitle, and author-initial variations, but does not borrow another title's metadata merely because the author matches. Cached and concurrent updates merge only permitted metadata fields into the current record. Manual fields, reading progress, deleted records, and newer revisions are protected.

Series totals no longer shrink to the length of an incomplete provider roster. An empty series field is now **Series unknown**, not **Standalone**. The editor offers **Not sure yet**, and only an explicit user choice or positive provider evidence confirms a standalone. Tests specifically cover Fallen and Indelible and protect a manually entered series total.

Settings → Storage now includes **Reset app**, with a custom confirmation dialog. On Android this clears the current app package's data and stops its workers. It retains the original shared-storage documents and returns to first-time format selection.

## Root causes addressed

- Classification relied too heavily on generic book signals and did not recognize enough personal-document structures.
- The older sorter could promote arbitrary page text into bibliographic metadata.
- Edition-verification gates prevented ordinary cover and series enrichment.
- A cancelled scheduler timer left its wait promise unresolved; fresh imports also missed a wake-up in one cached-evidence path.
- An awaited startup series crawl could delay the entire metadata worker.
- Loose provider matching allowed cross-title contamination.
- Partial series rosters could overwrite larger known totals.
- UI components treated missing series data as proof of standalone status.

## Validation

The targeted automated suite passes **176 tests**, covering classification, evidence persistence, migration, identity matching, metadata isolation, scheduler pacing, duplicate import handling, series discovery and preservation, and concurrent writes.

USB testing used **Pages Dev** (`com.bookish.app.debug`) on the connected Samsung phone. The release **Pages** app was not modified. Private backups were saved outside the repository before reset testing.

During upgrade testing, the existing 39 PDF records and their IDs were preserved, along with reading progress. The library changed from 22 undefined files and 17 books, with no personal documents, to **27 personal documents and 12 books**. Personal documents received no catalog searches. Proven boilerplate title damage was repaired without broadly replacing valid titles.

The restored deep search populated covers and series, including Grant County for Indelible, Hierarchy for The Will of the Many, and The Lonely Motel for Woom. A manually restored total of 5 for Fallen survived another deep search.

The reset dialog was exercised on the phone: reopening showed zero books and the first-time format chooser. Selecting PDF only imported the same 39 documents with the same 27/12 classification split.

On the final build, a second fresh reset/PDF-only run showed six imported files within 16 seconds and an active automatic metadata batch within 30 seconds. All 39 files were present by the 85-second observation. The result was again 27 personal documents and 12 books. Automatic enrichment supplied remote covers for 11 books and discovered Fallen (total 5), Grant County for Indelible and Kisscut, The Lonely Motel for Woom, and Hierarchy for The Will of the Many. Indelible's total was still unknown in the automatic-pass snapshot; the UI no longer presents that as standalone.

Two further scans retained exactly 39 records and 39 distinct device paths. All 27 personal documents had zero catalog-search timestamps. Fallen opened in the original PDF reader with rendered 1080 × 1728 page canvases, without the legacy original-page-rendering error.

The personal-document edit screen was checked on the phone: it exposes File created and omits Genre, Goodreads review, and publication year. No editor changes were saved during that check.

The final manual Update book details pass completed in approximately six minutes, including slow provider requests. Fallen retained its total of 5. Indelible retained its Grant County membership, but its individual record still lacked a provider-confirmed total in this run. This is distinct from the earlier upgrade run, which returned 6; provider coverage is not deterministic. The full sweep is still slower than initial import and automatic enrichment.

After force-stopping and reopening Pages Dev, all 39 IDs were unchanged, all 39 paths were distinct, and the 27 personal documents still had zero catalog-search timestamps. The phone was left with this fresh test library in Pages Dev; the pre-reset backup remains outside the repository.

`npm run cap:sync` and `:app:assembleDebug` both completed successfully. The final APK was installed in Pages Dev. Android Studio can use the synced `android` project; the debug APK is `android/app/build/outputs/apk/debug/app-debug.apk`.

The code knowledge graph was refreshed with AST extraction only (4,388 nodes and 7,433 edges; no LLM calls). Non-blocking build warnings include duplicate Nuxt auto-imports, chunk sizing, and existing Gradle deprecations. The whitespace check passed.

## Limits

These results establish behavior on the tested corpus and regression cases, not perfect recognition of every possible PDF. Image-only, damaged, encrypted, or ambiguous documents can require a user decision. External metadata depends on provider availability and coverage; missing evidence remains unknown rather than being replaced with a guess. Books sharing a title without a reliable author need stronger evidence before automatic enrichment.
