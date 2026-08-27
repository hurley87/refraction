import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListDescriptionEditor } from '../list-description-editor';

describe('ListDescriptionEditor', () => {
  it('lets the owner add a description', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <ListDescriptionEditor
        description={null}
        isSaving={false}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add description' }));
    await user.type(
      screen.getByPlaceholderText('What is this collection about?'),
      'Late-night Berlin bars'
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith('Late-night Berlin bars');
  });

  it('lets the owner edit an existing description', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <ListDescriptionEditor
        description="Old blurb"
        isSaving={false}
        onSave={onSave}
      />
    );

    expect(screen.getByText('Old blurb')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Edit description' }));
    const field = screen.getByPlaceholderText('What is this collection about?');
    await user.clear(field);
    await user.type(field, 'New blurb');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith('New blurb');
  });

  it('does not save when the description is unchanged', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(
      <ListDescriptionEditor
        description="Same blurb"
        isSaving={false}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Edit description' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Edit description' })
    ).toBeTruthy();
  });

  it('clears a description when saved empty', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <ListDescriptionEditor
        description="Old blurb"
        isSaving={false}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Edit description' }));
    await user.clear(
      screen.getByPlaceholderText('What is this collection about?')
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(null);
  });
});
