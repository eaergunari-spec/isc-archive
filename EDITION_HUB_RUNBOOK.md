# ISC Edition Hub Runbook

This document defines the permanent contract for edition pages such as `/editions/154/`.

## 1. URL and lifecycle contract

- Every ISC edition gets a permanent URL: `/editions/<edition_number>/`.
- The current edition page is both the live event hub and the future permanent archive record.
- The homepage is discovery/editorial; it is not the canonical edition record.
- Current-edition links on homepage, voting, results, archive, search, country pages and historical edition pages must resolve to the permanent edition URL.
- When an edition stops being current, its URL must not change.

## 2. Shared hub assets

The shared implementation lives in:

- `edition-hub.css`
- `edition-hub.js`

An edition page supplies its edition number using:

```html
<body class="edition-hub-body" data-edition="154">
```

The JavaScript reads the edition number and loads public data from Supabase. Do not hard-code line-up, voting counts, results state or playlist IDs in the JavaScript.

## 3. Public data boundary

The live hub uses:

- `isc_public_edition_hub(integer)`
- `isc_public_edition_results_summary(integer)`

Security rule:

- Before `results_revealed = true`, no country-level ballot, recipient choice, running vote total or provisional scoreboard may be returned to the public hub.
- Aggregate submitted-ballot count is allowed.
- `isc_public_edition_results_summary` must return an empty scoreboard until reveal.
- Do not use `isc_public_edition_archive` as the data source for a live/current hub because archive functions may contain ballot-level records intended for completed editions.

## 4. Edition data required in Supabase

Before publishing a new hub, verify:

### editions
- unique `edition_number`
- correct `title`
- exactly one edition with `status = 'current'`
- `voting_open` state correct
- `results_revealed` false before reveal

### entries
Every participating delegation needs:
- `edition_id`
- `country_id`
- unique running order within the edition
- artist name
- song title

### edition_country_labels
Use this when a delegation's edition-specific display name differs from its permanent country name.

### voting_schemes / voting_scheme_points
Verify:
- scheme exists for the edition
- ranks are contiguous
- points are unique where required by the ballot flow
- number of scoring slots does not exceed eligible entries
- `self_vote_allowed` is correct

### entry_media
Recommended media per entry:
- artist image / photo
- image focus / object position
- YouTube official video
- `detail_page` canonical URL for the entry file

The hub expects local media URLs to be repository-root relative, e.g.:
- `assets/artists/03-meira-omar-liamoo.png`
- `entries/03-meira-omar-liamoo.html`

### edition_media
Recommended:
- YouTube playlist with canonical URL + embed URL
- Spotify playlist with canonical URL + embed URL

Third-party embeds should remain click-to-load.

## 5. Results lifecycle

### Voting open
Hub shows:
- live voting state
- scoring scheme
- number of submitted delegations
- results locked

It must not show:
- provisional totals
- provisional rank
- individual ballots
- leading country

### Voting closed, reveal pending
Hub shows:
- voting closed
- submitted ballot count
- results pending/locked

### Results revealed
Hub may show:
- winner
- final scoreboard
- links to full Results Hub while that edition is current

Once a newer edition becomes current, the old edition page remains a permanent record and its own final scoreboard remains visible inside the edition hub.

## 6. Navigation contract

Current edition entry points should resolve to the permanent edition hub.

Already integrated:
- homepage current-edition nav
- homepage ISC edition title
- homepage current archive card
- voting page current-edition nav
- results page overview / participants nav
- archive edition cards
- global search edition results
- country profile edition history
- country directory current-edition nav
- historical edition current-edition nav
- ISC 154 entry pages

Generic pages use `current-edition-link.js` where they do not already load current-edition context.

## 7. Edition page required sections

A current edition hub should contain, in this order:

1. Overview / live hero
2. Live state rail
3. Full line-up
4. Official playlists
5. Magazine / editorial layer
6. Results state or final standings
7. Links to countries, search and full archive

The page should work as a useful permanent record after the edition is archived.

## 8. SEO and sharing

Each edition page needs:
- unique `<title>`
- meta description
- canonical URL
- Open Graph title / description / image
- Twitter large-image metadata
- 1200×630 share image
- structured data identifying the edition as part of ISC

The edition canonical must always be the permanent `/editions/<number>/` URL.

## 9. Accessibility and performance requirements

- Respect `prefers-reduced-motion`.
- Keep keyboard-visible focus states.
- Entry video modal closes with Escape and returns focus.
- Third-party playlist embeds load only after user action.
- Images below the fold use lazy loading.
- Sticky edition subnav must measure the real sticky header height so it never overlaps the site header.
- Mobile layout must not rely on fixed desktop dimensions.

## 10. Creating the next edition hub

For ISC 155 (example):

1. Copy the current edition hub HTML to `editions/155/index.html`.
2. Change `data-edition="154"` to `data-edition="155"`.
3. Update static fallback metadata:
   - canonical
   - title
   - OG URL
   - OG image / alt text
   - JSON-LD name / URL
4. Add ISC 155 entries, voting scheme and media in Supabase.
5. Set ISC 154 to archived only when its permanent result record is complete.
6. Set ISC 155 to current.
7. Verify `isc_public_edition_hub(155)` returns the expected line-up and no unrevealed result data.
8. Verify current-edition links across the site automatically resolve to `/editions/155/`.
9. Test voting and results pages against the new current edition.
10. Test mobile, desktop, share preview and global search before announcing the edition.

## 11. Pre-launch QA

- Hub loads without JavaScript errors.
- Every entry image resolves.
- Every entry file resolves.
- Every country link resolves.
- Every official video opens.
- YouTube and Spotify playlists load only after click.
- Voting CTA appears only while the edition is current and voting is open.
- Submitted ballot count updates live.
- Results stay locked before reveal.
- Final scoreboard is empty before reveal at API level.
- Results appear after reveal.
- Homepage ISC title opens the hub.
- Archive current card opens the hub.
- Searching the edition number opens the hub.
- Country appearance history opens the correct edition hub.
- OG preview uses the intended edition image.
- No permanent URL changes after the edition is archived.
