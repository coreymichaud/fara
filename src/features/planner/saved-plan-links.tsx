'use client';

import { useState } from 'react';
import { ArrowRight, Copy, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';

type LinkKind = 'public' | 'survey' | 'private';

export function SavedPlanLinks({
  publicUrl,
  manageUrl,
  notice,
}: {
  publicUrl: string;
  manageUrl: string;
  notice: string;
}) {
  const [copyStatus, setCopyStatus] = useState({ public: '', survey: '', private: '' });
  const links: {
    kind: LinkKind;
    heading: string;
    description: string;
    label: string;
    url: string;
    action: string;
    copyLabel: string;
  }[] = [
    {
      kind: 'public',
      heading: 'Your Saved Plan',
      description:
        'Public · keep this link to revisit your saved proposal, or share it with partners.',
      label: 'Saved Plan Link',
      url: publicUrl,
      action: 'Open Saved Plan',
      copyLabel: 'Copy Plan Link',
    },
    {
      kind: 'survey',
      heading: 'Community Survey',
      description: 'Share this link when you want community feedback.',
      label: 'Survey Link',
      url: `${publicUrl}/survey`,
      action: 'Open Survey',
      copyLabel: 'Copy Survey Link',
    },
    {
      kind: 'private',
      heading: 'Your Private Dashboard',
      description: 'Private · your survey results and controls.',
      label: 'Private Dashboard Link',
      url: manageUrl,
      action: 'View Survey Results',
      copyLabel: 'Copy Private Dashboard Link',
    },
  ];

  async function copy(value: string, kind: LinkKind) {
    let message: string;
    try {
      await navigator.clipboard.writeText(value);
      const confirmations = {
        public: 'Plan link copied.',
        survey: 'Survey link copied.',
        private: 'Private dashboard link copied.',
      };
      message = confirmations[kind];
    } catch {
      message = 'Clipboard unavailable. Select and copy this link manually.';
    }
    setCopyStatus((current) => ({ ...current, [kind]: message }));
  }

  return (
    <section className="saved-plan" aria-labelledby="saved-plan-heading">
      <span id="plan-links-new-tab" className="sr-only">
        Opens in a new tab.
      </span>
      {notice && (
        <p className="save-message" role="status">
          {notice}
        </p>
      )}
      <div className="saved-plan-links">
        {links.map((link) => (
          <section
            className="saved-link-section"
            data-kind={link.kind}
            key={link.kind}
            aria-labelledby={`saved-${link.kind}-heading`}
          >
            <h3 id={`saved-${link.kind}-heading`}>
              {link.kind === 'private' && <LockKeyhole size={15} aria-hidden="true" />}
              {link.heading}
            </h3>
            <p className="saved-link-description">{link.description}</p>
            <label className="saved-link-field">
              <span className="sr-only">{link.label}</span>
              <input readOnly value={link.url} onFocus={(event) => event.target.select()} />
            </label>
            <div className="saved-link-actions">
              <Button
                variant={link.kind === 'public' ? 'accent' : 'ghost'}
                aria-label={link.copyLabel}
                onClick={() => void copy(link.url, link.kind)}
              >
                <Copy size={14} aria-hidden="true" />{' '}
                {link.kind === 'public' ? 'Copy Plan Link' : 'Copy'}
              </Button>
              <Button asChild variant="secondary">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-describedby="plan-links-new-tab"
                >
                  {link.action} <ArrowRight size={14} aria-hidden="true" />
                </a>
              </Button>
            </div>
            <p className="saved-copy-status" role="status" aria-atomic="true">
              {copyStatus[link.kind]}
            </p>
          </section>
        ))}
      </div>
      <div className="saved-link-reminder">
        <strong>
          Save this private link. You&apos;ll need it to view survey results and manage your plan
          later.
        </strong>
        <p>
          Anyone with this link can access your management dashboard. Keep it safe and don&apos;t
          share it publicly.
        </p>
      </div>
    </section>
  );
}
