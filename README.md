# Skyline: flight booking

A complete flight booking app built on your ER diagram (Users, Airports, Flights, Seats, Bookings, Passengers) plus a new **Payments** table. It runs entirely in the browser: no install, no build step, no server code.

## Run it in VS Code

1. Open this folder in VS Code (**File > Open Folder**).
2. Install the **Live Server** extension (VS Code will suggest it, or search "Live Server" by Ritwick Dey).
3. Right-click `index.html` and choose **Open with Live Server**. The app opens at `http://127.0.0.1:5500`.

Other ways to run it:

- **Double-click `index.html`.** It works from disk too.
- **Terminal:** `npx serve . -l 5500` (or `npm start`), or `python -m http.server 5500`, then open http://localhost:5500.

The page loads Google Fonts, so fonts need an internet connection. Everything still works offline with fallback fonts.

See **DEPLOY.md** for putting this on your own URL (Netlify, GitHub Pages, Vercel).

## Try it

- **Sign in:** click *Sign in*, then *Continue as Aarav* (demo@skyline.app / demo1234). The demo account has past trips, an upcoming Dubai flight and a cancelled booking with a refund.
- **Test cards:** `4242 4242 4242 4242` succeeds. `4000 0000 0000 0002` is declined. Use any future expiry and any 3-digit code.
- **UPI apps (Google Pay, PhonePe, Paytm, BHIM, Amazon Pay):** pick an app and enter a UPI ID like `name@okaxis`, or a 10-digit mobile number. A payment request is sent to the app and the payment shows as *Pending*. A phone screen then appears where you press **Approve** or **Decline**, just as you would in the real app. The request expires after 3 minutes. An ID starting with `fail@` shows a failed request.
- **Cards:** test cards above.
- **Net banking:** *Metro Trust* is offline on purpose, so you can see that failure.
- **Wallets (Paytm Wallet, Amazon Pay balance, Mobikwik, Freecharge):** *Mobikwik* has a low balance on purpose.
- **EMI:** bookings of ₹5,000 or more. 3 and 6 months are no-cost. 9 and 12 months carry 13% a year, billed by the bank. Use a test card.
- **Pay later (Simpl, LazyPay, ZestMoney):** enter any 10-digit mobile number. Bookings above ₹25,000 are declined so you can see that case.
- **Promo codes:** `SKY10` (10% off, up to ₹1,500), `FIRSTFLY` (₹500 off fares above ₹3,000), `MONSOON` (7% off domestic flights).
- **Seat holds:** a booking that is not paid stays held for 15 minutes, then the seats are released.
- **Cancellation refunds:** 90% more than 72 hours before departure, 70% from 24 to 72 hours, 25% from 2 to 24 hours, and no cancellation inside 2 hours.

## Developer tools (hidden from travellers)

The **API gateway** console and **Database** browser are hidden from the navigation. Reveal them with **Ctrl+Shift+D**, or open the page with `#dev` on the end of the address (for example `http://127.0.0.1:5500/#dev`). Press Ctrl+Shift+D again to hide them.

- *API gateway:* live traffic, a request pipeline diagram, a request builder with copy-as-cURL, and a button that sends 70 requests at once to trigger the rate limiter (429).
- *Database:* your ER diagram as live table cards, relationships, a data browser, the SQL schema, and a *Reset demo data* button.

## Project structure

```
skyline-flight-booking/
├── index.html          Page shell. Loads the CSS and the four scripts in order
├── css/style.css       All styling, light and dark themes
├── js/
│   ├── core.js         Utilities, airports and airlines, flight generator, in-memory
│   │                   database, pricing, booking and payment rules, seed data
│   ├── gateway.js      Simulated API gateway (rate limit, router, auth) and all routes
│   ├── book.js         UI foundation, route map, boarding pass, search, seat map, payment
│   └── views.js        Header, sign-in, My trips, Payments, API console, Database, boot
├── schema.sql          PostgreSQL schema for the real database
├── DEPLOY.md           How to host it on your own URL
├── package.json        Optional "npm start" helper
└── .vscode/            Recommends Live Server
```

