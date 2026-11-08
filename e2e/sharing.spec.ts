import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  await page.getByRole('button', { name: 'Save & Share' }).click();
  await expect(page.getByRole('heading', { name: 'Your plan is saved' })).toBeFocused();
  const publicUrl = await page.getByLabel('Saved Plan Link', { exact: true }).inputValue();
  const surveyUrl = await page.getByLabel('Survey Link', { exact: true }).inputValue();
  const privateUrl = await page.getByLabel('Private Dashboard Link', { exact: true }).inputValue();
  expect(new URL(publicUrl).hash).toBe('');
  expect(new URL(privateUrl).pathname).toBe(`${new URL(publicUrl).pathname}/manage`);
  expect(new URL(privateUrl).hash).toMatch(/^#token=/);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  for (const [region, action, value, message] of [
    ['Your Saved Plan', 'Copy Plan Link', publicUrl, 'Plan link copied.'],
    ['Community Survey', 'Copy Survey Link', surveyUrl, 'Survey link copied.'],
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
  await expect(visitor.getByRole('link', { name: 'Open Community Survey' })).toHaveCount(0);
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
  const [creator] = await Promise.all([page.waitForEvent('popup'), page.keyboard.press('Enter')]);
  await expect(page.getByRole('dialog', { name: 'Your plan is saved' })).toBeVisible();
  expect(await creator.evaluate(() => window.opener)).toBeNull();
  await expect(creator.getByRole('heading', { name: 'Community responses' })).toBeVisible();
  await expect(creator.getByText('anonymous check-ins', { exact: true })).toBeVisible();
  await expect(creator.locator('.creator-summary strong')).toHaveText('1');
  await expect(creator.getByText(/Breakdown withheld/)).toHaveCount(4);
  await expect(creator.getByRole('table')).toHaveCount(0);
  const creatorAccessibility = await new AxeBuilder({ page: creator })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(creatorAccessibility.violations).toEqual([]);
  await creator.evaluate(() => window.scrollTo(0, 0));
  await creator.screenshot({ path: testInfo.outputPath('creator-responses.png'), fullPage: true });
  await expect(creator).not.toHaveURL(/token=/);
  await creator.getByRole('button', { name: 'Close community check-in' }).click();
  await expect(creator.getByRole('button', { name: 'Reopen community check-in' })).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByText('Community check-in is closed for this plan.')).toBeVisible();
  await creator.getByRole('button', { name: 'Reopen community check-in' }).click();
  await expect(creator.getByRole('button', { name: 'Close community check-in' })).toBeVisible();
  await visitor.goto(privateUrl);
  await expect(visitor.getByRole('heading', { name: 'Community responses' })).toBeVisible();
  await expect(visitor.locator('.creator-summary strong')).toHaveText('1');
  await expect(visitor).not.toHaveURL(/token=/);
  await expect(visitor.getByText(/Breakdown withheld/)).toHaveCount(4);
  await creator.close();
  await newContext.close();
});

