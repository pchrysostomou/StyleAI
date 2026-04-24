<div align="center">

# ✨ StyleAI — Personal AI Stylist

**Your wardrobe. Analysed by AI. Styled for you.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-green?style=flat-square&logo=supabase)](https://supabase.com)
[![Claude AI](https://img.shields.io/badge/Claude-Opus%204.5-orange?style=flat-square)](https://anthropic.com)

<br/>

> StyleAI is a full-stack AI-powered personal styling platform. Upload photos of yourself and your wardrobe — Claude Vision analyses your body type, skin tone, and colour palette, then generates personalised outfit recommendations tailored to the occasion and weather.

<br/>

![StyleAI Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=flat-square)

</div>

---

## 📸 Features

| Feature | Description |
|---------|-------------|
| 🧍 **Body Analysis** | Upload 3 photos (front, side, back) — Claude Vision AI detects body type, height, skin tone, hair colour, recommended fits and colours to avoid |
| 👗 **Smart Wardrobe** | Upload photos of your clothes — AI automatically categorises each item by type, colour, style, season, pattern and material |
| ✨ **Daily Outfit Generator** | Pick an occasion (Casual / Work / Sport / Formal / Night Out) and get an AI-curated outfit from your wardrobe, with reasoning and a style tip |
| 🤖 **Virtual Try-On** | CSS-based visual overlay of outfit items on your body photo, with full Replicate AI integration ready to activate (IDM-VTON model) |
| 💬 **AI Stylist Chat** | Real-time chat with a personal AI stylist powered by Claude — asks about your style, gives advice, works in both English and Greek |
| 📅 **Outfit History** | Every generated outfit is saved with date, occasion, weather and your star rating |
| 🔐 **Auth System** | Full email/password authentication with Supabase Auth, protected routes, and session management |

---

## 🏗️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.2.4 | Full-stack React framework (App Router) |
| **React** | 19.2.4 | UI library |
| **TypeScript** | 5.x | Type safety across the entire codebase |
| **Vanilla CSS** | — | Custom design system with CSS variables (dark premium theme) |

### Backend & AI
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Claude Opus 4.5** | via Anthropic SDK | Body analysis (Vision), clothing categorisation, outfit generation, chat |
| **Anthropic SDK** | 0.91.0 | API client for Claude |
| **Next.js API Routes** | — | Serverless backend endpoints |

### Database & Storage
| Technology | Purpose |
|-----------|---------|
| **Supabase** | PostgreSQL database, Row Level Security, Authentication |
| **Supabase Storage** | Private bucket for body photos (`body-photos`) |
| **Supabase Storage** | Public bucket for wardrobe photos (`wardrobe-photos`) |

### Optional / Upcoming
| Technology | Purpose |
|-----------|---------|
| **Replicate** | AI Virtual Try-On using IDM-VTON model (activate with API key) |

---

## 🗂️ Project Structure

```
StyleAi/
├── app/
│   ├── api/
│   │   ├── analyze-body/       # POST — Claude Vision body analysis (3 photos → profile)
│   │   ├── analyze-clothing/   # POST — Claude Vision clothing categorisation
│   │   ├── chat/               # POST — Streaming AI stylist chat (Claude)
│   │   ├── daily-outfit/       # POST — AI outfit generation from wardrobe
│   │   ├── virtual-tryon/      # POST — Replicate IDM-VTON integration
│   │   └── auth/signout/       # POST — Supabase sign-out
│   │
│   ├── dashboard/              # Profile page — body stats, colours, fits, AI notes
│   ├── wardrobe/               # Wardrobe management — upload & view clothes
│   ├── outfit/                 # Daily outfit generator + Virtual Try-On
│   ├── history/                # Past outfit history with ratings
│   ├── chat/                   # AI Stylist chat interface
│   ├── onboarding/             # 4-step onboarding flow (photos → analysis)
│   ├── login/                  # Authentication — sign in
│   ├── signup/                 # Authentication — create account
│   ├── auth/callback/          # Supabase OAuth callback handler
│   ├── globals.css             # Design system: CSS variables, components, animations
│   └── layout.tsx              # Root layout with fonts and metadata
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   └── server.ts           # Server-side Supabase client (RSC/API routes)
│   └── types.ts                # Shared TypeScript types
│
├── supabase/
│   ├── schema.sql              # Week 1: body_profiles table + RLS policies
│   ├── schema_w2.sql           # Week 2: wardrobe_items table + storage policies
│   └── schema_w3.sql           # Week 3: outfit_history table
│
├── proxy.ts                    # Auth middleware — protects all routes
├── .env.local                  # Environment variables (never commit this)
└── next.config.ts              # Next.js configuration
```

---

## 🗄️ Database Schema

### `body_profiles`
Stores the AI-generated body analysis for each user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `auth.users` (unique per user) |
| `body_type` | TEXT | e.g. `hourglass`, `athletic`, `pear` |
| `height_estimate` | TEXT | `tall`, `medium`, `short` |
| `skin_tone` | TEXT | e.g. `tan`, `olive`, `fair` |
| `hair_color` | TEXT | e.g. `dark brown`, `blonde` |
| `recommended_fits` | TEXT[] | e.g. `['fitted', 'tailored', 'slim']` |
| `avoid_styles` | TEXT[] | e.g. `['boxy tops', 'drop-waist dresses']` |
| `best_colors` | TEXT[] | e.g. `['teal', 'coral', 'mustard']` |
| `style_notes` | TEXT | AI-written styling advice paragraph |
| `photo_front` | TEXT | Storage path or signed URL |
| `photo_side` | TEXT | Storage path or signed URL |
| `photo_back` | TEXT | Storage path or signed URL |

### `wardrobe_items`
One row per clothing item uploaded by the user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `auth.users` |
| `photo_url` | TEXT | Public URL from Supabase Storage |
| `type` | TEXT | e.g. `jeans`, `t-shirt`, `sneakers` |
| `color` | TEXT | Primary colour |
| `secondary_colors` | TEXT[] | Additional colours |
| `style` | TEXT | e.g. `casual`, `formal`, `sporty` |
| `season` | TEXT[] | e.g. `['spring', 'summer']` |
| `pattern` | TEXT | e.g. `solid`, `striped`, `floral` |
| `material_estimate` | TEXT | e.g. `denim`, `cotton`, `wool` |
| `tags` | TEXT[] | e.g. `['basics', 'workwear']` |

### `outfit_history`
Records every AI-generated outfit.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `auth.users` |
| `item_ids` | UUID[] | Array of `wardrobe_items.id` in this outfit |
| `occasion` | TEXT | e.g. `casual`, `work`, `formal` |
| `reasoning` | TEXT | AI explanation of why this outfit works |
| `style_tip` | TEXT | AI styling tip for the day |
| `rating` | INTEGER | User rating 1–5 (nullable) |
| `created_at` | TIMESTAMPTZ | When the outfit was generated |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic](https://anthropic.com) API key (Claude access)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/StyleAI.git
cd StyleAI
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional — for AI Virtual Try-On (see section below)
# REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Set up the Supabase database

Run the SQL files in order in your **Supabase SQL Editor**:

```bash
# 1. Body profiles table
supabase/schema.sql

# 2. Wardrobe items table + storage buckets
supabase/schema_w2.sql

# 3. Outfit history table
supabase/schema_w3.sql
```

### 4. Set up Supabase Storage buckets

In your Supabase Dashboard → Storage, create two buckets:

| Bucket name | Public | Purpose |
|-------------|--------|---------|
| `body-photos` | ❌ Private | User's front/side/back photos |
| `wardrobe-photos` | ✅ Public | Clothing item photos |

### 5. Configure Supabase Auth

In your Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/auth/callback`

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — sign up and complete the onboarding!

---

## 🤖 AI Virtual Try-On (Replicate)

The Virtual Try-On feature uses the **IDM-VTON** model (state-of-the-art garment transfer) via Replicate.

**Without API key:** Shows a CSS-based visual overlay of clothes on your body photo (default behaviour).

**With API key:** Click "✨ AI Try-On" after generating an outfit → the AI generates photorealistic images of *you* wearing each garment (~20 seconds per item).

### To activate:

1. Sign up at [replicate.com](https://replicate.com) (free — comes with $5 credits)
2. Go to Account → API Tokens → Create token
3. In `.env.local`, uncomment and fill in:
   ```env
   REPLICATE_API_TOKEN=r8_your_actual_token_here
   ```
4. Restart the dev server

**Cost:** ~$0.02–0.05 per try-on generation.

---

## 🔌 API Reference

All API routes are protected by Supabase session auth.

### `POST /api/analyze-body`
Analyses 3 body photos using Claude Vision.

**Body:**
```json
{
  "photos": ["base64_front", "base64_side", "base64_back"],
  "photoUrls": { "front": "url", "side": "url", "back": "url" }
}
```
**Returns:** Full `body_profile` object saved to database.

---

### `POST /api/analyze-clothing`
Categorises a single clothing photo using Claude Vision.

**Body:**
```json
{
  "photo": "base64_image",
  "photoUrl": "public_storage_url"
}
```
**Returns:** Full `wardrobe_item` object saved to database.

---

### `POST /api/daily-outfit`
Generates an outfit from the user's wardrobe.

**Body:**
```json
{ "occasion": "casual" }
```
**Returns:**
```json
{
  "outfit": { "id": "...", "reasoning": "...", "style_tip": "..." },
  "items": [...wardrobe_items],
  "weather": { "temp": 22, "condition": "Sunny", "icon": "☀️" }
}
```

---

### `POST /api/chat`
Streams an AI stylist response.

**Body:**
```json
{
  "messages": [{ "role": "user", "content": "What should I wear?" }],
  "bodyProfile": {...},
  "wardrobeCount": 12
}
```
**Returns:** Server-Sent Events stream of Claude's response.

---

### `POST /api/virtual-tryon`
Generates an AI try-on image via Replicate IDM-VTON.

**Body:**
```json
{
  "humanImageUrl": "https://...",
  "garmentImageUrl": "https://...",
  "garmentType": "jeans",
  "garmentDescription": "beige slim jeans casual"
}
```
**Returns:** `{ "resultUrl": "https://replicate-output..." }` or `{ "error": "NO_API_KEY" }` if token not configured.

---

## 🎨 Design System

StyleAI uses a custom premium dark design system defined in `app/globals.css`.

### Colour Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#080808` | Main background |
| `--bg-surface` | `#111111` | Cards, panels |
| `--bg-elevated` | `#1a1a1a` | Elevated surfaces |
| `--accent` | `#c9a84c` | Gold — primary actions, highlights |
| `--accent-glow` | `rgba(201,168,76,0.08)` | Subtle gold backgrounds |
| `--text-primary` | `#f0ebe0` | Main text |
| `--text-secondary` | `#9a9080` | Muted labels |

### Key Components
- `.card` — Dark surface card with gold border
- `.btn .btn-primary` — Gold gradient button
- `.btn-secondary` — Outlined button
- `.skeleton` — Loading shimmer animation
- `.gold-line` — Decorative gold horizontal divider
- `.animate-fade-in` — Entrance animation

---

## 🔒 Security

- All database tables use **Row Level Security (RLS)** — users can only read/write their own data
- Body photos stored in a **private Supabase bucket** — accessed via time-limited signed URLs (1 hour)
- Wardrobe photos in public bucket (non-sensitive clothing images)
- API routes verify Supabase session on every request
- Auth middleware (`proxy.ts`) protects all pages — redirects unauthenticated users to `/login`
- `.env.local` contains secrets — **never committed to git** (in `.gitignore`)

---

## 📱 Pages Overview

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Landing page | ❌ |
| `/login` | Sign in | ❌ |
| `/signup` | Create account | ❌ |
| `/onboarding` | 4-step body photo upload + AI analysis | ✅ |
| `/dashboard` | Body profile, colours, fits, AI notes | ✅ |
| `/wardrobe` | Upload & manage clothing items | ✅ |
| `/outfit` | Generate daily outfit + Virtual Try-On | ✅ |
| `/history` | Past outfits with ratings | ✅ |
| `/chat` | AI personal stylist chat | ✅ |

---

## 🛣️ Roadmap

- [x] Body analysis via Claude Vision
- [x] AI wardrobe categorisation
- [x] Daily outfit generation
- [x] AI stylist chat
- [x] Outfit history & ratings
- [x] Virtual Try-On (CSS overlay)
- [x] Virtual Try-On (Replicate AI — awaiting API key)
- [ ] Weather API integration (live weather data)
- [ ] Outfit sharing / social feed
- [ ] Mobile app (React Native)
- [ ] Shopping recommendations based on wardrobe gaps
- [ ] Seasonal wardrobe rotation suggestions

---
