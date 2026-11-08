import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

test('homepage introduces FARA and connects the planner and reference pages', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mkdir('docs/screenshots', { recursive: true });
  for (const [name, width, height] of [
    ['phone', 390, 844],
    ['tablet', 820, 1180],
    ['desktop', 1440, 1080],
    ['wide', 1920, 1080],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Put your next pantry.*on the map/,
    );
    await expect(
      page.getByRole('img', { name: /Census boundaries/ }).locator('.atlas-land'),
    ).toHaveCount(4);
    await expect(page.locator('figcaption')).toContainText('490 Census tracts · 2020 boundaries');
    await expect(page.locator('.atlas-outline')).toHaveCount(4);
    const countyColors = await page
      .locator('.atlas-land')
      .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).fill));
    expect(new Set(countyColors).size).toBe(4);
    if (width >= 1200) {
      const composition = await page.locator('.home-page').evaluate((element) => ({
        gap: parseFloat(getComputedStyle(element).columnGap),
        width: element.getBoundingClientRect().width,
      }));
      expect(composition.gap).toBeLessThanOrEqual(24);
      expect(composition.width).toBeLessThanOrEqual(1320);
    }
    const plannerLink = page.locator('.hero-actions').getByRole('link', { name: 'Go to planner' });
    const bounds = await plannerLink.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(await plannerLink.evaluate((link) => getComputedStyle(link).backgroundColor)).toBe(
      'rgb(247, 145, 34)',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 390 || width === 1440) {
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
    ).toBe(true);
    await expect(page.getByRole('contentinfo')).toBeInViewport({ ratio: 1 });
    if (width >= 1200) {
      expect(
        await page.locator('.header-descriptor').evaluate((element) => {
          const style = getComputedStyle(element);
          return element.getBoundingClientRect().height <= Number.parseFloat(style.lineHeight) + 1;
        }),
      ).toBe(true);
    }
    await page.screenshot({ path: `docs/screenshots/home-${name}.png`, fullPage: true });
    await expect(page.getByRole('link', { name: 'Our approach' })).toHaveAttribute(
      'href',
      '/methodology',
    );
    for (const [href, heading] of [
      ['/resources', 'Resources'],
      ['/methodology', 'Data & Methods'],
      ['/about', 'About FARA'],
    ]) {
      await page.getByRole('contentinfo').locator(`a[href="${href}"]`).click();
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (width === 390 || width === 1440) {
        expect(
          (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
            .violations,
        ).toEqual([]);
      }
      await page.screenshot({
        path: testInfo.outputPath(`${href.slice(1)}-${name}.png`),
        fullPage: true,
      });
      await page.getByRole('link', { name: 'FARA home', exact: true }).click();
      await expect(page).toHaveURL(/\/$/);
    }
    await plannerLink.click();
    await expect(page).toHaveURL(/\/planner$/);
    await expect(page.getByRole('heading', { name: 'Pantry Planner' })).toBeVisible();
    await page.getByRole('link', { name: 'FARA home', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Put your next pantry/);
  }
  await page.keyboard.press('Tab');
  await page.getByRole('link', { name: 'Skip to content' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  expect(errors).toEqual([]);
});

test('the landing composition fits short screens and grows rather than clipping content', async ({
  page,
}) => {
  for (const [width, height] of [
    [390, 740],
    [820, 768],
    [1024, 768],
    [1280, 720],
    [1440, 900],
    [1440, 768],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(
      page.locator('.hero-actions').getByRole('link', { name: 'Go to planner' }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
    ).toBe(true);
    await expect(page.getByRole('contentinfo')).toBeInViewport({ ratio: 1 });
  }
  await page.setViewportSize({ width: 390, height: 480 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(true);
  await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
  await expect(page.getByRole('contentinfo')).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
