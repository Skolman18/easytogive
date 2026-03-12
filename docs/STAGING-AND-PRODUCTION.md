# Staging vs Production Setup

Two environments, one repo: **production** (live site) and **staging** (where you edit and test).

---

## Overview

| Environment | URL (example) | Branch | Supabase | Stripe |
|-------------|---------------|--------|----------|--------|
| **Production** | easytogive.com or easytogive.vercel.app | `main` | Production project | Live keys |
| **Staging** | easytogive-staging.vercel.app | `staging` | Staging project | Test keys |

Vercel deploys automatically: push to `main` → production; push to `staging` → staging. No need to run `vercel --prod` manually unless you deploy from the CLI.

---

## How do I know which deployment method I'm using?

**Git integration (auto-deploy):** You connected your GitHub repo to Vercel in the dashboard. When you push to a branch, Vercel builds and deploys without you running any command.

- **Check:** Go to [vercel.com](https://vercel.com) → your **easytogive** project → **Settings** → **Git**. If you see a connected repository and a "Production Branch" (e.g. `main`), you're using Git integration. Pushing to that branch triggers a production deploy.

**CLI deploys:** You run `vercel` or `vercel --prod` from your terminal to deploy.

- **Check:** If you usually run `vercel` or `vercel --prod` after making changes, you're using the CLI. Deploys only happen when you run that command.

**If you're not sure:** Open your Vercel project → **Deployments**. Click a recent deployment and look at the source: "Git" (with branch name) = Git integration; "CLI" or similar = CLI. You can also use both: Git for production, and occasionally run `vercel` from a branch to get a preview URL.

---

## Step 1 — Create the staging branch

```bash
cd ~/easytogive
git checkout -b staging
git push -u origin staging
```

Keep working on `main` for production. Use `staging` for experiments.

---

## Step 2 — Create the staging Vercel project

1. Go to [vercel.com](https://vercel.com) → **Add New Project**.
2. Import the same **easytogive** GitHub repo.
3. When asked which branch to deploy:
   - **Production project (your existing one):** keep **main** as the production branch.
   - **Staging project (new):** create a second project, name it e.g. **easytogive-staging**, and set its **production** branch to **staging** (so the staging project only deploys from `staging`).

So you end up with **two Vercel projects**:

- **easytogive** (or your current name)  
  - Production branch: `main`  
  - Domain: easytogive.com / easytogive.vercel.app  

- **easytogive-staging**  
  - Production branch: `staging`  
  - Domain: easytogive-staging.vercel.app  

---

## Step 3 — Separate Supabase projects

You want different data in each environment.

1. **Production**  
   - Keep using your current Supabase project.  
   - Its URL and keys stay in the **production** Vercel project’s env vars.

2. **Staging**  
   - In [Supabase](https://supabase.com): **New project** → e.g. **easytogive-staging**.  
   - Run the same migrations (or a subset) so the schema matches.  
   - In the **staging** Vercel project, set:
     - `NEXT_PUBLIC_SUPABASE_URL` = staging project URL  
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = staging anon key  

Use production Supabase only in the production Vercel project, and staging Supabase only in the staging project.

---

## Step 4 — Environment variables per Vercel project

In **each** Vercel project, set the env vars that project should use.

**Production project** (main):

- `NEXT_PUBLIC_SUPABASE_URL` — production Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — production anon key
- `GROQ_API_KEY`
- `STRIPE_SECRET_KEY` — **live** Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — **live** Stripe publishable key

**Staging project** (staging):

- Same names, but use **staging** Supabase URL and anon key.
- Use Stripe **test** keys so you don’t charge real cards.
- Optional: set `NEXT_PUBLIC_APP_ENV=staging` so the app shows a “Staging” banner.

---

## Step 5 — Workflow: making changes and going live

**Work and test on staging:**

```bash
git checkout staging
# make changes, commit, push
git add -A && git commit -m "New feature" && git push origin staging
```

Staging deploys automatically to easytogive-staging.vercel.app. Edit and play there.

**When it’s ready for production:**

```bash
git checkout main
git merge staging
git push origin main
```

Production deploys automatically. No need to run `vercel --prod` unless you’re not using Git integration.

**Then sync staging with main (optional):**

```bash
git checkout staging
git merge main
git push origin staging
```

---

## Step 6 — Optional: staging banner

If you set **`NEXT_PUBLIC_APP_ENV=staging`** in the **staging** Vercel project only, the app shows a “Staging” bar at the top so you can tell at a glance you’re not on the live site. Production should **not** set this variable.

---

## Quick reference

| I want to… | Do this |
|------------|--------|
| Try something without affecting live site | Work on `staging`, push → test on easytogive-staging.vercel.app |
| Ship to production | Merge `staging` into `main`, push |
| Run locally with prod-like config | Copy `.env.example` to `.env.local`, fill with production or staging values |

---

## Local development

Copy `.env.example` to `.env.local` and fill in values. Use **staging** Supabase and **Stripe test** keys locally so you don’t touch production data or charges.
