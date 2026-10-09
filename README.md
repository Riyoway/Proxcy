# Proxcy

A dashboard that turns the raw proxy lists from **[Riyoway/proxies](https://github.com/Riyoway/proxies)** into a fast, filterable, visual interface.

Proxcy does not collect, test, or store any proxies itself. It only reads the data published by the [`proxies`](https://github.com/Riyoway/proxies) repo (via GitHub Raw) and presents it as a searchable table, an interactive map, and a small API. No database, no backend state.

**Live:** https://proxcy.riyo.me

---

## What it does

- **Filterable table** — filter by country, protocol (HTTP / SOCKS4 / SOCKS5), latency, anonymity, and Google reachability; search, sort, paginate, and export to CSV. Right-click a row for quick actions.
- **Interactive map** — 2D (Mercator) and 3D globe. Country markers are sized by proxy count and shaded by median latency, with a ring for Google-reachability rate and animated request flows.
- **API** — the same dataset exposed through same-origin compatibility redirects (see below).

---

## Data source

All proxy data lives in a **separate repository**, [Riyoway/proxies](https://github.com/Riyoway/proxies), which a collector updates automatically. This repo (Proxcy) is just the static frontend plus compatibility redirects for the old API URLs.

The dashboard reads these files straight from GitHub Raw:

| File | Contents |
|------|----------|
| `data.json` | Full metadata (ip, port, protocol, speed, country, anonymity, Google access) — powers the dashboard |
| `http.txt` | HTTP proxies (`ip:port` per line) |
| `socks4.txt` | SOCKS4 proxies |
| `socks5.txt` | SOCKS5 proxies |
| `all.txt` | All valid proxies (`protocol://ip:port`) |

To point Proxcy at a different source, edit `REPO_RAW` in [`src/lib/proxy-fetcher.ts`](src/lib/proxy-fetcher.ts) and the targets in [`public/_redirects`](public/_redirects).

> Proxy locations on the map are approximate — the dataset has no coordinates, so proxies are grouped at their country's centroid.

---

## API

The dashboard reads the dataset directly from GitHub Raw. The same-origin endpoints remain available as Cloudflare Pages static redirects, so the multi-megabyte payload is served by GitHub Raw instead of being relayed through the frontend deployment. Full docs at [`/api`](https://proxcy.riyo.me/api).

| Endpoint | Returns |
|----------|---------|
| `GET /api/proxies` | Full metadata as JSON: `{ "proxies": [ ... ] }` |
| `GET /api/proxies/http` | HTTP proxies, `ip:port` per line (`text/plain`) |
| `GET /api/proxies/socks4` | SOCKS4 proxies |
| `GET /api/proxies/socks5` | SOCKS5 proxies |
| `GET /api/proxies/all` | All valid proxies (`protocol://ip:port`) |

```bash
curl -L https://proxcy.riyo.me/api/proxies/socks5
```

---

## Tech stack

Next.js (App Router, static export) · TypeScript · Tailwind CSS · `d3-geo` + `world-atlas` (map) · `lucide-react`. Deployed on Cloudflare Pages; data served from GitHub Raw.

---

## Local development

```bash
npm install
npm run dev
# → http://localhost:3000
```

To verify the production static export locally:

```bash
npm run build
# output → ./out
```

## Deploy

Create a Cloudflare Pages project from this repository with:

| Setting | Value |
|---------|-------|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `out` |

The repository includes:

- [`public/_headers`](public/_headers) for response and cache headers
- [`public/_redirects`](public/_redirects) for the compatibility API redirects

Optional configuration:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical / Open Graph base URL (defaults to `https://proxcy.riyo.me`) |

After the Pages deployment is healthy, attach `proxcy.riyo.me` as the custom domain and remove it from the old Vercel project.

---

## License

[MIT](LICENSE) © [Riyo](https://riyo.me)
