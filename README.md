# Aetherforge Wiki

A public, read-only encyclopedia. Node.js 22+, no external runtime dependencies.

Run `npm run build` to validate, `npm start` to serve. Railway uses PORT. The Docker build runs tests before copying only the five runtime files into the final image.

Publication requires an explicit author decision on the exact text, aliases and links. Add only approved fields to articles.json and approved canonical IDs to publication-allowlist.json. Never import the private archive into the repository or build context. The seven legacy public stubs are grandfathered, not newly approved candidate text. No private access is implemented.
