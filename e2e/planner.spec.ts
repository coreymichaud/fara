import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

test('explore → scenario → compare → challenge → persistent share → survey → creator results', async ({
  page,
  browser,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pantry planner' })).toBeVisible();
  await expect(page.locator('.site-marker')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Show event overlay' }).uncheck();
  await expect(page.locator('.site-marker')).toBeHidden();
  await expect(page.getByText('Existing pantry locations are unavailable.')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Show event overlay' }).check();
  await expect(page.locator('.site-marker')).toBeVisible();
  await page.locator('.candidate-main').nth(1).click();
  await page
    .getByRole('button', { name: /Shortlist Census Tract/ })
    .nth(1)
    .click();
  await page.getByRole('tab', { name: 'Event settings' }).click();
  await page.getByLabel('Plan title').fill('Saturday mobile pantry proposal');
  await page.getByLabel('Reach radius').fill('5');
  await page.getByLabel('Event capacity · household slots').fill('150');
  await page
    .getByLabel('Operator note')
    .fill('Verify venue permission and nearby unlisted services.');
  await page.getByRole('tab', { name: 'Compare locations' }).click();
  const alternatives = page.getByLabel('Add up to two alternatives');
  await alternatives.selectOption({ index: 1 });
  await expect(page.locator('.alternative')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Area details', exact: true }).click();
  await page.getByLabel('Flag as unsuitable').selectOption('Venue unavailable');
  await expect(page.getByText('Challenged candidates (1)')).toBeVisible();
  await page.locator('.candidate-main').first().click();
  await page.getByRole('button', { name: 'Save & share this plan' }).click();
  await expect(page.getByText('Plan saved persistently')).toBeVisible();
  const publicUrl = await page.getByLabel('Public read-only link').inputValue();
  const newContext = await browser.newContext();
  const visitor = await newContext.newPage();
  await visitor.setViewportSize({ width: 390, height: 844 });
  await visitor.goto(publicUrl);
  await expect(
    visitor.getByRole('heading', { name: 'Saturday mobile pantry proposal' }),
  ).toBeVisible();
  await expect(visitor.getByText('Venue unavailable', { exact: false })).toBeVisible();
  expect(
    await visitor.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  const publicAccessibility = await new AxeBuilder({ page: visitor })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(publicAccessibility.violations).toEqual([]);
  await visitor.evaluate(() => window.scrollTo(0, 0));
  await visitor.screenshot({ path: testInfo.outputPath('public-plan-phone.png'), fullPage: true });
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
  await expect(page.getByRole('heading', { name: 'Community responses' })).toBeVisible();
  await expect(page.getByText('anonymous check-ins', { exact: true })).toBeVisible();
  await expect(page.locator('.creator-summary strong')).toHaveText('1');
  const creatorAccessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(creatorAccessibility.violations).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('creator-responses.png'), fullPage: true });
  await expect(page).not.toHaveURL(/token=/);
  await page.getByRole('button', { name: 'Close community check-in' }).click();
  await expect(page.getByRole('button', { name: 'Reopen community check-in' })).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByText('Community check-in is closed for this plan.')).toBeVisible();
  await newContext.close();
});

test('responsive layouts, visible brand styling, accessibility and screenshots', async ({
  page,
}, testInfo) => {
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
    const attribution = page.locator('.maplibregl-ctrl-attrib summary');
    await expect(attribution).toHaveCount(1);
    await expect(attribution).toBeVisible();
    const attributionBounds = await attribution.boundingBox();
    expect(attributionBounds!.width).toBeGreaterThanOrEqual(44);
    expect(attributionBounds!.height).toBeGreaterThanOrEqual(44);
    await page.waitForTimeout(1600);
    const mapBounds = await page.locator('.map-canvas').boundingBox();
    const summaryBounds = await page.locator('.map-summary').boundingBox();
    expect(mapBounds).not.toBeNull();
    expect(summaryBounds).not.toBeNull();
    expect(summaryBounds!.y).toBeGreaterThanOrEqual(mapBounds!.y + mapBounds!.height);
    expect(
      await page
        .locator('.map-legend')
        .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    ).toBeGreaterThanOrEqual(14);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `docs/screenshots/planner-${name}.png`, fullPage: true });
    if (width === 390) {
      for (const name of ['Areas', 'Map', 'Plan']) {
        const bounds = await page.getByRole('button', { name, exact: true }).boundingBox();
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
      }
      const mobileResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(mobileResults.violations).toEqual([]);
      await page.getByRole('button', { name: 'Plan', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Save & share this plan' })).toBeVisible();
      await page.getByRole('button', { name: 'Areas', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Suggested areas' })).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath('area-list-phone.png'), fullPage: true });
      await page.locator('.candidate-main').nth(1).click();
      await expect(page.locator('.workspace-grid')).toHaveAttribute('data-mobile', 'plan');
      await expect(page.getByRole('tab', { name: 'Area details' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      for (const name of ['Areas', 'Map', 'Plan'])
        await expect(page.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
      await expect(page.locator('.area-heading h2')).toBeInViewport({ ratio: 1 });
      await page.getByRole('button', { name: 'Map', exact: true }).click();
      await page.getByRole('button', { name: 'View area details' }).click();
      await expect(page.locator('.workspace-grid')).toHaveAttribute('data-mobile', 'plan');
      for (const name of ['Areas', 'Map', 'Plan'])
        await expect(page.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
      await expect(page.locator('.area-heading h2')).toBeInViewport({ ratio: 1 });
      const detailsResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(detailsResults.violations).toEqual([]);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: testInfo.outputPath('area-details-phone.png'),
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(navigation.getByRole('link', { name: 'Planner', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(
    navigation.getByRole('link', { name: 'About', exact: true }).locator('svg'),
  ).toHaveCount(0);
  await expect(page.getByLabel('Planning flow')).toHaveCount(0);
  await expect(page.getByText('Central Florida · Prototype', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('contentinfo')).not.toContainText(/hackathon|prototype/i);
  await expect(
    page.getByRole('contentinfo').getByRole('link', { name: 'Data & methods' }),
  ).toHaveAttribute('href', '/methodology');
  const internalArrows = await page
    .locator('a[href^="/"]')
    .evaluateAll((links) => links.some((link) => link.textContent?.includes('↗')));
  expect(internalArrows).toBe(false);
  await page.getByRole('tab', { name: 'Area details' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Event settings' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Compare locations' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'Area details' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.locator('.evidence-chart svg[role="application"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.recharts-tooltip-wrapper')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole('link', { name: 'Methodology', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Data & methods', exact: true })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Methodology', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('methodology.png'), fullPage: true });
  await page.getByRole('link', { name: /About/, exact: false }).first().click();
  await expect(page.getByRole('heading', { name: 'About FARA', exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('about.png'), fullPage: true });
  expect(chartWarnings).toEqual([]);
});

test('an unavailable basemap has a working local boundary fallback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.fallback-map')).toBeVisible();
  await expect(page.locator('.fallback-map path')).toHaveCount(490);
  await expect(page.locator('.fallback-map ellipse')).toHaveCount(1);
  await expect(page.locator('.fallback-map circle')).toHaveCount(1);
  await page.getByRole('checkbox', { name: 'Show event overlay' }).uncheck();
  await expect(page.locator('.fallback-map ellipse')).toHaveCount(0);
  await expect(page.locator('.fallback-map circle')).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Show event overlay' }).check();
  await expect(page.locator('.fallback-map ellipse')).toHaveCount(1);
  await page.locator('.fallback-map path').nth(30).dispatchEvent('click');
  await expect(page.locator('.workspace-grid')).toHaveAttribute('data-mobile', 'map');
  await page.getByRole('button', { name: 'View area details' }).click();
  await expect(page.locator('.workspace-grid')).toHaveAttribute('data-mobile', 'plan');
  await expect(page.getByRole('tab', { name: 'Area details' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  for (const name of ['Areas', 'Map', 'Plan'])
    await expect(page.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.area-heading h2')).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Save & share this plan' })).toBeEnabled();
});
