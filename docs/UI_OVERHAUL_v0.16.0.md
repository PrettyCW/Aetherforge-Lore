# v0.16.0 — Wikipedia UI overhaul

Presentation-only release. Vector-inspired compact header and native collapsible menu; left desktop contents and closed mobile contents; continuous serif article layout; scoped, verified text-only infoboxes; linked category footer, alphabetical lists, compact search and two-column main page. Existing article JSON, allowlist, route handlers, search and chronology remain unchanged. Infobox fields are curated conservatively and omitted when unsupported by the subject's existing published text. No new dependencies, artwork or account features.

Validation: existing regression suite retained with presentation assertions updated, and a new infobox provenance/layout regression. Docker validation runs npm build before production image creation. Independent browser and device inspection must be reported separately.
