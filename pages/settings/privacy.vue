<template>
  <MobileSettingsNav title="Privacy Policy" back-to="/settings" aria-label="Settings navigation" />
  <main class="privacy-page">
    <header class="privacy-hero">
      <span class="hero-icon" aria-hidden="true"><i class="ri-shield-keyhole-fill"></i></span>
      <h1>Your Privacy</h1>
      <p>Pages is a local-first reading application. Your library lives on your own device, an account is optional and used only for cloud backup, and Pages does not sell, rent, or trade any information about you. This policy explains exactly what data Pages handles, where it goes, and the choices you have.</p>
    </header>

    <!-- The policy in four lines; the full text follows. -->
    <section aria-labelledby="policy-glance">
      <h2 id="policy-glance" class="group-title">At a Glance</h2>
      <ul class="group glance">
        <li><i class="ri-smartphone-line" aria-hidden="true"></i><span>Your library stays on your device.</span></li>
        <li><i class="ri-user-line" aria-hidden="true"></i><span>An account is optional, and only for cloud backup.</span></li>
        <li><i class="ri-forbid-line" aria-hidden="true"></i><span>No ads, no trackers, and no selling of your data.</span></li>
        <li><i class="ri-delete-bin-line" aria-hidden="true"></i><span>Export or delete everything at any time.</span></li>
      </ul>
    </section>

    <section aria-labelledby="policy-1">
      <h2 id="policy-1" class="group-title">1. Data stored on your device</h2>
      <div class="group prose">
        <p>
            Everything you create in Pages is stored locally on the device you use it on, in browser
            storage (IndexedDB and localStorage) or the app's private storage on mobile. This includes:
          </p>
          <ul>
            <li>Books you upload (EPUB, PDF, and text files) and their extracted reading content;</li>
            <li>Book records: titles, authors, covers, series, genres, descriptions, and ratings;</li>
            <li>Playlists, favourites, collections, reading progress, and reading status;</li>
            <li>Audio (text-to-speech) session state, such as the last position narrated;</li>
            <li>Your settings, including theme, narrator voice, playback speed, and library layout;</li>
            <li>Your local profile name and avatar, if you set one.</li>
          </ul>
          <p>
            This data never leaves your device unless you explicitly export it or a feature described
            below requires a network request. Pages keeps no server-side copy of your library unless
            you turn on cloud backup (section 5).
          </p>
      </div>
    </section>

    <section aria-labelledby="policy-2">
      <h2 id="policy-2" class="group-title">2. Text-to-speech narration</h2>
      <div class="group prose">
        <p>
            When you use the Listen feature, the sentences being narrated are sent to Microsoft's
            Read&nbsp;Aloud text-to-speech service to generate audio. Only the text of the passage being
            read is transmitted — never your identity, your library, or your reading history. Microsoft's
            handling of that text is governed by
            <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener">Microsoft's Privacy Statement</a>.
            If you do not use Listen, no book text is ever transmitted.
          </p>
      </div>
    </section>

    <section aria-labelledby="policy-3">
      <h2 id="policy-3" class="group-title">3. Metadata, cover, and author-image lookups</h2>
      <div class="group prose">
        <p>
            Metadata search runs when you press a search button or choose Goodreads or StoryGraph as
            your app-wide rating source. A rating-source change continues in the background for the
            books already in your library. Pages queries public book-information sources with the
            title, author, or publisher saved for the book (and nothing else). Depending on the search,
            those sources may include: Goodreads, StoryGraph, Google Books, Google Images, Kobo, Open Library,
            Internet Archive, Bing Images, DuckDuckGo, Wikipedia, Wikidata, Wikimedia Commons, and
            public publisher websites. Each provider receives an ordinary web request containing your
            search terms and your device's network address (IP), as with any website visit, under that
            provider's own privacy policy.
          </p>
          <p>
            Returned details and images are saved into your local library when you apply them;
            ratings selected in Preferences are cached automatically so switching sources does not
            repeat completed lookups or discard earlier results.
          </p>
      </div>
    </section>

    <section aria-labelledby="policy-4">
      <h2 id="policy-4" class="group-title">4. Optional self-hosted server</h2>
      <div class="group prose">
        <p>
            You may connect the app to your own Pages server (Settings → Storage → Server
            connection). When configured, metadata and image searches are performed by that server on
            your behalf instead of directly from the device. Pages only communicates with the server
            address you enter, and you can remove it at any time.
          </p>
      </div>
    </section>

    <section aria-labelledby="policy-5">
      <h2 id="policy-5" class="group-title">5. Optional account and cloud backup</h2>
      <div class="group prose">
        <p>
            You can use Pages without an account. If you choose to sign in with Google, Pages
            receives your name, email address and profile photo from Google, and creates an account
            whose only purpose is backing up your library.
          </p>
          <p>
            A backup contains your library records, reading progress, highlights and notes,
            playlists, profile and settings, and, only if you turn on <em>Include book files</em>,
            the contents of your books. It is compressed on your device and stored in a private
            storage area (hosted by Supabase) that only your signed-in account can read. Backups
            run while the app is open, on the schedule you choose in Settings → Storage → Backup.
          </p>
          <p>
            From that page you can sign out, permanently delete every cloud backup, or delete your
            account together with all of its backups at any time.
          </p>
      </div>
    </section>

    <section aria-labelledby="policy-6">
      <h2 id="policy-6" class="group-title">6. Analytics</h2>
      <div class="group prose">
        <p>
            The hosted web version of Pages may collect anonymous, aggregated page-view analytics
            (via Vercel Web Analytics) to understand overall usage. These analytics do not use cookies,
            do not identify you, and do not include the contents of your library.
            <strong>The installed mobile app collects no analytics at all.</strong>
          </p>
      </div>
    </section>

    <section aria-labelledby="policy-7">
      <h2 id="policy-7" class="group-title">7. What Pages does not do</h2>
      <div class="group prose">
        <ul>
            <li>No passwords: the optional account signs in with Google, and nothing is stored on our systems unless you turn on cloud backup;</li>
            <li>No selling, renting, or sharing of personal data with third parties for marketing;</li>
            <li>No advertising and no advertising trackers;</li>
            <li>No reading of your files beyond what is needed to display and narrate them;</li>
            <li>No transmission of your library, notes, or reading habits, except the cloud backup you choose to turn on.</li>
          </ul>
      </div>
    </section>

    <section aria-labelledby="policy-8">
      <h2 id="policy-8" class="group-title">8. Your control: export, import, and deletion</h2>
      <div class="group prose">
        <p>
            From Settings → Storage you can export your full library as a backup file, import a
            backup, and permanently wipe all Pages data from the device. Because all data is local,
            uninstalling the app or clearing browser site data also removes your library entirely.
            Deletion is immediate and irreversible. If you use cloud backup, delete the cloud copy from
            Settings → Storage → Backup as well.
          </p>
      </div>
    </section>

    <section aria-labelledby="policy-9">
      <h2 id="policy-9" class="group-title">9. Data security</h2>
      <div class="group prose">
        <p>
            Your library is protected by your device's own security (device lock, browser sandboxing,
            and app sandboxing on mobile). All network requests Pages makes use encrypted HTTPS
            connections where the provider supports them. Because data is stored locally, anyone with
            access to your unlocked device profile can access your Pages library — please secure
            your device accordingly.
          </p>
      </div>
    </section>

    <section aria-labelledby="policy-10">
      <h2 id="policy-10" class="group-title">10. Children's privacy</h2>
      <div class="group prose">
        <p>
            Pages does not knowingly collect personal information from anyone, including children.
            Since no data is transmitted to us, there is nothing for us to collect, retain, or delete
            on a child's behalf.
          </p>
      </div>
    </section>

    <section aria-labelledby="policy-11">
      <h2 id="policy-11" class="group-title">11. Your rights</h2>
      <div class="group prose">
        <p>
            Depending on where you live (for example under the GDPR or CCPA), you may have rights to
            access, correct, delete, or port your personal data. Pages' design satisfies these by
            default: all of your data is already in your hands, exportable at any time from Settings →
            Storage, and deletable in full from the same page.
          </p>
      </div>
    </section>

    <section aria-labelledby="policy-12">
      <h2 id="policy-12" class="group-title">12. Changes to this policy</h2>
      <div class="group prose">
        <p>
            If Pages' data practices change, this policy will be updated and the effective date
            above revised. Material changes will be noted in the app's release notes. Continued use of
            Pages after an update constitutes acceptance of the revised policy.
          </p>
      </div>
    </section>

    <section aria-labelledby="policy-13">
      <h2 id="policy-13" class="group-title">13. Contact</h2>
      <div class="group prose">
        <p>
            Questions or concerns about privacy in Pages can be raised on the project's GitHub
            repository at
            <a href="https://github.com/JeremyShiroya/Pages" target="_blank" rel="noopener">github.com/JeremyShiroya/Pages</a>.
          </p>
      </div>
      <p class="footnote">Effective date: 3 July 2026 · Applies to the Pages web app and the Pages mobile app.</p>
    </section>
  </main>
