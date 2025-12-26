import type { AdminConfig } from "../types";

const ADMIN_NAME = Bun.env.ADMIN_NAME;
const ADMIN_PASSWORD = Bun.env.ADMIN_PASSWORD;
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

  if (username !== ADMIN_NAME || password !== ADMIN_PASSWORD) {
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

export { validateToken, authenticate, unauthenticate };