## Changes to your ER diagram

1. **payments** (new table): `payment_id`, `booking_id`, `amount`, `currency`, `method` (UPI, Card, NetBanking, Wallet, EMI, PayLater), `provider` (for example PhonePe, Google Pay, Visa or a bank name), `method_detail` (masked), `status` (Success, Failed, Pending, Refunded), `transaction_ref`, `failure_reason`, `paid_at`, `refunded_amount`, `refunded_at`. One booking can have many payments, so a failed attempt and a later success are separate rows. UPI payments start as *Pending* until the customer approves them in the app.
2. **passengers.seat_id** (added column): links each traveller to a seat. The original diagram had no way to record who sits where.

## How the pieces fit

Every screen calls `G.call(method, url, options)` in `gateway.js`. That function applies the rate limit (60 requests per minute), finds the route, checks the bearer token, runs the service handler and logs the result. Handlers read and write the tables held in `DB` in `core.js`. Your data is saved to the browser's `localStorage`.

Because the UI only talks to `G.call`, moving to a real backend means replacing that one function with `fetch` calls to a server that implements the same routes, then creating the database from `schema.sql`.

## API reference (simulated gateway)

Base URL: `https://api.skyline.dev` (simulated, nothing is sent over the network). Send the token as `Authorization: Bearer <token>`. Errors look like `{ "error": { "code": "...", "message": "..." } }`.

**Accounts**

| Method | Path | Auth | What it does |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Create an account |
| POST | `/api/v1/auth/login` | Public | Sign in and receive a bearer token |
| GET | `/api/v1/users/me` | Bearer token | Current profile |
| PATCH | `/api/v1/users/me` | Bearer token | Update name or phone number |
| GET | `/api/v1/users/me/summary` | Bearer token | Travel and spend summary |
| GET | `/api/v1/users/me/activity` | Bearer token | Booking and payment activity |

**Flights**

| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/api/v1/airports` | Public | List airports |
| GET | `/api/v1/flights` | Public | Search flights by route and date |
| GET | `/api/v1/flights/:id` | Public | Flight details |
| GET | `/api/v1/flights/:id/seats` | Public | Seat map with live availability |
| GET | `/api/v1/fares/calendar` | Public | Cheapest fare for each day around a date |
| GET | `/api/v1/fares/explore` | Public | Cheapest destinations from an airport |

**Bookings**

| Method | Path | Auth | What it does |
|---|---|---|---|
| POST | `/api/v1/bookings/quote` | Bearer token | Price a seat selection, with optional promo code |
| POST | `/api/v1/bookings` | Bearer token | Create a booking and hold the seats for 15 minutes |
| GET | `/api/v1/bookings` | Bearer token | Your bookings, newest first |
| GET | `/api/v1/bookings/:id` | Bearer token | One booking with passengers and payments |
| POST | `/api/v1/bookings/:id/cancel` | Bearer token | Cancel a booking and refund what the policy allows |

**Payments**

| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/api/v1/payments/methods` | Public | Checkout options: UPI apps, banks, wallets, EMI and pay later |
| POST | `/api/v1/payments` | Bearer token | Pay for a pending booking. UPI returns 202 and waits for approval in the app |
| POST | `/api/v1/payments/:id/confirm` | Bearer token | Approve or decline a pending UPI request (stands in for the app callback) |
| GET | `/api/v1/payments` | Bearer token | Your payment history |
| GET | `/api/v1/payments/:id` | Bearer token | One payment receipt |

**Gateway**

| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/api/v1/health` | Public | Gateway and service health |

## Notes

- Payment provider names (Google Pay, PhonePe and so on) are plain text labels only. No logos are used and nothing is connected to those services. A real integration needs a payment gateway account (for example Razorpay, Cashfree or PayU) and the provider's SDK.
- Airlines (Aurora Air, Kite Airways and so on) and flights are made up. Fares depend on distance, time of day and how soon the flight leaves.
- Payments are simulated. No card details leave the page and no money moves. Passwords are hashed with SHA-256 in the browser; a real server should use bcrypt or argon2.
