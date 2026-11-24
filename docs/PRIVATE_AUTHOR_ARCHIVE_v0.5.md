# v0.5 — Private author archive

Server-side author authentication with a high-entropy key verifier supplied via runtime variables. Secure, HttpOnly, SameSite=Strict session cookies; absolute and idle expiration, login throttling, Origin checks, no-store and noindex headers. Private import validates structure and relationship integrity and writes an AES-256-GCM encrypted file atomically to a persistent volume. The encryption key is derived from the author key and retained only in authenticated sessions. Existing encrypted archive cannot be overwritten through the UI. Keep the key and offline archive; a lost key requires private reimport. No private content in Git or Docker build context.

Read-only private article directory, category browser, body search (POST), related article navigation, source and claim register and decision/recovery queue. Public rendering and search remain independent. Original source document bytes are retained in the offline archive, not uploaded to the website.

Import is a one-time authenticated browser action using the prepared private JSON export. Deployment health does not establish that the private data has been imported. Existing public articles remain unchanged. No new canon or publication decisions.

Private import contains 202 articles, 271 sections, 442 relationship pairs, 491 curated claims plus 23 recovered conversation summaries (514 evidence records), 19 source records and 23 decision/recovery records. The original source classifications are preserved. Both section and citation references must resolve in the imported evidence index. The import itself remains outside GitHub.

## v0.5.1 browser form compatibility

The no-referrer policy may suppress or null the Origin header on legitimate browser form submissions. All author POST forms now require a random token matching a Secure, HttpOnly, SameSite=Strict, host-only cookie; explicit foreign origins and cross-site fetch metadata remain rejected. Authentication, encryption, and data storage are unchanged. Tests cover null and missing Origin, missing and invalid CSRF tokens, and valid browser-style login, import, search, and logout. Access-key input tolerates surrounding whitespace.
