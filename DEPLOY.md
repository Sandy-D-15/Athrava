# Deploy Skyline to your own URL, with GitHub + Render

This gets you a real public URL (like `https://skyline-flight-booking.onrender.com`) that anyone can open. It's a static site — no build step, no server code, so this is entirely free.

There are two parts: put the code on GitHub, then point Render at it.

## Part 1: Push the code to GitHub

**Before you start:** unzip the project. Open the folder so you can see `index.html` directly inside it (not inside another folder). Everything below happens from that folder.

### Option A: No command line (upload through the browser)

1. Go to https://github.com and sign in, or create a free account.
2. Click the **+** in the top right → **New repository**.
3. Name it (for example `skyline-flight-booking`), keep it **Public**, and don't check any of the "Initialize with" boxes. Click **Create repository**.
4. On the next page, click **uploading an existing file**.
5. Open your unzipped folder, select **all the files and folders inside it** (`index.html`, `css`, `js`, `schema.sql`, and the rest — not the outer folder itself), and drag them into the browser.
6. Scroll down and click **Commit changes**.

Check the result: on your repository's main page, `index.html` should be listed directly, not inside another folder called `skyline-flight-booking`. If it's nested, delete it and redo step 5, this time selecting the files themselves rather than the folder.

### Option B: With git installed

```bash
cd skyline-flight-booking      # the folder that contains index.html directly
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/skyline-flight-booking.git
git push -u origin main
```

Create the empty repository on GitHub first (step 1–3 above, but stop before uploading), then run this from a terminal.

## Part 2: Deploy on Render

1. Go to https://render.com and sign in. Signing in with your GitHub account is easiest, since it also connects your repositories.
2. On the dashboard, click **New +** → **Static Site**.
3. If asked, click **Connect account** or **Configure account** to give Render access to GitHub, then select your `skyline-flight-booking` repository from the list. If you don't see it, use **Configure account** to grant Render access to that specific repo.
4. Fill in the form:
   - **Name:** anything you like — it becomes part of your URL (`your-name.onrender.com`)
   - **Branch:** `main`
   - **Root Directory:** leave empty
   - **Build Command:** leave empty (there is nothing to build)
   - **Publish Directory:** a single period, `.`
5. Click **Deploy Static Site** (sometimes labelled **Create Static Site**).
6. Wait about a minute. Render shows your live URL at the top of the page, for example `https://skyline-flight-booking.onrender.com`. Open it.

That's it — it's live, with a free HTTPS certificate.

## Making changes later

Push to `main` on GitHub (edit files there directly, or `git add . && git commit -m "..." && git push`), and Render redeploys automatically within a minute or two. You can also click **Manual Deploy → Deploy latest commit** on the Render dashboard.

## Custom domain (optional)

On the Render dashboard, open your site → **Settings** → **Custom Domains** → **Add Custom Domain**, then follow the CNAME instructions it gives you.

## Troubleshooting

- **Render says it can't find `index.html` / shows a 404:** your files are probably nested inside an extra folder in the GitHub repo. Open the repo on GitHub — `index.html` must be visible on the very first page, not one click in. Fix it, push again, and Render redeploys.
- **The page loads but looks unstyled or broken:** check the browser console (F12). If you see 404s for `css/style.css` or `js/core.js`, the folder structure didn't upload correctly; redo Part 1.
- **Render can't see your repository:** on Render, go to **Account Settings → GitHub**, and make sure the app has access to the repository (or to all repositories).

## Other hosts

Netlify, GitHub Pages, Vercel and Cloudflare Pages all work the same way, since this is a plain static site. The short version for each:

- **Netlify Drop:** go to https://app.netlify.com/drop and drag your unzipped folder onto the page. No GitHub needed.
- **GitHub Pages:** after Part 1 above, open your repo's **Settings → Pages**, set **Source** to **Deploy from a branch**, pick `main` and `/ (root)`, and save. Your site appears at `https://YOUR-USERNAME.github.io/skyline-flight-booking/`.
- **Vercel / Cloudflare Pages:** import the GitHub repository, choose the **Other** framework preset, leave the build command empty, and set the output directory to `.`.

## Good to know before you share the link

- **Demo login:** `demo@skyline.app` / `demo1234`. Test card `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined.
- **Developer screens:** press **Ctrl+Shift+D** on the live site (or add `#dev` to the URL) to reveal the API gateway and Database tabs.
- **Data is per browser, per URL.** Nothing is shared between visitors, and nothing is a real payment — it's all simulated in the browser.
