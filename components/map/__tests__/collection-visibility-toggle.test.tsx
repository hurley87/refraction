import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollectionVisibilityToggle } from '../collection-visibility-toggle';

describe('CollectionVisibilityToggle', () => {
  it('marks Private as selected and Public as idle', () => {
    render(
      <CollectionVisibilityToggle isPrivate onIsPrivateChange={vi.fn()} />
    );

    expect(screen.getByRole('radio', { name: /private/i })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('radio', { name: /public/i })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('switches to public when Public is clicked', async () => {
    const onIsPrivateChange = vi.fn();
    const user = userEvent.setup();

    render(
      <CollectionVisibilityToggle
        isPrivate
        onIsPrivateChange={onIsPrivateChange}
      />
    );

    await user.click(screen.getByRole('radio', { name: /public/i }));

    expect(onIsPrivateChange).toHaveBeenCalledWith(false);
  });

  it('does not fire when the selected option is clicked again', async () => {
    const onIsPrivateChange = vi.fn();
    const user = userEvent.setup();

    render(
      <CollectionVisibilityToggle
        isPrivate
        onIsPrivateChange={onIsPrivateChange}
      />
    );

    await user.click(screen.getByRole('radio', { name: /private/i }));

    expect(onIsPrivateChange).not.toHaveBeenCalled();
  });
});
