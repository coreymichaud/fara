import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

test('map hover uses a percentage and stays on one line on phones and desktops', async ({
  page,
}, testInfo) => {
  for (const width of [320, 820, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/planner');
    await expect(page.getByRole('heading', { name: 'Pantry Planner' })).toBeVisible();
    await expect(page.locator('.site-marker')).toBeVisible();
    const canvas = (await page.locator('.maplibregl-canvas').boundingBox())!;
    let attempt = 0;
    const offsets = [
      [24, 12],
      [50, 20],
      [-30, 15],
      [0, -40],
    ];
    const hover = page.getByRole('tooltip');
    await expect
      .poll(
        async () => {
          const [x, y] = offsets[attempt++ % offsets.length];
          await page.mouse.move(canvas.x + canvas.width / 2 + x, canvas.y + canvas.height / 2 + y);
          return hover.isVisible();
        },
        { timeout: 10000 },
      )
      .toBe(true);
    await expect(hover).toContainText(/\d+% priority/);
    await expect(hover).not.toContainText('/ 100');
    const size = await hover.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const place = element.querySelector('.map-hover-place')!.getBoundingClientRect();
      const priority = element.querySelector('.map-hover-priority')!.getBoundingClientRect();
      return {
        height: bounds.height,
        line: parseFloat(getComputedStyle(element).lineHeight),
        difference: Math.abs(place.y - priority.y),
      };
    });
    expect(size.height).toBeLessThanOrEqual(size.line + 1);
    expect(size.difference).toBeLessThan(1);
    const popup = (await page.locator('.maplibregl-popup').boundingBox())!;
    expect(popup.x).toBeGreaterThanOrEqual(canvas.x);
    expect(popup.y).toBeGreaterThanOrEqual(canvas.y);
    expect(popup.x + popup.width).toBeLessThanOrEqual(canvas.x + canvas.width);
    expect(popup.y + popup.height).toBeLessThanOrEqual(canvas.y + canvas.height);
    await expect(hover).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await hover.screenshot({ path: testInfo.outputPath(`map-hover-${width}.png`) });
  }
});

