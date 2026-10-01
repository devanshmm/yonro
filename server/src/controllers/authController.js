import * as service from '../services/authService.js';
import { config } from '../lib/config.js';
const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api',
  maxAge: 7 * 86400000,
};
export async function signup(req, res) {
  const result = await service.signup(req.validated.body);
  res.cookie('lockin_session', result.token, cookieOptions).status(201).json({ user: result.user });
}
export async function login(req, res) {
  const result = await service.login(req.validated.body);
  res.cookie('lockin_session', result.token, cookieOptions).json({ user: result.user });
}
export async function logout(req, res) {
  await service.logout(req.sessionId);
  res
    .clearCookie('lockin_session', { ...cookieOptions, maxAge: undefined })
    .status(204)
    .end();
}
export function me(req, res) {
  res.json({ user: req.user });
}
