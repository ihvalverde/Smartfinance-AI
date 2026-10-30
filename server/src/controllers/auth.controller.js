import { config } from '../config/env.js';
import { parseCookies } from '../utils/helpers.js';
import { sendSuccess } from '../utils/response.js';
import {
  authenticateUser,
  getUserById,
  issueTokenPair,
  parseDurationToMs,
  registerUser,
  revokeRefreshToken,
  rotateRefreshToken,
  updateUserProfile,
} from '../services/auth.service.js';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: config.cookies.path,
    maxAge: parseDurationToMs(config.jwt.refreshExpiresIn, config.cookies.maxAgeMs),
  };
}

function setRefreshCookie(res, token) {
  res.cookie(config.cookies.refreshName, token, cookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(config.cookies.refreshName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: config.cookies.path,
  });
}

export async function register(req, res) {
  const user = await registerUser(req.validatedData);
  const tokens = await issueTokenPair(user, req.headers['user-agent']);
  setRefreshCookie(res, tokens.refreshToken);
  return sendSuccess(res, {
    user,
    accessToken: tokens.accessToken,
    expiresAt: tokens.expiresAt,
  }, 201);
}

export async function login(req, res) {
  const user = await authenticateUser(req.validatedData);
  const tokens = await issueTokenPair(user, req.headers['user-agent']);
  setRefreshCookie(res, tokens.refreshToken);
  return sendSuccess(res, {
    user,
    accessToken: tokens.accessToken,
    expiresAt: tokens.expiresAt,
  });
}

export async function refresh(req, res) {
  const cookies = parseCookies(req);
  const rawToken = cookies[config.cookies.refreshName];
  const result = await rotateRefreshToken(rawToken, req.headers['user-agent']);
  setRefreshCookie(res, result.refreshToken);
  return sendSuccess(res, {
    user: result.user,
    accessToken: result.accessToken,
    expiresAt: result.expiresAt,
  });
}

export async function logout(req, res) {
  const cookies = parseCookies(req);
  await revokeRefreshToken(cookies[config.cookies.refreshName]);
  clearRefreshCookie(res);
  return sendSuccess(res, { message: 'Sesión cerrada' });
}

export async function me(req, res) {
  const user = await getUserById(req.userId);
  return sendSuccess(res, { user });
}

export async function updateMe(req, res) {
  const user = await updateUserProfile(req.userId, req.validatedData);
  return sendSuccess(res, { user });
}
