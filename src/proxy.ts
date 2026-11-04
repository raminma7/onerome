import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createIntlMiddleware(routing);

/** Paths (after the locale prefix) that require a signed-in user. */
const PROTECTED = [
  "/onboarding",
  "/discover",
  "/likes",
  "/matches",
  "/connection",
  "/chat",
  "/first-date",
  "/billing",
  "/notifications",
  "/settings",
  "/profile",
  "/admin",
];
const AUTH_ONLY = ["/login", "/register"];

function stripLocale(pathname: string) {
  const [, maybeLocale, ...rest] = pathname.split("/");
  if ((routing.locales as readonly string[]).includes(maybeLocale)) {
    return { locale: maybeLocale, path: "/" + rest.join("/") };
  }
  return { locale: routing.defaultLocale, path: pathname };
}

export default async function proxy(request: NextRequest) {
  const response = intl(request);
  // next-intl redirected (e.g. to add the locale prefix): nothing else to do.
  if (response.headers.get("location")) return response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  // Refresh the Supabase session and forward refreshed cookies.
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { locale, path } = stripLocale(request.nextUrl.pathname);
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));
  const isAuthOnly = AUTH_ONLY.some((p) => path === p);

  const redirectTo = (target: string) => {
    const redirect = NextResponse.redirect(new URL(`/${locale}${target}`, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (isProtected && !signedIn) {
    return redirectTo(`/login?next=${encodeURIComponent(path)}`);
  }
  if (isAuthOnly && signedIn) {
    return redirectTo("/discover");
  }
  return response;
}

export const config = {
  // Skip API routes, Next internals and static files.
  matcher: ["/((?!api|auth/callback|_next|_vercel|sw.js|manifest.webmanifest|.*\\..*).*)"],
};
