import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

test('explore → scenario → compare → challenge → persistent share → survey → creator results', async ({
  page,
  browser,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto('/planner');
  await expect(page.getByRole('heading', { name: 'Pantry Planner' })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Your plan is saved' })).toBeFocused();
  const publicUrl = await page.getByLabel('Public Plan Link', { exact: true }).inputValue();
  const surveyUrl = await page.getByLabel('Survey Link', { exact: true }).inputValue();
  const privateUrl = await page.getByLabel('Private Dashboard Link', { exact: true }).inputValue();
  expect(new URL(publicUrl).hash).toBe('');
  expect(new URL(privateUrl).pathname).toBe(`${new URL(publicUrl).pathname}/manage`);
  expect(new URL(privateUrl).hash).toMatch(/^#token=/);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  for (const [region, action, value, message] of [
    ['Share Your Plan', 'Copy Public Link', publicUrl, 'Public link copied.'],
    ['Community Check-in', 'Copy Survey Link', surveyUrl, 'Survey link copied.'],
    [
      'Your Private Dashboard',
      'Copy Private Dashboard Link',
      privateUrl,
      'Private dashboard link copied.',
    ],
  ]) {
    const section = page.getByRole('region', { name: region });
    await expect(section).toBeInViewport({ ratio: 1 });
    await section.getByRole('button', { name: action }).click();
    await expect(section.getByRole('status')).toHaveText(message);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(value);
  }
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
  await expect(visitor.getByRole('radio')).toHaveCount(0);
  await expect(visitor.getByRole('heading', { name: 'Would this work for you?' })).toHaveCount(0);
  await expect(visitor.getByRole('link', { name: 'Open Community Check-in' })).toHaveCount(0);
  await visitor.goto(surveyUrl);
  await expect(visitor).toHaveURL(surveyUrl);
  await expect(visitor.getByRole('banner')).toHaveCount(0);
  await expect(visitor.getByRole('navigation')).toHaveCount(0);
  await expect(visitor.getByRole('contentinfo')).toHaveCount(0);
  await expect(visitor.getByRole('heading', { name: 'Would this work for you?' })).toBeVisible();
  await expect(visitor.getByRole('heading', { name: 'Planning estimate' })).toHaveCount(0);
  await expect(visitor.getByRole('heading', { name: 'Area indicators' })).toHaveCount(0);
  await expect(
    visitor.getByText('Verify venue permission and nearby unlisted services.'),
  ).toHaveCount(0);
  await expect(visitor.getByText(/Only these four choices are saved/)).toBeVisible();
  const surveyAccessibility = await new AxeBuilder({ page: visitor })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(surveyAccessibility.violations).toEqual([]);
  await visitor.screenshot({ path: testInfo.outputPath('survey-phone.png'), fullPage: true });
  await visitor.getByRole('radio', { name: 'Yes', exact: true }).check();
  await visitor.getByRole('radio', { name: 'Transportation', exact: true }).check();
  await visitor.getByRole('radio', { name: 'Weekend', exact: true }).check();
  await visitor.getByRole('radio', { name: 'Ride with someone', exact: true }).check();
  await visitor.getByRole('button', { name: 'Send anonymous check-in' }).click();
  await expect(visitor.getByRole('heading', { name: 'Thank you for checking in.' })).toBeVisible();
  const id = publicUrl.split('/').pop()!;
  expect((await visitor.request.get(`/api/plans/${id}/manage`)).status()).toBe(403);
  expect(
    (
      await visitor.request.post(`/api/plans/${id}/manage`, { data: { token: 'invalid' } })
    ).status(),
  ).toBe(403);
  const dashboard = page.getByRole('link', { name: 'View Survey Results' });
  await dashboard.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Community responses' })).toBeVisible();
  await expect(page.getByText('anonymous check-ins', { exact: true })).toBeVisible();
  await expect(page.locator('.creator-summary strong')).toHaveText('1');
  await expect(page.getByText(/Breakdown withheld/)).toHaveCount(4);
  await expect(page.getByRole('table')).toHaveCount(0);
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
  await page.getByRole('button', { name: 'Reopen community check-in' }).click();
  await expect(page.getByRole('button', { name: 'Close community check-in' })).toBeVisible();
  await visitor.goto(privateUrl);
  await expect(visitor.getByRole('heading', { name: 'Community responses' })).toBeVisible();
  await expect(visitor.locator('.creator-summary strong')).toHaveText('1');
  await expect(visitor).not.toHaveURL(/token=/);
  await expect(visitor.getByText(/Breakdown withheld/)).toHaveCount(4);
  await newContext.close();
});

test('saved links stay expanded, accessible and usable across screen sizes', async ({
  page,
}, testInfo) => {
  for (const [width, height] of [
    [320, 844],
    [390, 844],
    [820, 1180],
    [1440, 1080],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/planner');
    if (width <= 700) await page.getByRole('button', { name: 'Plan', exact: true }).click();
    const workspaceBefore = await page.locator('.workspace-grid').evaluate((element) => ({
      top: (element as HTMLElement).offsetTop,
      height: element.getBoundingClientRect().height,
    }));
    await page.getByRole('button', { name: 'Save & share this plan' }).click();
    await expect(page.getByRole('heading', { name: 'Your plan is saved' })).toBeFocused();
    const saved = page.getByRole('region', { name: 'Your plan is saved' });
    const workspaceAfter = await page.locator('.workspace-grid').evaluate((element) => ({
      top: (element as HTMLElement).offsetTop,
      height: element.getBoundingClientRect().height,
    }));
    expect(workspaceAfter.top).toBe(workspaceBefore.top);
    expect(workspaceAfter.height).toBeCloseTo(workspaceBefore.height, 0);
    await expect(saved.locator('details')).toHaveCount(0);
    const publicSection = saved.getByRole('region', { name: 'Share Your Plan' });
    const privateSection = saved.getByRole('region', { name: 'Your Private Dashboard' });
    await expect(publicSection.getByLabel('Public Plan Link', { exact: true })).toBeVisible();
    await expect(
      privateSection.getByLabel('Private Dashboard Link', { exact: true }),
    ).toBeVisible();
    await expect(saved.getByLabel('Survey Link', { exact: true })).toBeVisible();
    const publicBounds = (await publicSection.boundingBox())!;
    const privateBounds = (await privateSection.boundingBox())!;
    if (width > 700) {
      expect(publicBounds.y).toBe(privateBounds.y);
      expect(publicBounds.x + publicBounds.width).toBeLessThan(privateBounds.x);
      await expect(
        privateSection.getByRole('link', { name: 'View Survey Results' }),
      ).toBeInViewport({ ratio: 1 });
    } else {
      expect(publicBounds.y + publicBounds.height).toBeLessThan(privateBounds.y);
      for (const mode of ['Map', 'Areas', 'Plan']) {
        await page.getByRole('button', { name: mode, exact: true }).click();
        await expect(privateSection).toBeVisible();
        await expect(publicSection).toBeVisible();
      }
    }
    for (const action of await saved.locator('button, a').all()) {
      const bounds = (await action.boundingBox())!;
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.width).toBeGreaterThanOrEqual(44);
    }
    await expect(saved.getByText(/Save this private link/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await saved.screenshot({ path: testInfo.outputPath(`saved-plan-${width}.png`) });
    const publicLink = saved.getByRole('link', { name: 'Open Public Plan' });
    const publicUrl = await publicLink.getAttribute('href');
    const surveyUrl = await saved.getByLabel('Survey Link', { exact: true }).inputValue();
    await publicLink.click();
    await expect(page).toHaveURL(publicUrl!);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Would this work for you?' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open Community Check-in' })).toHaveCount(0);
    await page.goto(surveyUrl);
    await expect(page.getByRole('banner')).toHaveCount(0);
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Would this work for you?' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Planning estimate' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`participant-${width}.png`),
      fullPage: true,
    });
    await page.getByRole('link', { name: 'View the full proposal and planning details' }).click();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page).toHaveURL(publicUrl!);
  }
});