</template>

<script setup>
import MobileSettingsNav from '~/components/mobile/MobileSettingsNav.vue'
</script>

<style scoped>
.privacy-page {
  display: grid;
  gap: var(--settings-section-gap);
  width: 100%;
  max-width: 560px;
  min-height: calc(100vh - 70px);
  margin: 0 auto;
  padding: 8px var(--settings-gutter) 40px;
  color: var(--color-text-primary);
  background: var(--color-settings-background);
  /* Apple's system blue for this page's icons and links. */
  --apple-blue: #007aff;
}

:global(html[data-theme="dark"] .privacy-page) {
  --apple-blue: #0a84ff;
}

.privacy-hero { display: grid; justify-items: center; gap: 6px; padding-top: 8px; text-align: center; }
.hero-icon {
  display: grid;
  width: 64px;
  height: 64px;
  margin-bottom: 6px;
  place-items: center;
  border-radius: 18px;
  background: color-mix(in srgb, var(--apple-blue) 14%, transparent);
  color: var(--apple-blue);
  font-size: 32px;
}
.privacy-hero h1 { margin: 0; font-size: 28px; font-weight: 400 !important; letter-spacing: -0.02em; }
.privacy-hero p { margin: 0; color: var(--color-text-muted); font-size: 15px; line-height: 1.5; }

