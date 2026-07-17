import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  emptySponsoredActivationForm,
  type SponsoredActivationFormState,
} from './form-state';
import { SponsoredActivationFormPanel } from './sponsored-activation-form-panel';

beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

function FormHarness() {
  const [form, setForm] = useState<SponsoredActivationFormState>(
    emptySponsoredActivationForm()
  );
  return (
    <SponsoredActivationFormPanel
      open
      form={form}
      setForm={setForm}
      isSaving={false}
      onClose={vi.fn()}
      onSubmit={vi.fn()}
    />
  );
}

describe('SponsoredActivationFormPanel settlement rails', () => {
  it('offers Tempo and switches the form to its CADD configuration', async () => {
    const user = userEvent.setup();
    render(<FormHarness />);

    const settlementRailSelect = screen.getAllByRole('combobox')[0]!;
    await user.click(settlementRailSelect);
    await user.click(screen.getByRole('option', { name: 'Tempo' }));

    expect(settlementRailSelect).toHaveTextContent('Tempo');
    expect(screen.getByText('Max budget (CADD)')).toBeInTheDocument();
    expect(
      screen.getByText('Campaign wallet is provisioned automatically (Privy).')
    ).toBeInTheDocument();
  });
});
