import type { Dispatch, SetStateAction } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SettlementRail } from '@/lib/db/sponsored-activations';
import type { SponsoredActivationFormState } from './form-state';

export type SponsoredActivationFormPanelProps = {
  open: boolean;
  form: SponsoredActivationFormState;
  setForm: Dispatch<SetStateAction<SponsoredActivationFormState>>;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export function SponsoredActivationFormPanel({
  open,
  form,
  setForm,
  isSaving,
  onClose,
  onSubmit,
}: SponsoredActivationFormPanelProps) {
  if (!open) return null;

  const isBase = form.settlement_rail === 'base';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            New sponsored activation
          </h2>
          <button
            type="button"
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="sa-title">Title</Label>
            <Input
              id="sa-title"
              value={form.title}
              onChange={(ev) =>
                setForm((f) => ({ ...f, title: ev.target.value }))
              }
              placeholder="e.g. Public Records drink credit"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sa-sponsor">Sponsor name</Label>
            <Input
              id="sa-sponsor"
              value={form.sponsor_name}
              onChange={(ev) =>
                setForm((f) => ({ ...f, sponsor_name: ev.target.value }))
              }
              placeholder="e.g. Public Records"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sa-event">Event ID (optional)</Label>
            <Input
              id="sa-event"
              value={form.event_id}
              onChange={(ev) =>
                setForm((f) => ({ ...f, event_id: ev.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Settlement rail</Label>
            <Select
              value={form.settlement_rail}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  settlement_rail: v as SettlementRail,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rail" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="base">Base</SelectItem>
                <SelectItem value="stellar">Stellar</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-neutral-500">
              Campaign wallet is provisioned automatically (Privy).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sa-venue">Venue settlement wallet</Label>
            <Input
              id="sa-venue"
              value={form.venue_settlement_wallet_address}
              onChange={(ev) =>
                setForm((f) => ({
                  ...f,
                  venue_settlement_wallet_address: ev.target.value,
                }))
              }
              placeholder={isBase ? '0x…' : 'G…'}
              className="font-mono text-sm"
            />
          </div>
          {!isBase ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="sa-stellar-code">Stellar asset code</Label>
                <Input
                  id="sa-stellar-code"
                  value={form.stellar_asset_code}
                  onChange={(ev) =>
                    setForm((f) => ({
                      ...f,
                      stellar_asset_code: ev.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sa-stellar-issuer">Stellar USDC issuer</Label>
                <Input
                  id="sa-stellar-issuer"
                  value={form.stellar_usdc_issuer}
                  onChange={(ev) =>
                    setForm((f) => ({
                      ...f,
                      stellar_usdc_issuer: ev.target.value,
                    }))
                  }
                  placeholder="G…"
                  className="font-mono text-sm"
                />
              </div>
            </>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sa-max-redemptions">Max redemptions</Label>
              <Input
                id="sa-max-redemptions"
                type="number"
                min={1}
                value={form.max_redemptions}
                onChange={(ev) =>
                  setForm((f) => ({ ...f, max_redemptions: ev.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa-max-budget">Max USDC budget</Label>
              <Input
                id="sa-max-budget"
                type="number"
                min={0}
                step="any"
                value={form.max_usdc_budget}
                onChange={(ev) =>
                  setForm((f) => ({ ...f, max_usdc_budget: ev.target.value }))
                }
                placeholder="Optional"
              />
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            At least one cap (redemptions or budget) is required.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sa-starts">Starts</Label>
              <Input
                id="sa-starts"
                type="datetime-local"
                value={form.starts_at_local}
                onChange={(ev) =>
                  setForm((f) => ({ ...f, starts_at_local: ev.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa-ends">Ends</Label>
              <Input
                id="sa-ends"
                type="datetime-local"
                value={form.ends_at_local}
                onChange={(ev) =>
                  setForm((f) => ({ ...f, ends_at_local: ev.target.value }))
                }
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-black text-white hover:bg-black/85"
            disabled={isSaving}
            onClick={onSubmit}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create activation'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
