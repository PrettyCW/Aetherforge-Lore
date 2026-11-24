# v0.5 — Private author archive

Server-side author authentication with a high-entropy key verifier supplied via runtime variables. Secure, HttpOnly, SameSite=Strict session cookies; absolute and idle expiration, login throttling, Origin checks, no-store and noindex headers. Private import validates structure and relationship integrity and writes an AES-256-GCM encrypted file atomically to a persistent volume. The encryption key is derived from the author key and retained only in authenticated sessions. Existing encrypted archive cannot be overwritten through the UI. Keep the key and offline archive; a lost key requires private reimport. No private content in Git or Docker build context.

Read-only private article directory, category browser, body search (POST), related article navigation, source and claim register and decision/recovery queue. Public rendering and search remain independent. Original source document bytes are retained in the offline archive, not uploaded to the website.

Import is a one-time authenticated browser action using the prepared private JSON export. Deployment health does not establish that the private data has been imported. Existing public articles remain unchanged. No new canon or publication decisions.
