# Aetherforge Wiki

A public, read-only encyclopedia. Node.js 22+, no external runtime dependencies.

Run `npm run build` to validate, `npm start` to serve. Railway uses PORT. The Docker build runs tests before copying only the five runtime files into the final image.

Publication requires an explicit author decision on the exact text, aliases and links. Add only approved fields to articles.json and approved canonical IDs to publication-allowlist.json. Never import the private archive into the repository or build context. The seven legacy public stubs are grandfathered, not newly approved candidate text. Author-only archive access is implemented separately at /author/login. Private content must be imported through authenticated access into a Railway volume; never place it in this repository or image. Configure AUTHOR_KEY_HASH (SHA-256 of a randomly generated high-entropy key) and AUTHOR_DATA_DIR. The application initializes the volume directory and drops root privileges before listening. Keep a secure offline copy of the access key; loss of the key requires reimport from the private source archive.
