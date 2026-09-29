/**
 * Password hashing for SkunkScan's own accounts (bcrypt, per the explicit
 * decision to keep this simple over argon2id at this stage).
 *
 * Uses `bcryptjs` - a pure-JS implementation of the bcrypt algorithm -
 * rather than the native `bcrypt` npm package. The native package requires
 * a node-gyp/native compilation step at install time, which is exactly the
 * "native-build friction" the bcrypt-over-argon2id decision was made to
 * avoid; bcryptjs produces byte-identical, fully bcrypt-compatible hashes
 * with zero native build step, so it's the package that actually delivers
 * on that stated goal.
 */
import bcrypt from "bcryptjs";

// 12 is bcryptjs's own documented "current default" recommendation - a
// deliberate, explicit choice rather than relying on whatever the
// library's own default happens to be today, so this doesn't silently
// change behavior on a future bcryptjs upgrade.
const BCRYPT_COST_FACTOR = 12;

export async function hashPassword(plaintextPassword: string): Promise<string> {
  return bcrypt.hash(plaintextPassword, BCRYPT_COST_FACTOR);
}

export async function verifyPassword(
  plaintextPassword: string,
  storedHash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintextPassword, storedHash);
}
