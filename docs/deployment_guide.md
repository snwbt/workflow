# 🚀 Vercel Deployment Guide

Follow these steps to deploy your luxury wedding microsite to Vercel.

## 1. Connect to Vercel
1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your Git repository.
3. Vercel will automatically detect that you are using **Next.js**.

## 2. Configure Environment Variables
Before clicking "Deploy", expand the **Environment Variables** section and add the following:

| Variable | Description | Example / Source |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | API Key for sending RSVP emails | Get from [resend.com](https://resend.com) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Key for the venue map | Get from [Google Cloud Console](https://console.cloud.google.com/) |
| `ADMIN_EMAIL` | Where RSVP notifications are sent | `your-email@example.com` |
| `FROM_EMAIL` | The "From" address for emails | `rsvp@yourdomain.com` (Must be verified in Resend) |

## 3. Deploy
1. Click **Deploy**.
2. Once finished, Vercel will provide you with a production URL.

## 4. Post-Deployment Check
- Visit `/admin` on your new site.
- **Login**: `admin`
- **Password**: `wedding2026`
- Verify that the map is loading correctly.
- Test the RSVP form to ensure you receive the notification email.

---
*Note: The admin credentials are currently hardcoded in `src/middleware.ts`. For enhanced security, consider moving these to environment variables in a future update.*
