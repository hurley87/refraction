import type { Dispatch, SetStateAction } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  const setField =
    <K extends keyof SponsoredActivationFormState>(key: K) =>
    (value: SponsoredActivationFormState[K]) =>
      setForm((f) => ({ ...f, [key]: value }));

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
              onChange={(ev) => setField('title')(ev.target.value)}
              placeholder="e.g. Public Records drink credit"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sa-description">Description (optional)</Label>
            <Textarea
              id="sa-description"
              value={form.description}
              onChange={(ev) => setField('description')(ev.target.value)}
              placeholder="Shown on the activation landing page"
              rows={4}
              maxLength={10000}
              className="resize-y"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sa-sponsor">Sponsor name</Label>
            <Input
              id="sa-sponsor"
              value={form.sponsor_name}
              onChange={(ev) => setField('sponsor_name')(ev.target.value)}
              placeholder="e.g. Public Records"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sa-event">Event ID (optional)</Label>
            <Input
              id="sa-event"
              value={form.event_id}
              onChange={(ev) => setField('event_id')(ev.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Settlement rail</Label>
            <Select
              value={form.settlement_rail}
              onValueChange={(v) => {
                if (v === 'base' || v === 'stellar') {
                  setField('settlement_rail')(v);
                }
              }}
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
              {isBase
                ? 'Campaign wallet is provisioned automatically (Privy).'
                : 'Settlements pay from the shared Stellar campaign wallet configured on the server. Fund that wallet with USDC before going live.'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sa-venue">Venue settlement wallet</Label>
            <Input
              id="sa-venue"
              value={form.venue_settlement_wallet_address}
              onChange={(ev) =>
                setField('venue_settlement_wallet_address')(ev.target.value)
              }
              placeholder={isBase ? '0x…' : 'G…'}
              className="font-mono text-sm"
            />
            {!isBase && (
              <p className="text-xs text-neutral-500">
                Must differ from the shared campaign wallet. USDC settles here
                when guests redeem.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sa-max-redemptions">Max redemptions</Label>
              <Input
                id="sa-max-redemptions"
                type="number"
                min={1}
                value={form.max_redemptions}
                onChange={(ev) => setField('max_redemptions')(ev.target.value)}
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
                onChange={(ev) => setField('max_usdc_budget')(ev.target.value)}
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
                onChange={(ev) => setField('starts_at_local')(ev.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa-ends">Ends</Label>
              <Input
                id="sa-ends"
                type="datetime-local"
                value={form.ends_at_local}
                onChange={(ev) => setField('ends_at_local')(ev.target.value)}
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
