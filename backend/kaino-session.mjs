import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { createKainoServerClient } from "@kainostore/sdk/server";
const APP_ID = "2fcd0514-e4f4-4814-b0f1-ff54ed5d5b99";
const COOKIE = "__Host-slip_session";
const ATTRIBUTES = "Path=/; HttpOnly; Secure; SameSite=Lax";
let client;
function kaino() {
  return client ??= createKainoServerClient({
    marketplaceUrl: process.env.KAINO_MARKETPLACE_URL,
    clientId: process.env.KAINO_INTEGRATION_CLIENT_ID,
    clientSecret: process.env.KAINO_INTEGRATION_CLIENT_SECRET,
    assertionIssuer: process.env.KAINO_INTEGRATED_SESSION_ISSUER ?? "kaino-marketplace",
  });
}
function cookieKey() {
  const secret = process.env.KAINO_INTEGRATION_CLIENT_SECRET;
  if (!secret) throw new Error("Missing managed integration binding");
  return Buffer.from(hkdfSync("sha256", secret, APP_ID, "slip-session-v1", 32));
}
async function validate(session) {
  if (session.appId !== APP_ID ||
      session.integrationStatus !== "active" ||
      session.entitlementStatus !== "active") {
    throw new Error("Session not authorized for Slip");
  }
  const verified = await kaino().verifySessionAssertion(session);
  const declaredExpiry = Date.parse(session.assertionExpiresAt);
  const signedExpiry = Number(verified.payload.exp) * 1000;
  const expiresAt = Math.min(declaredExpiry, signedExpiry);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() ||
      verified.subject !== session.appScopedUserId) {
    throw new Error("Invalid or expired session");
  }
  return { subject: verified.subject, expiresAt };
}
function seal(session) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cookieKey(), iv);
  cipher.setAAD(Buffer.from(APP_ID));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  return ["v1", iv.toString("base64url"), ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url")].join(".");
}
function unseal(value) {
  if (value.length > 3800) throw new Error("Cookie too large");
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "v1" ||
      parts.slice(1).some(part => !/^[A-Za-z0-9_-]+$/.test(part))) {
    throw new Error("Malformed cookie");
  }
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[3], "base64url");
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Malformed cookie");
  const decipher = createDecipheriv("aes-256-gcm", cookieKey(), iv);
  decipher.setAAD(Buffer.from(APP_ID));
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([
    decipher.update(Buffer.from(parts[2], "base64url")),
    decipher.final(),
  ]).toString("utf8"));
}
export function clearSessionCookie() {
  return `${COOKIE}=; Max-Age=0; ${ATTRIBUTES}`;
}
export async function createSessionCookie(bridgeToken) {
  const integrated = await kaino().createIntegratedSession(bridgeToken, {
    signal: AbortSignal.timeout(10000),
  });
  const { subject, expiresAt } = await validate(integrated);
  const maxAge = Math.floor((expiresAt - Date.now()) / 1000);
  if (maxAge < 1) throw new Error("Expired session");
  const session = {
    appId: integrated.appId,
    appSlug: integrated.appSlug,
    appScopedUserId: subject,
    entitlementId: integrated.entitlementId,
    entitlementStatus: integrated.entitlementStatus,
    integrationStatus: integrated.integrationStatus,
    sessionAssertion: integrated.sessionAssertion,
    issuedAt: integrated.issuedAt,
    assertionExpiresAt: new Date(expiresAt).toISOString(),
  };
  const value = seal(session);
  if (value.length > 3800) throw new Error("Session too large for cookie");
  return `${COOKIE}=${value}; Max-Age=${maxAge}; ${ATTRIBUTES}`;
}
export async function verifyRequestSession(req) {
  const matches = (req.headers.cookie ?? "").split(";")
    .map(part => part.trim())
    .filter(part => part.startsWith(`${COOKIE}=`));
  if (matches.length !== 1) throw new Error("Missing or duplicate session");
  const session = unseal(matches[0].slice(COOKIE.length + 1));
  return validate(session);
}
