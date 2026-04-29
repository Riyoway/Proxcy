# ProxyChecker Web 🚀

A fully free, open-source real-time dashboard for proxy data, built with Next.js and Supabase.

> The proxy checking worker has been split out into its own repository. This project only contains the Next.js dashboard that reads from Supabase.

## ✨ Features
- **TypeScript / Next.js (App Router)**
- **Real-time Dashboard**: shadcn/ui + Tailwind CSS.
- **Interactive Map Drilldown**: Country-level clusters first; network and per-proxy detail load only for the selected country.
- **Zero Cost**: Deploy on Vercel, data stored in Supabase (PostgreSQL).
- **Public Endpoints**: Download `valid.txt` and `google.txt` directly from the web.

---

## 🗺️ Map Behavior

- Proxy locations are approximate and derived from country-level metadata rather than exact server coordinates.
- The default world view stays grouped by country to keep rendering responsive.
- Detailed network / subgroup / individual proxy drilldown is computed only for the selected country.
- This country-first drilldown strategy is intentional and reduces initial rendering cost for large proxy datasets.

---

## 🛠️ How to Setup

### 1. Database (Supabase)
Read the [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for instructions on creating the free database and SQL tables.

### 2. Vercel Deployment (Web UI)
1. Push this repository to your GitHub repository.
2. Go to [Vercel](https://vercel.com/) and import your repository.
3. In the Environment Variables section, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Click Deploy. Your dashboard is now live!

### 3. Proxy Checker
The checker has been moved to a separate repository. Configure it there to UPSERT into the same Supabase `proxies` / `proxy_history` tables that this dashboard reads from.