test('reference pages match Resources and stay expanded; atlas metadata stays on one line', async ({
  page,
}, testInfo) => {
  for (const width of [320, 820, 1440]) {
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
      if (path === '/resources') await expect(page.getByText(/Links reviewed/)).toHaveCount(0);
      if (path === '/methodology') {
        for (const cell of await page.locator('#sources th, #sources td').all()) {
          expect(
            await cell.evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft)),
          ).toBeGreaterThanOrEqual(12);
        }
      }
      for (const paragraph of await page.locator('main p').all())
        await expect(paragraph).toBeVisible();
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
}) => {
  for (const width of [390, 1440]) {
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
  await expect(page.getByRole('button', { name: 'Save & share this plan' })).toBeEnabled();
});

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
    await expect(page.getByRole('img', { name: /Census boundaries/ }).locator('path')).toHaveCount(
      4,
    );
    await expect(page.locator('figcaption')).toContainText('490 Census tracts · 2020 boundaries');
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
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
    ).toBe(true);
    const grid = await page.locator('.workspace-grid').boundingBox();
    const context = await page.locator('.map-context').boundingBox();
    expect(grid!.y).toBeLessThan(180);
    expect(context!.y + context!.height).toBeLessThanOrEqual(grid!.y + grid!.height + 1);
    await expect(page.getByRole('contentinfo')).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Save & share this plan' })).toBeInViewport({
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
      await topics.getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
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
      await topics.getByRole('link', { name: title }).click();
      await expect(page).toHaveURL(new RegExp(`/resources#${id}$`));
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
