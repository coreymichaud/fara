import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SharePlanDialog } from '@/features/planner/share-plan-dialog';

const links = {
  publicUrl: 'http://localhost:3000/plans/example',
  manageUrl: 'http://localhost:3000/plans/example/manage#token=private-test-token',
  notice: '',
};

function renderLinks(props = links) {
  return render(
    <SharePlanDialog {...props} onClose={() => {}} returnFocusRef={{ current: document.body }} />,
  );
}

describe('saved plan access', () => {
  it('focuses the save confirmation and distinguishes permanent public and private sections', () => {
    renderLinks();
    const heading = screen.getByRole('heading', { name: 'Your plan is saved' });
    expect(heading).toHaveFocus();
    expect(screen.getByRole('dialog', { name: 'Your plan is saved' })).toBeVisible();
    expect(document.body.style.overflow).toBe('hidden');
    const publicSection = screen.getByRole('region', { name: 'Your Saved Plan' });
    const privateSection = screen.getByRole('region', { name: 'Your Private Dashboard' });
    expect(publicSection).toBeVisible();
    expect(privateSection).toBeVisible();
    expect(publicSection.querySelector('details')).toBeNull();
    expect(privateSection.querySelector('details')).toBeNull();
    expect(publicSection).toHaveTextContent(
      'Public · keep this link to revisit your saved proposal, or share it with partners.',
    );
    const surveySection = screen.getByRole('region', { name: 'Community Survey' });
    expect(surveySection).toBeVisible();
    expect(surveySection).toHaveTextContent('Share this link when you want community feedback.');
    const openLinks = screen.getAllByRole('link');
    expect(openLinks).toHaveLength(3);
    for (const link of openLinks) {
      expect(link).toHaveClass('button-secondary');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAccessibleDescription('Opens in a new tab.');
    }
    expect(within(surveySection).getByRole('link', { name: 'Open Survey' })).toHaveAttribute(
      'href',
      `${links.publicUrl}/survey`,
    );
    expect(surveySection.innerHTML).not.toContain('private-test-token');
    expect(publicSection.innerHTML).not.toContain('private-test-token');
    expect(within(publicSection).getByRole('link', { name: 'Open Saved Plan' })).toHaveAttribute(
      'href',
      links.publicUrl,
    );
    expect(privateSection).toHaveTextContent('Private · your survey results and controls.');
    const saved = screen.getByRole('region', { name: 'Your plan is saved' });
    expect(saved).toHaveTextContent(
      "Save this private link. You'll need it to view survey results and manage your plan later.",
    );
    expect(saved).toHaveTextContent('Anyone with this link can access your management dashboard');
    expect(saved).toHaveTextContent("don't share it publicly");
    expect(
      within(privateSection).getByRole('link', { name: 'View Survey Results' }),
    ).toHaveAttribute('href', links.manageUrl);
  });

  it('copies the exact corresponding link and keeps separate accessible confirmations', async () => {
    const user = userEvent.setup();
    const clipboard = vi.spyOn(navigator.clipboard, 'writeText');
    renderLinks();
    await user.tab();
    const publicInput = screen.getByLabelText('Saved Plan Link');
    expect(publicInput).toHaveFocus();
    expect((publicInput as HTMLInputElement).selectionEnd).toBe(links.publicUrl.length);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Copy Plan Link' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(clipboard).toHaveBeenLastCalledWith(links.publicUrl);
    const publicStatus = within(screen.getByRole('region', { name: 'Your Saved Plan' })).getByRole(
      'status',
    );
    const privateStatus = within(
      screen.getByRole('region', { name: 'Your Private Dashboard' }),
    ).getByRole('status');
    expect(publicStatus).toHaveTextContent('Plan link copied.');
    expect(privateStatus).toBeEmptyDOMElement();
    await user.click(screen.getByRole('button', { name: 'Copy Survey Link' }));
    expect(clipboard).toHaveBeenLastCalledWith(`${links.publicUrl}/survey`);
    expect(
      within(screen.getByRole('region', { name: 'Community Survey' })).getByRole('status'),
    ).toHaveTextContent('Survey link copied.');
    const privateInput = screen.getByLabelText('Private Dashboard Link');
    await user.click(privateInput);
    expect((privateInput as HTMLInputElement).selectionEnd).toBe(links.manageUrl.length);
    await user.click(screen.getByRole('button', { name: 'Copy Private Dashboard Link' }));
    expect(clipboard).toHaveBeenLastCalledWith(links.manageUrl);
    expect(privateStatus).toHaveTextContent('Private dashboard link copied.');
    expect(publicStatus).toHaveTextContent('Plan link copied.');
  });

  it.each([
    ['Your Saved Plan', 'Copy Plan Link', 'Saved Plan Link'],
    ['Community Survey', 'Copy Survey Link', 'Survey Link'],
    ['Your Private Dashboard', 'Copy Private Dashboard Link', 'Private Dashboard Link'],
  ])('offers manual copying in %s when clipboard access fails', async (name, action, label) => {
    const user = userEvent.setup();
    const clipboard = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValue(new Error('denied'));
    renderLinks();
    await user.click(screen.getByRole('button', { name: action }));
    expect(within(screen.getByRole('region', { name })).getByRole('status')).toHaveTextContent(
      'Clipboard unavailable. Select and copy this link manually.',
    );
    expect(screen.getByLabelText(label)).toBeVisible();
    clipboard.mockResolvedValue();
    await user.click(screen.getByRole('button', { name: action }));
    expect(within(screen.getByRole('region', { name })).getByRole('status')).toHaveTextContent(
      /copied/,
    );
  });

  it('keeps both links available without the clipboard API or browser storage', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    renderLinks({ ...links, notice: 'Browser storage is unavailable; keep the private link.' });
    await user.click(screen.getByRole('button', { name: 'Copy Private Dashboard Link' }));
    expect(screen.getByText(/Clipboard unavailable/)).toHaveAttribute('role', 'status');
    expect(screen.getByText(/Browser storage is unavailable/)).toHaveAttribute('role', 'status');
    expect(screen.getByLabelText('Saved Plan Link')).toHaveValue(links.publicUrl);
    expect(screen.getByLabelText('Private Dashboard Link')).toHaveValue(links.manageUrl);
  });

  it.each(['close button', 'Escape cancellation'])(
    'closes through %s and restores focus and page scrolling',
    async (action) => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const opener = document.createElement('button');
      document.body.append(opener);
      opener.focus();
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'scroll';
      const view = render(
        <SharePlanDialog {...links} onClose={onClose} returnFocusRef={{ current: opener }} />,
      );
      if (action === 'close button') {
        await user.click(screen.getByRole('button', { name: 'Close sharing options' }));
      } else {
        fireEvent(
          screen.getByRole('dialog'),
          new Event('cancel', { bubbles: true, cancelable: true }),
        );
      }
      expect(onClose).toHaveBeenCalledOnce();
      view.unmount();
      expect(document.body.style.overflow).toBe('auto');
      expect(document.documentElement.style.overflow).toBe('scroll');
      expect(opener).toHaveFocus();
      opener.remove();
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    },
  );

  it('wraps Tab focus at both boundaries while allowing ordinary navigation keys', async () => {
    const user = userEvent.setup();
    renderLinks();
    const close = screen.getByRole('button', { name: 'Close sharing options' });
    const dashboard = screen.getByRole('link', { name: 'View Survey Results' });
    close.focus();
    await user.tab({ shift: true });
    expect(dashboard).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Saved Plan Link')).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(close).toHaveFocus();
  });

  it.each([
    ['left of the popup', [99, 200], [99, 200], true],
    ['right of the popup', [501, 200], [501, 200], true],
    ['above the popup', [200, 99], [200, 99], true],
    ['below the popup', [200, 401], [200, 401], true],
    ['inside popup padding', [110, 110], [110, 110], false],
    ['on the popup border', [100, 100], [100, 100], false],
    ['dragging from inside to outside', [150, 150], [99, 200], false],
    ['dragging from outside to inside', [99, 200], [150, 150], false],
  ])('handles %s without dismissing an inside click or drag', (_name, press, release, closes) => {
    const onClose = vi.fn();
    render(
      <SharePlanDialog {...links} onClose={onClose} returnFocusRef={{ current: document.body }} />,
    );
    const dialog = screen.getByRole('dialog');
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 400, 300));
    // JSDOM lacks pointer geometry, so supply the pointer event's mouse coordinates explicitly.
    fireEvent(
      dialog,
      new MouseEvent('pointerdown', { bubbles: true, clientX: press[0], clientY: press[1] }),
    );
    fireEvent.click(dialog, { clientX: release[0], clientY: release[1] });
    expect(onClose).toHaveBeenCalledTimes(closes ? 1 : 0);
    fireEvent.click(dialog, { clientX: 99, clientY: 200 });
    expect(onClose).toHaveBeenCalledTimes(closes ? 1 : 0);
  });

  it('keeps the popup open when a backdrop press ends on its content', () => {
    const onClose = vi.fn();
    render(
      <SharePlanDialog {...links} onClose={onClose} returnFocusRef={{ current: document.body }} />,
    );
    const dialog = screen.getByRole('dialog');
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 400, 300));
    fireEvent(dialog, new MouseEvent('pointerdown', { bubbles: true, clientX: 99, clientY: 200 }));
    fireEvent.click(screen.getByLabelText('Saved Plan Link'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
