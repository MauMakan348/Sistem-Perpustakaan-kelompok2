const test = require("node:test");
const assert = require("node:assert/strict");
const {
  hashPassword,
  verifyPassword,
  createAccessToken,
  verifyAccessToken,
  getAuthenticatedUser,
} = require("../auth");

process.env.JWT_SECRET = "test-only-secret-that-is-long-enough-for-unit-tests-123456";

test("password is hashed and verified without storing plaintext", async () => {
  const password = "contohPassword123";
  const hash = await hashPassword(password);
  assert.notEqual(hash, password);
  assert.match(hash, /^\$2[aby]\$/);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("password-salah", hash), false);
});

test("JWT contains the user identity and verifies with the configured secret", () => {
  const token = createAccessToken({ id: 42, username: "mahasiswa01" });
  const payload = verifyAccessToken(token);
  assert.equal(payload.sub, "42");
  assert.equal(payload.username, "mahasiswa01");
  assert.equal(payload.iss, "perpustakaan-loan-service");
});

test("invalid JWT is rejected by the request authenticator", () => {
  const user = getAuthenticatedUser({ headers: { authorization: "Bearer invalid.token.value" } });
  assert.equal(user, null);
  assert.equal(getAuthenticatedUser({ headers: {} }), null);
});

test("authenticated user is extracted from a Bearer token", () => {
  const token = createAccessToken({ id: 7, username: "uji_user" });
  const user = getAuthenticatedUser({ headers: { authorization: `Bearer ${token}` } });
  assert.deepEqual(user, { id: "7", username: "uji_user" });
});
