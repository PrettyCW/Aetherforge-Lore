# Aetherforge Wiki

A searchable encyclopedia of Aetherforge. Public articles are reviewed before publication. Unpublished manuscripts, private sources, and spoilers must not be committed to this public repository.

## Run

Node.js 22 or later: `npm start`. Railway uses the `PORT` environment variable.

## Canon workflow

Article content lives in `articles.json`. Each entry has a slug, title, category, summary, sections, related articles, source references and publication status. Only reviewed, published articles should be included in this repository. Git tracks revisions. No generated lore is canon by default.
