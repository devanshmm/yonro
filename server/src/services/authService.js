import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../lib/config.js';
import { AppError } from '../utils/errors.js';
export const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  email: true,
  profileImage: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
  settings: true,
};
const expiryMs = 7 * 86400000;
const dummyHash = await bcrypt.hash('dummy-password-for-timing', 12);
async function createSession(user) {
  const session = await prisma.authSession.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + expiryMs) },
  });
  const token = jwt.sign({}, config.JWT_SECRET, {
    subject: user.id,
    jwtid: session.id,
    expiresIn: '7d',
    issuer: 'yonro',
    audience: 'lockin',
  });
  return { user, token };
}
export async function signup({ password, timezone, ...data }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { ...data, passwordHash, settings: { create: { timezone } } },
    select: userSelect,
  });
  return createSession(user);
}
export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !valid) throw new AppError(401, 'Email or password is incorrect');
  return createSession(
    await prisma.user.findUnique({ where: { id: user.id }, select: userSelect }),
  );
}
export async function authenticate(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'yonro',
      audience: 'lockin',
    });
  } catch {
    throw new AppError(401, 'Please log in to continue');
  }
  const session = await prisma.authSession.findUnique({
    where: { id: payload.jti },
    include: { user: { select: userSelect } },
  });
  if (!session || session.userId !== payload.sub || session.expiresAt <= new Date())
    throw new AppError(401, 'Your session has expired. Please log in again');
  return { user: session.user, sessionId: session.id };
}
export async function logout(sessionId) {
  await prisma.authSession.deleteMany({ where: { id: sessionId } });
}