test('planner select controls and inline arrows stay aligned at narrow widths', async ({
  page,
}, testInfo) => {
  for (const width of [320, 390, 820, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/planner');
    await expect(page.getByRole('heading', { name: 'Pantry Planner' })).toBeVisible();
    if (width <= 700) await page.getByRole('button', { name: 'Areas', exact: true }).click();
    const select = page.getByLabel('Data availability');
    await expect(select).toBeVisible();
    const style = await select.evaluate((element) => ({
      appearance: getComputedStyle(element).appearance,
      background: getComputedStyle(element).backgroundImage,
      padding: parseFloat(getComputedStyle(element).paddingRight),
    }));
    expect(style.appearance).toBe('none');
    expect(style.background).toContain('data:image/svg+xml');
    expect(style.padding).toBeGreaterThanOrEqual(40);
    await select.selectOption('missing');
    await select.selectOption('comparable');
    await select.screenshot({ path: testInfo.outputPath(`candidate-select-${width}.png`) });
    if (width <= 700) await page.getByRole('button', { name: 'Plan', exact: true }).click();
    await page.getByRole('tab', { name: 'Compare locations' }).click();
    const method = page.getByRole('link', { name: 'Read the full method' });
    await expect(method).toBeVisible();
    const alignment = await method.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element.firstChild!);
      const text = range.getBoundingClientRect();
      const icon = element.querySelector('svg')!.getBoundingClientRect();
      return {
        textCenter: text.y + text.height / 2,
        iconCenter: icon.y + icon.height / 2,
        iconX: icon.x,
        textRight: text.right,
      };
    });
    expect(Math.abs(alignment.textCenter - alignment.iconCenter)).toBeLessThan(3);
    expect(alignment.iconX).toBeGreaterThan(alignment.textRight);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('the shared navigation keeps identical dimensions on every page', async ({
  playwright,
  baseURL,
}) => {
  // Headless Chromium normally hides scrollbars, which would conceal this regression.
  const browser = await playwright.chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const page = await browser.newPage({ baseURL });
  try {
    for (const width of [390, 820, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      let reference: { x: number; width: number; height: number } | undefined;
      for (const path of ['/', '/planner', '/resources', '/methodology', '/about']) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.addStyleTag({ content: '::-webkit-scrollbar { width: 16px; }' });
        const bounds = (await page.locator('.site-header').boundingBox())!;
        if (reference) {
          expect(bounds.x).toBe(reference.x);
          expect(bounds.width).toBe(reference.width);
          expect(bounds.height).toBe(reference.height);
        } else {
          reference = bounds;
        }
        expect(
          await page.evaluate(() => getComputedStyle(document.documentElement).overflowY),
        ).toBe('scroll');
        expect(await page.evaluate(() => innerWidth - document.documentElement.clientWidth)).toBe(
          16,
        );
      }
    }
  } finally {
    await browser.close();
  }
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
    ['wide', 1920, 1080],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/planner');
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
      const footer = page.getByRole('contentinfo');
      const footerBounds = (await footer.boundingBox())!;
      for (const group of [footer.locator('.footer-branding'), footer.getByRole('navigation')]) {
        const bounds = (await group.boundingBox())!;
        expect(
          Math.abs(bounds.x + bounds.width / 2 - (footerBounds.x + footerBounds.width / 2)),
        ).toBeLessThanOrEqual(1);
      }
      for (const name of ['Areas', 'Map', 'Plan']) {
        const bounds = await page.getByRole('button', { name, exact: true }).boundingBox();
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
      }
      const mobileResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(mobileResults.violations).toEqual([]);
      await page.getByRole('button', { name: 'Plan', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Save & Share' })).toBeVisible();
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
  await page.goto('/planner');
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(
    navigation.getByRole('link', { name: 'Go to planner', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(
    navigation.getByRole('link', { name: 'About', exact: true }).locator('svg'),
  ).toHaveCount(0);
  await expect(page.getByLabel('Planning flow')).toHaveCount(0);
  await expect(page.getByText('Central Florida · Prototype', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('contentinfo')).not.toContainText(/hackathon|prototype/i);
  await expect(
    page.getByRole('contentinfo').getByRole('link', { name: 'Data & Methods' }),
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
  await expect(page.getByRole('heading', { name: 'Data & Methods', exact: true })).toBeVisible();
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
  await page.goto('/planner');
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
  await expect(page.getByRole('button', { name: 'Save & Share' })).toBeEnabled();
});

test('the desktop planner fits laptop screens and keeps its panels usable', async ({
  page,
}, testInfo) => {
  for (const [width, height] of [
    [1440, 900],
    [1440, 768],
    [1280, 720],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/planner');
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    const main = (await page.getByRole('main').boundingBox())!;
    expect(main.y + main.height).toBeLessThanOrEqual(height + 1);
    const grid = await page.locator('.workspace-grid').boundingBox();
    const context = await page.locator('.map-context').boundingBox();
    expect(grid!.y).toBeLessThan(180);
    expect(context!.y + context!.height).toBeLessThanOrEqual(grid!.y + grid!.height + 1);
    const panel = page.getByRole('complementary', { name: 'Evidence and plan' });
    const inspectorBounds = (await panel.locator('.detail-tabs-root').boundingBox())!;
    const panelBounds = (await panel.boundingBox())!;
    expect(inspectorBounds.height).toBeCloseTo(panelBounds.height, 0);
    await expect(panel.getByRole('switch')).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'Save & Share' })).toHaveCount(0);
    await expect(page.getByText('What still needs verification', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Observed public indicators/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save & Share' })).toBeInViewport({
      ratio: 1,
    });
    await page.getByRole('button', { name: 'Plan a pop-up here' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Plan a pop-up here' })).toBeInViewport({
      ratio: 1,
    });
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.getByRole('tab', { name: 'Event settings' }).click();
    await expect(page.getByLabel('Event capacity · household slots')).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`planner-${width}-${height}.png`),
      fullPage: true,
    });
    await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
    const footerBounds = (await page.getByRole('contentinfo').boundingBox())!;
    expect(footerBounds.y).toBeGreaterThanOrEqual(-1);
    expect(footerBounds.y + footerBounds.height).toBeLessThanOrEqual(height + 1);
  }
});
