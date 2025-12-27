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

function authenticate(
  username: string,
  password: string,
): { token: string } | undefined {
  const userAttempts = loginAttempts[username] || {
    count: 0,
    lockoutUntil: null,
  };

  if (userAttempts.lockoutUntil && userAttempts.lockoutUntil > Date.now()) {
    return undefined;
  }

  if (username !== ADMIN_NAME || password !== ADMIN_PASSWORD) {
    userAttempts.count++;
    if (userAttempts.count >= MAX_ATTEMPTS) {
      userAttempts.lockoutUntil = Date.now() + LOCKOUT_TIME;
    }
    loginAttempts[username] = userAttempts;
    return undefined;
  }

  // reset attempts on successful login
  delete loginAttempts[username];

  // generate a new token
  adminToken = crypto.randomUUID();

  return { token: adminToken };
}

function unauthenticate(): void {
  adminToken = null;
}

export { validateToken, authenticate, unauthenticate };
