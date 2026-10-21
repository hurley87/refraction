import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import VenueCTA, { venueMapHref } from './venue-cta';

describe('venueMapHref', () => {
  it('opens the spot on the map and returns home', () => {
    expect(venueMapHref('Floyd Miami')).toBe(
      '/interactive-map?name=Floyd+Miami&returnTo=%2F'
    );
  });
});

describe('VenueCTA', () => {
  it('links each venue to its map spot, with the city above the name', () => {
    render(<VenueCTA />);

    const floyd = screen.getAllByRole('link', { name: 'Floyd, Miami' })[0];
    expect(floyd.getAttribute('href')).toBe(venueMapHref('Floyd Miami'));
    expect(floyd.textContent?.replace(/\s+/g, '')).toBe('(Miami)Floyd');
    const city = floyd.querySelector('span');
    expect(city?.textContent).toBe('(Miami)');
    expect(
      city?.compareDocumentPosition(
        floyd.childNodes[floyd.childNodes.length - 1]
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    const dubble = screen.getAllByRole('link', {
      name: 'dubble, Amsterdam',
    })[0];
    expect(dubble.getAttribute('href')).toBe(venueMapHref('dubble'));
    expect(dubble.querySelector('span')?.textContent).toBe('(Amsterdam)');
  });
});
