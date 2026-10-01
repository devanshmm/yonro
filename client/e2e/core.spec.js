import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
const suffix = randomUUID().slice(0, 8),
  username = `e2e_${suffix}`,
  email = `${username}@example.com`,
  password = `Test-only-${randomUUID()}`;
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
test('signup → dashboard → tasks → focus → analytics → settings → logout/login, desktop and mobile', async ({
  page,
}) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Your next chapter starts here.' })).toBeVisible();
  await page.getByLabel('First name', { exact: true }).fill('Alex');
  await page.getByLabel('Last name', { exact: true }).fill('Builder');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create your workspace' }).click();
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening), Alex/ }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Quick add task' }).fill('Build authentication');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText('Build authentication', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New task' }).click();
  await page.getByLabel('Task name', { exact: true }).fill('Read 20 pages');
  await page.getByLabel('Category', { exact: true }).fill('Learning');
  await page.getByLabel('Estimated minutes').fill('30');
  await page.getByLabel('Priority', { exact: true }).selectOption('HIGH');
  await page.getByRole('button', { name: 'Create task' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Complete Build authentication', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Task completion' })).toHaveAttribute(
    'aria-valuenow',
    '50',
  );
  await page.getByRole('button', { name: 'Uncomplete Build authentication', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Task completion' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await page.getByRole('button', { name: 'Edit Build authentication', exact: true }).click();
  await page.getByLabel('Task name', { exact: true }).fill('Build secure authentication');
  await page.getByLabel('Status', { exact: true }).selectOption('IN_PROGRESS');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('In progress', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Complete Build secure authentication', exact: true })
    .click();
  await expect(page.getByRole('progressbar', { name: 'Task completion' })).toHaveAttribute(
    'aria-valuenow',
    '50',
  );
  await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();
  await page.screenshot({ path: 'outputs/lockin-dashboard.png', fullPage: true });
  await page.getByRole('link', { name: 'Tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(page.getByText('Build secure authentication', { exact: true })).toBeVisible();
  await expect(page.getByText('Read 20 pages', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'All tasks' }).click();
  await page.getByRole('button', { name: 'Edit Read 20 pages', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Read 20 pages', { exact: true })).not.toBeVisible();
  await page.getByRole('link', { name: 'Focus', exact: true }).click();
  await page.getByRole('button', { name: '50 min', exact: true }).click();
  await expect(page.locator('.timer-number')).toHaveText('50:00');
  await page.getByRole('button', { name: 'Start focus', exact: true }).click();
  await page.getByRole('button', { name: 'Pause session' }).click();
  const paused = await page.locator('.timer-number').textContent();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume session' })).toBeVisible();
  await expect(page.locator('.timer-number')).toHaveText(paused);
  await page.getByRole('button', { name: 'Resume session' }).click();
  await expect(page.getByRole('button', { name: 'Pause session' })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reset timer' }).click();
  await page.getByRole('button', { name: 'Custom', exact: true }).click();
  await page.getByLabel('Minutes', { exact: true }).fill('1');
  await expect(page.locator('.timer-number')).toHaveText('01:00');
  await page.getByRole('button', { name: 'Start focus', exact: true }).click();
  // Backdate a persisted session to exercise overdue completion on reload
  // without waiting a real minute. The save still hits real PostgreSQL.
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('lockin-focus-v1'));
    stored.state.startedAt = Date.now() - 61000;
    stored.state.runningSince = Date.now() - 61000;
    localStorage.setItem('lockin-focus-v1', JSON.stringify(stored));
  });
  await page.reload();
  await expect(page.getByText('Nice work. Your session has been saved.')).toBeVisible();
  await expect(page.getByText('Focused work', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Focused work', { exact: true })).toHaveCount(1);
  await page.getByRole('link', { name: 'Analytics', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Progress, in perspective.' })).toBeVisible();
  await expect(page.getByText('Focus this week', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Your day starts at').fill('05:00');
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.getByText('Preferences saved')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Your day starts at')).toHaveValue('05:00');
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
  await expect
    .poll(() => page.locator('.sidebar').evaluate((el) => el.getBoundingClientRect().right))
    .toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'outputs/lockin-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('link', { name: 'Analytics', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Progress, in perspective.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in to your workspace' }).click();
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening), Alex/ }),
  ).toBeVisible();
  await page.context().clearCookies();
  await page.getByRole('textbox', { name: 'Quick add task' }).fill('Expired session check');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
