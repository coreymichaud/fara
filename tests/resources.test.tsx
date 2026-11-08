import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Resources, { metadata } from '@/app/resources/page';
import { resourceSections } from '@/config/resources';

describe('nonprofit resources', () => {
  it('renders every resource with an attributed provider, service area and safe external link', () => {
    render(<Resources />);
    expect(screen.getByRole('main').querySelector('details, summary')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Resources' })).toBeInTheDocument();
    expect(screen.queryByText(/Links reviewed/)).not.toBeInTheDocument();
    expect(screen.queryByText('November 7, 2026')).not.toBeInTheDocument();
    expect(metadata.title).toBe('Resources | FARA');
    expect(metadata.description).toContain('nonprofit teams');
    const destinations: string[] = [];
    for (const section of resourceSections) {
      const region = within(screen.getByRole('region', { name: section.title }));
      expect(region.getByText(section.summary)).toBeInTheDocument();
      for (const resource of section.resources) {
        const link = region.getByRole('link', {
          name: (name) => name.startsWith(resource.title) && name.endsWith('(opens in a new tab)'),
        });
        expect(link).toHaveAttribute('href', resource.href);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        const entry = within(link.closest('li')!);
        expect(entry.getByText(resource.organization)).toBeInTheDocument();
        expect(entry.getByText(resource.coverage)).toBeInTheDocument();
        expect(entry.getByText(resource.description)).toBeInTheDocument();
        expect(new URL(resource.href).protocol).toBe('https:');
        expect(Object.values(resource).every((value) => value.trim().length > 0)).toBe(true);
        destinations.push(resource.href);
      }
    }
    expect(destinations).toHaveLength(16);
    expect(new Set(destinations).size).toBe(destinations.length);
  });

  it('provides working section anchors and keeps important referral limits visible', () => {
    render(<Resources />);
    const topics = within(screen.getByRole('navigation', { name: 'Resource topics' }));
    const ids = resourceSections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of resourceSections) {
      expect(topics.getByRole('link', { name: section.title })).toHaveAttribute(
        'href',
        `#${section.id}`,
      );
      expect(screen.getByRole('heading', { name: section.title })).toHaveAttribute(
        'id',
        section.id,
      );
    }
    expect(screen.getByText(/Products carry handling fees/)).toBeInTheDocument();
    expect(screen.getByText(/This is a student service/)).toBeInTheDocument();
    const notice = within(screen.getByRole('complementary', { name: 'Before making a referral' }));
    expect(notice.getByText(/Confirm current services, costs, eligibility/)).toBeInTheDocument();
    expect(notice.getByText(/do not establish existing service coverage/)).toBeInTheDocument();
  });
});
