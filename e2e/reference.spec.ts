import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('reference pages match Resources and stay expanded; atlas metadata stays on one line', async ({
  page,
}, testInfo) => {
  for (const width of [320, 390, 700, 701, 820, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Put your next pantry');
    const caption = await page.locator('.atlas-meta').evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return {
        lines: new Set(Array.from(range.getClientRects(), (rect) => Math.round(rect.top))).size,
        width: element.getBoundingClientRect().width,
        available: element.parentElement!.getBoundingClientRect().width,
      };
    });
    expect(caption.lines).toBe(1);
    expect(caption.width).toBeLessThanOrEqual(caption.available);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    let reference: unknown;
    for (const [path, heading] of [
      ['/resources', 'Resources'],
      ['/methodology', 'Data & Methods'],
      ['/about', 'About FARA'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.locator('main details, main summary, main [hidden]')).toHaveCount(0);
      const styles = await page.locator('.editorial-heading').evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          border: style.borderColor,
          radius: style.borderRadius,
          padding: style.padding,
          headingColor: getComputedStyle(element.querySelector('h1')!).color,
        };
      });
      if (reference) expect(styles).toEqual(reference);
      else reference = styles;
      const header = page.locator('.editorial-heading');
      await expect(header.locator(':scope > h1')).toHaveCount(1);
      await expect(header.locator(':scope > :not(h1)')).toHaveCount(0);
      await expect(header).toHaveText(heading);
      const contents = page.locator('main .page-contents');
      if (path === '/about') {
        await expect(contents).toHaveCount(0);
      } else if (width <= 700) {
        await expect(contents).toBeHidden();
        await expect(page.getByRole('navigation', { name: /topics/ })).toHaveCount(0);
      } else {
        await expect(contents).toBeVisible();
      }
      if (width <= 700) {
        const footer = page.getByRole('contentinfo');
        const footerBounds = (await footer.boundingBox())!;
        for (const group of [footer.locator('.footer-branding'), footer.getByRole('navigation')]) {
          const bounds = (await group.boundingBox())!;
          expect(
            Math.abs(bounds.x + bounds.width / 2 - (footerBounds.x + footerBounds.width / 2)),
          ).toBeLessThanOrEqual(1);
        }
      }
      if (path === '/resources') {
        await expect(page.getByText(/Links reviewed/)).toHaveCount(0);
        const summary = page.locator('#operations').locator('..').locator('p');
        expect(await summary.evaluate((element) => getComputedStyle(element).maxWidth)).toBe(
          'none',
        );
        if (width >= 1440) {
          expect(
            await summary.evaluate((element) => {
              const range = document.createRange();
              range.selectNodeContents(element);
              return new Set(Array.from(range.getClientRects(), (rect) => Math.round(rect.top)))
                .size;
            }),
          ).toBe(1);
        }
      }
      if (path === '/about') {
        const rows = page.locator('.local-checks > div');
        await expect(rows).toHaveCount(5);
        let previousBottom = 0;
        for (const row of await rows.all()) {
          const bounds = (await row.boundingBox())!;
          expect(bounds.y).toBeGreaterThanOrEqual(previousBottom);
          previousBottom = bounds.y + bounds.height;
          expect(await row.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
            true,
          );
          await expect(row.locator('dt')).toBeVisible();
          await expect(row.locator('dd')).toBeVisible();
        }
        if (width === 320 || width === 1440) {
          await page.locator('.about-local').screenshot({
            path: testInfo.outputPath(`local-checks-${width}.png`),
          });
        }
      }
      if (path === '/methodology') {
        for (const cell of await page.locator('#sources th, #sources td').all()) {
          expect(
            await cell.evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft)),
          ).toBeGreaterThanOrEqual(12);
        }
      }
      for (const paragraph of await page.locator('main p').all()) {
        if (
          width <= 700 &&
          (await paragraph.evaluate((element) => !!element.closest('.page-contents')))
        ) {
          await expect(paragraph).toBeHidden();
        } else {
          await expect(paragraph).toBeVisible();
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`${path.slice(1)}-expanded-${width}.png`),
        fullPage: true,
      });
    }
  }
});

test('Data & Methods stays on one line in the page title and footer', async ({
  page,
}, testInfo) => {
  for (const width of [320, 390, 700, 820, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/methodology');
    const title = page.getByRole('heading', { level: 1, name: 'Data & Methods' });
    await expect(title).toBeVisible();
    for (const element of [
      title,
      page.getByRole('contentinfo').getByRole('link', { name: 'Data & Methods' }),
    ]) {
      const layout = await element.evaluate((node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        return {
          lines: new Set(Array.from(range.getClientRects(), (rect) => Math.round(rect.top))).size,
          width: node.scrollWidth,
          available: node.clientWidth,
        };
      });
      expect(layout.lines).toBe(1);
      expect(layout.width).toBeLessThanOrEqual(layout.available);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 320 || width === 1440) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath(`methodology-title-${width}.png`) });
    }
  }
});

