import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

test(
  'Phase 3 real PostgreSQL rewards, focus verification and private rankings',
  { skip: process.env.RUN_INTEGRATION !== '1' },
  async (suite) => {
    assert.match(process.env.DATABASE_URL || '', /\/yonro_test(?:\?|$)/);
    const { default: request } = await import('supertest');
    const { app } = await import('../src/app.js');
    const { prisma } = await import('../src/lib/prisma.js');
    const { getProductivityDay, addDays } = await import('../src/utils/productivityDay.js');
    const owner = request.agent(app);
    const other = request.agent(app);
    const userIds = [];
    const suffix = randomUUID().slice(0, 8);
    let today;
    let habit;
    let milestone;
    let completedTask;
    const total = async () => (await owner.get('/api/gamification/me').expect(200)).body.totalXP;
    const receiptCount = (source) =>
      prisma.xPTransaction.count({ where: { userId: userIds[0], source } });
    try {
      await suite.test(
        'new APIs require authentication, private defaults, and read-only zero baseline',
        async () => {
          for (const route of [
            '/api/gamification/me',
            '/api/gamification/xp-history',
            '/api/gamification/achievements',
            '/api/leaderboards/weekly',
          ])
            await request(app).get(route).expect(401);
          for (const [index, agent] of [owner, other].entries()) {
            const response = await agent
              .post('/api/auth/signup')
              .send({
                firstName: 'Builder',
                lastName: 'Test',
                username: `phase3_${index}_${suffix}`,
                email: `phase3_${index}_${suffix}@example.com`,
                password: 'phase-three-test-password',
                timezone: 'UTC',
              })
              .expect(201);
            userIds.push(response.body.user.id);
            assert.equal(response.body.user.settings.showOnLeaderboards, false);
          }
          today = getProductivityDay({ timezone: 'UTC', dayStartTime: '04:00' });
          assert.equal(await total(), 0);
          const data = (await owner.get('/api/gamification/me')).body;
          assert.equal(data.level, 1);
          assert.equal(data.achievements.length, 14);
          assert.equal(
            data.achievements.some((achievement) => achievement.unlocked),
            false,
          );
          assert.equal(await receiptCount('ACHIEVEMENT'), 0);
          await owner.post('/api/gamification/me').send({ xp: 99999 }).expect(404);
          await owner
            .patch('/api/settings')
            .send({ xp: 999, showOnLeaderboards: true })
            .expect(400);
        },
      );
      await suite.test(
        'task creation/editing never awards XP, completion is once with a shared concurrent daily cap',
        async () => {
          const tasks = [];
          for (let index = 0; index < 10; index += 1) {
            tasks.push(
              (
                await owner
                  .post('/api/tasks')
                  .send({ title: `Task ${index}`, priority: 'HIGH' })
                  .expect(201)
              ).body.task,
            );
          }
          await owner
            .post('/api/tasks')
            .send({ title: 'Already complete on creation', status: 'COMPLETED' })
            .expect(201);
          assert.equal(await total(), 0);
          await owner.patch(`/api/tasks/${tasks[0].id}`).send({ title: 'Edited plan' }).expect(200);
          assert.equal(await total(), 0);
          await Promise.all(
            tasks.map((task) => owner.post(`/api/tasks/${task.id}/complete`).expect(200)),
          );
          completedTask = tasks[0];
          assert.equal(await total(), 75);
          assert.equal(await receiptCount('TASK_COMPLETION'), 10);
          const cap = await prisma.xPTransaction.aggregate({
            where: { userId: userIds[0], source: 'TASK_COMPLETION' },
            _sum: { amount: true },
          });
          assert.equal(cap._sum.amount, 50);
          await owner.post(`/api/tasks/${completedTask.id}/uncomplete`).expect(200);
          await owner.post(`/api/tasks/${completedTask.id}/complete`).expect(200);
          await owner.post(`/api/tasks/${completedTask.id}/complete`).expect(200);
          assert.equal(await total(), 75);
          await owner
            .patch(`/api/tasks/${completedTask.id}`)
            .send({ xp: 500, userId: userIds[1] })
            .expect(400);
          await other.post(`/api/tasks/${completedTask.id}/complete`).expect(404);
        },
      );
      await suite.test(
        'habit completion is once per habit/date even after editing, clearing and recreating entries',
        async () => {
          habit = (
            await owner
              .post('/api/habits')
              .send({ name: 'Exercise', type: 'BOOLEAN', targetValue: 1, unit: 'completed' })
              .expect(201)
          ).body.habit;
          const before = await total();
          await owner.post(`/api/habits/${habit.id}/entries`).send({ value: 0 }).expect(200);
          assert.equal(await total(), before);
          await Promise.all(
            Array.from({ length: 4 }, () =>
              owner.post(`/api/habits/${habit.id}/entries`).send({ value: 1 }).expect(200),
            ),
          );
          assert.equal(await total(), before + 35);
          await owner.delete(`/api/habits/${habit.id}/entries/${today}`).expect(204);
          await owner.post(`/api/habits/${habit.id}/entries`).send({ value: 1 }).expect(200);
          assert.equal(await total(), before + 35);
          assert.equal(await receiptCount('HABIT_COMPLETION'), 1);
          await owner
            .post(`/api/habits/${habit.id}/entries`)
            .send({ value: 1, xp: 100 })
            .expect(400);
        },
      );
      await suite.test(
        'backfilling repairs real streaks without retroactive base XP; streak milestones and badges are once',
        async () => {
          const before = await total();
          for (let offset = 1; offset <= 6; offset += 1)
            await owner
              .post(`/api/habits/${habit.id}/entries`)
              .send({ value: 1, productivityDate: addDays(today, -offset) })
              .expect(200);
          assert.equal(await total(), before);
          assert.equal((await owner.get('/api/gamification/me')).body.currentStreak, 7);
          const noBonusHabit = (
            await owner
              .post('/api/habits')
              .send({ name: 'Water', type: 'BOOLEAN', targetValue: 1, unit: 'completed' })
          ).body.habit;
          await owner.post(`/api/habits/${noBonusHabit.id}/entries`).send({ value: 1 }).expect(200);
          assert.equal(await receiptCount('STREAK_MILESTONE'), 0);
          // Fixture six genuinely recorded earning days to test the seven-day
          // boundary without changing the application clock or using backfill XP.
          for (let offset = 1; offset <= 6; offset += 1) {
            const date = addDays(today, -offset);
            const task = await prisma.task.create({
              data: {
                userId: userIds[0],
                title: 'Historical earned work',
                productivityDate: date,
                status: 'COMPLETED',
              },
            });
            await prisma.xPTransaction.create({
              data: {
                userId: userIds[0],
                source: 'TASK_COMPLETION',
                sourceId: task.id,
                amount: 10,
                description: 'Completed planned task',
                productivityDate: date,
                rewardDate: date,
              },
            });
          }
          const secondHabit = (
            await owner
              .post('/api/habits')
              .send({ name: 'Read', type: 'BOOLEAN', targetValue: 1, unit: 'completed' })
          ).body.habit;
          await owner.post(`/api/habits/${secondHabit.id}/entries`).send({ value: 1 }).expect(200);
          assert.equal(await total(), before + 130);
          assert.equal(await receiptCount('STREAK_MILESTONE'), 1);
          await owner.post(`/api/habits/${secondHabit.id}/entries`).send({ value: 1 }).expect(200);
          assert.equal(await total(), before + 130);
          const achievement = (
            await owner.get('/api/gamification/achievements')
          ).body.achievements.find((entry) => entry.key === 'SEVEN_DAY_STREAK');
          assert.equal(achievement.unlocked, true);
        },
      );
      await suite.test(
        'milestones/goal achievement derive from completed work, remain permanent and respect daily caps',
        async () => {
          const goal = (await owner.post('/api/goals').send({ title: 'Ship an app' }).expect(201))
            .body.goal;
          const before = await total();
          milestone = (
            await owner
              .post(`/api/goals/${goal.id}/milestones`)
              .send({ title: 'Ship it' })
              .expect(201)
          ).body.milestone;
          assert.equal(await total(), before);
          await Promise.all(
            Array.from({ length: 3 }, () =>
              owner.post(`/api/milestones/${milestone.id}/complete`).expect(200),
            ),
          );
          assert.equal(await total(), before + 100);
          await owner
            .patch(`/api/milestones/${milestone.id}`)
            .send({ completed: false })
            .expect(200);
          await owner.post(`/api/milestones/${milestone.id}/complete`).expect(200);
          assert.equal(await total(), before + 100);
          for (let index = 0; index < 4; index += 1)
            await owner
              .post(`/api/goals/${goal.id}/milestones`)
              .send({ title: `Extra ${index}`, completed: true })
              .expect(201);
          assert.equal(await total(), before + 125);
          await other.post(`/api/milestones/${milestone.id}/complete`).expect(404);
        },
      );
      await suite.test(
        'fabricated or legacy focus timestamps never produce XP or verified ranking time',
        async () => {
          const before = await total();
          const id = randomUUID();
          await owner
            .post('/api/focus/sessions')
            .send({
              id,
              startedAt: new Date(Date.now() - 3601000).toISOString(),
              endedAt: new Date().toISOString(),
              durationSeconds: 3600,
            })
            .expect(201);
          assert.equal(await total(), before);
          assert.equal(
            (await prisma.focusSession.findUnique({ where: { id } })).verifiedSeconds,
            0,
          );
          await owner
            .post('/api/focus/runs')
            .send({ id: randomUUID(), targetSeconds: 300, verifiedSeconds: 300 })
            .expect(400);
        },
      );
      await suite.test(
        'focus run ownership, overlap protection and paused time prevent fake completion rewards',
        async () => {
          const id = randomUUID();
          await owner.post('/api/focus/runs').send({ id, targetSeconds: 300 }).expect(201);
          await owner
            .post('/api/focus/runs')
            .send({ id: randomUUID(), targetSeconds: 300 })
            .expect(409);
          await other.patch(`/api/focus/runs/${id}`).send({ action: 'pause' }).expect(404);
          await owner.patch(`/api/focus/runs/${id}`).send({ action: 'pause' }).expect(200);
          await prisma.focusRun.update({
            where: { id },
            data: { startedAt: new Date(Date.now() - 3600000), activeMilliseconds: 1000 },
          });
          await owner.patch(`/api/focus/runs/${id}`).send({ action: 'resume' }).expect(200);
          const before = await total();
          await owner
            .post('/api/focus/sessions')
            .send({
              id,
              startedAt: new Date(Date.now() - 3601000).toISOString(),
              endedAt: new Date().toISOString(),
              durationSeconds: 3600,
            })
            .expect(201);
          assert.equal(await total(), before);
          assert.equal(
            (await prisma.focusSession.findUnique({ where: { id } })).verifiedSeconds,
            0,
          );
        },
      );
      await suite.test(
        'verified focus duration is server-derived, capped, and rewarded only once',
        async () => {
          const id = randomUUID();
          await owner.post('/api/focus/runs').send({ id, targetSeconds: 300 }).expect(201);
          // Advance only this test user's server run, never the application clock.
          await prisma.focusRun.update({
            where: { id },
            data: {
              startedAt: new Date(Date.now() - 301000),
              resumedAt: new Date(Date.now() - 301000),
            },
          });
          const payload = {
            id,
            startedAt: new Date(Date.now() - 601000).toISOString(),
            endedAt: new Date().toISOString(),
            durationSeconds: 600,
          };
          const before = await total();
          const response = await owner.post('/api/focus/sessions').send(payload).expect(201);
          assert.equal(response.body.session.durationSeconds, 300);
          assert.equal(response.body.session.verifiedSeconds, 300);
          assert.equal(await total(), before + 27);
          await owner.post('/api/focus/sessions').send(payload).expect(201);
          assert.equal(await total(), before + 27);
          assert.equal(await receiptCount('FOCUS_SESSION'), 1);
          await owner.patch(`/api/focus/runs/${id}`).send({ action: 'resume' }).expect(409);
        },
      );
      await suite.test(
        'all six rankings exclude private/opted-out users, respect metric privacy, thresholds and limits',
        async () => {
          await other
            .patch('/api/settings')
            .send({
              profileVisibility: 'PUBLIC',
              showOnLeaderboards: true,
              showActivity: true,
              showFocusTime: true,
              showStreak: true,
            })
            .expect(200);
          for (const metric of ['weekly', 'monthly', 'all-time', 'tasks', 'focus', 'streaks']) {
            const board = (await owner.get(`/api/leaderboards/${metric}?limit=1`).expect(200)).body;
            assert.equal(
              board.rows.some((row) => row.userId === userIds[0]),
              false,
            );
          }
          await owner.patch('/api/settings').send({ showOnLeaderboards: true }).expect(200);
          assert.equal(
            (await owner.get('/api/leaderboards/all-time')).body.rows.some(
              (row) => row.userId === userIds[0],
            ),
            false,
          );
          await owner.patch('/api/settings').send({ profileVisibility: 'PUBLIC' }).expect(200);
          const hidden = (await owner.get('/api/leaderboards/weekly')).body.rows.find(
            (row) => row.userId === userIds[0],
          );
          assert.equal(hidden.focusSeconds, null);
          assert.equal(hidden.currentStreak, null);
          assert.equal(hidden.completedTasks, null);
          assert.equal('email' in hidden, false);
          await owner
            .patch('/api/settings')
            .send({ showActivity: true, showFocusTime: true, showStreak: true })
            .expect(200);
          for (const metric of ['weekly', 'monthly', 'all-time', 'tasks', 'focus', 'streaks']) {
            const board = (
              await owner.get(`/api/leaderboards/${metric}?limit=1&period=all-time`).expect(200)
            ).body;
            assert.equal(board.rows.length, 1);
            assert.equal(board.myRank.userId, userIds[0]);
            assert.equal(board.myRank.rank, 1);
          }
          const focus = (await owner.get('/api/leaderboards/focus?period=all-time')).body;
          assert.equal(focus.myRank.focusSeconds, 300);
          const tasks = (await owner.get('/api/leaderboards/tasks?period=all-time')).body;
          assert.equal(tasks.minimumPlannedTasks, 10);
          assert.equal(tasks.myRank.score, 100);
          await owner.get('/api/leaderboards/weekly?limit=10000').expect(400);
          await owner.get('/api/leaderboards/tasks?period=invalid').expect(400);
          await owner.patch('/api/settings').send({ showOnLeaderboards: false }).expect(200);
          assert.equal((await owner.get('/api/leaderboards/all-time')).body.myRank, null);
        },
      );
      await suite.test(
        'focus and habit daily caps are enforced across distinct qualifying actions',
        async () => {
          const before = await total();
          for (let index = 0; index < 2; index += 1) {
            const id = randomUUID();
            await owner.post('/api/focus/runs').send({ id, targetSeconds: 21600 }).expect(201);
            await prisma.focusRun.update({
              where: { id },
              data: {
                startedAt: new Date(Date.now() - 21601000),
                resumedAt: new Date(Date.now() - 21601000),
              },
            });
            await owner
              .post('/api/focus/sessions')
              .send({
                id,
                startedAt: new Date(Date.now() - 21601000).toISOString(),
                endedAt: new Date().toISOString(),
                durationSeconds: 21600,
              })
              .expect(201);
          }
          const focusXP = await prisma.xPTransaction.aggregate({
            where: { userId: userIds[0], source: 'FOCUS_SESSION' },
            _sum: { amount: true },
          });
          assert.equal(focusXP._sum.amount, 80);
          assert.equal(await total(), before + 178); // 78 remaining daily XP + one 10-hour achievement.
          const habits = [];
          for (let index = 0; index < 8; index += 1) {
            habits.push(
              (
                await owner
                  .post('/api/habits')
                  .send({
                    name: `Capped habit ${index}`,
                    type: 'BOOLEAN',
                    targetValue: 1,
                    unit: 'completed',
                  })
                  .expect(201)
              ).body.habit,
            );
          }
          await Promise.all(
            habits.map((entry) =>
              owner.post(`/api/habits/${entry.id}/entries`).send({ value: 1 }).expect(200),
            ),
          );
          const habitXP = await prisma.xPTransaction.aggregate({
            where: { userId: userIds[0], source: 'HABIT_COMPLETION' },
            _sum: { amount: true },
          });
          assert.equal(habitXP._sum.amount, 50);
          assert.equal(await total(), before + 198);
        },
      );
      await suite.test(
        'reset recovers an orphan timer without cancelling another owner or awarding XP',
        async () => {
          const ownRun = randomUUID();
          const otherRun = randomUUID();
          const before = await total();
          await owner.post('/api/focus/runs').send({ id: ownRun, targetSeconds: 300 }).expect(201);
          await other
            .post('/api/focus/runs')
            .send({ id: otherRun, targetSeconds: 300 })
            .expect(201);
          await owner.delete('/api/focus/runs/active').expect(204);
          assert.equal(
            (await prisma.focusRun.findUniqueOrThrow({ where: { id: ownRun } })).state,
            'CANCELLED',
          );
          assert.equal(
            (await prisma.focusRun.findUniqueOrThrow({ where: { id: otherRun } })).state,
            'RUNNING',
          );
          await other.delete('/api/focus/runs/active').expect(204);
          assert.equal(await total(), before);
        },
      );
      await suite.test(
        'a failed productive action rolls back its mutation and reward atomically',
        async () => {
          const { rewardedAction } = await import('../src/services/rewardService.js');
          const before = await total();
          const taskId = randomUUID();
          await assert.rejects(
            rewardedAction(userIds[0], async (transaction) => {
              await transaction.task.create({
                data: {
                  id: taskId,
                  userId: userIds[0],
                  title: 'Rollback fixture',
                  productivityDate: today,
                },
              });
              throw new Error('Intentional transaction failure');
            }),
            /Intentional transaction failure/,
          );
          assert.equal(await prisma.task.count({ where: { id: taskId } }), 0);
          assert.equal(await total(), before);
        },
      );
      await suite.test(
        'XP history is paginated, owner-scoped and agrees exactly with the derived total',
        async () => {
          const first = (await owner.get('/api/gamification/xp-history?limit=2').expect(200)).body;
          assert.equal(first.transactions.length, 2);
          assert.ok(first.nextCursor);
          const next = (
            await owner
              .get(`/api/gamification/xp-history?limit=2&cursor=${first.nextCursor}`)
              .expect(200)
          ).body;
          assert.equal(
            next.transactions.some((entry) =>
              first.transactions.some((prior) => prior.id === entry.id),
            ),
            false,
          );
          await other
            .get(`/api/gamification/xp-history?cursor=${first.transactions[0].id}`)
            .expect(404);
          const sum = await prisma.xPTransaction.aggregate({
            where: { userId: userIds[0] },
            _sum: { amount: true },
          });
          assert.equal(await total(), sum._sum.amount);
          const overview = (await owner.get('/api/gamification/me')).body;
          assert.equal(overview.level, 3);
          assert.equal(overview.currentLevelXP, 300);
          assert.equal(overview.nextLevelXP, 600);
        },
      );
    } finally {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.$disconnect();
    }
  },
);
