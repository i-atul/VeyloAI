import fs from 'fs';
const content = `import arcjet from '@arcjet/next';
import { detectBot, shield } from '@arcjet/next';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// matcher used by both Arcjet (inside \`protect\`) and our auth logic
const isProtectedRoute = createRouteMatcher([
    "/admin(.*)",
    "/saved-cars(.*)",
    "/reservations(.*)",
]);

// configure Arcjet rules the same as before
const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({ mode: "LIVE", allow: ["CATEGORY:SEARCH_ENGINE"] }),
  ],
});

// standalone Clerk middleware instance; we call it explicitly below so that the
// default export of this file is a plain \`async function middleware(...)\` which
// helps Clerk detect that its middleware is being used.
const clerkMw = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn();
  }
  return NextResponse.next();
});

export default async function middleware(request, event) {
  // run Arcjet first to enforce rate-limits/shields
  const decision = await aj.protect(request);
  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return NextResponse.json(
        { code: 429, message: "Too Many Requests" },
        { status: 429 }
      );
    } else {
      return NextResponse.json(
        { code: 403, message: "Forbidden" },
        { status: 403 }
      );
    }
  }

  // now that the request is allowed, hand it off to Clerk's middleware
  return clerkMw(request, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
`;
fs.writeFileSync('d:/Project/vehicle-marketplace/veylo/middleware.js', content);
console.log('middleware file overwritten');
