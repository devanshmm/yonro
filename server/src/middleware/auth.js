import { authenticate } from '../services/authService.js';
import { AppError } from '../utils/errors.js';
export async function requireAuth(req, _res, next) {
  try {
    if (!req.cookies.lockin_session) throw new AppError(401, 'Please log in to continue');
    const auth = await authenticate(req.cookies.lockin_session);
    req.user = auth.user;
    req.sessionId = auth.sessionId;
    next();
  } catch (error) {
    next(error);
  }
}
