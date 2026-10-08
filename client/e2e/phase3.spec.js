import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const username = `phase3_e2e_${randomUUID().slice(0, 8)}`;
const database = () =>
  new PrismaClient({
    datasourceUrl:
      process.env.DATABASE_URL ||
      'postgresql://yonro:local_development_only@localhost:5433/yonro?schema=public',
  });

test.afterAll(async () => {
  const db = database();
  try {
    await db.user.deleteMany({ where: { username } });
  } finally {
    await db.$disconnect();
  }
});

async function capture(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `outputs/${name}.png`, fullPage: true });
}

test('Phase 3 real rewards, level-up once, trophies, verified focus and private leaderboards', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/signup');
  await page.getByLabel('First name', { exact: true }).fill('Nova');
  await page.getByLabel('Last name', { exact: true }).fill('Builder');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Email', { exact: true }).fill(`${username}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Test-only-${randomUUID()}`);
  await page.getByRole('button', { name: 'Create your workspace' }).click();
  await expect(page.locator('.game-summary .xp-heading')).toContainText('0 XP');
  await expect(page.locator('.reward-toast')).not.toBeVisible();
  for (let index = 1; index <= 5; index += 1) {
    await page.getByRole('textbox', { name: 'Quick add task' }).fill(`Daily mission ${index}`);
    await page.getByRole('button', { name: 'Add task' }).click();
    await page
      .getByRole('button', { name: `Complete Daily mission ${index}`, exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: `Uncomplete Daily mission ${index}`, exact: true }),
    ).toBeVisible();
  }
  await expect(page.locator('.game-summary .xp-heading')).toContainText('75 XP');
  await page.getByRole('button', { name: 'Uncomplete Daily mission 1', exact: true }).click();
  await page.getByRole('button', { name: 'Complete Daily mission 1', exact: true }).click();
  await expect(page.locator('.game-summary .xp-heading')).toContainText('75 XP');
  if (await page.getByRole('button', { name: 'Dismiss reward' }).isVisible())
    await page.getByRole('button', { name: 'Dismiss reward' }).click();
  await page.getByRole('link', { name: 'Habits', exact: true }).click();
  await page.getByRole('button', { name: 'New habit', exact: true }).click();
  await page.getByLabel('Habit name', { exact: true }).fill('Practice guitar');
  await page.getByRole('button', { name: 'Create habit', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Track today', exact: true }).click();
  await page.getByLabel('Completed this habit').check();
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.locator('.reward-toast')).toContainText('Level up! Level 2');
  await page.getByRole('button', { name: 'Dismiss reward' }).click();
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('.game-summary .xp-heading')).toContainText('110 XP');
  await capture(page, 'phase3-dashboard');
  await page.getByRole('link', { name: 'Rewards', exact: true }).click();
  await expect(page.locator('.game-hero .xp-heading')).toContainText('110 XP');
  await expect(page.getByRole('progressbar', { name: 'Level progress' })).toHaveAttribute(
    'aria-valuenow',
    '5',
  );
  await page.reload();
  await expect(page.locator('.game-hero .xp-heading')).toContainText('110 XP');
  await expect(page.locator('.reward-toast')).not.toBeVisible();
  await capture(page, 'phase3-rewards');
  await page.getByRole('button', { name: 'Achievements', exact: true }).click();
  await expect(page.locator('.achievement-card')).toHaveCount(14);
  await expect(page.locator('.achievement-card.unlocked')).toHaveCount(2);
  await capture(page, 'phase3-achievements');
  await page.getByRole('button', { name: 'XP History', exact: true }).click();
  await expect(page.locator('.xp-history-list')).toContainText('Completed planned task');
  await expect(page.locator('.xp-history-list')).toContainText('Achievement: First victory');
  await capture(page, 'phase3-xp-history');
  await page.getByRole('button', { name: 'Leaderboards', exact: true }).click();
  await expect(
    page.locator('.leaderboard-table').getByText(`@${username}`, { exact: true }),
  ).not.toBeVisible();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Profile visibility').selectOption('PUBLIC');
  await page.getByLabel('Participate in public leaderboards').check();
  await page.getByLabel('Show focus time', { exact: true }).check();
  await page.getByLabel('Show current streak', { exact: true }).check();
  await page.getByLabel('Show activity', { exact: true }).check();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.getByText('Preferences saved')).toBeVisible();
  await page.getByRole('link', { name: 'Focus', exact: true }).click();
  await page.getByRole('button', { name: 'Custom', exact: true }).click();
  await page.getByLabel('Minutes', { exact: true }).fill('5');
  const runResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/focus/runs') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Start focus' }).click();
  const run = (await (await runResponse).json()).run;
  const db = database();
  try {
    const user = await db.user.findUniqueOrThrow({ where: { username } });
    expect(run.userId).toBe(user.id);
    // Fixture elapsed server time only for this disposable user's run. The
    // normal save endpoint still derives verified time and awards real receipts.
    await db.focusRun.update({
      where: { id: run.id, userId: user.id },
      data: { startedAt: new Date(Date.now() - 301000), resumedAt: new Date(Date.now() - 301000) },
    });
  } finally {
    await db.$disconnect();
  }
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('lockin-focus-v1'));
    stored.state.startedAt = Date.now() - 301000;
    stored.state.runningSince = Date.now() - 301000;
    localStorage.setItem('lockin-focus-v1', JSON.stringify(stored));
  });
  await page.reload();
  await expect(page.getByText('Nice work. Your session has been saved.')).toBeVisible();
  await page.getByRole('link', { name: 'Rewards', exact: true }).click();
  await expect(page.locator('.game-hero .xp-heading')).toContainText('137 XP');
  await page.getByRole('button', { name: 'Leaderboards', exact: true }).click();
  await expect(page.locator('.leaderboard-table')).toContainText(`@${username}`);
  for (const name of ['Monthly XP', 'All-time XP', 'Focus time', 'Current streak']) {
    await page.locator('.ranking-tabs').getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.leaderboard-table')).toContainText(`@${username}`);
  }
  await capture(page, 'phase3-leaderboards');
  await page
    .locator('.ranking-tabs')
    .getByRole('button', { name: 'Task completion', exact: true })
    .click();
  await expect(page.locator('.ranking-explanation')).toContainText('Minimum 10 planned tasks');
  await expect(
    page.locator('.leaderboard-table').getByText(`@${username}`, { exact: true }),
  ).not.toBeVisible();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  if (await page.getByRole('button', { name: 'Dismiss reward' }).isVisible()) {
    await page.getByRole('button', { name: 'Dismiss reward' }).click();
  }
  await capture(page, 'phase3-mobile');
  await page.getByRole('button', { name: 'Leaderboards', exact: true }).click();
  await page
    .locator('.ranking-tabs')
    .getByRole('button', { name: 'Weekly XP', exact: true })
    .click();
  await expect(page.locator('.leaderboard-table')).toContainText(`@${username}`);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Participate in public leaderboards').uncheck();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.getByText('Preferences saved')).toBeVisible();
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('link', { name: 'Rewards', exact: true }).click();
  await page.getByRole('button', { name: 'Leaderboards', exact: true }).click();
  await expect(
    page.locator('.leaderboard-table').getByText(`@${username}`, { exact: true }),
  ).not.toBeVisible();
  expect(errors).toEqual([]);
});
