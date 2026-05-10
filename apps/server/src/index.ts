import { createContext } from "@cdm-pickleball/api/context";
import { appRouter } from "@cdm-pickleball/api/routers/index";
import { auth } from "@cdm-pickleball/auth";
import { env } from "@cdm-pickleball/env/server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.get("/healthz", (c) => c.json({ ok: true }));

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

const serverDir = fileURLToPath(new URL(".", import.meta.url));
const defaultWebDist = join(serverDir, "../../web/dist");

function resolveWebDistRoot(): string {
  const override = process.env.WEB_DIST?.trim();
  return override && override.length > 0 ? override : defaultWebDist;
}

function safePathUnderRoot(root: string, relativePath: string): string | null {
  const base = resolve(root);
  const basePrefix = base.endsWith(sep) ? base : base + sep;
  const candidate = resolve(join(base, relativePath));
  if (candidate === base || candidate.startsWith(basePrefix)) {
    return candidate;
  }
  return null;
}

/** Explicit types so browsers accept `type="module"` scripts behind proxies that strip Bun's inferred type. */
const STATIC_MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

function contentTypeForPath(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return STATIC_MIME[ext] ?? "application/octet-stream";
}

function hasKnownStaticExtension(relativePath: string): boolean {
  const ext = extname(relativePath).toLowerCase();
  return ext !== "" && ext in STATIC_MIME;
}

function looksLikeStaticAsset(relativePath: string): boolean {
  return relativePath.startsWith("assets/") || relativePath === "favicon.svg";
}

if (env.NODE_ENV === "production") {
  const webDist = resolveWebDistRoot();

  app.get("*", async (c) => {
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(c.req.url).pathname);
    } catch {
      return c.text("Bad Request", 400);
    }
    if (pathname.includes("\0") || pathname.includes("..")) {
      return c.text("Not found", 404);
    }

    const relative = pathname.replace(/^\/+/, "") || "index.html";
    const allowed = safePathUnderRoot(webDist, relative);
    if (allowed) {
      const file = Bun.file(allowed);
      if (await file.exists()) {
        const type = contentTypeForPath(allowed);
        return new Response(file, {
          headers: { "Content-Type": type },
        });
      }
    }

    // Missing hashed chunks must not fall back to index.html — that yields wrong MIME / blank type and obscure errors.
    if (looksLikeStaticAsset(relative) || hasKnownStaticExtension(relative)) {
      return new Response("Not found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const indexAllowed = safePathUnderRoot(webDist, "index.html");
    if (indexAllowed) {
      const index = Bun.file(indexAllowed);
      if (await index.exists()) {
        return new Response(index, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }

    return c.text("Web bundle missing: set WEB_DIST or run `vite build` for apps/web.", 500);
  });
} else {
  app.get("/", (c) => {
    return c.text("OK");
  });
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

export default {
  port,
  hostname,
  fetch: app.fetch,
};