test('sharing dialog prioritizes the saved plan, traps focus and reopens across screen sizes', async ({
  page,
}, testInfo) => {
  let saves = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/plans') saves++;
  });
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
    await page.getByRole('button', { name: 'Save & Share' }).click();
    await expect(page.getByRole('heading', { name: 'Your plan is saved' })).toBeFocused();
    const saved = page.getByRole('region', { name: 'Your plan is saved' });
    const workspaceAfter = await page.locator('.workspace-grid').evaluate((element) => ({
      top: (element as HTMLElement).offsetTop,
      height: element.getBoundingClientRect().height,
    }));
    expect(workspaceAfter.top).toBe(workspaceBefore.top);
    expect(workspaceAfter.height).toBeCloseTo(workspaceBefore.height, 0);
    await expect(saved.locator('details')).toHaveCount(0);
    const publicSection = saved.getByRole('region', { name: 'Your Saved Plan' });
    const privateSection = saved.getByRole('region', { name: 'Your Private Dashboard' });
    await expect(publicSection.getByLabel('Saved Plan Link', { exact: true })).toBeVisible();
    await expect(
      privateSection.getByLabel('Private Dashboard Link', { exact: true }),
    ).toBeVisible();
    await expect(saved.getByLabel('Survey Link', { exact: true })).toBeVisible();
    const publicBounds = (await publicSection.boundingBox())!;
    const privateBounds = (await privateSection.boundingBox())!;
    const surveyBounds = (await saved
      .getByRole('region', { name: 'Community Survey' })
      .boundingBox())!;
    expect(publicBounds.y + publicBounds.height).toBeLessThan(surveyBounds.y);
    expect(publicBounds.y + publicBounds.height).toBeLessThan(privateBounds.y);
    if (width > 700) {
      expect(surveyBounds.y).toBe(privateBounds.y);
      expect(publicBounds.width).toBeGreaterThan(privateBounds.width);
    } else {
      expect(surveyBounds.y + surveyBounds.height).toBeLessThan(privateBounds.y);
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
    const dialog = page.getByRole('dialog', { name: 'Your plan is saved' });
    const dialogBounds = (await dialog.boundingBox())!;
    expect(dialogBounds.x).toBeGreaterThanOrEqual(0);
    expect(dialogBounds.y).toBeGreaterThanOrEqual(0);
    expect(dialogBounds.x + dialogBounds.width).toBeLessThanOrEqual(width);
    expect(dialogBounds.y + dialogBounds.height).toBeLessThanOrEqual(height);
    const backgroundScroll = await page.evaluate(() => scrollY);
    await page.mouse.move(1, 1);
    await page.mouse.wheel(0, 400);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(await page.evaluate(() => scrollY)).toBe(backgroundScroll);
    await dialog.screenshot({ path: testInfo.outputPath(`sharing-dialog-${width}.png`) });
    const originalUrl = await saved.getByLabel('Saved Plan Link', { exact: true }).inputValue();
    const savesBeforeReopening = saves;
    await dialog.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(dialog.getByRole('button', { name: 'Close sharing options' })).toBeInViewport({
      ratio: 1,
    });
    await dialog.getByRole('button', { name: 'Close sharing options' }).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('link', { name: 'View Survey Results' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Close sharing options' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save & Share' })).toBeFocused();
    if (width <= 700) {
      for (const mode of ['Map', 'Areas', 'Plan']) {
        await page.getByRole('button', { name: mode, exact: true }).click();
        await page.getByRole('button', { name: 'Save & Share' }).click();
        await expect(saved.getByLabel('Saved Plan Link', { exact: true })).toHaveValue(originalUrl);
        await dialog.getByRole('button', { name: 'Close sharing options' }).click();
      }
    }
    await page.getByRole('button', { name: 'Save & Share' }).click();
    await expect(saved.getByLabel('Saved Plan Link', { exact: true })).toHaveValue(originalUrl);
    await dialog.getByRole('heading', { name: 'Your plan is saved' }).click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(1, 1);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save & Share' })).toBeFocused();
    await page.getByRole('button', { name: 'Save & Share' }).click();
    await expect(saved.getByLabel('Saved Plan Link', { exact: true })).toHaveValue(originalUrl);
    expect(saves).toBe(savesBeforeReopening);
    const publicLink = saved.getByRole('link', { name: 'Open Saved Plan' });
    const publicUrl = await publicLink.getAttribute('href');
    const surveyUrl = await saved.getByLabel('Survey Link', { exact: true }).inputValue();
    const [planTab] = await Promise.all([page.waitForEvent('popup'), publicLink.click()]);
    await planTab.setViewportSize({ width, height });
    expect(await planTab.evaluate(() => window.opener)).toBeNull();
    await expect(page.getByRole('dialog', { name: 'Your plan is saved' })).toBeVisible();
    await expect(planTab).toHaveURL(publicUrl!);
    await expect(planTab.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(planTab.getByRole('heading', { name: 'Would this work for you?' })).toHaveCount(0);
    await expect(planTab.getByRole('link', { name: 'Open Community Survey' })).toHaveCount(0);
    await page.bringToFront();
    const [surveyTab] = await Promise.all([
      page.waitForEvent('popup'),
      saved.getByRole('link', { name: 'Open Survey' }).click(),
    ]);
    await surveyTab.setViewportSize({ width, height });
    await expect(surveyTab).toHaveURL(surveyUrl);
    expect(await surveyTab.evaluate(() => window.opener)).toBeNull();
    await expect(surveyTab.getByRole('banner')).toHaveCount(0);
    await expect(surveyTab.getByRole('navigation')).toHaveCount(0);
    await expect(surveyTab.getByRole('contentinfo')).toHaveCount(0);
    await expect(
      surveyTab.getByRole('heading', { level: 1, name: 'Would this work for you?' }),
    ).toBeVisible();
    await expect(surveyTab.getByRole('heading', { name: 'Planning estimate' })).toHaveCount(0);
    expect(await surveyTab.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (
        await new AxeBuilder({ page: surveyTab })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    await surveyTab.screenshot({
      path: testInfo.outputPath(`participant-${width}.png`),
      fullPage: true,
    });
    await surveyTab
      .getByRole('link', { name: 'View the full proposal and planning details' })
      .click();
    await expect(surveyTab.getByRole('banner')).toBeVisible();
    await expect(surveyTab).toHaveURL(publicUrl!);
    await planTab.close();
    await surveyTab.close();
  }
});

test('sharing popup closes on outside taps and keeps inside taps active', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    isMobile: true,
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto('/planner');
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    const trigger = page.getByRole('button', { name: 'Save & Share' });
    await trigger.tap();
    const dialog = page.getByRole('dialog', { name: 'Your plan is saved' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('heading', { name: 'Your plan is saved' }).tap();
    await expect(dialog).toBeVisible();
    const url = await dialog.getByLabel('Saved Plan Link', { exact: true }).inputValue();
    await page.touchscreen.tap(1, 1);
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.tap();
    await expect(dialog.getByLabel('Saved Plan Link', { exact: true })).toHaveValue(url);
    await dialog.getByRole('button', { name: 'Close sharing options' }).tap();
    await expect(dialog).toHaveCount(0);
  } finally {
    await context.close();
  }
});
