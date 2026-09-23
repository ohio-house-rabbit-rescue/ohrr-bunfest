# Midwest BunFest — sample site

A sample festival site for the OHRR board, in the same family as the OHRR app
and the OHRR website. The official site, midwestbunfest.org, is untouched.

**Nothing is typed into this code.** The date, place, prices, talks, speakers,
festival pages, vendors, rescues, sponsors, auction items and floor plan are all
read live from the shared OHRR database — the same records the app and the
website show. OHRR staff change them from a phone or a laptop:

- the app: Staff → BunFest
- the website: Staff → BunFest (https://ohrr-website.pages.dev/staff/bunfest)

A change appears here as soon as it is saved. When a new year starts (Staff →
BunFest → This year → Start a new year), last year's talks, vendors, rescues
and pages stay readable under **Past years**.

## Built for

The design brief in the share drive (*OHRR Design Principles and Personas*):

- The first screen answers what it is, the date, the place, the price, whether
  you can bring your rabbit, and the ticket — on a laptop and on a phone.
- 18px body text; nothing a visitor needs under 16px. Dark text on white.
- Every menu item visible; nothing opens on hover. 48px buttons.
- The visit page, the rabbit rules, the schedule and the map print cleanly.
- Nothing moves on its own; motion respects "reduce motion".
- Kept out of search engines (`noindex`, `robots.txt`) while it is a sample.
- Email is how people reach OHRR; OHRR's phone number is not on this site.

## Running it

```
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
```

`.env` holds the public, browser-safe database address and publishable key.
Never add a secret key.

## Hosting

Cloudflare Pages, from this repository's `main` branch:
build command `npm run build`, output directory `dist`. `public/_redirects`
sends every path to the app.

`src/lib/floor.ts` and `src/components/VenuePlan.tsx` are copies of the OHRR
app's (`src/features/bunfest/`) — change them there first, then copy here.
