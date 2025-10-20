import { createHmac, randomBytes } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

type CookieOptions = {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
};

export interface UserSession {
  id: string;
  email: string;
  name?: string;
}

const SESSION_COOKIE_NAME = "user_token";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours
const SESSION_SECRET = process.env.SESSION_SECRET ?? "archimeuble_dev_secret";

const base64url = (value: string | Buffer) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const { httpOnly = false, maxAge, path = "/", sameSite = "lax", secure = false } = options;
  let cookie = `${name}=${value}`;
  cookie += `; Path=${path}`;
  if (maxAge !== undefined) {
    cookie += `; Max-Age=${Math.floor(maxAge)}`;
  }
  if (httpOnly) {
    cookie += "; HttpOnly";
  }
  if (secure) {
    cookie += "; Secure";
  }
  if (sameSite) {
    cookie += `; SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`;
  }
  return cookie;
}

function signSessionPayload(payload: string) {
  return base64url(createHmac("sha256", SESSION_SECRET).update(payload).digest());
}

export function createSessionToken(session: UserSession) {
  const payload = base64url(JSON.stringify({ ...session, nonce: randomBytes(8).toString("hex") }));
  const signature = signSessionPayload(payload);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token?: string): UserSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expectedSignature = signSessionPayload(payload);
  if (signature !== expectedSignature) return null;
  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(Buffer.from(normalizedPayload, "base64").toString("utf8"));
    const { id, email, name } = data as UserSession;
    if (!id || !email) return null;
    return { id, email, name };
  } catch (error) {
    return null;
  }
}

export function setSessionCookie(res: NextApiResponse, token: string) {
  res.setHeader(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    })
  );
}

export function clearSessionCookie(res: NextApiResponse) {
  res.setHeader(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      maxAge: 0,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    })
  );
}

export function parseSessionFromCookieHeader(cookieHeader?: string): UserSession | null {
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [name, ...rest] = cookie.trim().split("=");
      return [name, rest.join("=")];
    })
  );
  const token = cookies[SESSION_COOKIE_NAME];
  return verifySessionToken(token);
}

export function getSessionFromRequest(req: NextApiRequest): UserSession | null {
  return parseSessionFromCookieHeader(req.headers.cookie);
}
