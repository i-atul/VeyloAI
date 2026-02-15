# Veylo

Veylo is a next-generation AI-powered vehicle marketplace. Easily buy, sell, and manage vehicles with advanced features for both users and administrators.

## Features
- AI-powered car detail extraction from images
- Modern, responsive UI built with Next.js 15 and Tailwind CSS
- User authentication and management (Clerk, Supabase)
- Admin dashboard for car inventory, test drives, stats, and settings
- Car listing with advanced filters and search
- Reservation and test drive management
- Contact and support forms
- Prisma ORM for database management

## Tech Stack
- Next.js 15 (App Router)
- React 19
- Tailwind CSS
- Prisma ORM
- Clerk & Supabase (authentication)
- Google Generative AI (car detail extraction using the `gemini-2.5-flash` model or whichever is available in your project)
- PostgreSQL (database)
- Arcjet(rate limiting and security)
- Vercel (deployment)

## Getting Started
1. Clone the repository:
   ```sh
   git clone https://github.com/i-atul/Veylo.git
   cd veylo
   ```
2. Install dependencies:
   ```sh
   npm install --legacy-peer-deps
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env` and fill in your credentials (see below).
   - Example dummy values for `.env`:
     ```env
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
     CLERK_SECRET_KEY=""
     NEXT_PUBLIC_CLERK_SIGN_IN_URL=""
     NEXT_PUBLIC_CLERK_SIGN_UP_URL=""
     DATABASE_URL=""
     DIRECT_URL=""
     NEXT_PUBLIC_SUPABASE_URL=""
     NEXT_PUBLIC_SUPABASE_ANON_KEY=""
     SUPABASE_SERVICE_ROLE_KEY=""
     ARCJET_KEY=""
     GEMINI_API_KEY=""  # must be a valid key; run `node scripts/listModels.js` to verify which Gemini models your project can access (example uses `gemini-2.5-flash`).     ```
4. Run the development server:
   ```sh
   npm run dev
   ```
5. Visit [http://localhost:3000](http://localhost:3000) to view the app.


## Deployment
- Deploy easily on Vercel or your preferred platform.



