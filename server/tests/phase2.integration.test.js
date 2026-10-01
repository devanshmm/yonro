import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

test(
  'Phase 2 PostgreSQL integration',
  { skip: process.env.RUN_INTEGRATION !== '1' },
  async (suite) => {
    assert.match(process.env.DATABASE_URL || '', /\/yonro_test(?:\?|$)/);
    const { default: request } = await import('supertest');
    const { app } = await import('../src/app.js');
    const { prisma } = await import('../src/lib/prisma.js');
    const { getProductivityDay, addDays } = await import('../src/utils/productivityDay.js');
    const owner = request.agent(app);
    const outsider = request.agent(app);
    const suffix = randomUUID().slice(0, 8);
    const users = [];
    const habits = {};
    let today;
    let goal;
    let milestones;

    try {
      await suite.test('protected routes and separate user accounts', async () => {
        for (const route of [
          '/api/habits',
          '/api/goals',
          '/api/analytics/heatmap',
          '/api/analytics/overview',
        ]) {
          await request(app).get(route).expect(401);
        }
        for (const [index, agent] of [owner, outsider].entries()) {
          const response = await agent
            .post('/api/auth/signup')
            .send({
              firstName: 'Phase',
              lastName: 'Two',
              username: `phase2_${index}_${suffix}`,
              email: `phase2_${index}_${suffix}@example.com`,
              password: 'phase-two-test-password',
              timezone: 'UTC',
            })
            .expect(201);
          users.push(response.body.user.id);
        }
        await owner.patch('/api/settings').send({ dayStartTime: '23:59' }).expect(200);
        today = getProductivityDay({ timezone: 'UTC', dayStartTime: '23:59' });
        assert.equal((await owner.get('/api/productivity/today')).body.currentStreak, 0);
      });

      await suite.test('create each tracking type with real typed validation', async () => {
        const definitions = [
          { name: 'Exercise', type: 'BOOLEAN', targetValue: 1, unit: 'completed' },
          { name: 'Coding', type: 'NUMBER', targetValue: 2, unit: 'hours' },
          {
            name: 'Phone',
            type: 'DURATION',
            targetValue: 180,
            unit: 'minutes',
            targetDirection: 'AT_MOST',
          },
          { name: 'Study target', type: 'PERCENTAGE', targetValue: 75, unit: '%' },
          { name: 'Reading', type: 'COUNTER', targetValue: 20, unit: 'pages' },
        ];
        for (const definition of definitions) {
          const response = await owner.post('/api/habits').send(definition).expect(201);
          habits[definition.type] = response.body.habit;
        }
        await owner
          .post('/api/habits')
          .send({ ...definitions[0], targetValue: 2 })
          .expect(400);
        await owner
          .post('/api/habits')
          .send({ ...definitions[2], unit: 'hours' })
          .expect(400);
        await owner
          .post('/api/habits')
          .send({ ...definitions[3], targetValue: 101 })
          .expect(400);
        await owner
          .post('/api/habits')
          .send({ ...definitions[4], userId: users[1] })
          .expect(400);
        assert.equal((await outsider.get('/api/habits')).body.habits.length, 0);
      });

      await suite.test(
        'entries use the configured day, enforce type constraints, and upsert uniquely',
        async () => {
          const values = { BOOLEAN: 1, NUMBER: 1.75, DURATION: 161, PERCENTAGE: 90, COUNTER: 15 };
          for (const [type, value] of Object.entries(values)) {
            const response = await owner
              .post(`/api/habits/${habits[type].id}/entries`)
              .send({ value })
              .expect(200);
            assert.equal(response.body.entry.productivityDate, today);
          }
          for (const [type, value] of Object.entries({
            BOOLEAN: 2,
            DURATION: 1.5,
            PERCENTAGE: 101,
            COUNTER: 1.5,
            NUMBER: -1,
          })) {
            await owner.post(`/api/habits/${habits[type].id}/entries`).send({ value }).expect(400);
          }
          await owner
            .post(`/api/habits/${habits.BOOLEAN.id}/entries`)
            .send({ value: 1, productivityDate: addDays(today, 1) })
            .expect(400);
          await owner
            .post(`/api/habits/${habits.BOOLEAN.id}/entries`)
            .send({ value: 1, productivityDate: addDays(today, -365) })
            .expect(400);
          const reading = await owner.get(`/api/habits/${habits.COUNTER.id}`).expect(200);
          assert.equal(reading.body.habit.progressPercentage, 75);
          await Promise.all(
            [1, 2].map(() =>
              owner
                .post(`/api/habits/${habits.COUNTER.id}/entries`)
                .send({ value: 20 })
                .expect(200),
            ),
          );
          const entries = await owner
            .get(`/api/habits/${habits.COUNTER.id}/entries?days=7`)
            .expect(200);
          assert.equal(entries.body.entries.length, 1);
          assert.equal(entries.body.entries[0].completed, true);
        },
      );

      await suite.test(
        'habit current/best streaks and range statistics use centralized dates',
        async () => {
          for (const offset of [-1, -2]) {
            await owner
              .post(`/api/habits/${habits.BOOLEAN.id}/entries`)
              .send({ value: 1, productivityDate: addDays(today, offset) })
              .expect(200);
          }
          for (const days of [7, 30, 90, 365]) {
            const response = await owner
              .get(`/api/habits/${habits.BOOLEAN.id}/analytics?days=${days}`)
              .expect(200);
            assert.equal(response.body.chart.length, days);
            assert.equal(response.body.statistics.currentStreak, 3);
            assert.equal(response.body.statistics.longestStreak, 3);
            assert.equal(response.body.statistics.trackedDays, 3);
            assert.equal(response.body.statistics.completionPercentage, 100);
          }
          await owner.get(`/api/habits/${habits.BOOLEAN.id}/analytics?days=500`).expect(400);
          assert.equal((await owner.get('/api/productivity/today')).body.currentStreak, 3);
        },
      );

      await suite.test(
        'target edits preserve stored history; tracking type/unit changes are rejected',
        async () => {
          const updated = await owner
            .patch(`/api/habits/${habits.COUNTER.id}`)
            .send({ name: 'Read daily', targetValue: 100 })
            .expect(200);
          assert.equal(updated.body.habit.todayEntry.completed, true);
          await owner
            .post(`/api/habits/${habits.COUNTER.id}/entries`)
            .send({ value: 20 })
            .expect(200);
          assert.equal(
            (await owner.get(`/api/habits/${habits.COUNTER.id}`)).body.habit.todayEntry.completed,
            false,
          );
          await owner
            .patch(`/api/habits/${habits.BOOLEAN.id}`)
            .send({ type: 'COUNTER', unit: 'pages', targetValue: 20 })
            .expect(409);
          await owner
            .patch(`/api/habits/${habits.NUMBER.id}`)
            .send({ unit: 'minutes' })
            .expect(409);
        },
      );

      await suite.test(
        'archive/restore keeps history and zero is a valid upper-limit entry',
        async () => {
          await owner
            .patch(`/api/habits/${habits.DURATION.id}`)
            .send({ active: false })
            .expect(200);
          assert.equal((await owner.get('/api/habits')).body.habits.length, 4);
          assert.equal((await owner.get('/api/habits?scope=all')).body.habits.length, 5);
          await owner
            .post(`/api/habits/${habits.DURATION.id}/entries`)
            .send({ value: 0 })
            .expect(409);
          await owner.get(`/api/habits/${habits.DURATION.id}/analytics`).expect(200);
          await owner.patch(`/api/habits/${habits.DURATION.id}`).send({ active: true }).expect(200);
          const entry = await owner
            .post(`/api/habits/${habits.DURATION.id}/entries`)
            .send({ value: 0 })
            .expect(200);
          assert.equal(entry.body.entry.completed, true);
        },
      );

      await suite.test(
        'all habit reads/writes/history are owned, including clearing an entry',
        async () => {
          const id = habits.BOOLEAN.id;
          await outsider.get(`/api/habits/${id}`).expect(404);
          await outsider.get(`/api/habits/${id}/entries`).expect(404);
          await outsider.get(`/api/habits/${id}/analytics`).expect(404);
          await outsider.patch(`/api/habits/${id}`).send({ name: 'Stolen' }).expect(404);
          await outsider.post(`/api/habits/${id}/entries`).send({ value: 1 }).expect(404);
          await outsider.delete(`/api/habits/${id}/entries/${today}`).expect(404);
          await outsider.delete(`/api/habits/${id}`).expect(404);
        },
      );

      await suite.test(
        'goals and milestones calculate real progress and reject supplied progress',
        async () => {
          const response = await owner
            .post('/api/goals')
            .send({ title: 'Become a full-stack developer', targetDate: addDays(today, 60) })
            .expect(201);
          goal = response.body.goal;
          assert.equal(goal.progressPercentage, 0);
          milestones = [];
          for (const title of [
            'Learn React',
            'Learn Express',
            'Build REST API',
            'Build full-stack app',
            'Deploy app',
          ]) {
            const created = await owner
              .post(`/api/goals/${goal.id}/milestones`)
              .send({ title })
              .expect(201);
            milestones.push(created.body.milestone);
          }
          for (const milestone of milestones.slice(0, 3)) {
            await owner.post(`/api/milestones/${milestone.id}/complete`).expect(200);
          }
          const details = await owner.get(`/api/goals/${goal.id}`).expect(200);
          assert.equal(details.body.goal.progressPercentage, 60);
          assert.equal(details.body.goal.completedMilestones, 3);
          await owner.patch(`/api/goals/${goal.id}`).send({ progress: 90 }).expect(400);
          const firstCompletion = details.body.goal.milestones[0].completedAt;
          const again = await owner
            .post(`/api/milestones/${milestones[0].id}/complete`)
            .expect(200);
          assert.equal(again.body.milestone.completedAt, firstCompletion);
        },
      );

      await suite.test(
        'goal/milestone ownership checks cover every read, mutation, and reorder',
        async () => {
          const id = milestones[0].id;
          await outsider.get(`/api/goals/${goal.id}`).expect(404);
          await outsider.patch(`/api/goals/${goal.id}`).send({ title: 'Stolen' }).expect(404);
          await outsider.delete(`/api/goals/${goal.id}`).expect(404);
          await outsider
            .post(`/api/goals/${goal.id}/milestones`)
            .send({ title: 'Stolen' })
            .expect(404);
          await outsider
            .put(`/api/goals/${goal.id}/milestones/order`)
            .send({ milestoneIds: milestones.map((milestone) => milestone.id) })
            .expect(404);
          await outsider.patch(`/api/milestones/${id}`).send({ completed: false }).expect(404);
          await outsider.post(`/api/milestones/${id}/complete`).expect(404);
          await outsider.delete(`/api/milestones/${id}`).expect(404);
        },
      );

      await suite.test(
        'concurrent appends and transactional reorder keep unique contiguous positions',
        async () => {
          await Promise.all(
            ['Practice', 'Review'].map((title) =>
              owner.post(`/api/goals/${goal.id}/milestones`).send({ title }).expect(201),
            ),
          );
          const details = (await owner.get(`/api/goals/${goal.id}`)).body.goal;
          assert.deepEqual(
            details.milestones.map((milestone) => milestone.order),
            [0, 1, 2, 3, 4, 5, 6],
          );
          const ids = details.milestones.map((milestone) => milestone.id).reverse();
          const reordered = await owner
            .put(`/api/goals/${goal.id}/milestones/order`)
            .send({ milestoneIds: ids })
            .expect(200);
          assert.deepEqual(
            reordered.body.goal.milestones.map((milestone) => milestone.id),
            ids,
          );
          assert.deepEqual(
            reordered.body.goal.milestones.map((milestone) => milestone.order),
            [0, 1, 2, 3, 4, 5, 6],
          );
          await owner
            .put(`/api/goals/${goal.id}/milestones/order`)
            .send({ milestoneIds: ids.slice(1) })
            .expect(400);
          await owner
            .put(`/api/goals/${goal.id}/milestones/order`)
            .send({ milestoneIds: [ids[0], ids[0]] })
            .expect(400);
          await owner
            .patch(`/api/milestones/${milestones[3].id}`)
            .send({ title: 'Build polished app' })
            .expect(200);
          await owner.delete(`/api/milestones/${milestones[4].id}`).expect(204);
          const afterDelete = (await owner.get(`/api/goals/${goal.id}`)).body.goal;
          assert.deepEqual(
            afterDelete.milestones.map((milestone) => milestone.order),
            [0, 1, 2, 3, 4, 5],
          );
          assert.equal(afterDelete.progressPercentage, 50);
          await owner
            .patch(`/api/milestones/${milestones[0].id}`)
            .send({ completed: false })
            .expect(200);
          assert.equal((await owner.get(`/api/goals/${goal.id}`)).body.goal.progressPercentage, 33);
        },
      );

      await suite.test(
        'heatmap aggregates real tasks, focus and habits; overview matches the overall streak',
        async () => {
          await owner
            .post('/api/tasks')
            .send({ title: 'Meaningful work', status: 'COMPLETED' })
            .expect(201);
          const focus = await owner
            .post('/api/focus/sessions')
            .send({
              id: randomUUID(),
              startedAt: new Date(Date.now() - 61000).toISOString(),
              endedAt: new Date(Date.now() - 1000).toISOString(),
              durationSeconds: 60,
            })
            .expect(201);
          const response = await owner.get('/api/analytics/heatmap').expect(200);
          assert.equal(response.body.days.length, 365);
          assert.equal(response.body.endDate, today);
          const current = response.body.days.find((day) => day.date === today);
          assert.equal(current.tasksCompleted, 1);
          assert.equal(current.habitsCompleted, 3);
          assert.equal(
            current.activity,
            current.tasksCompleted + current.habitsCompleted + current.focusSessions,
          );
          assert.equal(
            response.body.days.find((day) => day.date === focus.body.session.productivityDate)
              .focusSeconds,
            60,
          );
          const otherActivity = (await outsider.get('/api/analytics/heatmap')).body.days;
          assert.ok(otherActivity.every((day) => day.activity === 0));
          const overview = (await owner.get('/api/analytics/overview').expect(200)).body;
          assert.equal(overview.daily.completedTasks, 1);
          assert.equal(overview.goals.activeCount, 1);
          assert.equal(
            overview.streaks.currentStreak,
            (await owner.get('/api/productivity/today')).body.currentStreak,
          );
          assert.equal(overview.streaks.longestStreak, 3);
        },
      );

      await suite.test(
        'clearing/deleting habits and deleting goals cascades only their own children',
        async () => {
          await owner.delete(`/api/habits/${habits.NUMBER.id}/entries/${today}`).expect(204);
          assert.equal(
            (await owner.get(`/api/habits/${habits.NUMBER.id}/entries`)).body.entries.length,
            0,
          );
          await owner.delete(`/api/habits/${habits.NUMBER.id}`).expect(204);
          await owner.patch(`/api/goals/${goal.id}`).send({ status: 'ARCHIVED' }).expect(200);
          await owner.delete(`/api/goals/${goal.id}`).expect(204);
          assert.equal(await prisma.goalMilestone.count({ where: { goalId: goal.id } }), 0);
          assert.equal(await prisma.habit.count({ where: { userId: users[0] } }), 4);
        },
      );
    } finally {
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
  },
);
