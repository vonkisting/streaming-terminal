# Streaming Terminal

A Next.js 16 application with TypeScript, NextAuth.js (Google OAuth), Tailwind CSS 4, and Convex.

## Features

- ✅ Next.js 16 with App Router
- ✅ TypeScript
- ✅ NextAuth.js with Google OAuth
- ✅ Tailwind CSS 4
- ✅ Convex (database and backend)
- ✅ Protected routes
- ✅ Authentication flow

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Google OAuth application
- A Convex account

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Copy `env.example` to `.env.local` and fill in your values:

```bash
cp env.example .env.local
```

Required environment variables:
- `NEXTAUTH_URL` - Your app URL (http://localhost:3000 for dev)
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `NEXT_PUBLIC_CONVEX_URL` - Your Convex deployment URL

3. Set up Convex:

```bash
npx convex dev
```

This will:
- Create a new Convex project (if needed)
- Generate the Convex URL
- Deploy your schema and functions

4. Set up Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://your-domain.com/api/auth/callback/google` (prod)

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── auth/         # Authentication routes
│   ├── dashboard/        # Protected dashboard page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── convex/               # Convex backend
│   ├── auth.config.ts   # Auth configuration
│   ├── auth.ts          # Auth exports
│   └── schema.ts        # Database schema
└── middleware.ts         # Next.js middleware
```

## Authentication Flow

1. User visits the home page
2. If not authenticated, they see a "Sign in with Google" button
3. Clicking the button redirects to Google OAuth
4. After authentication, user is redirected to `/dashboard`
5. Protected routes check authentication status

## Protected Routes

The `/dashboard` route is protected. Users must be authenticated to access it.

To protect additional routes:
1. Import `getAuthToken` from `@convex-dev/auth/nextjs/server`
2. Check for token and redirect if missing

## Deployment

### Production Setup

1. Copy `.env.production.example` to `.env.production`
2. Fill in production values
3. Set up Convex production deployment
4. Deploy to your hosting platform (Vercel, etc.)

### Environment Variables for Production

Make sure to set these in your hosting platform:
- All variables from `.env.production`
- Update Google OAuth redirect URIs to production URL

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Convex Documentation](https://docs.convex.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
