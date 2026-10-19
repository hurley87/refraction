import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminHubLink } from './admin-hub-link';

let pathname = '/admin/guides';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

describe('AdminHubLink', () => {
  beforeEach(() => {
    pathname = '/admin/guides';
  });

  it('links a section back to the admin hub', () => {
    render(<AdminHubLink />);

    const link = screen.getByRole('link', { name: 'Admin hub' });
    expect(link.getAttribute('href')).toBe('/admin');
  });

  it('stays off the hub itself', () => {
    pathname = '/admin';
    render(<AdminHubLink />);

    expect(screen.queryByRole('link', { name: 'Admin hub' })).toBeNull();
  });

  it('links a nested page back to the hub', () => {
    pathname = '/admin/guides/guide-1';
    render(<AdminHubLink />);

    expect(screen.getByRole('link', { name: 'Admin hub' })).toBeTruthy();
  });
});