test('page contents highlight the current topic while scrolling, resizing and following anchors', async ({
  page,
}, testInfo) => {
  for (const width of [701, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, label, ids] of [
      ['/resources', 'Resource topics', ['operations', 'referrals', 'local-network']],
      ['/methodology', 'Methodology topics', ['model', 'sources', 'limits']],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const contents = page.getByRole('navigation', { name: label });
      await expect(contents.locator(`a[href="#${ids[0]}"]`)).toHaveAttribute(
        'aria-current',
        'location',
      );
      for (const link of await contents.getByRole('link').all()) {
        const centerOffset = await link.evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const text = range.getBoundingClientRect();
          const box = element.getBoundingClientRect();
          return Math.abs(text.top + text.height / 2 - (box.top + box.height / 2));
        });
        expect(centerOffset).toBeLessThanOrEqual(1);
      }
      await contents.screenshot({
        path: testInfo.outputPath(`contents-${path.slice(1)}-${width}.png`),
      });
      for (const id of ids.slice(1)) {
        await page
          .locator(`#${id}`)
          .evaluate((element) => element.scrollIntoView({ block: 'start' }));
        await expect(contents.locator(`a[href="#${id}"]`)).toHaveAttribute(
          'aria-current',
          'location',
        );
        await expect(contents.locator('[aria-current="location"]')).toHaveCount(1);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(contents.locator(`a[href="#${ids[0]}"]`)).toHaveAttribute(
        'aria-current',
        'location',
      );
      await contents.locator(`a[href="#${ids[1]}"]`).focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`#${ids[1]}$`));
      await expect(contents.locator(`a[href="#${ids[1]}"]`)).toHaveAttribute(
        'aria-current',
        'location',
      );
      await page.setViewportSize({ width, height: 800 });
      await expect(contents.locator('[aria-current="location"]')).toHaveCount(1);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect(contents.locator(`a[href="#${ids[2]}"]`)).toHaveAttribute(
        'aria-current',
        'location',
      );
    }
  }
});

test('methodology shows the full model and privacy explanations without disclosures', async ({
  page,
}, testInfo) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/methodology');
    const topics = page.getByRole('navigation', { name: 'Methodology topics' });
    for (const [name, id] of [
      ['The model', 'model'],
      ['Sources & vintages', 'sources'],
      ['Limits & privacy', 'limits'],
    ]) {
      if (width > 700) {
        await topics.getByRole('link', { name, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`#${id}$`));
      } else {
        await expect(topics).toHaveCount(0);
        await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      }
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
    await expect(page.locator('main details, main summary')).toHaveCount(0);
    for (const heading of await page.locator('.method-detail > h3').all()) {
      await expect(heading).toBeVisible();
      await expect(heading.locator('..').locator('p').first()).toBeVisible();
    }
    await expect(page.getByText(/constant variable contributes 0.5/)).toBeVisible();
    await expect(page.getByText(/Whole-question breakdowns/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`methodology-expanded-${width}.png`),
      fullPage: true,
    });
  }
});

test('nonprofit resources are reachable, readable and usable on desktop and phones', async ({
  page,
}, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  for (const [name, width, height] of [
    ['desktop', 1440, 1080],
    ['phone', 390, 844],
    ['tablet', 820, 1180],
    ['wide', 1920, 1080],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const navigation = page.getByRole('navigation', { name: 'Main navigation' });
    const menu = page.getByRole('button', { name: 'Menu', exact: true });
    if (width === 390) {
      await expect(navigation).toBeHidden();
      const bounds = await menu.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      await menu.click();
      await expect(navigation).toBeVisible();
      await navigation.getByRole('link', { name: 'Resources' }).focus();
      await page.keyboard.press('Escape');
      await expect(navigation).toBeHidden();
      await expect(menu).toBeFocused();
      await menu.click();
    } else {
      await expect(menu).toBeHidden();
    }
    await navigation.getByRole('link', { name: 'Resources' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Resources' })).toBeVisible();
    await expect(page.locator('#main-navigation')).toHaveAttribute('data-open', 'false');
    if (width === 390) await menu.click();
    await expect(navigation.getByRole('link', { name: 'Resources' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    if (width === 390) {
      const openMenuAccessibility = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(openMenuAccessibility.violations).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(menu).toBeFocused();
    }
    const topics = page.getByRole('navigation', { name: 'Resource topics' });
    for (const [title, id] of [
      ['Run a food program', 'operations'],
      ['Make a referral', 'referrals'],
      ['Central Florida organizations', 'local-network'],
    ]) {
      if (width > 700) {
        await topics.getByRole('link', { name: title }).click();
        await expect(page).toHaveURL(new RegExp(`/resources#${id}$`));
      } else {
        await expect(topics).toHaveCount(0);
        await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      }
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeInViewport();
    }
    const providers = page.locator('.resource-entry h3 a');
    await expect(providers).toHaveCount(16);
    const entry = page.locator('.resource-entry').first();
    const owner = await entry.locator('.resource-owner').boundingBox();
    const description = await entry.locator('.resource-description').boundingBox();
    if (width >= 1200) {
      expect(owner!.x + owner!.width).toBeLessThan(description!.x);
    } else {
      expect(owner!.y + owner!.height).toBeLessThan(description!.y);
    }
    expect(
      await providers.evaluateAll((links) =>
        links.every(
          (link) =>
            link instanceof HTMLAnchorElement &&
            link.protocol === 'https:' &&
            link.target === '_blank' &&
            link.relList.contains('noopener') &&
            link.relList.contains('noreferrer') &&
            link.textContent?.includes('opens in a new tab'),
        ),
      ),
    ).toBe(true);
    await expect(page.getByText(/Products carry handling fees/)).toBeVisible();
    await expect(page.getByText(/This is a student service/)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`resources-${width}-viewport.png`) });
    await page.screenshot({ path: testInfo.outputPath(`resources-${width}.png`), fullPage: true });
    await page.screenshot({ path: `docs/screenshots/resources-${name}.png`, fullPage: true });
  }
  expect(pageErrors).toEqual([]);
});
