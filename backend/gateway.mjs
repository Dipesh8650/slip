import http from "node:http";
import { readFile } from "node:fs/promises";
import {
  clearSessionCookie,
  createSessionCookie,
  verifyRequestSession,
} from "./kaino-session.mjs";
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Invalid HTTP port");
}
const expectedOrigin = new URL(
  process.env.KAINO_DEPLOYMENT_URL ?? `http://127.0.0.1:${port}`
).origin;
const backend = "http://127.0.0.1:8000";
const publicDirectory = new URL("./public/", import.meta.url);
function reply(res, status, text, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    ...headers,
  });
  res.end(text);
}
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 262144) {
      const error = new Error("Request too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function handle(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/health") {
    if (req.method !== "GET") return reply(res, 405, "Method not allowed");
    try {
      const health = await fetch(`${backend}/api/health`, {
        signal: AbortSignal.timeout(3000),
        redirect: "error",
      });
      return reply(res, health.ok ? 200 : 503,
        health.ok ? "ok" : "Backend unavailable");
    } catch {
      return reply(res, 503, "Backend unavailable");
    }
  }
  if (url.pathname === "/api/kaino/callback") {
    if (req.method !== "GET") return reply(res, 405, "Method not allowed");
    const tokens = url.searchParams.getAll("bridge_token");
    if (tokens.length !== 1 || !tokens[0]?.trim() || tokens[0].length > 8192) {
      return reply(res, 400, "Start a new launch from Kaino", {
        "Set-Cookie": clearSessionCookie(),
      });
    }
    try {
      const cookie = await createSessionCookie(tokens[0]);
      res.writeHead(303, { Location: "/", "Set-Cookie": cookie });
      return res.end();
    } catch {
      return reply(res, 400, "Start a new launch from Kaino", {
        "Set-Cookie": clearSessionCookie(),
      });
    }
  }
  if (req.headers["sec-fetch-site"] === "cross-site") {
    return reply(res, 403, "Cross-site request denied");
  }
  try {
    await verifyRequestSession(req);
  } catch {
    return reply(res, 401,
      "Launch Slip from Kaino to sign in. If your session expired, launch it again.",
      { "Set-Cookie": clearSessionCookie() });
  }
  if (url.pathname.startsWith("/api/")) {
    const notePath = /^\/api\/notes\/[a-z0-9-]{3,80}(\/protection)?$/;
    if (!notePath.test(url.pathname)) return reply(res, 404, "Not found");
    if (!["GET", "POST", "PUT"].includes(req.method)) {
      return reply(res, 405, "Method not allowed");
    }
    const headers = {};
    let body;
    if (req.method !== "GET") {
      if (req.headers.origin !== expectedOrigin) {
        return reply(res, 403, "Write request origin denied");
      }
      const contentType = req.headers["content-type"] ?? "";
      if (contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
        return reply(res, 415, "JSON required");
      }
      headers["Content-Type"] = "application/json";
      body = await readBody(req);
    }
    const notePassword = req.headers["x-note-password"];
    if (notePassword !== undefined) {
      if (typeof notePassword !== "string" || notePassword.length > 1024) {
        return reply(res, 400, "Invalid note password header");
      }
      headers["X-Note-Password"] = notePassword;
    }
    try {
      const upstream = await fetch(`${backend}${url.pathname}`, {
        method: req.method,
        headers,
        body,
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
      const data = await upstream.arrayBuffer();
      res.writeHead(upstream.status, {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      });
      return res.end(Buffer.from(data));
    } catch {
      return reply(res, 502, "Note service unavailable");
    }
  }
  if (req.method !== "GET") return reply(res, 405, "Method not allowed");
  let filename;
  let contentType;
  if (/^\/assets\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(js|css|woff2?|png|svg)$/.test(url.pathname) &&
      !url.pathname.includes("..")) {
    filename = url.pathname.slice(1);
    contentType = {
      js: "text/javascript; charset=utf-8",
      css: "text/css; charset=utf-8",
      woff: "font/woff",
      woff2: "font/woff2",
      png: "image/png",
      svg: "image/svg+xml",
    }[filename.split(".").pop()];
  } else if (url.pathname === "/" ||
             /^\/(?:v\/)?[a-z0-9-]{3,80}$/.test(url.pathname)) {
    filename = "index.html";
    contentType = "text/html; charset=utf-8";
  } else {
    return reply(res, 404, "Not found");
  }
  try {
    const data = await readFile(new URL(filename, publicDirectory));
    res.writeHead(200, { "Content-Type": contentType });
    return res.end(data);
  } catch {
    return reply(res, 404, "Page or asset unavailable");
  }
}
const server = http.createServer((req, res) => {
  handle(req, res).catch(error => {
    if (!res.headersSent) {
      reply(res, error.status === 413 ? 413 : 500, "Request failed");
    } else {
      res.destroy();
    }
  });
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(port, "0.0.0.0");
