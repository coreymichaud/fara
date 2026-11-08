import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SavedPlanLinks } from '@/features/planner/saved-plan-links';

const links = {
  publicUrl: 'http://localhost:3000/plans/example',
  manageUrl: 'http://localhost:3000/plans/example/manage#token=private-test-token',
  surveyEnabled: true,
  notice: '',
};

describe('saved plan access', () => {
  it('focuses the save confirmation and distinguishes permanent public and private sections', () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    render(<SavedPlanLinks {...links} />);
    const heading = screen.getByRole('heading', { name: 'Your plan is saved' });
    expect(heading).toHaveFocus();
    expect(scroll).toHaveBeenCalledWith({ block: 'start' });
    expect(scroll.mock.contexts[0]).toBe(heading);
    const publicSection = screen.getByRole('region', { name: 'Share Your Plan' });
    const privateSection = screen.getByRole('region', { name: 'Your Private Dashboard' });
    expect(publicSection).toBeVisible();
    expect(privateSection).toBeVisible();
    expect(publicSection.querySelector('details')).toBeNull();
    expect(privateSection.querySelector('details')).toBeNull();
    expect(publicSection).toHaveTextContent(
      'Public · full proposal for partners and collaborators.',
    );
    const surveySection = screen.getByRole('region', { name: 'Community Check-in' });
    expect(surveySection).toBeVisible();
    expect(within(surveySection).getByRole('link', { name: 'Open Survey' })).toHaveAttribute(
      'href',
      `${links.publicUrl}/survey`,
    );
    expect(surveySection.innerHTML).not.toContain('private-test-token');
    expect(publicSection.innerHTML).not.toContain('private-test-token');
    expect(within(publicSection).getByRole('link', { name: 'Open Public Plan' })).toHaveAttribute(
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
    render(<SavedPlanLinks {...links} />);
    await user.tab();
    const publicInput = screen.getByLabelText('Public Plan Link');
    expect(publicInput).toHaveFocus();
    expect((publicInput as HTMLInputElement).selectionEnd).toBe(links.publicUrl.length);
    await user.tab();
    expect(screen.getByRole('link', { name: 'Open Public Plan' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Copy Public Link' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(clipboard).toHaveBeenLastCalledWith(links.publicUrl);
    const publicStatus = within(screen.getByRole('region', { name: 'Share Your Plan' })).getByRole(
      'status',
    );
    const privateStatus = within(
      screen.getByRole('region', { name: 'Your Private Dashboard' }),
    ).getByRole('status');
    expect(publicStatus).toHaveTextContent('Public link copied.');
    expect(privateStatus).toBeEmptyDOMElement();
    await user.click(screen.getByRole('button', { name: 'Copy Survey Link' }));
    expect(clipboard).toHaveBeenLastCalledWith(`${links.publicUrl}/survey`);
    expect(
      within(screen.getByRole('region', { name: 'Community Check-in' })).getByRole('status'),
    ).toHaveTextContent('Survey link copied.');
    const privateInput = screen.getByLabelText('Private Dashboard Link');
    await user.click(privateInput);
    expect((privateInput as HTMLInputElement).selectionEnd).toBe(links.manageUrl.length);
    await user.click(screen.getByRole('button', { name: 'Copy Private Dashboard Link' }));
    expect(clipboard).toHaveBeenLastCalledWith(links.manageUrl);
    expect(privateStatus).toHaveTextContent('Private dashboard link copied.');
    expect(publicStatus).toHaveTextContent('Public link copied.');
  });

  it.each([
    ['Share Your Plan', 'Copy Public Link', 'Public Plan Link'],
    ['Community Check-in', 'Copy Survey Link', 'Survey Link'],
    ['Your Private Dashboard', 'Copy Private Dashboard Link', 'Private Dashboard Link'],
  ])('offers manual copying in %s when clipboard access fails', async (name, action, label) => {
    const user = userEvent.setup();
    const clipboard = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValue(new Error('denied'));
    render(<SavedPlanLinks {...links} />);
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
    render(
      <SavedPlanLinks {...links} notice="Browser storage is unavailable; keep the private link." />,
    );
    await user.click(screen.getByRole('button', { name: 'Copy Private Dashboard Link' }));
    expect(screen.getByText(/Clipboard unavailable/)).toHaveAttribute('role', 'status');
    expect(screen.getByText(/Browser storage is unavailable/)).toHaveAttribute('role', 'status');
    expect(screen.getByLabelText('Public Plan Link')).toHaveValue(links.publicUrl);
    expect(screen.getByLabelText('Private Dashboard Link')).toHaveValue(links.manageUrl);
  });

  it('describes the saved survey setting accurately when community check-in is off', () => {
    render(<SavedPlanLinks {...links} surveyEnabled={false} />);
    expect(screen.queryByRole('region', { name: 'Community Check-in' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Survey Link')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Public Plan Link')).toBeVisible();
    expect(screen.getByRole('link', { name: 'View Survey Results' })).toBeVisible();
  });
});
