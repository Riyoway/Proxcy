# Proxcy

A dashboard for the proxy results produced by the private **Riyoway/proxy-collector** checker.

The checker publishes its results to both **Riyoway/Proxies** (the public GitHub mirror) and this repository under `public/data/`. Cloudflare serves the copy bundled with Proxcy directly as static assets, so normal dashboard/API requests do not need a Function, Worker runtime, or GitHub Raw fetch.

**Live:** https://proxcy.riyo.me

---

## What it does

- **Filterable table** — filter by country, protocol (HTTP / SOCKS4 / SOCKS5), latency, anonymity, and Google reachability; search, sort, paginate, and export to CSV. Right-click a row for quick actions.
- **Interactive map** — 2D (Mercator) and 3D globe. Country markers are sized by proxy count and shaded by median latency, with a ring for Google-reachability rate and animated request flows.
- **Static API** — exposes the same checked results through `/api/proxies*` without a server-side Function.

---

## Data pipeline

`Riyoway/proxy-collector` checks the proxy sources and writes the generated result files to two destinations:

1. `Riyoway/Proxies` — existing public GitHub mirror.
2. `Riyoway/Proxcy/public/data/` — static copy deployed with this site.

The deployment serves these files directly:

| Static file | Contents |
|------|----------|
| `/data/data.json` | Full metadata (ip, port, protocol, speed, country, anonymity, Google access) — powers the dashboard |
| `/data/http.txt` | HTTP proxies (`ip:port` per line) |
| `/data/socks4.txt` | SOCKS4 proxies |
| `/data/socks5.txt` | SOCKS5 proxies |
| `/data/all.txt` | All valid proxies (`protocol://ip:port`) |
| `/data/history.json` | Checker cycle history |

The dashboard table and map both read `/data/data.json` from the same deployment. Filtering, sorting, pagination, CSV export, and map aggregation happen in the browser, so they do not require a backend API or runtime Function.

> Proxy locations on the map are approximate — the dataset has no coordinates, so proxies are grouped at their country's centroid.

---

## API

The API is implemented as **200 rewrites** to the static result files. The client keeps the `/api/proxies*` URL while Cloudflare returns the matching static asset. No runtime Function is involved.

### Direct endpoints

- Full JSON: https://proxcy.riyo.me/api/proxies
- HTTP: https://proxcy.riyo.me/api/proxies/http
- SOCKS4: https://proxcy.riyo.me/api/proxies/socks4
- SOCKS5: https://proxcy.riyo.me/api/proxies/socks5
- All protocols: https://proxcy.riyo.me/api/proxies/all

| Endpoint | Static source | Returns |
|----------|---------------|---------|
| `GET /api/proxies` | `/data/data.json` | Full metadata as JSON: `{ "proxies": [ ... ] }` |
| `GET /api/proxies/http` | `/data/http.txt` | HTTP proxies, `ip:port` per line (`text/plain`) |
| `GET /api/proxies/socks4` | `/data/socks4.txt` | SOCKS4 proxies |
| `GET /api/proxies/socks5` | `/data/socks5.txt` | SOCKS5 proxies |
| `GET /api/proxies/all` | `/data/all.txt` | All valid proxies (`protocol://ip:port`) |

```bash
curl https://proxcy.riyo.me/api/proxies/socks5
```

Full docs: https://proxcy.riyo.me/api

---

## Tech stack

Next.js (App Router, static export) · TypeScript · Tailwind CSS · `d3-geo` + `world-atlas` (map) · `lucide-react`. Deployed on Cloudflare with proxy data served as static assets.

---

## Local development

```bash
npm install
npm run dev
# → http://localhost:3000
```

The checker normally creates `public/data/`. To verify the production static export after data has been mirrored:

```bash
npm run build
# output → ./out
```

## Deploy

The project is built as a static Next.js export:

| Setting | Value |
|---------|-------|
| Production branch | `main` |
| Build command | `npm run build` |
| Static output directory | `out` |

The repository includes:

- [`public/_headers`](public/_headers) for response and cache headers.
- [`public/_redirects`](public/_redirects) for static API rewrites.
- `public/data/` for the checker-generated deployable dataset.
- [`wrangler.jsonc`](wrangler.jsonc) for deploying `out/` as Cloudflare Static Assets.

Optional configuration:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical / Open Graph base URL (defaults to `https://proxcy.riyo.me`) |

---

## Checker publishing configuration

The checker keeps the existing `Riyoway/Proxies` push and additionally mirrors the same results into this repository. Its local `.env.local` can explicitly set the Proxcy target:

```env
PROXCY_SITE_REPO_URL=git@github.com:Riyoway/Proxcy.git
PROXCY_SITE_BRANCH=main
PROXCY_SITE_OUTPUT_DIR=public/data
```

The current publisher also derives the Proxcy repository automatically from the existing `Riyoway/Proxies` repository URL when possible, so the old publishing configuration remains compatible.

---

## License

[MIT](LICENSE) © [Riyo](https://riyo.me)
