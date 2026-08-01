# Proxcy

A dashboard that turns the raw proxy lists from **[Riyoway/proxies](https://github.com/Riyoway/proxies)** into a fast, filterable, visual interface.

Proxcy does not collect, test, or store any proxies itself. It only reads the data published by the [`proxies`](https://github.com/Riyoway/proxies) repo (via GitHub raw) and presents it as a searchable table, an interactive map, and a small API. No database, no backend state.

**Live:** https://proxcy.riyo.me

---

## What it does

- **Filterable table** — filter by country, protocol (HTTP / SOCKS4 / SOCKS5), latency, anonymity, and Google reachability; search, sort, paginate, and export to CSV. Right-click a row for quick actions.
- **Interactive map** — 2D (Mercator) and 3D globe. Country markers are sized by proxy count and shaded by median latency, with a ring for Google-reachability rate and animated request flows.
- **API** — the same dataset re-served as same-origin JSON and per-protocol plain-text lists (see below).

---

## Data source

All proxy data lives in a **separate repository**, [Riyoway/proxies](https://github.com/Riyoway/proxies), which a collector updates automatically. This repo (Proxcy) is just the frontend plus a thin pass-through API.

The dashboard reads these files straight from GitHub raw:

| File | Contents |
|------|----------|
| `data.json` | Full metadata (ip, port, protocol, speed, country, anonymity, Google access) — powers the dashboard |
| `http.txt` | HTTP proxies (`ip:port` per line) |
| `socks4.txt` | SOCKS4 proxies |
| `socks5.txt` | SOCKS5 proxies |
| `all.txt` | All valid proxies (`protocol://ip:port`) |

To point Proxcy at a different source, edit `REPO_RAW` in [`src/lib/proxy-fetcher.ts`](src/lib/proxy-fetcher.ts).

> Proxy locations on the map are approximate — the dataset has no coordinates, so proxies are grouped at their country's centroid.

---

## API

No authentication, CORS enabled (`Access-Control-Allow-Origin: *`), uncached for fresh upstream data. Full docs at [`/api`](https://proxcy.riyo.me/api).

| Endpoint | Returns |
|----------|---------|
| `GET /api/proxies` | Full metadata as JSON: `{ "proxies": [ ... ] }` |
| `GET /api/proxies/http` | HTTP proxies, `ip:port` per line (`text/plain`) |
| `GET /api/proxies/socks4` | SOCKS4 proxies |
| `GET /api/proxies/socks5` | SOCKS5 proxies |
| `GET /api/proxies/all` | All valid proxies (`protocol://ip:port`) |

```bash
curl https://proxcy.riyo.me/api/proxies/socks5
```

---

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · `d3-geo` + `world-atlas` (map) · `lucide-react`. Deployed on Vercel; data served from GitHub raw.

---

## Local development

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Deploy

Import the repo on [Vercel](https://vercel.com) — no environment variables required.

Optional configuration:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical / Open Graph base URL (defaults to `https://proxcy.riyo.me`) |

---

## License

[MIT](LICENSE) © [Riyo](https://riyo.me)
