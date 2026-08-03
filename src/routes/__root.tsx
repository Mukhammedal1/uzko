import * as React from "react";
import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { AppProvider } from "@/lib/app-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";

import appCss from "../styles.css?url";

const AUTH_ROUTES = new Set(["/login", "/register", "/verify-code"]);

function SplashScreen() {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-muted/30">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md shadow-sm">
        <img src="/uzko-logo.jpg" alt="UZKO" className="h-full w-full object-cover" />
      </div>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthRoute = AUTH_ROUTES.has(location.pathname);

  React.useEffect(() => {
    if (status === "loading") return;
    if (status === "guest" && !isAuthRoute) {
      navigate({ to: "/login", replace: true });
    } else if (status === "authenticated" && isAuthRoute) {
      navigate({ to: "/", replace: true });
    }
  }, [status, isAuthRoute, navigate]);

  if (status === "loading") return <SplashScreen />;
  if (status === "guest" && !isAuthRoute) return <SplashScreen />;
  if (status === "authenticated" && isAuthRoute) return <SplashScreen />;
  return <>{children}</>;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "UZKO" },
      {
        name: "description",
        content: "Point-of-sale application for managing sales and inventory.",
      },
      { name: "author", content: "UZKO" },
      { property: "og:title", content: "UZKO" },
      {
        property: "og:description",
        content: "Point-of-sale application for managing sales and inventory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "UZKO" },
      {
        name: "twitter:description",
        content: "Point-of-sale application for managing sales and inventory.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AppProvider>
      <AuthProvider>
        <AuthGate>
          <Outlet />
        </AuthGate>
      </AuthProvider>
    </AppProvider>
  );
}
