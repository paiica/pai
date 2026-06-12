# PAI — Deployment Guide

## Prerequisites
- Node.js 20+
- Supabase project
- Stripe account
- Vercel account

## 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings (keep secret)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — from Stripe dashboard
- `STRIPE_SECRET_KEY` — from Stripe dashboard (keep secret)
- `STRIPE_WEBHOOK_SECRET` — from Stripe webhook settings
- `STRIPE_CAIP_PRICE_ID` — create a price in Stripe for $495 one-time
- `NEXT_PUBLIC_APP_URL` — your production domain

## 2. Supabase Setup

1. Create a new Supabase project at supabase.com
2. Enable Google Auth in Authentication > Providers
3. Run the migration:

```bash
# Using Supabase CLI
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste `supabase/migrations/001_initial_schema.sql` directly into the Supabase SQL Editor.

4. Set up Row Level Security (already included in the migration)
5. Set the Site URL and Redirect URLs in Authentication > URL Configuration:
   - Site URL: `https://professionalaiinstitute.com`
   - Redirect URLs: `https://professionalaiinstitute.com/**`

## 3. Stripe Setup

1. Create a Product in Stripe:
   - Name: "Certified AI Professional (CAIP)"
   - Price: $495.00 USD, one-time
   - Copy the Price ID to `STRIPE_CAIP_PRICE_ID`

2. Set up a Webhook:
   - Endpoint URL: `https://professionalaiinstitute.com/api/stripe/webhook`
   - Events to listen to:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
   - Copy the Webhook Secret to `STRIPE_WEBHOOK_SECRET`

## 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# For production
vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deployments.

Add all environment variables in Vercel > Project > Settings > Environment Variables.

## 5. Post-Deployment Checklist

- [ ] Run the database migration
- [ ] Test user registration (email + Google)
- [ ] Test certificate verification at /verify (use ID: CAIP-2026-00001)
- [ ] Test Stripe checkout (use Stripe test card: 4242 4242 4242 4242)
- [ ] Verify webhook is receiving events in Stripe dashboard
- [ ] Create an admin user (manually set `role = 'admin'` in profiles table)
- [ ] Test admin dashboard at /admin
- [ ] Submit sitemap to Google Search Console
- [ ] Configure custom domain in Vercel

## 6. Creating an Admin User

After first user signup, manually promote them to admin in Supabase:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-admin@email.com';
```

## 7. Issuing a Certificate

Certificates are issued manually via the Admin Dashboard (/admin).
Future automation: certificates auto-issue when an exam is passed.

Each certificate receives a unique ID: `{ACRONYM}-{YEAR}-{SEQUENCE}`
Example: `CAIP-2026-00001`

## Architecture Notes

- **Next.js 15** App Router, server components by default
- **Supabase** for auth, database, and storage
- **Stripe** for payments (checkout sessions + webhooks)
- **Framer Motion** for animations
- **Tailwind CSS** with custom PAI brand tokens
- All pages are statically generated where possible
- API routes are serverless functions
- Middleware handles auth protection and redirects
