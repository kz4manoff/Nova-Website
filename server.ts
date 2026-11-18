import "dotenv/config";
import express, { type Request as ExpressRequest, type Response as ExpressResponse } from "express";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import type { BroadcastEnv } from "./server/broadcast/cryptoAuth.ts";
import { onRequestPost as authPost } from "./functions/api/broadcast/auth.ts";
import { onRequestGet as sessionGet } from "./functions/api/broadcast/session.ts";
import { onRequestPost as logoutPost } from "./functions/api/broadcast/logout.ts";
import { onRequestGet as overviewGet } from "./functions/api/broadcast/overview.ts";
import { onRequestPost as sendPost } from "./functions/api/broadcast/send.ts";
import { onRequestPost as testDevicePost } from "./functions/api/broadcast/test-device.ts";
import {
  onRequestPost as registerDevicePost,
  onRequestDelete as registerDeviceDelete,
} from "./functions/api/broadcast/devices/register.ts";
import {
  onRequestGet as downloadsGet,
  onRequestPost as downloadsPost,
} from "./functions/api/downloads.ts";

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";

type PagesHandler = (ctx: {
  request: Request;
  env: BroadcastEnv;
}) => Promise<Response>;

function buildServerEnv(): BroadcastEnv {
  return {
    NOVA_BROADCAST_ADMIN_CODE: process.env.NOVA_BROADCAST_ADMIN_CODE,
    NOVA_BROADCAST_SESSION_SECRET: process.env.NOVA_BROADCAST_SESSION_SECRET,
    NOVA_ANDROID_REG_KEY: process.env.NOVA_ANDROID_REG_KEY,
    NOVA_BROADCAST_CLIENT_KEY: process.env.NOVA_BROADCAST_CLIENT_KEY,
    FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  };
}

function adaptPagesFunction(handler: PagesHandler) {
  return async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const protocol =
        req.get("x-forwarded-proto") || (req.secure ? "https" : "http");
      const host = req.get("host") || `localhost:${PORT}`;
      const fullUrl = `${protocol}://${host}${req.originalUrl}`;

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) {
          for (const item of value) headers.append(key, item);
        } else if (typeof value === "string") {
          headers.set(key, value);
        }
      }

      const method = req.method.toUpperCase();
      const hasBody = method !== "GET" && method !== "HEAD";
      let bodyInit: string | undefined;
      if (hasBody && req.body !== undefined) {
        bodyInit =
          typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      }

      const webRequest = new Request(fullUrl, {
        method,
        headers,
        body: bodyInit,
      });

      const webResponse = await handler({
        request: webRequest,
        env: buildServerEnv(),
      });

      res.status(webResponse.status);

      const anyHeaders = webResponse.headers as Headers & {
        getSetCookie?: () => string[];
      };
      const setCookies =
        typeof anyHeaders.getSetCookie === "function"
          ? anyHeaders.getSetCookie()
          : [];
      if (setCookies.length > 0) {
        res.setHeader("Set-Cookie", setCookies);
      }

      webResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie" && setCookies.length > 0) {
          return;
        }
        res.setHeader(key, value);
      });

      const arrayBuf = await webResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuf));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error.";
      res.status(500).json({ error: message });
    }
  };
}

async function startServer() {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json({ limit: "1mb" }));

  // NOVA BROADCAST Admin & Device APIs
  app.get("/api/broadcast/session", adaptPagesFunction(sessionGet));
  app.post("/api/broadcast/auth", adaptPagesFunction(authPost));
  app.post("/api/broadcast/logout", adaptPagesFunction(logoutPost));
  app.get("/api/broadcast/overview", adaptPagesFunction(overviewGet));
  app.post("/api/broadcast/send", adaptPagesFunction(sendPost));
  app.post("/api/broadcast/test-device", adaptPagesFunction(testDevicePost));
  app.post("/api/broadcast/devices/register", adaptPagesFunction(registerDevicePost));
  app.delete("/api/broadcast/devices/register", adaptPagesFunction(registerDeviceDelete));

  // Persistent APK Download Counter API
  app.get("/api/downloads", adaptPagesFunction(downloadsGet));
  app.post("/api/downloads", adaptPagesFunction(downloadsPost));

  // Any unmatched /api/* path should always return JSON 404, never index.html
  app.all("/api/*", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NOVA MUSIC server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
