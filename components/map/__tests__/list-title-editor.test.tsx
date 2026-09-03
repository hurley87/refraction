import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListTitleEditor } from '../list-title-editor';

describe('ListTitleEditor', () => {
  it('lets the owner rename a list', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <ListTitleEditor title="Old name" isSaving={false} onSave={onSave} />
    );

    expect(screen.getByRole('heading', { name: 'Old name' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Rename' }));
    const field = screen.getByPlaceholderText('List name');
    await user.clear(field);
    await user.type(field, 'New name');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith('New name');
  });

  it('does not save when the title is unchanged', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(
      <ListTitleEditor title="Same name" isSaving={false} onSave={onSave} />
    );

    await user.click(screen.getByRole('button', { name: 'Rename' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Rename' })).toBeTruthy();
  });

  it('blocks saving an empty title', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(
      <ListTitleEditor title="Keep me" isSaving={false} onSave={onSave} />
    );

    await user.click(screen.getByRole('button', { name: 'Rename' }));
    await user.clear(screen.getByPlaceholderText('List name'));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
