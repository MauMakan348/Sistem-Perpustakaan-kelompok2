const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_ISSUER = "perpustakaan-loan-service";
const BCRYPT_ROUNDS = 12;

function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function createAccessToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET belum dikonfigurasi.");

  return jwt.sign(
    { username: user.username, role: user.role || "user" },
    secret,
    {
      subject: String(user.id),
      issuer: JWT_ISSUER,
      expiresIn: process.env.JWT_EXPIRES_IN || "2h",
    }
  );
}

function verifyAccessToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET belum dikonfigurasi.");
  return jwt.verify(token, secret, { issuer: JWT_ISSUER });
}

function getAuthenticatedUser(req) {
  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  try {
    const payload = verifyAccessToken(match[1]);
    if (!payload.sub || !payload.username) return null;
    return { id: String(payload.sub), username: payload.username, role: payload.role || "user" };
  } catch {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  createAccessToken,
  verifyAccessToken,
  getAuthenticatedUser,
};
