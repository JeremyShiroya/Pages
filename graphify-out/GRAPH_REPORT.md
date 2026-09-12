# Graph Report - Bookish  (2026-09-12)

## Corpus Check
- 411 files · ~1,272,064 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3657 nodes · 5913 edges · 276 communities (200 shown, 33 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 85 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fd6c6d10`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ReaderMobile.vue
- useSeriesSuggestions.js
- reader/[id].vue
- composables/usePdfExtractor.js
- aiMetadataVerifier.ts
- goodreadsScraper.ts
- BooksDesktop.vue
- BooksMobile.vue
- AddBookMobile.vue
- EditBookMobile.vue
- AddBookComp.vue
- useAutoMetadata.js
- imageSearch.ts
- vitest
- SeriesDetailMobile.vue
- ReaderPagedEpub.vue
- publisherMetadata.ts
- PlayingBar.vue
- useBookMetadataSearch.js
- AuthorDetailComp.vue
- SettingsDesktop.vue
- SettingsStorageMobile.vue
- useTTS.js
- productionSnapshotEngine.ts
- useDeviceLibrarySync.js
- PdfViewer.vue
- useBookishSettings.js
- EditBookComp.vue
- seriesDomainTypes.ts
- PlaylistDetailMobile.vue
- PlaylistsMobile.vue
- BookDetailMobile.vue
- BookGroupDetail.vue
- MediaSessionPlugin
- ConnectionTestPanel.vue
- SettingsStoragePanel.vue
- useAnnotations.js
- useMobileReaderPrefs.js
- metadata.get.ts
- nativeSpeech.js
- LibraryBookCard.vue
- edgeTts.ts
- coverSearch.ts
- useAuthorImageSearch.js
- HomeMobile.vue
- PreferencesMobile.vue
- StreakCalendarMobile.vue
- BookishSelect.vue
- generate-version-manifest.mjs
- AnnotationListMobile.vue
- MobilePlayingBar.vue
- AddToPlaylistModal.vue
- loadBook
- migrationEngine.ts
- series-books.get.ts
- package.json
- EmptyState.vue
- DeviceBooksPlugin
- Bookish UX batch — voices, position sync, filters, format removal, PDF reflow
- FavouritesMobile.vue
- SeriesMobile.vue
- hideSelectionMenu
- PlaylistsDesktop.vue
- usePdfReflow.js
- dependencies
- com.getcapacitor.PluginCall
- vue
- uxBatchFive.test.js
- uxBatchSix.test.js
- SeriesCollageCard.vue
- useStreak.js
- useDeviceMetadataSearch.js
- SeriesDesktop.vue
- emit
- LibraryControlsRow.vue
- hardcoverApi.ts
- googleBooksApi.ts
- Composable: `composables/useTTS.js` (rewrite playback engine)
- useLibraryBackup.js
- Author Enrichment — Design Spec
- chunkIndexForCurrentPosition
- Getting Started
- MobileTopNav.vue
- SettingsMobile.vue
- useAppUpdate.js
- LibraryDisplayControls.vue
- useEdgeSpeechClient.js
- composables/useEpubExtractor.js
- useLibraryFilters.js
- internetArchiveApi.ts
- Local-First Library Migration Design
- HiddenBooksMobile.vue
- ProfileMobile.vue
- EditBookModal.vue
- ProfileDesktop.vue
- useLibrarySearch.test.js
- MainActivity
- MultiStepLoader.vue
- useApiEndpoint.js
- useDeviceArchitecture.js
- NarrationService
- DeleteConfirmModal.vue
- seriesMutationGuard.js
- useEpubPageMap.js
- make-gallery.mjs
- scripts
- ExampleInstrumentedTest.java
- ReaderFigureViewer.vue
- onScrollTap
- useBooks.js
- selectionAndFilters.test.js
- playlist/[id].vue
- serie/[id].vue
- openLibraryApi.ts
- MobileSettingsNav.vue
- sectionStartChunkLocal
- onSelectionSettled
- AppUpdateModal.vue
- FormatChoiceModal.vue
- PlaylistEditModal.vue
- SettingsAudioPanel.vue
- devDependencies
- vue-router
- vercel-analytics.client.js
- DeviceBooksPlugin.java
- FavouritesDesktop.vue
- Local-First Library Migration Implementation Plan
- Read-Aloud Word Highlight, Instant Highlight & Lazy PDF Render
- useChunkSpans.js
- useLibraryBackup.test.js
- Pages_Master_AI_Knowledge_Base_Combined.md
- Sidebar.vue
- kokoroTts.worker.js
- IndexedDB Book Content Storage
- mobileTtsDriver.js
- Read-Aloud Word Highlight, Instant Highlight & Lazy PDF Render — Implementation Plan
- useFormatEnablement.js
- useHtmlSanitizer.js
- useBookStorage.js
- useReaderPosition.test.js
- useReaderPrewarm.js
- IndexedDB Book Content Storage Implementation Plan
- useCoverFallback.js
- EPUB & PDF Reader Support — Design Spec
- mountSection
- sign-release-apk.sh
- scrape-image.get.ts
- Library and Playlist UI Improvements Design
- mobileDesktopPurity.test.js
- gradlew
- fetchMetadata
- fetchMetadata
- Reader, Metadata, and Author Repairs Design
- edge-tts Implementation Plan
- Library and Playlist UI Improvements Implementation Plan
- closeChapterMenu
- FavouriteCardPreview.vue
- useAuthorDetails.test.js
- useSelectOptions.test.js
- useSeriesRepair.js
- Reader, Metadata, and Author Repairs Implementation Plan
- updateBookEdge
- responsiveComponentSplit.test.js
- useUserProfile.js
- saveBook
- applyVoiceChoice
- Series Collection Progress Design
- saveBook
- desktopTtsDriver.js
- useGoodreadsRating.js
- useThemeCssVars.js
- nuxt.config.ts
- parseChapters
- cache-cover.post.ts
- tsconfig.json
- mobileTtsDriver.test.js
- ReaderNoteEditor.vue
- CoverImageModal.vue
- firstChunkAtOrAfterPage
- PDF Manifest and Author Totals Redesign Implementation Plan
- Series Data Backfill Design
- EPUB & PDF Reader Support Implementation Plan
- DevicePermissionModal.vue
- Metadata Scraper Redesign Implementation Plan
- File Structure
- Series Data Backfill Implementation Plan
- ToastComp.vue
- cancelReadFromHere
- PDF Manifest and Author Totals Redesign
- Mobile Native Reader Implementation Plan
- 1. Primary Entities & Schema Definition
- series/[id].vue
- app-update.client.js
- device-library-sync.client.js
- desktopTtsDriver.test.js
- goToChunk
- Empty State Redesign
- initializeSectionMounting
- AuthorImageModal.vue
- Q: every time i try to play a book in horizintal for tablet, it says tts failed check your connection, find the problem and fix
- Q: Why does browser tablet landscape TTS still show TTS failed check your connection after invalid endpoint responses were handled?
- Q: Screenshot shows browser TTS still fails while POST /api/tts returns 200 OK with content-length 59
- Q: is electron the best for this project? for performance and speed without eating resources?
- Q: will it function/behave like an actual desktop app and not just a mock?
- Q: Only Sonia UK, Ryan UK, and Natasha AU are actual voices; the rest male and female sound the same and robotic
- Phase 1: Architecture & Lifecycle
- Phase 3: Metadata Intelligence Engine
- Phase 7: Text-to-Speech (TTS) & Media Subsystem
- Phase 5: Book Ingestion & EPUB/PDF Processing
- 1. Master System Overview & Architecture Diagrams
- Phase 6: Reader & Annotations Architecture
- Phase 4: Series Intelligence Engine
- AGENTS.md
- mobile/deviceArchitecture.js
- tablet/deviceArchitecture.js
- Phase 13: Performance & Scale Analysis
- Phase 10: Android & Capacitor Native Integration
- Phase 15: Build & Deployment Pipeline
- Phase 11: Search & Authors Subsystem
- Phase 14: Testing & Regression Suite
- appVersioning.test.js
- closeCoverModal
- fetchMetadata
- useCoverSearch.js
- overrides
- closeCoverModal
- SeriesCardPreview.vue
- closeBlurbChooser
- openBlurbChooser
- sourceLabel
- closeBlurbChooser
- openBlurbChooser
- sourceLabel

## God Nodes (most connected - your core abstractions)
1. `vitest` - 89 edges
2. `vue` - 84 edges
3. `vue-router` - 27 edges
4. `computeContentHash()` - 23 edges
5. `ProductionBookRecord` - 22 edges
6. `getMetadataResults()` - 22 edges
7. `MediaSessionPlugin` - 21 edges
8. `compact()` - 20 edges
9. `useTTS()` - 18 edges
10. `ApkInstallerPlugin` - 17 edges

## Surprising Connections (you probably didn't know these)
- `manifest()` --calls--> `normalizeUpdateManifest()`  [EXTRACTED]
  tests/appUpdate.test.js → composables/appUpdateManifest.js
- `handleDelete()` --calls--> `deleteBook()`  [INFERRED]
  components/mobile/BookDetailMobile.vue → components/mobile/BooksMobile.vue
- `confirmDelete()` --calls--> `deleteBook()`  [INFERRED]
  components/mobile/FavouritesMobile.vue → components/mobile/BooksMobile.vue
- `confirmDeleteBook()` --calls--> `deleteBook()`  [INFERRED]
  components/mobile/PlaylistDetailMobile.vue → components/mobile/BooksMobile.vue
- `confirmDeleteBook()` --calls--> `deleteBook()`  [INFERRED]
  components/mobile/SeriesDetailMobile.vue → components/mobile/BooksMobile.vue

## Import Cycles
- None detected.

## Communities (276 total, 33 thin omitted)

### Community 0 - "ReaderMobile.vue"
Cohesion: 0.02
Nodes (71): activeListenChunk, activeTocChapter, activeVoiceId, { addToast }, allFigureSources, { annotations }, bookAnnotations, chapterLabel (+63 more)

### Community 1 - "useSeriesSuggestions.js"
Cohesion: 0.06
Nodes (71): backfillSeriesTotals(), ensureSeriesTotal(), formatSeriesCollectionProgress(), metadataSeriesTotal(), normalizeSeriesName(), propagateSeriesTotal(), validSeriesTotals(), aiAttemptedRecently() (+63 more)

### Community 2 - "reader/[id].vue"
Cohesion: 0.02
Nodes (81): activeTocEntryIdx, activeTtsChunkIndex, activeTtsChunkPage, activeWordRange, allReadableChunks, book, bookFormat, { books, initialized, fetchAllData, fetchBookById, updateBook } (+73 more)

### Community 3 - "composables/usePdfExtractor.js"
Cohesion: 0.09
Nodes (45): bucketTextLines(), buildPdfPagesHtml(), collectPdfPageLines(), collectPdfPageParagraphs(), collectPdfPageRecords(), escapeHtml(), extractPdf(), extractPdfContentFromSource() (+37 more)

### Community 4 - "aiMetadataVerifier.ts"
Cohesion: 0.07
Nodes (57): AuthorDetails, fetchOpenLibraryBio(), fetchWikidataDetails(), fetchWikipediaBio(), JSON_HEADERS, AiAuthorOptions, AiProviderConfig, applyPatch() (+49 more)

### Community 5 - "goodreadsScraper.ts"
Cohesion: 0.13
Nodes (44): absoluteGoodreadsUrl(), cleanCount(), cleanSearchTitle(), compact(), decodeHtmlEntities(), fetchGoodreadsProxyResult(), fetchGoodreadsSearchFallback(), fetchGoodreadsSeriesBooks() (+36 more)

### Community 6 - "BooksDesktop.vue"
Cohesion: 0.04
Nodes (41): activeActionsMenu, activeChipIndex, activeDropdown, activeViewIndex, { addToast }, bookMetrics, {
  books,
  loading,
  error,
  updateBook,
  deleteBook: removeBookFromStore,
  toggleFavourite,
  fetchAllData,
}, chipHighlightStyle (+33 more)

### Community 7 - "BooksMobile.vue"
Cohesion: 0.04
Nodes (38): activeViewIndex, { addToast }, bookMetrics, {
  books,
  loading,
  error,
  updateBook,
  deleteBook: removeBookFromStore,
  toggleFavourite,
  hideBook,
  fetchAllData,
}, bulkActions, bulkDeleteBooks, bulkPlaylistBooks, displayedBooks (+30 more)

### Community 8 - "AddBookMobile.vue"
Cohesion: 0.04
Nodes (45): { addBook, books, updateBook }, { addToast }, { apiUrl }, blurbOptions, bookKind, { cacheCoverImage }, closeBlurbChooser(), closeCoverModal() (+37 more)

### Community 9 - "EditBookMobile.vue"
Cohesion: 0.05
Nodes (39): { addToast }, { apiUrl }, blurbOptions, bookKind, { cacheCoverImage }, closeBlurbChooser(), closeCoverModal(), coverInput (+31 more)

### Community 10 - "AddBookComp.vue"
Cohesion: 0.04
Nodes (36): { addBook, books, updateBook }, { addToast }, { apiUrl }, blurbOptions, bookKind, { cacheCoverImage }, coverInput, coverModalMode (+28 more)

### Community 11 - "useAutoMetadata.js"
Cohesion: 0.08
Nodes (39): addedAt(), autoState, countPendingTargets(), fillOne(), foreground(), GOODREADS_ONLY_FIELDS, loop(), metadataResultMatchesBook() (+31 more)

### Community 12 - "imageSearch.ts"
Cohesion: 0.12
Nodes (42): addImage(), AuthorImageResult, buildAuthorGoogleQueries(), fetchJson(), fetchText(), findDuckDuckGoImages(), findOpenLibraryAuthorImages(), findWikidataAuthorImages() (+34 more)

### Community 13 - "vitest"
Cohesion: 0.05
Nodes (16): mockCacheCoverImage, mockExists, vitest, LiveShadowAuditSummary, runLiveShadowAudit(), verifySnapshotIntegrity(), ShadowProposalReport, root (+8 more)

### Community 14 - "SeriesDetailMobile.vue"
Cohesion: 0.05
Nodes (37): { addToast }, allMissingInstallments, { books, seriesList, updateBook, deleteBook, toggleFavourite, hideBook }, bookToDelete, coverFallback(), derivedSeriesTotal, filteredBooks, { filters, setFilter, matches } (+29 more)

### Community 15 - "ReaderPagedEpub.vue"
Cohesion: 0.10
Nodes (41): animate, applyChunkHighlight(), cancelLongPress(), chunkAtPoint(), chunkEls, clearChunkHighlight(), contentRef, contentStyle (+33 more)

### Community 16 - "publisherMetadata.ts"
Cohesion: 0.07
Nodes (61): authorsCompatible(), buildMetadataResults(), calculateConfidenceScore(), collectBlurbOptions(), collectPublisherSource(), collectSourceTags(), completenessScore(), firstValue() (+53 more)

### Community 17 - "PlayingBar.vue"
Cohesion: 0.06
Nodes (28): { books, toggleFavourite }, chapterMenuOpen, chapterMenuRef, chapterMenuX, chapterSegments, coverFallback(), currentBookIndex, generateCoverPlaceholder() (+20 more)

### Community 18 - "useBookMetadataSearch.js"
Cohesion: 0.11
Nodes (31): compact(), fetchBookMetadataResults(), fetchInternetArchiveDetails(), fetchOpenLibraryWork(), fetchSeriesTotalResults(), firstValue(), loadDeviceSearch(), mergeResults() (+23 more)

### Community 19 - "AuthorDetailComp.vue"
Cohesion: 0.06
Nodes (31): { addToast }, author, authorAge, authorDetails, authorImageStage, authorSeries, authorWorks, bioLoading (+23 more)

### Community 20 - "SettingsDesktop.vue"
Cohesion: 0.06
Nodes (24): { addToast }, authorFetchLoading, authorFetchProgress, backgroundOptions, { books, authors, collections, genres, recentlyAddedBooks, fetchAndStoreAuthorDetails }, booksWithCovers, booksWithWebReviews, cardGroups (+16 more)

### Community 21 - "SettingsStorageMobile.vue"
Cohesion: 0.06
Nodes (28): { addToast }, autoStatusLabel, backfillPercent, { books, updateBook, restoreHiddenBooks, countHiddenBooks }, folderSuggestions, formatBytes(), formattedStorageSize, { getStorageSummary } (+20 more)

### Community 22 - "useTTS.js"
Cohesion: 0.10
Nodes (39): _audioCache, BOOKISH_TTS_SESSION_KEY, buildChapterBoundariesFromHtml(), buildReadableChunks(), chunkIndexForPdfProgress(), chunkIndexForProgress(), _chunks, clearStoredTtsSession() (+31 more)

### Community 23 - "productionSnapshotEngine.ts"
Cohesion: 0.24
Nodes (18): verifyCanonicalLibraryEquivalence(), executePhase3ACanary(), Phase3ACanaryAuditReport, executePhase3BBatch(), Phase3BBatchAuditReport, executePhase3CFinalBatch(), Phase3CFinalBatchAuditReport, ADB_VERIFIED_PHYSICAL_DEVICE_IDENTITY (+10 more)

### Community 24 - "useDeviceLibrarySync.js"
Cohesion: 0.11
Nodes (28): backfillBookMetadata(), base64ToFile(), BOOKISH_DEVICE_IMPORTS_KEY, BOOKISH_DEVICE_SYNC_ASKED_KEY, BOOKISH_SCAN_FOLDERS_KEY, cleanTitleFromFileName(), DEFAULT_SCAN_FOLDERS, deleteDeviceImport() (+20 more)

### Community 25 - "PdfViewer.vue"
Cohesion: 0.09
Nodes (32): buildPages(), dataUrlToBytes(), emit, highlightsByPage, isStreamableUrl(), onViewerScroll(), pageAtAnchor(), pageCanvases (+24 more)

### Community 26 - "useBookishSettings.js"
Cohesion: 0.09
Nodes (30): APP_BACKGROUND_OPTIONS, applyBookishTheme(), BOOK_ACTION_DISPLAY_OPTIONS, BOOKISH_SETTINGS_KEY, CARD_BACKGROUND_OPTIONS, clamp(), CURRENT_SETTINGS_VERSION, DARK_APP_BACKGROUND_OPTIONS (+22 more)

### Community 27 - "EditBookComp.vue"
Cohesion: 0.06
Nodes (25): { addToast }, { apiUrl }, blurbOptions, bookKind, { cacheCoverImage }, coverInput, coverModalMode, coverOptions (+17 more)

### Community 28 - "seriesDomainTypes.ts"
Cohesion: 0.12
Nodes (28): calculateWeightedConfidence(), DEFAULT_PROVIDER_RELIABILITY_MATRIX, BookAuditRecord, DryRunAuditReport, CanonicalSeries, CanonicalWork, EntryType, EvidenceClaimType (+20 more)

### Community 29 - "PlaylistDetailMobile.vue"
Cohesion: 0.07
Nodes (25): { addToast }, { books, collections, updatePlaylist, deletePlaylist, deleteBook, toggleFavourite, hideBook }, bookToDelete, coverFallback(), editingPlaylist, filteredBooks, { filters, setFilter, matches }, generateCoverPlaceholder() (+17 more)

### Community 30 - "PlaylistsMobile.vue"
Cohesion: 0.08
Nodes (25): { addToast }, bulkActions, bulkDeleteTargets, closeContextMenu(), closeEditor(), { collections, books, updatePlaylist, deletePlaylist, loading, initialized }, confirmDelete(), contextMenu (+17 more)

### Community 31 - "BookDetailMobile.vue"
Cohesion: 0.08
Nodes (27): { addToast }, book, { books, collections, loading, toggleFavourite, hideBook, deleteBook }, coverUrl, detailMenuElement, detailMenuOpen, forThisBook(), generateCoverPlaceholder() (+19 more)

### Community 32 - "BookGroupDetail.vue"
Cohesion: 0.09
Nodes (18): bookToDelete, coverFallback(), { deleteBook, toggleFavourite }, filteredBooks, generateCoverPlaceholder(), handlePlay(), isBookActive(), normalizedStatus() (+10 more)

### Community 33 - "MediaSessionPlugin"
Cohesion: 0.15
Nodes (9): android.app.PendingIntent, Override, MediaSessionPlugin, android.content.BroadcastReceiver, android.content.Context, android.graphics.Bitmap, android.support.v4.media.session.MediaSessionCompat, BroadcastReceiver (+1 more)

### Community 34 - "ConnectionTestPanel.vue"
Cohesion: 0.09
Nodes (21): { addToast }, anyFail, anyWarn, { checks, runCheck }, completedCount, currentLabel, expanded, finished (+13 more)

### Community 35 - "SettingsStoragePanel.vue"
Cohesion: 0.09
Nodes (21): { addToast }, { apiBaseUrl: effectiveApiBaseUrl }, backupLoading, { createDownload, importBookishData, wipeBookishData }, { fetchAllData }, formatBytes(), formattedStorageSize, { getStorageSummary } (+13 more)

### Community 36 - "useAnnotations.js"
Cohesion: 0.16
Nodes (20): anchorFromSelection(), ANNOTATION_MARK_SELECTOR, annotations, chunkElement(), clearAnnotationMarks(), colorValue(), deleteAnnotation(), deleteAnnotationsForBook() (+12 more)

### Community 37 - "useMobileReaderPrefs.js"
Cohesion: 0.09
Nodes (19): clamp(), DEFAULT_MOBILE_READER_PREFS, MOBILE_READER_PREFS_KEY, normalizeMobileReaderPrefs(), PDF_PAGE_MODE_OPTIONS, PDF_VIEW_MODE_OPTIONS, PDF_ZOOM_MIN, PDF_ZOOM_STEP (+11 more)

### Community 38 - "metadata.get.ts"
Cohesion: 0.15
Nodes (21): firstValue(), fromGoodreads(), fromGoogleBooks(), fromInternetArchive(), fromKobo(), fromOpenLibrary(), fromPublisher(), getGoodreadsSources() (+13 more)

### Community 39 - "nativeSpeech.js"
Cohesion: 0.16
Nodes (24): browserSpeechSupported(), capacitorSpeechSupported(), clamp01(), clampRate(), createBrowserSpeechAudio(), createNativeSpeechAudio(), describeDeviceVoice(), DEVICE_VOICE_LOCALES (+16 more)

### Community 40 - "LibraryBookCard.vue"
Cohesion: 0.10
Nodes (16): { bookInAnyPlaylist }, cardElement, coverUrl, emit, generateCoverPlaceholder(), handleCoverError(), inPlaylist, menuElement (+8 more)

### Community 41 - "edgeTts.ts"
Cohesion: 0.09
Nodes (13): msedge-tts, ALLOWED_VOICES, RATE_MAP, delay(), EdgeTtsClient, isRetriableEdgeTtsError(), synthesizeEdgeSpeech(), SynthesizeEdgeSpeechOptions (+5 more)

### Community 42 - "coverSearch.ts"
Cohesion: 0.16
Nodes (20): cheerio, addCover(), buildCoverQueries(), buildPublisherQueries(), CoverImage, hostnameOf(), quoteTerm(), searchBookCovers() (+12 more)

### Community 43 - "useAuthorImageSearch.js"
Cohesion: 0.38
Nodes (9): addImage(), fetchAuthorImageResults(), findOpenLibraryAuthorImages(), findWikidataImages(), findWikipediaSummaryImages(), imageInfoForFiles(), isUsefulAuthorImage(), normalizeAuthorImageResults() (+1 more)

### Community 44 - "HomeMobile.vue"
Cohesion: 0.09
Nodes (14): {
  books,
  recentlyReadBooks,
  recentlyAddedBooks,
  seriesList,
  loading,
  initialized,
  error,
  fetchAllData,
}, currentReadingBook, homeSearch, homeSearchResults, mobileRecentBooks, mobileSeries, router, { ttsBook, ttsStatus, play: playTTS, togglePlay: toggleTTS } (+6 more)

### Community 45 - "PreferencesMobile.vue"
Cohesion: 0.09
Nodes (15): { addToast }, appBackgroundOptions, applyingFormat, backgroundOptions, bookActionDisplayOptions, darkAppBackgroundOptions, { enabledFormats, formatMode, countAffected, applyFormatMode }, formatFilterOptions (+7 more)

### Community 46 - "StreakCalendarMobile.vue"
Cohesion: 0.05
Nodes (46): actionState, { activeDates, streakStats }, activeSet, { addToast }, blobToBase64(), breakInsight, calendarCells, createStreakImage() (+38 more)

### Community 47 - "BookishSelect.vue"
Cohesion: 0.15
Nodes (21): close(), emit, highlightedIndex, isOpen, menuRef, menuStyle, move(), normalizedOptions (+13 more)

### Community 48 - "generate-version-manifest.mjs"
Cohesion: 0.13
Nodes (15): isSafeApkUrl(), MAX_VERSION_CODE, normalizeUpdateManifest(), shouldPromptForUpdate(), toVersionCode(), accepted, args, manifest (+7 more)

### Community 49 - "AnnotationListMobile.vue"
Cohesion: 0.10
Nodes (15): { addToast }, book, bookId, { books }, confirmDelete, editing, { highlights, notes }, items (+7 more)

### Community 50 - "MobilePlayingBar.vue"
Cohesion: 0.10
Nodes (14): coverUrl, dragging, fallbackCover, hasBottomNav, { isMobileView }, isPlaying, NAV_ROUTES, route (+6 more)

### Community 51 - "AddToPlaylistModal.vue"
Cohesion: 0.12
Nodes (18): { addToast }, { collections, createPlaylist, addBookToPlaylist, removeBookFromPlaylist }, coverUrl, createAndAdd(), creating, emit, finish(), generateCoverPlaceholder() (+10 more)

### Community 52 - "loadBook"
Cohesion: 0.21
Nodes (18): _buildChunkMap(), _cancelScheduledChunkMapBuild(), clearHtmlHighlight(), ensurePdfToc(), _highlightChunk(), initialReadingChunk(), initialSectionIndex(), _isNearViewport() (+10 more)

### Community 53 - "migrationEngine.ts"
Cohesion: 0.16
Nodes (24): CanaryExecutionReport, executeSingleBookCanary(), ALLOWED_REPAIR_FIELDS, AllowedRepairField, cloneLibrary(), isUserOverrideProtected(), MigrationManifest, MigrationResult (+16 more)

### Community 54 - "series-books.get.ts"
Cohesion: 0.36
Nodes (5): CacheEntry, normalizeKey(), seriesCacheKey(), withSeriesCache(), root

### Community 55 - "package.json"
Cohesion: 0.11
Nodes (17): config, name, private, type, version, @capacitor/android, @capacitor/cli, @capacitor-community/text-to-speech (+9 more)

### Community 56 - "EmptyState.vue"
Cohesion: 0.10
Nodes (8): { allAuthors, loading, initialized }, router, { genresList }, props, ratingInfo, {
  books,
  recentlyAddedBooks,
  recentAuthors,
  popularBooks,
  loading,
  initialized,
  error,
  fetchAllData,
}, { play: playTTS, togglePlay: toggleTTS, ttsBook, ttsStatus }, router

### Community 57 - "DeviceBooksPlugin"
Cohesion: 0.21
Nodes (5): DeviceBooksPlugin, android.net.Uri, com.getcapacitor.annotation.PermissionCallback, com.getcapacitor.JSArray, JSArray

### Community 58 - "Bookish UX batch — voices, position sync, filters, format removal, PDF reflow"
Cohesion: 0.07
Nodes (26): 1. Offline voice list: duplicates and no gender label, 2. Reading position across page and scroll mode, 3. "Currently Reading" shows the last narrated book, 4. Per-page filter independence and persistence, 5. Playlist icon does not indicate membership, 6. Format removal and first-boot chooser, 7. Text visible below the chapter pill in scroll mode, 8. WPS-style Original View / Reflow mode for PDFs (mobile only) (+18 more)

### Community 59 - "FavouritesMobile.vue"
Cohesion: 0.09
Nodes (20): handleDelete(), closeDeleteModal(), deleteBook(), { addToast }, confirmDelete(), displayedFavourites, { favourites, toggleFavourite, deleteBook, hideBook, loading, initialized }, favouritesBackground (+12 more)

### Community 60 - "SeriesMobile.vue"
Cohesion: 0.12
Nodes (13): items, route, bookStatus(), collectionState(), { filters: filterValues, setFilters }, filterSections, props, router (+5 more)

### Community 61 - "hideSelectionMenu"
Cohesion: 0.17
Nodes (18): annotationRoot(), cancelLongPress(), clearNativeSelection(), closeNoteEditor(), deleteNote(), hideSelectionMenu(), mountNearbyPlaceholders(), noteInteraction() (+10 more)

### Community 62 - "PlaylistsDesktop.vue"
Cohesion: 0.12
Nodes (18): emit, isBulk, props, { addToast }, closeContextMenu(), closeEditor(), { collections, books, updatePlaylist, deletePlaylist }, confirmDelete() (+10 more)

### Community 63 - "usePdfReflow.js"
Cohesion: 0.20
Nodes (18): lineIsInsideFigure(), appendLine(), assembleLines(), blocksForLines(), blocksToHtml(), collectRepeatedMarginText(), detectColumns(), endsParagraph() (+10 more)

### Community 64 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, @capacitor/android, @capacitor/app, @capacitor-community/text-to-speech, @capacitor/core, @capacitor/filesystem, @capacitor/ios, @capacitor/preferences (+10 more)

### Community 65 - "com.getcapacitor.PluginCall"
Cohesion: 0.31
Nodes (3): ApkInstallerPlugin, com.getcapacitor.PluginCall, com.getcapacitor.PluginMethod

### Community 66 - "vue"
Cohesion: 0.15
Nodes (8): showFormatChoice, mode, positionStyle, props, showBooks, router, { settings }, vue

### Community 67 - "uxBatchFive.test.js"
Cohesion: 0.24
Nodes (12): enabledAcceptAttribute(), enabledExtensionPattern(), formatModeFor(), isFormatEnabled(), normalizeEnabledFormats(), chunkForProgress(), progressForChunk(), READING_POSITION_SAVE_DELAY_MS (+4 more)

### Community 68 - "uxBatchSix.test.js"
Cohesion: 0.22
Nodes (10): PDF_ZOOM_MAX, boxesOverlap(), cropFiguresFromPage(), extractPdfFigures(), figureBoxesFromOperators(), mergeFigureBoxes(), multiply(), PDF_FIGURES_VERSION (+2 more)

### Community 69 - "SeriesCollageCard.vue"
Cohesion: 0.13
Nodes (14): background, bookCount, collectedCount, countLabel, coverStack, emit, highestBookTotal, isPlaylist (+6 more)

### Community 70 - "useStreak.js"
Cohesion: 0.31
Nodes (13): buildStreakRuns(), calculateStreakStats(), cleanDates(), dateFromKey(), dayNumber(), initialState(), legacyDates(), localDateKey() (+5 more)

### Community 71 - "useDeviceMetadataSearch.js"
Cohesion: 0.32
Nodes (13): applyGoogleBooksKey(), asSource(), enumerateSeriesOnDevice(), fetchBookMetadataOnDevice(), fetchSeriesBooksOnDevice(), fetchSeriesTotalOnDevice(), fromPublisher(), getGoodreadsSources() (+5 more)

### Community 72 - "SeriesDesktop.vue"
Cohesion: 0.10
Nodes (5): { isPhone, isPortrait }, props, router, { seriesList }, sortedSeriesList

### Community 73 - "emit"
Cohesion: 0.14
Nodes (15): chooseTocItem(), closeResumeChoice(), dockStep(), emit, listenSectionIdx, observePlaceholders(), onPagedPosition(), pageForChunkLocal() (+7 more)

### Community 74 - "LibraryControlsRow.vue"
Cohesion: 0.17
Nodes (13): builtInSections, defaultFor(), emit, filterOpen, formatFilters, hasActiveFilter, props, readingStatuses (+5 more)

### Community 75 - "hardcoverApi.ts"
Cohesion: 0.19
Nodes (15): compact(), fetchHardcoverSeriesRoster(), HardcoverRosterBook, HardcoverSeriesRoster, parseYear(), searchHardcover(), compact(), parseYear() (+7 more)

### Community 76 - "googleBooksApi.ts"
Cohesion: 0.20
Nodes (12): BOOKS_HOSTS, booksCache, buildGoogleBooksQueries(), GBResult, googleBooksCooldownFor(), googleBooksKey(), googleBooksRateLimited(), googleBooksRequest() (+4 more)

### Community 77 - "Composable: `composables/useTTS.js` (rewrite playback engine)"
Cohesion: 0.09
Nodes (21): Architecture, Chunk size, Cleanup, Component: `components/PlayingBar.vue`, Composable: `composables/useTTS.js` (rewrite playback engine), edge-tts Audiobook Player — Design Spec, Error Handling, Goal (+13 more)

### Community 78 - "useLibraryBackup.js"
Cohesion: 0.29
Nodes (13): base64ToBytes(), bytesToBase64(), clearStores(), deserializeValue(), LIBRARY_STORES, normalizeBackup(), openBookishDB(), readAllRecords() (+5 more)

### Community 79 - "Author Enrichment — Design Spec"
Cohesion: 0.10
Nodes (20): Architecture, Author Enrichment — Design Spec, `AuthorDetailComp.vue`, Data Storage Changes, Enrichment Flow, Error Handling, Frontend Changes, Image picker behaviour (+12 more)

### Community 80 - "chunkIndexForCurrentPosition"
Cohesion: 0.19
Nodes (13): chunkIndexForCurrentPosition(), confirmReadFromHere(), currentPositionChunk(), flushPendingSave(), onReaderScroll(), playFromChunk(), playFromCurrentPosition(), queueProgressSave() (+5 more)

### Community 81 - "Getting Started"
Cohesion: 0.11
Nodes (17): 1. Clone the repository, 2. Install dependencies, 3. Configure optional environment variables, 4. Start the development server, Android Build, Data Model, Development builds install alongside, not over, Features (+9 more)

### Community 82 - "MobileTopNav.vue"
Cohesion: 0.15
Nodes (8): firstName, isFirstBoot, { profile, activeAvatarPreset, loadProfile }, profileAvatarSrc, router, { settings }, showStreak, { streakCount }

### Community 83 - "SettingsMobile.vue"
Cohesion: 0.14
Nodes (14): { addToast }, appVersion, { canShareApp, shareApp }, handleSettingsRow(), mobileSettingsRows, navigate(), { profile, activeAvatarPreset, loadProfile }, profileAvatarSrc (+6 more)

### Community 84 - "useAppUpdate.js"
Cohesion: 0.22
Nodes (10): DEFERRED_VERSION_KEY, readDeferredCode(), readInstalledVersion(), readSkippedCode(), SKIPPED_VERSION_KEY, useAppUpdate(), writeDeferredCode(), writeSkippedCode() (+2 more)

### Community 85 - "LibraryDisplayControls.vue"
Cohesion: 0.14
Nodes (17): activeStatusIndex, activeViewIndex, props, statusChipsRef, statusHighlightActive, statusHighlightStyle, statusHoverIndex, statusOptions (+9 more)

### Community 86 - "useEdgeSpeechClient.js"
Cohesion: 0.33
Nodes (11): appendEdgeWordBoundaries(), audioPartsToDataUrl(), buildEdgeSsml(), EDGE_TTS_RATE_MAP, edgeRateForSpeed(), escapeSsmlText(), extractEdgeAudioPayload(), generateSecMsGec() (+3 more)

### Community 87 - "composables/useEpubExtractor.js"
Cohesion: 0.28
Nodes (10): extractEpub(), inlineCssUrls(), parseXml(), PASSTHROUGH_AT, readBlock(), resolvePath(), scopeCss(), toDataUrl() (+2 more)

### Community 88 - "useLibraryFilters.js"
Cohesion: 0.26
Nodes (12): DEFAULT_LIBRARY_FILTERS, FORMAT_OPTIONS, LIBRARY_FILTERS_KEY_PREFIX, loadScope(), matchesLibraryFilters(), normalizeLibraryFilters(), resetLibraryFiltersForTests(), resolveStorage() (+4 more)

### Community 89 - "internetArchiveApi.ts"
Cohesion: 0.29
Nodes (12): buildQueries(), fetchItemDetails(), IAResult, internetArchiveHeaders, normalizeArray(), normalizeCreator(), normalizeDescription(), normalizeGenre() (+4 more)

### Community 90 - "Local-First Library Migration Design"
Cohesion: 0.13
Nodes (14): Author Detail Routing, Book object (stored in IndexedDB `books` store), Collection object (stored in IndexedDB `collections` store), Data Model, Deleted: NeonDB + Drizzle infrastructure, Goal, Kept: Utility server routes (no user data), Local-First Library Migration Design (+6 more)

### Community 91 - "HiddenBooksMobile.vue"
Cohesion: 0.20
Nodes (11): { addToast }, filteredBooks, { filters, setFilter, matches }, handleRestore(), hiddenBooks, { listHiddenBooks, restoreHiddenBook }, loading, normalizedStatus() (+3 more)

### Community 92 - "ProfileMobile.vue"
Cohesion: 0.21
Nodes (11): { addToast }, avatarModalOpen, firstName, persistProfile(), {
  profile,
  avatarPresets,
  activeAvatarPreset,
  loadProfile,
  updateProfile,
}, profileAvatarSrc, profileDraftName, saveProfileDetails() (+3 more)

### Community 93 - "EditBookModal.vue"
Cohesion: 0.20
Nodes (7): closeModal(), coverInput, editedBook, emit, hoverRating, props, saveBook()

### Community 94 - "ProfileDesktop.vue"
Cohesion: 0.18
Nodes (12): { addToast }, avatarModalOpen, firstName, persistProfile(), {
  profile,
  avatarPresets,
  activeAvatarPreset,
  loadProfile,
  updateProfile,
}, profileAvatarSrc, profileDraftName, router (+4 more)

### Community 95 - "useLibrarySearch.test.js"
Cohesion: 0.26
Nodes (10): DEFAULT_SEARCH_LIMIT, FIELD_WEIGHTS, matchQuality(), normalizeSearchText(), searchLibrary(), dracula, dune, emma (+2 more)

### Community 96 - "MainActivity"
Cohesion: 0.36
Nodes (4): Override, MainActivity, android.os.Bundle, com.getcapacitor.BridgeActivity

### Community 97 - "MultiStepLoader.vue"
Cohesion: 0.22
Nodes (10): activeIndex, activeText, currentIndex, hasControlledStatuses, normalizedStates, props, startTimer(), stepClass() (+2 more)

### Community 98 - "useApiEndpoint.js"
Cohesion: 0.42
Nodes (7): BOOKISH_API_BASE_URL_KEY, joinApiUrl(), normalizeApiBaseUrl(), readStoredApiBaseUrl(), resolveApiBaseUrl(), useApiEndpoint(), writeStoredApiBaseUrl()

### Community 99 - "useDeviceArchitecture.js"
Cohesion: 0.24
Nodes (13): classifyDevice(), deviceClass, INSTALLED_DEVICE_CLASS_KEY, isNativeApp(), orientation, physicalScreenSize(), ready, startListening() (+5 more)

### Community 100 - "NarrationService"
Cohesion: 0.33
Nodes (6): android.app.Notification, android.app.Service, Override, NarrationService, android.content.Intent, android.os.IBinder

### Community 101 - "DeleteConfirmModal.vue"
Cohesion: 0.32
Nodes (7): closeModal(), confirmDelete(), emit, formatLabel, isBulk, props, removesDeviceFile

### Community 102 - "seriesMutationGuard.js"
Cohesion: 0.33
Nodes (6): AUTOMATIC_SERIES_FIELDS, hasProtectedFlag(), isSeriesFieldProtected(), isSeriesRepairProtected(), same(), validateAutomaticSeriesMutation()

### Community 103 - "useEpubPageMap.js"
Cohesion: 0.22
Nodes (3): EPUB_PAGE_MAP_PREFIX, prunePageMapCache(), writePageMapCache()

### Community 104 - "make-gallery.mjs"
Cohesion: 0.27
Nodes (9): BASE, CARDS, __dirname, esc(), loadCover(), makeCard(), makeShadow(), OUT (+1 more)

### Community 105 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, cap:open:android, cap:open:ios, cap:sync, dev, generate, postinstall (+2 more)

### Community 106 - "ExampleInstrumentedTest.java"
Cohesion: 0.33
Nodes (5): ExampleInstrumentedTest, ExampleUnitTest, androidx.test.ext.junit.runners.AndroidJUnit4, org.junit.runner.RunWith, org.junit.Test

### Community 107 - "ReaderFigureViewer.vue"
Cohesion: 0.25
Nodes (6): emit, index, onTap(), props, stageRef, zoomed

### Community 108 - "onScrollTap"
Cohesion: 0.22
Nodes (9): cancelChromeAutoHide(), hidePdfReadHere(), onPdfTouchStart(), onScrollTap(), openFigureViewer(), pdfPageAtPoint(), readFromPressedPage(), scheduleChromeAutoHide() (+1 more)

### Community 109 - "useBooks.js"
Cohesion: 0.33
Nodes (7): DEFAULT_BOOKISH_SETTINGS, canonicalLibrarySeriesName(), coverCacheInFlight, groupBooksBySeries(), normalizeLibrarySeriesName(), reconcileStatusProgress(), useBooks()

### Community 110 - "selectionAndFilters.test.js"
Cohesion: 0.28
Nodes (4): LONG_PRESS_MS, useMultiSelect(), shouldAskWhereToResume(), root

### Community 111 - "playlist/[id].vue"
Cohesion: 0.22
Nodes (7): { addToast }, { books, collections, updatePlaylist }, editingPlaylist, playlist, playlistBooks, route, savingPlaylist

### Community 112 - "serie/[id].vue"
Cohesion: 0.22
Nodes (8): derivedSeriesTotal, route, series, seriesBooks, seriesCountLabel, { seriesList, updateBook }, seriesName, seriesTotalRefreshKey

### Community 113 - "openLibraryApi.ts"
Cohesion: 0.36
Nodes (7): extractGenres(), normalizeSubjectGenre(), OLResult, openLibraryHeaders, pickPublisher(), safeOpenLibraryKey(), searchOpenLibrary()

### Community 114 - "MobileSettingsNav.vue"
Cohesion: 0.29
Nodes (6): compactPageTitle, formatLongTitle(), pageTitle, props, route, router

### Community 115 - "sectionStartChunkLocal"
Cohesion: 0.25
Nodes (8): buildPageMap(), chunkAtVisiblePage(), _idleSlice(), listenEpubGlobalPage, listenStartChunk, sampleScrollChunk(), sectionStartChunkLocal(), setReaderMode()

### Community 116 - "onSelectionSettled"
Cohesion: 0.25
Nodes (8): cancelPdfLongPress(), menuPointForRange(), onAnnotationTap(), onPdfTouchEnd(), onPdfTouchMove(), onSelectionChange(), onSelectionSettled(), openSelectionMenu()

### Community 117 - "AppUpdateModal.vue"
Cohesion: 0.25
Nodes (5): { available, installed, skip, dismiss }, busy, inAppCapable, installedName, {
  state: install,
  canInstallInApp,
  downloadAndInstall,
  openInstallSettings,
  reset,
}

### Community 118 - "FormatChoiceModal.vue"
Cohesion: 0.29
Nodes (7): { applyFormatMode }, chosen, confirm(), emit, options, saving, { updateSettings }

### Community 119 - "PlaylistEditModal.vue"
Cohesion: 0.29
Nodes (6): canSave, emit, name, nameInput, props, save()

### Community 120 - "SettingsAudioPanel.vue"
Cohesion: 0.25
Nodes (4): currentVoiceName, { settings, updateSettings }, speedOptions, { ttsVoices, setSpeed, setVolume, setVoice }

### Community 121 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, @capacitor/cli, dotenv, fake-indexeddb, happy-dom, @nuxt/test-utils, playwright-core, vitest

### Community 122 - "vue-router"
Cohesion: 0.15
Nodes (12): isMobileSubPage, route, TAB_ROOT_PATHS, book, { books, loading }, coverUrl, generateCoverPlaceholder(), handleCoverError() (+4 more)

### Community 123 - "vercel-analytics.client.js"
Cohesion: 0.36
Nodes (4): absolutePath(), getBasePath(), getClientConfig(), injectAnalytics()

### Community 124 - "DeviceBooksPlugin.java"
Cohesion: 0.43
Nodes (3): SystemBarsPlugin, com.getcapacitor.annotation.CapacitorPlugin, com.getcapacitor.Plugin

### Community 125 - "FavouritesDesktop.vue"
Cohesion: 0.17
Nodes (11): closeDeleteModal(), deleteBook(), confirmDelete(), { favourites, toggleFavourite, deleteBook, loading, initialized }, handlePlay(), isBookActive(), { play: playTTS, togglePlay: toggleTTS, ttsBook, ttsStatus }, router (+3 more)

### Community 126 - "Local-First Library Migration Implementation Plan"
Cohesion: 0.15
Nodes (12): File Map, Local-First Library Migration Implementation Plan, Self-Review, Spec coverage check, Task 1: Create `useLibraryStore.js` with tests, Task 2: Rewrite `composables/useBooks.js`, Task 3: Update `composables/useBooks.test.js`, Task 4: Fix component — `CollectionsComp.vue` (+4 more)

### Community 127 - "Read-Aloud Word Highlight, Instant Highlight & Lazy PDF Render"
Cohesion: 0.15
Nodes (12): 1. Word-level highlight (two-tier), 2. Instant sentence highlight & warmer prefetch, 3. Lazy PDF render, Background, EPUB, Errors / fallback, Goal, PDF (+4 more)

### Community 128 - "useChunkSpans.js"
Cohesion: 0.48
Nodes (5): buildTextIndex(), decodeHtmlEntities(), mapSectionChunks(), normalizeForSearch(), resolveRangePoint()

### Community 129 - "useLibraryBackup.test.js"
Cohesion: 0.22
Nodes (11): DEFAULT_PROFILE, LIBRARY_DB_NAME, nextTimestamp(), normalizeProfile(), openLibraryDB(), PROFILE_AVATAR_TYPES, PROFILE_ID, toPlainRecord() (+3 more)

### Community 130 - "Pages_Master_AI_Knowledge_Base_Combined.md"
Cohesion: 0.15
Nodes (12): 18. Critical Invariants, Failure Modes & Discovered Behaviors, 1. Endpoint Summary, 1. Platform View Selection, 1. Security Safeguards, 1. Technical Debt Inventory, Critical System Invariants, Pages (Bookish): Complete Reverse-Engineered Master AI Knowledge Base & Architectural Interrogation Report, Phase 12: Security & Privacy Audit (+4 more)

### Community 131 - "Sidebar.vue"
Cohesion: 0.21
Nodes (11): getActiveRouteIndex(), highlightStyle, hoverIndex, isHighlightActive, isMenuItemActive(), isSettingsActive, menuItems, navRef (+3 more)

### Community 132 - "kokoroTts.worker.js"
Cohesion: 0.53
Nodes (5): getTts(), isFirefox(), loadTts(), runtimeCandidates(), kokoro-js

### Community 133 - "IndexedDB Book Content Storage"
Cohesion: 0.17
Nodes (11): Adding a Book, Data Flows, Decision: Existing Books, Deleting a Book, Files Changed, IndexedDB Book Content Storage, IndexedDB Schema, Out of Scope (+3 more)

### Community 134 - "mobileTtsDriver.js"
Cohesion: 0.48
Nodes (5): documentHidden(), hasUsableAudio(), mobileTtsEdgeDisabled(), noteEdgeFailure(), synthesizeMobileSpeech()

### Community 135 - "Read-Aloud Word Highlight, Instant Highlight & Lazy PDF Render — Implementation Plan"
Cohesion: 0.18
Nodes (10): File Structure, Final Verification, Read-Aloud Word Highlight, Instant Highlight & Lazy PDF Render — Implementation Plan, Self-Review, Task 1: Manifest `textStart` + `wordSpansWithinChunk`, Task 2: Geometry `spansToRects` + `chunkSubRangeRects`, Task 3: PDF word-highlight overlay + reader wiring, Task 4: EPUB word highlight via CSS Custom Highlight API (+2 more)

### Community 136 - "useFormatEnablement.js"
Cohesion: 0.60
Nodes (5): booksOfFormat(), formatLabel(), formatsAddedBy(), formatsRemovedBy(), useFormatEnablement()

### Community 137 - "useHtmlSanitizer.js"
Cohesion: 0.47
Nodes (4): BLOCKED_TAGS, compactScheme(), sanitizeBookHtml(), URL_ATTRIBUTES

### Community 138 - "useBookStorage.js"
Cohesion: 0.33
Nodes (10): cloneForStorage(), DEVICE_FILE_MARKER, emptyStorageSummary(), estimateStoredBytes(), normalizeSourceForStorage(), openDB(), pdfFileName(), sourceToArrayBuffer() (+2 more)

### Community 139 - "useReaderPosition.test.js"
Cohesion: 0.60
Nodes (4): chunkIndexForSection(), pdfProgressForPage(), sectionForChunkIndex(), visiblePageFromRects()

### Community 140 - "useReaderPrewarm.js"
Cohesion: 0.53
Nodes (5): clearPrewarmedReaderContent(), getPrewarmedReaderContent(), normalizeId(), prewarmReaderContent(), readerContentCache

### Community 141 - "IndexedDB Book Content Storage Implementation Plan"
Cohesion: 0.20
Nodes (9): File Map, IndexedDB Book Content Storage Implementation Plan, Task 1: Create `useBookStorage` composable, Task 2: Update `useBooks.js`, Task 3: Update `AddBookComp.vue`, Task 4: Update Server API Endpoints, Task 5: Drop `content` Column from Schema and Run Migration, Task 6: Update the Reader to Load Content from IndexedDB (+1 more)

### Community 142 - "useCoverFallback.js"
Cohesion: 0.50
Nodes (3): coverPlaceholder(), onCoverError(), PLACEHOLDER_COLORS

### Community 143 - "EPUB & PDF Reader Support — Design Spec"
Cohesion: 0.20
Nodes (9): Architecture, EPUB & PDF Reader Support — Design Spec, EPUB Processing (`AddBookModal.vue`), Error States Summary, Goal, Out of Scope, PDF Handling (`AddBookModal.vue`), Problem (+1 more)

### Community 144 - "mountSection"
Cohesion: 0.60
Nodes (5): goToAdjacentChapter(), goToSectionFromMobile(), goToTocItem(), mountSection(), scrollToChapter()

### Community 145 - "sign-release-apk.sh"
Cohesion: 0.90
Nodes (4): die(), ensure_java(), find_tool(), sign-release-apk.sh script

### Community 146 - "scrape-image.get.ts"
Cohesion: 0.50
Nodes (3): findWikidataImage(), headers, imageInfoForFile()

### Community 147 - "Library and Playlist UI Improvements Design"
Cohesion: 0.20
Nodes (9): Add-to-Playlist Modal, Book Grid Layout, Error Handling, Goal, Library and Playlist UI Improvements Design, Playlist Management, Settings and Pagination, Table Hover Color (+1 more)

### Community 148 - "mobileDesktopPurity.test.js"
Cohesion: 0.50
Nodes (3): lineCount(), read(), root

### Community 149 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 150 - "fetchMetadata"
Cohesion: 0.50
Nodes (4): createMetadataLoadingStates(), fetchMetadata(), resetMetadataProgress(), updateMetadataProgress()

### Community 151 - "fetchMetadata"
Cohesion: 0.50
Nodes (4): createMetadataLoadingStates(), fetchMetadata(), resetMetadataProgress(), updateMetadataProgress()

### Community 152 - "Reader, Metadata, and Author Repairs Design"
Cohesion: 0.20
Nodes (9): Author Details, Goal, Goodreads Metadata, PDF Highlighting, Read From Here, Reader, Metadata, and Author Repairs Design, Select Controls, Table of Contents (+1 more)

### Community 153 - "edge-tts Implementation Plan"
Cohesion: 0.22
Nodes (8): edge-tts Implementation Plan, File Map, Self-Review Checklist, Task 1: Install msedge-tts, Task 2: Create the TTS API endpoint, Task 3: Rewrite useTTS.js, Task 4: Update PlayingBar.vue, Task 5: Clean up VoxCPM traces

### Community 154 - "Library and Playlist UI Improvements Implementation Plan"
Cohesion: 0.22
Nodes (8): Library and Playlist UI Improvements Implementation Plan, Task 1: Independent Pagination Settings, Task 2: Remove Temporary Series Backfill UI, Task 3: Playlist Persistence Operations, Task 4: Reusable Playlist Editor, Task 5: Grid Progress and Table Hover Styling, Task 6: Redesign Add-to-Playlist Modal, Task 7: Verification

### Community 155 - "closeChapterMenu"
Cohesion: 0.50
Nodes (4): closeChapterMenu(), jumpToChapter(), onDocumentClick(), onDocumentKeydown()

### Community 159 - "useSeriesRepair.js"
Cohesion: 0.83
Nodes (3): normalizeText(), reconcileAndRepairBookSeries(), useSeriesRepair()

### Community 160 - "Reader, Metadata, and Author Repairs Implementation Plan"
Cohesion: 0.22
Nodes (8): Reader, Metadata, and Author Repairs Implementation Plan, Task 1: Goodreads blocked-response fallback, Task 2: PDF TOC display titles, Task 3: Exact PDF page-to-chunk mapping, Task 4: PDF.js text-layer highlighting, Task 5: Reliable author enrichment and totals, Task 6: Shared select styling, Task 7: Integrated verification

### Community 161 - "updateBookEdge"
Cohesion: 0.50
Nodes (4): handlePdfLoaded(), updateBookEdge(), zoomIn(), zoomOut()

### Community 163 - "useUserProfile.js"
Cohesion: 0.25
Nodes (9): BOOKISH_PROFILE_UPDATED_EVENT, DEFAULT_USER_PROFILE, getProfileInitial(), normalizeProfile(), notifyProfileUpdated(), PROFILE_AVATAR_PRESETS, profileState, USER_AVATAR_OPTIONS (+1 more)

### Community 164 - "saveBook"
Cohesion: 0.67
Nodes (3): generateCoverPlaceholder(), getPdfSourceForStorage(), saveBook()

### Community 165 - "applyVoiceChoice"
Cohesion: 0.67
Nodes (3): applyVoiceChoice(), chooseNarrator(), chooseVoice()

### Community 166 - "Series Collection Progress Design"
Cohesion: 0.22
Nodes (8): Architecture, Counting Rules, Data Flow, Failure Handling, Goal, Series Collection Progress Design, Testing, UI

### Community 167 - "saveBook"
Cohesion: 0.67
Nodes (3): generateCoverPlaceholder(), getPdfSourceForStorage(), saveBook()

### Community 172 - "parseChapters"
Cohesion: 0.67
Nodes (3): chapterList, extractTitle(), parseChapters()

### Community 175 - "mobileTtsDriver.test.js"
Cohesion: 0.25
Nodes (4): EDGE_AUDIO, $fetch, nativeSpeechSupported, synthesizeEdgeSpeechInBrowser

### Community 176 - "ReaderNoteEditor.vue"
Cohesion: 0.29
Nodes (5): draft, inputRef, overlayStyle, props, viewport

### Community 177 - "CoverImageModal.vue"
Cohesion: 0.29
Nodes (5): coverLoadingStates, failedImages, normalizedImages, props, visibleImages

### Community 179 - "PDF Manifest and Author Totals Redesign Implementation Plan"
Cohesion: 0.25
Nodes (7): PDF Manifest and Author Totals Redesign Implementation Plan, Task 1: Remove the failed reader and author-count pipelines, Task 2: Build a canonical PDF manifest, Task 3: Make PDF TTS consume manifest chunks, Task 4: Rebuild highlight and reader navigation from manifest IDs, Task 5: Build validated full-length author totals, Task 6: Repeated browser and integration verification

### Community 180 - "Series Data Backfill Design"
Cohesion: 0.25
Nodes (7): Architecture, Batch Behavior, Goal, Persistence, Series Data Backfill Design, Testing, UI

### Community 181 - "EPUB & PDF Reader Support Implementation Plan"
Cohesion: 0.29
Nodes (6): EPUB & PDF Reader Support Implementation Plan, Task 1: Install jszip, Task 2: Create EPUB extractor composable, Task 3: Update AddBookModal to process EPUB and PDF, Task 4: Update the reader to render PDF via embed, Task 5: Add chapter-break style for EPUB

### Community 183 - "Metadata Scraper Redesign Implementation Plan"
Cohesion: 0.29
Nodes (6): Metadata Scraper Redesign Implementation Plan, Task 1: Google Books API utility, Task 2: Kobo scraper, Task 3: Add `getGoodreadsReview` to existing scraper, Task 4: Rewrite the metadata endpoint, Task 5: Manual verification

### Community 184 - "File Structure"
Cohesion: 0.29
Nodes (6): File Structure, Series Collection Progress Implementation Plan, Task 1: Goodreads Series Count, Task 2: Metadata Propagation, Task 3: Series Progress Labels, Task 4: End-to-End Verification

### Community 185 - "Series Data Backfill Implementation Plan"
Cohesion: 0.29
Nodes (6): Series Data Backfill Implementation Plan, Task 1: Batch Series Service, Task 2: Settings Backfill Control, Task 3: Add/Edit Persistence, Task 4: Local-Only Series Route, Task 5: Verification

### Community 191 - "PDF Manifest and Author Totals Redesign"
Cohesion: 0.14
Nodes (13): Author Totals, Canonical PDF Manifest, Goal, Highlight, Jump To Narration, PDF Manifest and Author Totals Redesign, Persistence, Read From This Page (+5 more)

### Community 192 - "Mobile Native Reader Implementation Plan"
Cohesion: 0.29
Nodes (6): Mobile Native Reader Implementation Plan, Task 1: Tests, Task 2: Reader Prewarm, Task 3: PWA, Task 4: Capacitor, Task 5: Verification

### Community 193 - "1. Primary Entities & Schema Definition"
Cohesion: 0.29
Nodes (7): 1. Primary Entities & Schema Definition, 2. Vue Proxy Serialization Protection, Entity 1: `Book` Record, Entity 2: `Collection` (Playlist) Record, Entity 3: `BookContent` Record (IndexedDB `bookish-storage` -> `book-content`), Entity 4: `PdfSource` Record (IndexedDB `bookish-storage` -> `book-pdf-source`), Phase 2: Data Model & Storage

### Community 202 - "desktopTtsDriver.test.js"
Cohesion: 0.33
Nodes (3): $fetch, nativeSpeechSupported, SERVER_AUDIO

### Community 227 - "Empty State Redesign"
Cohesion: 0.33
Nodes (5): Design, Empty State Redesign, Files Changed, Problem, Solution

### Community 228 - "initializeSectionMounting"
Cohesion: 0.40
Nodes (6): applyStoredReaderContent(), _cancelIdleSectionMounting(), initializeSectionMounting(), observeChapters(), _onAllSectionsMounted(), _startIdleSectionMounting()

### Community 229 - "AuthorImageModal.vue"
Cohesion: 0.40
Nodes (4): loadingStates, props, subtitle, title

### Community 230 - "Q: every time i try to play a book in horizintal for tablet, it says tts failed check your connection, find the problem and fix"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: every time i try to play a book in horizintal for tablet, it says tts failed check your connection, find the problem and fix, Source Nodes

### Community 231 - "Q: Why does browser tablet landscape TTS still show TTS failed check your connection after invalid endpoint responses were handled?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does browser tablet landscape TTS still show TTS failed check your connection after invalid endpoint responses were handled?, Source Nodes

### Community 232 - "Q: Screenshot shows browser TTS still fails while POST /api/tts returns 200 OK with content-length 59"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Screenshot shows browser TTS still fails while POST /api/tts returns 200 OK with content-length 59, Source Nodes

### Community 233 - "Q: is electron the best for this project? for performance and speed without eating resources?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: is electron the best for this project? for performance and speed without eating resources?, Source Nodes

### Community 234 - "Q: will it function/behave like an actual desktop app and not just a mock?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: will it function/behave like an actual desktop app and not just a mock?, Source Nodes

### Community 235 - "Q: Only Sonia UK, Ryan UK, and Natasha AU are actual voices; the rest male and female sound the same and robotic"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Only Sonia UK, Ryan UK, and Natasha AU are actual voices; the rest male and female sound the same and robotic, Source Nodes

### Community 236 - "Phase 1: Architecture & Lifecycle"
Cohesion: 0.50
Nodes (4): 1. Architectural Overview & Major Subsystems, 2. Complete Runtime Lifecycle (Startup to Shutdown), Execution Trace, Phase 1: Architecture & Lifecycle

### Community 237 - "Phase 3: Metadata Intelligence Engine"
Cohesion: 0.50
Nodes (4): 1. Multi-Provider Aggregation & Priority Rankings, 2. Candidate Scoring Formula (`scoreSource`), 3. LLM Metadata Verifier Integration, Phase 3: Metadata Intelligence Engine

### Community 238 - "Phase 7: Text-to-Speech (TTS) & Media Subsystem"
Cohesion: 0.50
Nodes (4): 1. Speech Driver Delegation (`useTTS.js`), 2. Silent WAV Keep-Alive Loop, 3. Native MediaSession Controls (`media-session.client.js`), Phase 7: Text-to-Speech (TTS) & Media Subsystem

### Community 239 - "Phase 5: Book Ingestion & EPUB/PDF Processing"
Cohesion: 0.67
Nodes (3): 1. EPUB Extraction Pipeline (`useEpubExtractor.js`), 2. PDF Ingestion & Filesystem Offloading, Phase 5: Book Ingestion & EPUB/PDF Processing

### Community 240 - "1. Master System Overview & Architecture Diagrams"
Cohesion: 0.67
Nodes (3): 1. Master System Overview & Architecture Diagrams, Complete System Architecture Diagram, Directory Structure & File Map

### Community 241 - "Phase 6: Reader & Annotations Architecture"
Cohesion: 0.67
Nodes (3): 1. ReadEra-Style Offscreen Column Pagination (`useEpubPageMap.js`), 2. Sentence-Based Annotation Anchoring (`useAnnotations.js`), Phase 6: Reader & Annotations Architecture

### Community 242 - "Phase 4: Series Intelligence Engine"
Cohesion: 0.67
Nodes (3): 1. Roster-Driven Totals Over Book-Level Totals Architecture, 2. Two-Tiered AI Placement Verification, Phase 4: Series Intelligence Engine

### Community 263 - "appVersioning.test.js"
Cohesion: 0.40
Nodes (3): buildGradle, packageJson, root

### Community 264 - "closeCoverModal"
Cohesion: 0.50
Nodes (4): closeCoverModal(), handleCoverChange(), selectBookCover(), triggerCoverInput()

### Community 265 - "fetchMetadata"
Cohesion: 0.50
Nodes (4): createMetadataLoadingStates(), fetchMetadata(), resetMetadataProgress(), updateMetadataProgress()

### Community 266 - "useCoverSearch.js"
Cohesion: 0.83
Nodes (3): fetchCoverImageResults(), fetchMetadataCoverImages(), fetchWebCoverImages()

### Community 267 - "overrides"
Cohesion: 0.50
Nodes (4): overrides, glob, workbox-build, source-map

### Community 268 - "closeCoverModal"
Cohesion: 0.67
Nodes (3): closeCoverModal(), selectBookCover(), triggerCoverInput()

## Knowledge Gaps
- **1476 isolated node(s):** `graphify`, `Pages (Bookish): Complete Reverse-Engineered Master AI Knowledge Base & Architectural Interrogation Report`, `Table of Contents`, `Directory Structure & File Map`, `Complete System Architecture Diagram` (+1471 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1915 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `desktopTtsDriver.test.js` (2× useful, score=1.999473641)
- `nativeSpeech.js` (2× useful, score=1.999473641)
- `package.json` (2× useful, score=1.999473641)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `ReaderMobile.vue`, `useSeriesSuggestions.js`, `reader/[id].vue`, `Sidebar.vue`, `BooksDesktop.vue`, `BooksMobile.vue`, `AddBookMobile.vue`, `EditBookMobile.vue`, `AddBookComp.vue`, `useAutoMetadata.js`, `useBookStorage.js`, `useFormatEnablement.js`, `SeriesDetailMobile.vue`, `ReaderPagedEpub.vue`, `PlayingBar.vue`, `AuthorDetailComp.vue`, `SettingsDesktop.vue`, `SettingsStorageMobile.vue`, `useTTS.js`, `PdfViewer.vue`, `useBookishSettings.js`, `EditBookComp.vue`, `PlaylistDetailMobile.vue`, `PlaylistsMobile.vue`, `BookDetailMobile.vue`, `BookGroupDetail.vue`, `ConnectionTestPanel.vue`, `SettingsStoragePanel.vue`, `useAnnotations.js`, `useMobileReaderPrefs.js`, `responsiveComponentSplit.test.js`, `useUserProfile.js`, `LibraryBookCard.vue`, `HomeMobile.vue`, `PreferencesMobile.vue`, `StreakCalendarMobile.vue`, `BookishSelect.vue`, `ReaderNoteEditor.vue`, `AnnotationListMobile.vue`, `MobilePlayingBar.vue`, `AddToPlaylistModal.vue`, `CoverImageModal.vue`, `package.json`, `EmptyState.vue`, `FavouritesMobile.vue`, `SeriesMobile.vue`, `PlaylistsDesktop.vue`, `SeriesCollageCard.vue`, `useStreak.js`, `SeriesDesktop.vue`, `LibraryControlsRow.vue`, `MobileTopNav.vue`, `SettingsMobile.vue`, `LibraryDisplayControls.vue`, `useLibraryFilters.js`, `HiddenBooksMobile.vue`, `ProfileMobile.vue`, `EditBookModal.vue`, `ProfileDesktop.vue`, `MultiStepLoader.vue`, `useDeviceArchitecture.js`, `AuthorImageModal.vue`, `DeleteConfirmModal.vue`, `ReaderFigureViewer.vue`, `useBooks.js`, `selectionAndFilters.test.js`, `playlist/[id].vue`, `serie/[id].vue`, `AppUpdateModal.vue`, `FormatChoiceModal.vue`, `PlaylistEditModal.vue`, `SettingsAudioPanel.vue`, `vue-router`, `FavouritesDesktop.vue`?**
  _High betweenness centrality (0.448) - this node is a cross-community bridge._
- **Why does `vitest` connect `vitest` to `useLibraryBackup.test.js`, `useSeriesSuggestions.js`, `composables/usePdfExtractor.js`, `aiMetadataVerifier.ts`, `goodreadsScraper.ts`, `appVersioning.test.js`, `useHtmlSanitizer.js`, `useBookStorage.js`, `useReaderPosition.test.js`, `imageSearch.ts`, `useAutoMetadata.js`, `publisherMetadata.ts`, `useBookMetadataSearch.js`, `mobileDesktopPurity.test.js`, `useTTS.js`, `productionSnapshotEngine.ts`, `useDeviceLibrarySync.js`, `useBookishSettings.js`, `seriesDomainTypes.ts`, `useAuthorDetails.test.js`, `useSelectOptions.test.js`, `responsiveComponentSplit.test.js`, `useUserProfile.js`, `useAnnotations.js`, `useMobileReaderPrefs.js`, `nativeSpeech.js`, `edgeTts.ts`, `useAuthorImageSearch.js`, `StreakCalendarMobile.vue`, `mobileTtsDriver.test.js`, `generate-version-manifest.mjs`, `migrationEngine.ts`, `series-books.get.ts`, `package.json`, `uxBatchFive.test.js`, `uxBatchSix.test.js`, `useStreak.js`, `desktopTtsDriver.test.js`, `hardcoverApi.ts`, `useEdgeSpeechClient.js`, `composables/useEpubExtractor.js`, `useLibrarySearch.test.js`, `useApiEndpoint.js`, `seriesMutationGuard.js`, `useBooks.js`, `selectionAndFilters.test.js`, `openLibraryApi.ts`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Why does `vue-router` connect `vue-router` to `ReaderMobile.vue`, `Sidebar.vue`, `AddBookMobile.vue`, `EditBookMobile.vue`, `AddBookComp.vue`, `SeriesDetailMobile.vue`, `PlayingBar.vue`, `AuthorDetailComp.vue`, `SettingsStorageMobile.vue`, `EditBookComp.vue`, `PlaylistDetailMobile.vue`, `PlaylistsMobile.vue`, `BookDetailMobile.vue`, `HomeMobile.vue`, `AnnotationListMobile.vue`, `MobilePlayingBar.vue`, `package.json`, `EmptyState.vue`, `SeriesMobile.vue`, `PlaylistsDesktop.vue`, `SeriesDesktop.vue`, `HiddenBooksMobile.vue`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **What connects `graphify`, `Pages (Bookish): Complete Reverse-Engineered Master AI Knowledge Base & Architectural Interrogation Report`, `Table of Contents` to the rest of the system?**
  _1476 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ReaderMobile.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.022988505747126436 - nodes in this community are weakly interconnected._
- **Should `useSeriesSuggestions.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0633964429145152 - nodes in this community are weakly interconnected._
- **Should `reader/[id].vue` be split into smaller, more focused modules?**
  _Cohesion score 0.022982635342185902 - nodes in this community are weakly interconnected._