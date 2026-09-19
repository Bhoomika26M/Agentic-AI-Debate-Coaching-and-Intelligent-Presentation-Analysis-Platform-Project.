# Aanavandi Parcel — KSRTC Bus Cargo Booking & Public Tracking System

Aanavandi Parcel is an inter-depot parcel booking and tracking web application for Kerala State Road Transport Corporation (KSRTC) buses. Senders can book parcels to travel on state transport buses between 30+ Kerala depots, staff can scan and advance parcel handover statuses, and senders/receivers can track parcels anywhere using only a reference number.

---

## Key Features

- **No-login Public Tracking**: Search and view parcel transit status using only a 6-character reference number (e.g., `KSRTC-7A8B9C`). No phone numbers or passwords needed.
- **Shared Persistent Storage**: Powered by Vercel Postgres (or Neon SQL) with an automatic local database fallback for development. Data syncs live across devices.
- **6-Status Handover Pipeline**:
  1. `Booked`
  2. `Accepted at origin depot`
  3. `Loaded on bus`
  4. `In transit`
  5. `Arrived at destination depot`
  6. `Delivered`
- **Server-Validated Receiver OTP**: Final delivery handover requires entering the 4-digit OTP generated at booking, validated server-side.
- **Swappable Timetable Module (`lib/timetables.ts`)**: Built on published KSRTC timetables (`data/timetables.json`) covering 30+ stations across all districts with a deterministic fallback generator.
- **Station Manifest Desk (`/staff`)**: Depot staff view arriving and departing parcels grouped by bus service with pickup vs. delivered counters.
- **Civic Waybill / Ticket Aesthetic**: Designed with calm paper-toned background, deep green and amber functional accents, crisp monospace codes, and ticket perforations.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS, Lucide Icons, Custom Ticket Utilities
- **Database**: Vercel Postgres / Neon (`@neondatabase/serverless` & `pg` SQL interface) with local JSON storage fallback (`data/parcels_db.json`)
- **Deployment**: Vercel (Zero configuration required)

---

## Data Model

Table: `parcels`

| Column | Type | Description |
| :--- | :--- | :--- |
| `ref` | `TEXT PRIMARY KEY` | Unique reference number (format: `KSRTC-4F9K2Q`) |
| `origin` | `TEXT` | Pickup depot station name |
| `dest` | `TEXT` | Drop depot station name |
| `trip_id` | `TEXT` | Assigned bus trip identifier |
| `trip_time` | `TEXT` | Scheduled bus departure time |
| `trip_type` | `TEXT` | KSRTC service class (Super Fast, Garuda Volvo, etc.) |
| `bus_no` | `TEXT` | Bus registration number (e.g. `KL-15 X 1420`) |
| `size` | `TEXT` | Parcel size (`small`, `medium`, `large`) |
| `weight` | `NUMERIC` | Weight in kg |
| `sender_name` | `TEXT` | Sender full name |
| `sender_phone` | `TEXT` | Sender contact phone |
| `receiver_name` | `TEXT` | Receiver full name |
| `receiver_phone` | `TEXT` | Receiver contact phone |
| `price` | `NUMERIC` | Computed freight fare in INR |
| `otp` | `TEXT` | 4-digit delivery security code |
| `status` | `TEXT` | Current pipeline status |
| `booked_at` | `TIMESTAMPTZ` | Timestamp of booking creation |
| `timeline` | `JSONB` | Ordered array of `{ status, at, note }` handover events |

---

## API Routes

- `POST /api/parcels` — Create booking ticket. Returns parcel details with OTP (shown once on confirmation screen).
- `GET /api/parcels/[ref]` — Public tracking lookup (excludes phone numbers and OTP for privacy).
- `PATCH /api/parcels/[ref]/status` — Advance parcel status by 1 stage (requires valid `otp` body for "Delivered").
- `GET /api/trips?origin=...&dest=...` — Query scheduled bus trips annotated with remaining cargo space.
- `GET /api/manifest?station=...` — Query arriving & departing parcels for depot desk.
- `POST /api/seed` — Seed demo parcels (guarded by secret key in production).

---

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

4. Seed demo parcels:
   Click the **"Load Demo Data"** button in the top navigation bar, or run:
   ```bash
   npm run seed
   ```

---

## Deploying to Vercel

1. Push code to GitHub repository.
2. Import project into Vercel.
3. Create or connect a Postgres database through Vercel's **Neon** storage integration. Ensure the production environment has `POSTGRES_URL` (or `DATABASE_URL`).
4. Add a production-only `SEED_SECRET` environment variable if you want to load the demo parcels through `/api/seed?secret=...`.
5. Deploy. The `parcels` table is initialized automatically when an API route first runs.

Without `POSTGRES_URL` or `DATABASE_URL`, the app falls back to the local JSON file. That fallback is suitable for local development only because Vercel function filesystems are not persistent.

---

## Note on Staff Portal & Timetables

- **Staff Portal (`/staff`)**: In a commercial production system, the `/staff` route would be protected by staff authentication (e.g., NextAuth / KSRTC SSO). For hackathon judging purposes, it is accessible directly.
- **Timetables**: Route schedules are derived from published KSRTC timetables (`data/timetables.json`) and clearly labeled in the UI as schedule-based, not live GPS telemetry.
