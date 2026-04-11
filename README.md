# ProxyChecker Web 🚀

A fully free, open-source proxy checker and real-time dashboard built with Next.js, Supabase, and GitHub Actions.

## ✨ Features
- **All-TypeScript Architecture**: Both checker and web UI are built with TypeScript (Node.js & Next.js).
- **Real-time Dashboard**: Beautiful UI powered by `@21st-dev/magic` (shadcn/ui + Tailwind CSS).
- **Zero Cost**: Hosted on Vercel (UI), checked via GitHub Actions (Checker), and stored in Supabase (PostgreSQL).
- **Public Endpoints**: Download `valid.txt` and `google.txt` directly from the web.

---

## 🛠️ How to Setup (Complete Free Tier Guide)

### 1. Database (Supabase)
Read the [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for instructions on creating the free database and SQL tables.

### 2. Vercel Deployment (Web UI)
1. Push this repository to your GitHub repository.
2. Go to [Vercel](https://vercel.com/) and import your repository.
3. In the Environment Variables section, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Click Deploy. Your dashboard is now live!

### 3. Proxy Checker (GitHub Actions)
The checker is located in the `/checker` directory. It uses `workflow_dispatch` to be triggered on demand.

1. Go to your GitHub repository -> Settings -> Secrets and variables -> Actions.
2. Add new **Repository secrets**:
   - `SUPABASE_URL` (Your Supabase URL)
   - `SUPABASE_SECRET_KEY` (Recommended) or `SUPABASE_SERVICE_ROLE_KEY`
3. To run it automatically every 5-10 minutes, we use **cron-job.org** to trigger the GitHub API.

### 4. Setting up cron-job.org (External Trigger)
GitHub's internal scheduler can be heavily delayed (up to 30 mins). To ensure our checker runs frequently:

1. Create a free account on [cron-job.org](https://cron-job.org).
2. Create a new "Cronjob".
3. **URL**: `https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/actions/workflows/check.yml/dispatches`
4. **Execution schedule**: Every 5 or 10 minutes.
5. **Advanced -> HTTP Method**: `POST`
6. **Advanced -> HTTP Headers**:
   - `Accept`: `application/vnd.github+json`
   - `Authorization`: `Bearer YOUR_GITHUB_PERSONAL_ACCESS_TOKEN` (Create one in GitHub Settings -> Developer settings -> PATs)
   - `X-GitHub-Api-Version`: `2022-11-28`
7. **Advanced -> Request Body**: `{"ref":"main"}`
8. Save and enable!

Now, the checker will run on GitHub Actions every few minutes, validate proxies using `p-limit` concurrency, and UPSERT the alive ones into Supabase. Your Vercel dashboard will instantly reflect the changes.
