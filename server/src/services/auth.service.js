import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { config } from '../config/env.js';
import { BCRYPT_SALT_ROUNDS } from '../config/constants.js';
import { ConflictError, UnauthorizedError } from '../utils/errors.js';

export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

export function parseDurationToMs(value, fallbackMs) {
  const match = String(value || '').trim().match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return amount * multipliers[unit];
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function registerUser({ email, password, fullName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('El email ya está registrado');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName },
  });

  return sanitizeUser(user);
}

export async function authenticateUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  return sanitizeUser(user);
}

export async function issueTokenPair(user, deviceInfo = null) {
  const accessToken = jwt.sign(
    { userId: user.id },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn },
  );

  const refreshToken = crypto.randomBytes(64).toString('hex');
  const expiresMs = parseDurationToMs(config.jwt.refreshExpiresIn, config.cookies.maxAgeMs);
  const expiresAt = new Date(Date.now() + expiresMs);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      deviceInfo: deviceInfo ? String(deviceInfo).slice(0, 255) : null,
    },
  });

  return { accessToken, refreshToken, expiresAt };
}

export async function rotateRefreshToken(rawToken, deviceInfo = null) {
  if (!rawToken) {
    throw new UnauthorizedError('Refresh token requerido');
  }

  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.isRevoked || stored.expiresAt.getTime() < Date.now()) {
    if (stored && !stored.isRevoked) {
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { isRevoked: true },
      });
    }
    throw new UnauthorizedError('Refresh token inválido o expirado');
  }

  const user = sanitizeUser(stored.user);

  const revoked = await prisma.refreshToken.updateMany({
    where: { id: stored.id, isRevoked: false },
    data: { isRevoked: true },
  });

  if (revoked.count === 0) {
    throw new UnauthorizedError('Refresh token ya utilizado');
  }

  const tokens = await issueTokenPair(user, deviceInfo);
  return { user, ...tokens };
}

export async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), isRevoked: false },
    data: { isRevoked: true },
  });
}

export async function getUserById(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new UnauthorizedError('Usuario no encontrado');
  }
  return sanitizeUser(user);
}

export async function updateUserProfile(userId, data) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });
  return sanitizeUser(user);
}
