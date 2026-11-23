import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.bookish.app',
  // Display name only. appId stays com.bookish.app on purpose: it is the
  // installed app's identity, and changing it would land on devices as a
  // brand-new app, orphaning every existing library, setting and import.
  appName: 'Pages',
  webDir: '.output/public',
  bundledWebRuntime: false,
  // The Edge Read Aloud endpoint only accepts WebSocket handshakes from
  // user agents that advertise Microsoft Edge. Appending the Edge-on-Android
  // marker lets the WebView synthesize TTS on-device without a server.
  appendUserAgent: 'EdgA/143.0.0.0',
  server: {
    androidScheme: 'https',
  },
  // Capacitor's verbose bridge logging stringifies EVERY plugin argument into
  // a log line — including a whole book's base64 when writing a PDF. That
  // StringBuilder.toString() was itself a ~54MB allocation and crashed the app
  // inside Capacitor's own Bridge. Nothing needs those megabytes echoed.
  loggingBehavior: 'production',
  plugins: {
    // Routes window.fetch through the native HTTP stack, bypassing WebView
    // CORS so on-device metadata search can query Goodreads, Kobo, etc.
    CapacitorHttp: {
      enabled: true,
    },
    // Silent web (OTA) updates, self-hosted on GitHub Releases — see
    // composables/useLiveUpdate.js and scripts/build-web-bundle.mjs.
    LiveUpdate: {
      // Every bundle must carry an RSA signature from android/live-update-
      // private.pem (never committed). A bundle replaces the app's code, so
      // without this a compromised release page could ship arbitrary JS —
      // the one path that Android's APK signature check does not cover.
      publicKey: [
        '-----BEGIN PUBLIC KEY-----',
        'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwMvWyZc8Inc4OEGZLX2B',
        'DIUTcXgXM47Pr4TKHo0XpXDF/lba1Tyg16qfOwhBNPGwG4pdO17PLdmBRQF8rewm',
        'AIspD0+bmWWQTFXgLLtePIDZsdtTo0zSYAJDiITgDOILJyEc6AYmQLpO+fRLR4Gr',
        'bQuoGCIIZjPL7LSAIUZF2h6T+bhiPIbsCXOto5X1MXKHo4EpryTMVqPfKSBiu1KF',
        '7aCplLYK3DXXK346xAac3Li+7P0VH2QroFQpcycH/oEgDW7QGHaJwQtIpshX0mtc',
        'GmvKbzgdcYwGUfvbhVBGq9fqelQ1SwZSm9NEpY27q3S2v1b0zvKp6yCN4tCGeDEg',
        '3QIDAQAB',
        '-----END PUBLIC KEY-----',
      ].join('\n'),
      // A bundle that has not reached a healthy startup within this window
      // (see plugins/live-update.client.js) is rolled back to the bundle that
      // shipped inside the APK, and blocked from being installed again.
      readyTimeout: 15000,
      autoBlockRolledBackBundles: true,
      autoDeleteBundles: true,
    },
  },
}

export default config
