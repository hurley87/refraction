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

  it('offers Solana/CADD with a CADD budget, base58 venue input, and SOL fee guidance', async () => {
    const user = userEvent.setup();
    render(<FormHarness />);

    const settlementRailSelect = screen.getAllByRole('combobox')[0]!;
    await user.click(settlementRailSelect);
    await user.click(screen.getByRole('option', { name: 'Solana (CADD)' }));

    expect(settlementRailSelect).toHaveTextContent('Solana (CADD)');
    expect(screen.getByText('Max budget (CADD)')).toBeInTheDocument();
    expect(screen.getByLabelText('Venue settlement wallet')).toHaveAttribute(
      'placeholder',
      'Solana address (base58)'
    );
    expect(
      screen.getByText(/dedicated Solana campaign wallet is provisioned/i)
    ).toHaveTextContent(/CADD plus a small amount of SOL for network fees/);
    expect(screen.queryByText('Payment token')).not.toBeInTheDocument();
  });
});
