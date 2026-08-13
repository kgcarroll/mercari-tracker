# Mercari Tracker

Private Next.js dashboard for Needoh / Mercari resale P&L. Add and edit lots, with fees and profit calculated automatically.

## Calculations

- Unsold lots (sale price `0`) are inventory at cost. They do not create fake fees, shipping losses, or negative profit.
- Mercari fee on sold lots is **10% of sale price + shipping**.
- Profit = sale − fee − cost. Shipping is only in the fee base, not subtracted again.

## Setup

1. Copy `.env.example` values into `.env.local` after `vercel env pull`.
2. Set `ALLOWED_EMAIL` to the only address that should sign in.
3. `npm run db:push`
4. `npm run db:seed`
5. `npm run dev`
