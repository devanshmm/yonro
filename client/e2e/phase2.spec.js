import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const username = `phase2_e2e_${randomUUID().slice(0, 8)}`;
async function capture(page, filename) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `outputs/${filename}.png`, fullPage: true });
}
test.afterAll(async () => {
  const db = new PrismaClient({
    datasourceUrl:
      process.env.DATABASE_URL ||
      'postgresql://yonro:local_development_only@localhost:5433/yonro?schema=public',
  });
  try {
    await db.user.deleteMany({ where: { username } });
  } finally {
    await db.$disconnect();
  }
});

test('Phase 2 habits, history, milestones, analytics, recovery and mobile', async ({ page }) => {
  test.setTimeout(120000);
  const errors = [];
  const reads = [];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.method() === 'GET') reads.push(request.url());
  });
  await page.goto('/signup');
  await page.getByLabel('First name', { exact: true }).fill('Sam');
  await page.getByLabel('Last name', { exact: true }).fill('Builder');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Email', { exact: true }).fill(`${username}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Test-only-${randomUUID()}`);
  await page.getByRole('button', { name: 'Create your workspace' }).click();
  await expect(page.getByRole('heading', { name: /Good .*Sam/ })).toBeVisible();
  await expect(page.locator('.heatmap-cell')).toHaveCount(365);
  await expect(
    page.getByText('Start locking in and your progress will appear here.'),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Habits', exact: true }).click();
  for (const [type, name, value] of [
    ['BOOLEAN', 'Exercise', 1],
    ['NUMBER', 'Coding', 3],
    ['DURATION', 'Phone time', 90],
    ['PERCENTAGE', 'Course', 80],
    ['COUNTER', 'Reading', 20],
  ]) {
    await page.getByRole('button', { name: 'New habit', exact: true }).click();
    await page.getByLabel('Habit name', { exact: true }).fill(name);
    await page.getByLabel('Tracking type').selectOption(type);
    if (type === 'DURATION') {
      await page.getByLabel('Target direction').selectOption('AT_MOST');
      await page.getByLabel('Target duration hours').fill('2');
    } else if (type !== 'BOOLEAN') {
      await page.getByLabel('Target value').fill(String(value));
    }
    await page.getByRole('button', { name: 'Create habit', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    const card = page
      .locator('.habit-card')
      .filter({ has: page.getByRole('heading', { name, exact: true }) });
    await card.getByRole('button', { name: 'Track today' }).click();
    if (type === 'BOOLEAN') await page.getByLabel('Completed this habit').check();
    else if (type === 'DURATION') {
      await page.getByLabel('Tracked duration hours').fill('1');
      await page.getByLabel('Tracked duration minutes').fill('30');
    } else await page.getByLabel(/Tracked value/).fill(String(value));
    await page.getByRole('button', { name: 'Save entry' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  }
  await capture(page, 'phase2-habits');
  await page.getByRole('button', { name: 'Edit Exercise', exact: true }).click();
  await page.getByLabel('Tracking type').selectOption('NUMBER');
  await page.getByRole('button', { name: 'Save habit', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Tracking type and unit cannot change');
  await page.getByLabel('Tracking type').selectOption('BOOLEAN');
  await page.getByLabel('Habit name', { exact: true }).fill('Daily exercise');
  await page.getByRole('button', { name: 'Save habit', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Archive Phone time', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Phone time', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Archived habits' }).click();
  await page.getByRole('button', { name: 'Restore Phone time', exact: true }).click();
  await page.getByRole('button', { name: 'Active habits' }).click();
  await page.getByRole('link', { name: 'View Reading history', exact: true }).click();
  await expect(page.getByText('Current streak', { exact: true })).toBeVisible();
  for (const name of ['7 days', '90 days', '1 year', '30 days']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Edit entry' })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Edit entry' }).click();
  await page.getByLabel(/Tracked value/).fill('10');
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.locator('.history-table').getByText('No', { exact: true })).toBeVisible();
  await capture(page, 'phase2-habit-history');
  await page.getByRole('link', { name: 'Goals', exact: true }).click();
  await page.getByRole('button', { name: 'New goal', exact: true }).click();
  await page.getByLabel('Goal title', { exact: true }).fill('Become a developer');
  await page.getByRole('button', { name: 'Create goal' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('heading', { name: 'Become a developer', exact: true }).click();
  for (const title of ['Learn JavaScript', 'Build an API', 'Ship a project']) {
    await page.getByRole('button', { name: 'New milestone' }).click();
    await page.getByLabel('Milestone title').fill(title);
    await page.getByRole('button', { name: 'Add milestone' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.locator('.milestone-item').getByText(title, { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Complete Learn JavaScript', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Goal milestone progress' })).toHaveAttribute(
    'aria-valuenow',
    '33',
  );
  await page.getByRole('button', { name: 'Move Ship a project up' }).click();
  await expect(page.locator('.milestone-item').nth(1)).toContainText('Ship a project');
  await page.getByRole('button', { name: 'Edit Build an API' }).click();
  await page.getByLabel('Milestone title').fill('Build a secure API');
  await page.getByRole('button', { name: 'Save milestone' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Ship a project' }).click();
  await expect(page.getByRole('progressbar', { name: 'Goal milestone progress' })).toHaveAttribute(
    'aria-valuenow',
    '50',
  );
  await page.reload();
  await expect(page.getByRole('progressbar', { name: 'Goal milestone progress' })).toHaveAttribute(
    'aria-valuenow',
    '50',
  );
  await capture(page, 'phase2-goal');
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('.habit-card')).toHaveCount(3);
  await expect(page.locator('.goal-card')).toHaveCount(1);
  await expect(page.locator('.heatmap-cell')).toHaveCount(365);
  await capture(page, 'phase2-dashboard');
  await page.getByRole('link', { name: 'Analytics', exact: true }).click();
  await expect(page.locator('.heatmap-cell')).toHaveCount(365);
  const initialReads = reads.filter((url) => url.includes('/api/analytics/heatmap')).length;
  for (const name of ['Tasks', 'Focus', 'Habits', 'Overall']) {
    await page.locator('.heatmap-filters').getByRole('button', { name, exact: true }).click();
    await expect(
      page.locator('.heatmap-filters').getByRole('button', { name, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  }
  expect(reads.filter((url) => url.includes('/api/analytics/heatmap')).length).toBe(initialReads);
  const today = page.locator('.heatmap-cell').last();
  await today.focus();
  await today.press('ArrowUp');
  await expect(page.locator('.heatmap-cell').nth(363)).toBeFocused();
  await capture(page, 'phase2-analytics');
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.locator('.sidebar').evaluate((element) => element.getBoundingClientRect().right),
    )
    .toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, 'phase2-mobile');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('link', { name: 'Habits', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // A real page reload forces a read; a simulated server outage must be visible and retryable.
  let releaseRead;
  const delayedRead = new Promise((resolve) => {
    releaseRead = resolve;
  });
  await page.route('**/api/habits?*', async (route) => {
    await delayedRead;
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'Temporary test outage' } }),
    });
  });
  await page.reload();
  await expect(page.getByText('Loading habits…', { exact: true })).toBeVisible();
  releaseRead();
  await expect(page.getByText('Temporary test outage')).toBeVisible();
  await page.unroute('**/api/habits?*');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Daily exercise', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