.group-title {
  margin: 0 0 var(--settings-header-gap) var(--settings-row-inset);
  color: var(--color-text-muted);
  font-size: var(--settings-header-size);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.group { margin: 0; border-radius: var(--settings-radius); background: var(--color-settings-group); }
.footnote { margin: 10px var(--settings-row-inset) 0; color: var(--color-text-muted); font-size: 13px; line-height: 1.4; }

.glance { display: grid; padding: 4px 0 4px var(--settings-row-inset); list-style: none; }
.glance li { display: grid; grid-template-columns: 22px minmax(0, 1fr); align-items: center; gap: 12px; min-height: 52px; padding: 10px var(--settings-row-inset) 10px 0; font-size: 16px; }
.glance li + li { border-top: 1px solid var(--color-border-subtle); }
.glance i { color: var(--apple-blue); font-size: 20px; }

.prose { display: grid; gap: 10px; padding: 16px var(--settings-row-inset); }
.prose p, .prose ul { margin: 0; color: var(--color-text-secondary); font-size: 15px; line-height: 1.55; }
.prose ul { display: grid; gap: 6px; padding-left: 20px; }
.prose strong { color: var(--color-text-primary); font-weight: 500 !important; }

a { color: var(--apple-blue); text-decoration: none; }
a:hover { text-decoration: underline; }
</style>
