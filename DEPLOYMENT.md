# Deploying KnotNest

Two ways. **Option A** is simplest: one Render service runs the API and serves the website, so there is one URL and no CORS setup. **Option B** splits the website (Vercel) and the API (Render).

Whichever you pick, set these up first:

1. **MongoDB Atlas** (free M0 cluster): create a database user, allow access from anywhere (`0.0.0.0/0`, Render's IPs change), and copy the connection string, e.g. `mongodb+srv://knotnest:<password>@cluster0.xxxxx.mongodb.net/knotnest`.
2. **Cloudinary** (free): copy cloud name, API key and API secret. Render's disk is wiped on every deploy, so uploaded photos must live on Cloudinary.
3. **SMTP** for invitation emails, e.g. **Brevo** (free, 300 emails/day): Settings > SMTP & API gives `smtp-relay.brevo.com`, port `587`, your login and an SMTP key. Verify the sender address you will use in `MAIL_FROM`.
   Gmail also works for small lists: turn on 2-step verification, create an App Password, and use `smtp.gmail.com`, port `465`.
4. **Razorpay test keys** (optional): dashboard in Test Mode > Settings > API Keys. Without keys, production disables the payment button with a clear message (simulated payments exist only in development).

## Option A: one Render service (recommended)

1. Push the project to GitHub (the `.gitignore` already excludes `.env`, `node_modules`, `dist`, uploads and the dev database).
2. Render > **New > Blueprint** > choose the repo. Render reads `render.yaml`.
3. Fill in the values marked "sync: false":
   - `MONGO_URI`: the Atlas string
   - `CLIENT_URL` and `PUBLIC_APP_URL`: your service URL, e.g. `https://knotnest.onrender.com`
   - `CLOUDINARY_*`, `SMTP_*`, `MAIL_FROM`, `RAZORPAY_*`
4. Deploy. The build runs `npm install && npm run build`; the start command runs the API, which also serves the built React app.
5. Load the demo data once (optional): Render > your service > **Shell**: `npm run seed`.
6. Check `https://<your-app>.onrender.com/api/health`, log in with the demo accounts, then send one invitation to your own email and open the RSVP link on your phone.

## Option B: Vercel (website) + Render (API)

**API on Render**: same as Option A, but set
- `CLIENT_URL` = your Vercel URL, e.g. `https://knotnest.vercel.app` (CORS)
- `PUBLIC_APP_URL` = the same Vercel URL (RSVP links in emails must open the website, not the API)

**Website on Vercel**: New Project > import the repo > **Root Directory: `client`** (Vite is detected; `client/vercel.json` adds the single-page-app rewrite). Environment variables:
- `VITE_API_URL` = `https://<your-api>.onrender.com`
- `VITE_API_ORIGIN` = `https://<your-api>.onrender.com` (for images stored on the API)

Redeploy the website after changing these, because Vite bakes them in at build time.

## After deploying

- Change the demo passwords or delete the demo accounts before sharing the link publicly.
- Render's free plan sleeps after 15 minutes without traffic; the first request then takes up to a minute. Open the site once before a demo or viva.
- Moving from Razorpay test to live mode needs a verified account, live keys, and ideally a payment webhook.
