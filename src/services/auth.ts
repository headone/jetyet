import { secrets } from "bun";
import type { AdminConfig } from "../types";

const SERVICE_NAME = "auth-service";
const SECRET_NAME = "admin-password";
let adminToken: string | null = null;

const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 60 * 1000; // 1 minute

const loginAttempts: Record<
  string,
  { count: number; lockoutUntil: number | null }
> = {};

function validateToken(token: string): boolean {
  return token === adminToken;
}

async function authenticate(req: Request): Promise<Response> {
  const { username, password } = (await req.json()) as AdminConfig;

  const userAttempts = loginAttempts[username] || {
    count: 0,
    lockoutUntil: null,
  };

  if (userAttempts.lockoutUntil && userAttempts.lockoutUntil > Date.now()) {
    return new Response(null, { status: 401 });
  }

  let adminPassword = await secrets.get({
    service: SERVICE_NAME,
    name: SECRET_NAME,
  });
  if (!adminPassword) {
    // use default password
    adminPassword = "admin";
    await secrets.set({
      service: SERVICE_NAME,
      name: SECRET_NAME,
      value: adminPassword,
    });
  }
  if (username !== "admin" || password !== adminPassword) {
    userAttempts.count++;
    if (userAttempts.count >= MAX_ATTEMPTS) {
      userAttempts.lockoutUntil = Date.now() + LOCKOUT_TIME;
    }
    loginAttempts[username] = userAttempts;
    return new Response(null, { status: 401 });
  }

  // reset attempts on successful login
  delete loginAttempts[username];

  // generate a new token
  adminToken = crypto.randomUUID();

  return Response.json({ token: adminToken });
}

function unauthenticate(isAuthenticated: boolean): Response {
  if (!isAuthenticated) {
    return new Response(null, { status: 401 });
  }
  adminToken = null;
  return new Response(null, { status: 204 });
}

async function choosePassword(
  req: Request,
  isAuthenticated: boolean,
): Promise<Response> {
  if (!isAuthenticated) {
    return new Response(null, { status: 401 });
  }

  const { password } = (await req.json()) as AdminConfig;
  if (!password) {
    return new Response(null, { status: 400 });
  }

  await secrets.set({
    service: SERVICE_NAME,
    name: SECRET_NAME,
    value: password,
  });

  unauthenticate(true);

  return new Response(null, { status: 204 });
}

export { validateToken, authenticate, unauthenticate, choosePassword };
