'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Copy, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';

type LinkKind = 'public' | 'survey' | 'private';

export function SavedPlanLinks({
  publicUrl,
  manageUrl,
  surveyEnabled,
  notice,
}: {
  publicUrl: string;
  manageUrl: string;
  surveyEnabled: boolean;
  notice: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
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
      heading: 'Share Your Plan',
      description: 'Public · full proposal for partners and collaborators.',
      label: 'Public Plan Link',
      url: publicUrl,
      action: 'Open Public Plan',
      copyLabel: 'Copy Public Link',
    },
    ...(surveyEnabled
      ? [
          {
            kind: 'survey' as const,
            heading: 'Community Check-in',
            description: 'Public · a short survey for community members.',
            label: 'Survey Link',
            url: `${publicUrl}/survey`,
            action: 'Open Survey',
            copyLabel: 'Copy Survey Link',
          },
        ]
      : []),
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

  useEffect(() => {
    // The sharing strip follows the workspace so it never reduces the planning area.
    heading.current!.focus({ preventScroll: true });
    heading.current!.scrollIntoView({ block: 'start' });
  }, []);

  async function copy(value: string, kind: LinkKind) {
    let message: string;
    try {
      await navigator.clipboard.writeText(value);
      const confirmations = {
        public: 'Public link copied.',
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
      <h2 id="saved-plan-heading" className="saved-plan-title" ref={heading} tabIndex={-1}>
        <Check size={20} aria-hidden="true" /> Your plan is saved
      </h2>
      {notice && (
        <p className="save-message" role="status">
          {notice}
        </p>
      )}
      <div className="saved-plan-links" data-link-count={links.length}>
        {links.map((link) => (
          <section
            className="saved-link-section"
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
              <Button asChild variant={link.kind === 'private' ? 'default' : 'secondary'}>
                <a href={link.url}>
                  {link.action} <ArrowRight size={14} aria-hidden="true" />
                </a>
              </Button>
              <Button
                variant="ghost"
                aria-label={link.copyLabel}
                onClick={() => void copy(link.url, link.kind)}
              >
                <Copy size={14} aria-hidden="true" /> Copy
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
