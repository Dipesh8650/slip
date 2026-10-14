import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
const appId = "2fcd0514-e4f4-4814-b0f1-ff54ed5d5b99";
const clientId = "fixture-client";
const clientSecret = randomBytes(32).toString("hex");
const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwk = { ...await exportJWK(publicKey), kid: "fixture", alg: "RS256" };
const sessions = new Map();
const consumed = new Set();
let upstreamRequests = 0;
let gateway;
async function makeSession(token, changes = {}, claims = {}) {
  const now = Math.floor(Date.now() / 1000);
  const expiry = token === "short" ? now + 3 : now + 120;
  const session = {
    appId,
    appSlug: "slip",
    appScopedUserId: "fixture-user",
    entitlementId: "fixture-entitlement",
    entitlementStatus: "active",
    integrationStatus: "active",
    issuedAt: new Date(now * 1000).toISOString(),
    assertionExpiresAt: new Date(expiry * 1000).toISOString(),
    ...changes,
  };
  session.sessionAssertion = await new SignJWT({
    iss: "kaino-marketplace",
    aud: `integrated-app:${session.appId}`,
    sub: session.appScopedUserId,
    iat: now,
    exp: expiry,
    ...claims,
  }).setProtectedHeader({ alg: "RS256", kid: "fixture" }).sign(privateKey);
  sessions.set(token, session);
}
function json(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(value));
}
const marketplace = http.createServer((req, res) => {
  (async () => {
    if (req.url === "/api/integrations/assertion-jwks") {
      return json(res, 200, { keys: [jwk] });
    }
    if (req.url !== "/api/integrations/bridge-session" || req.method !== "POST") {
      return json(res, 404, {});
    }
    if (req.headers["x-kaino-client-id"] !== clientId ||
        req.headers["x-kaino-client-secret"] !== clientSecret) {
      return json(res, 401, { error: "Invalid fixture credentials" });
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    const { bridgeToken } = JSON.parse(body);
    if (consumed.has(bridgeToken)) {
      return json(res, 409, {
        error: "Bridge token already consumed",
        replayAction: "request-new-bridge-token",
      });
    }
    if (!sessions.has(bridgeToken)) {
      return json(res, 401, {
        error: "Invalid or expired bridge token",
        renewalAction: "request-new-bridge-token",
      });
    }
    consumed.add(bridgeToken);
    json(res, 200, sessions.get(bridgeToken));
  })().catch(() => json(res, 500, { error: "Fixture failed" }));
});
const backend = http.createServer((req, res) => {
  upstreamRequests++;
  json(res, 200, { fixture: true });
});
async function listen(server, port) {
  server.listen(port, "127.0.0.1");
  await once(server, "listening");
}
async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
try {
  await makeSession("valid");
  await makeSession("wrong-app", { appId: "11111111-1111-4111-8111-111111111111" });
  await makeSession("wrong-subject", {}, { sub: "another-user" });
  await makeSession("wrong-audience", {}, { aud: "integrated-app:another-app" });
  await makeSession("wrong-issuer", {}, { iss: "another-issuer" });
  await makeSession("expired", {}, { exp: Math.floor(Date.now() / 1000) - 10 });
  await makeSession("disabled", { integrationStatus: "disabled" });
  await makeSession("revoked", { entitlementStatus: "revoked" });
  await makeSession("bad-signature");
  const bad = sessions.get("bad-signature");
  const parts = bad.sessionAssertion.split(".");
  parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
  bad.sessionAssertion = parts.join(".");
  await listen(marketplace, 0);
  await listen(backend, 8000);
  const base = "http://127.0.0.1:3000";
  gateway = spawn(process.execPath, ["gateway.mjs"], {
    cwd: new URL("./", import.meta.url),
    env: {
      ...process.env,
      PORT: "3000",
      KAINO_DEPLOYMENT_URL: base,
      KAINO_MARKETPLACE_URL: `http://127.0.0.1:${marketplace.address().port}`,
      KAINO_INTEGRATION_CLIENT_ID: clientId,
      KAINO_INTEGRATION_CLIENT_SECRET: clientSecret,
      KAINO_INTEGRATED_SESSION_ISSUER: "kaino-marketplace",
    },
    stdio: "inherit",
  });
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`${base}/health`);
      assert.equal(response.status, 200);
      ready = true;
      break;
    } catch {
      await setTimeout(100);
    }
  }
  assert.ok(ready, "Gateway did not become ready");
  const callback = token => fetch(
    `${base}/api/kaino/callback?bridge_token=${token}`,
    { redirect: "manual" },
  );
  const login = await callback("valid");
  assert.equal(login.status, 303, await login.text());
  assert.equal(login.headers.get("location"), "/");
  const setCookie = login.headers.get("set-cookie");
  assert.ok(setCookie);
  for (const attribute of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"]) {
    assert.ok(setCookie.includes(attribute), attribute);
  }
  assert.ok(!setCookie.includes("fixture-user"));
  assert.ok(!setCookie.includes(sessions.get("valid").sessionAssertion));
  const cookie = setCookie.split(";")[0];
  assert.equal((await fetch(`${base}/`, {
    headers: { Cookie: cookie },
  })).status, 200);
  const write = origin => fetch(`${base}/api/notes/test-note`, {
    method: "PUT",
    headers: {
      Cookie: cookie,
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: "fixture" }),
  });
  const count = upstreamRequests;
  assert.equal((await write("https://another.example")).status, 403);
  assert.equal(upstreamRequests, count, "Denied write reached backend");
  assert.equal((await write(base)).status, 200);
  assert.equal(upstreamRequests, count + 1);
  assert.equal((await callback("valid")).status, 400, "Replay accepted");
  for (const token of [
    "unknown", "wrong-app", "wrong-subject", "wrong-audience",
    "wrong-issuer", "expired", "disabled", "revoked", "bad-signature",
  ]) {
    assert.equal((await callback(token)).status, 400, token);
  }
  await makeSession("short");
  const shortLogin = await callback("short");
  assert.equal(shortLogin.status, 303);
  const shortCookie = shortLogin.headers.get("set-cookie").split(";")[0];
  await setTimeout(3500);
  assert.equal((await fetch(`${base}/api/notes/test-note`, {
    headers: { Cookie: shortCookie },
  })).status, 401, "Expired cookie accepted");
  console.log("Signed login, replay, invalid assertions, protected cookie, origin checks and expiry passed");
} finally {
  if (gateway && gateway.exitCode === null) {
    const stopped = once(gateway, "close");
    gateway.kill("SIGTERM");
    await stopped;
  }
  await close(backend);
  await close(marketplace);
}
