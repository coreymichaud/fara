import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

test('explore → scenario → compare → challenge → persistent share → survey → creator results', async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'From public signals to a practical plan.' }),
  ).toBeVisible();
  await page.locator('.candidate-main').nth(1).click();
  await page
    .getByRole('button', { name: /Shortlist Census Tract/ })
    .nth(1)
    .click();
  await page.getByRole('tab', { name: 'Your event' }).click();
  await page.getByLabel('Plan title').fill('Judge demo · mobile pantry proposal');
  await page.getByLabel('Reach radius').fill('5');
  await page.getByLabel('Event capacity · household slots').fill('150');
  await page
    .getByLabel('Operator note')
    .fill('Verify venue permission and nearby unlisted services.');
  await page.getByRole('tab', { name: 'Compare' }).click();
  const alternatives = page.getByLabel('Add up to two alternatives');
  await alternatives.selectOption({ index: 1 });
  await expect(page.locator('.alternative')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  await page.getByLabel('Flag as unsuitable').selectOption('Venue unavailable');
  await expect(page.getByText('Challenged candidates (1)')).toBeVisible();
  await page.locator('.candidate-main').first().click();
  await page.getByRole('button', { name: 'Save & share this plan' }).click();
  await expect(page.getByText('Plan saved persistently')).toBeVisible();
  const publicUrl = await page.getByLabel('Public read-only link').inputValue();
  const newContext = await browser.newContext();
  const visitor = await newContext.newPage();
  await visitor.goto(publicUrl);
  await expect(
    visitor.getByRole('heading', { name: 'Judge demo · mobile pantry proposal' }),
  ).toBeVisible();
  await expect(visitor.getByText('Venue unavailable', { exact: false })).toBeVisible();
  await visitor.getByRole('radio', { name: 'Yes', exact: true }).check();
  await visitor.getByRole('radio', { name: 'Transportation', exact: true }).check();
  await visitor.getByRole('radio', { name: 'Weekend', exact: true }).check();
  await visitor.getByRole('radio', { name: 'Ride with someone', exact: true }).check();
  await visitor.getByRole('button', { name: 'Send anonymous check-in' }).click();
  await expect(visitor.getByRole('heading', { name: 'Thank you for checking in.' })).toBeVisible();
  const id = publicUrl.split('/').pop()!;
  expect((await visitor.request.get(`/api/plans/${id}/manage`)).status()).toBe(403);
  await page.getByText('Private creator link · keep this safe').click();
  await page.getByRole('link', { name: 'Open private results' }).click();
  await expect(page.getByText('anonymous check-ins', { exact: true })).toBeVisible();
  await expect(page.locator('.creator-summary strong')).toHaveText('1');
  await expect(page).not.toHaveURL(/token=/);
  await page.getByRole('button', { name: 'Close community check-in' }).click();
  await expect(page.getByRole('button', { name: 'Reopen community check-in' })).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByText('Community check-in is closed for this plan.')).toBeVisible();
  await newContext.close();
});

test('responsive layouts, visible brand styling, accessibility and screenshots', async ({
  page,
}) => {
  const chartWarnings: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('of chart should be greater than 0')) {
      chartWarnings.push(message.text());
    }
  });
  await mkdir('docs/screenshots', { recursive: true });
  for (const [name, width, height] of [
    ['phone', 390, 844],
    ['tablet', 820, 1180],
    ['desktop', 1440, 1080],
    ['presentation', 1920, 1080],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('.candidate-main').first()).toBeAttached();
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    await expect
      .poll(() => page.locator('.map-canvas').evaluate((e) => e.getBoundingClientRect().height))
      .toBeGreaterThan(400);
    await page.waitForTimeout(1600);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `docs/screenshots/planner-${name}.png`, fullPage: true });
    if (width === 390) {
      await page.getByRole('button', { name: 'Your plan', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Save & share this plan' })).toBeVisible();
      await page.getByRole('button', { name: 'Explore areas', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Where to look' })).toBeVisible();
    }
  }
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole('link', { name: 'Methodology', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Useful signals/ })).toBeVisible();
  await page.getByRole('link', { name: /About/, exact: false }).first().click();
  await expect(page.getByRole('heading', { name: /Plan a mobile pantry/ })).toBeVisible();
  expect(chartWarnings).toEqual([]);
});

test('an unavailable basemap has a working local boundary fallback', async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.fallback-map')).toBeVisible();
  await expect(page.locator('.fallback-map path')).toHaveCount(490);
  await page.locator('.fallback-map path').nth(30).dispatchEvent('click');
  await expect(page.getByRole('button', { name: 'Save & share this plan' })).toBeEnabled();
});
