import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
test('PostgreSQL API integration', { skip: process.env.RUN_INTEGRATION !== '1' }, async (t) => {
  // Never run this suite on the user's production database.
  assert.match(
    process.env.DATABASE_URL || '',
    /\/yonro_test(?:\?|$)/,
    'Integration tests require the dedicated yonro_test database',
  );
  const { default: request } = await import('supertest');
  const { app } = await import('../src/app.js');
  const { prisma } = await import('../src/lib/prisma.js');
  const { getProductivityDay, addDays } = await import('../src/utils/productivityDay.js');
  const suffix = randomUUID().slice(0, 8),
    ids = [];
  const a = request.agent(app),
    b = request.agent(app);
  const body = (n) => ({
    firstName: 'Alex',
    lastName: 'Test',
    username: `test_${n}_${suffix}`,
    email: `${n}_${suffix}@example.com`,
    password: 'correct-horse-battery',
    timezone: 'Asia/Kolkata',
  });
  let cookie, task, today;
  try {
    await t.test('signup sets HttpOnly JWT cookie and omits password hashes', async () => {
      const res = await a.post('/api/auth/signup').send(body('a')).expect(201);
      ids.push(res.body.user.id);
      cookie = res.headers['set-cookie'][0].split(';')[0];
      assert.match(res.headers['set-cookie'][0], /HttpOnly/);
      assert.equal(res.body.user.passwordHash, undefined);
      const stored = await prisma.user.findUnique({ where: { id: ids[0] } });
      assert.notEqual(stored.passwordHash, body('a').password);
      assert.match(stored.passwordHash, /^\$2/);
      await a.get('/api/auth/me').expect(200);
      await request(app).get('/api/tasks').expect(401);
      const second = await b.post('/api/auth/signup').send(body('b')).expect(201);
      ids.push(second.body.user.id);
    });
    await t.test('validation, duplicate signup, invalid login, CSRF protection', async () => {
      await request(app).post('/api/auth/signup').send(body('a')).expect(409);
      await request(app)
        .post('/api/auth/login')
        .send({ email: body('a').email, password: 'wrong' })
        .expect(401);
      await a.post('/api/tasks').send({ title: '' }).expect(400);
      await a
        .post('/api/tasks')
        .set('Origin', 'https://attacker.example')
        .send({ title: 'x' })
        .expect(403);
      await a.patch('/api/settings').send({ timezone: 'Invalid/Zone' }).expect(400);
    });
    await t.test('create and edit tasks, reject cross-user access', async () => {
      const res = await a
        .post('/api/tasks')
        .send({
          title: 'Build authentication',
          priority: 'HIGH',
          estimatedMinutes: 50,
          category: 'Development',
        })
        .expect(201);
      task = res.body.task;
      today = task.productivityDate;
      assert.equal(today, getProductivityDay({ timezone: 'Asia/Kolkata', dayStartTime: '04:00' }));
      await b.patch(`/api/tasks/${task.id}`).send({ title: 'stolen' }).expect(404);
      await b.delete(`/api/tasks/${task.id}`).expect(404);
      const list = await b.get('/api/tasks').expect(200);
      assert.equal(list.body.tasks.length, 0);
      const edit = await a
        .patch(`/api/tasks/${task.id}`)
        .send({ description: 'Secure sessions', estimatedMinutes: 90 })
        .expect(200);
      assert.equal(edit.body.task.estimatedMinutes, 90);
    });
    await t.test('complete, uncomplete, planned percentage, and streaks', async () => {
      await a.post('/api/tasks').send({ title: 'Read', status: 'SKIPPED' }).expect(201);
      await a
        .post('/api/tasks')
        .send({ title: 'Yesterday', productivityDate: addDays(today, -1), status: 'COMPLETED' })
        .expect(201);
      const complete = await a.post(`/api/tasks/${task.id}/complete`).expect(200);
      assert.ok(complete.body.task.completedAt);
      const summary = await a.get('/api/productivity/today').expect(200);
      assert.equal(summary.body.plannedTasks, 2);
      assert.equal(summary.body.completedTasks, 1);
      assert.equal(summary.body.completionPercentage, 50);
      assert.equal(summary.body.currentStreak, 2);
      const undo = await a.post(`/api/tasks/${task.id}/uncomplete`).expect(200);
      assert.equal(undo.body.task.completedAt, null);
      assert.equal((await a.get('/api/productivity/today')).body.completionPercentage, 0);
    });
    await t.test(
      'focus persistence is idempotent, private, and uses start-day boundaries',
      async () => {
        const id = randomUUID(),
          focus = {
            id,
            startedAt: new Date(Date.now() - 61000).toISOString(),
            endedAt: new Date().toISOString(),
            durationSeconds: 60,
          };
        const one = await a.post('/api/focus/sessions').send(focus).expect(201);
        assert.equal(one.body.session.durationSeconds, 60);
        await a.post('/api/focus/sessions').send(focus).expect(201);
        assert.equal((await a.get('/api/focus/sessions')).body.sessions.length, 1);
        await b.post('/api/focus/sessions').send(focus).expect(409);
        assert.equal((await b.get('/api/focus/sessions')).body.sessions.length, 0);
        await a
          .post('/api/focus/sessions')
          .send({ ...focus, id: randomUUID(), durationSeconds: 900 })
          .expect(400);
        assert.equal(
          one.body.session.productivityDate,
          getProductivityDay({ timezone: 'Asia/Kolkata', dayStartTime: '04:00' }, focus.startedAt),
        );
      },
    );
    await t.test('analytics and preferences roundtrip', async () => {
      const week = await a.get('/api/analytics/week').expect(200);
      assert.equal(week.body.days.length, 7);
      assert.equal(week.body.focusSeconds, 60);
      const prefs = await a
        .patch('/api/settings')
        .send({ dayStartTime: '05:30', timezone: 'Europe/London', showStreak: true })
        .expect(200);
      assert.equal(prefs.body.settings.dayStartTime, '05:30');
      const me = await a.get('/api/auth/me').expect(200);
      assert.equal(me.body.user.settings.timezone, 'Europe/London');
      const existing = await prisma.task.findUnique({ where: { id: task.id } });
      assert.equal(existing.productivityDate, today);
    });
    await t.test('logout revokes the copied JWT and login restores access', async () => {
      await a.post('/api/auth/logout').expect(204);
      await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
      await a
        .post('/api/auth/login')
        .send({ email: body('a').email, password: body('a').password })
        .expect(200);
      await a.get('/api/auth/me').expect(200);
      await a.delete(`/api/tasks/${task.id}`).expect(204);
    });
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
});
