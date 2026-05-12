import type { Dispatch, ReactNode, SetStateAction } from 'react';
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
import type { SpendExperience, SpendExperienceStatus } from '@/lib/types';
import type { SpendRailCatalogEntry } from '@/lib/spend-rail-config/types';
import type { SpendExperienceFormState } from './form-state';

export type SpendExperienceFormPanelProps = {
  open: boolean;
  editing: SpendExperience | null;
  form: SpendExperienceFormState;
  setForm: Dispatch<SetStateAction<SpendExperienceFormState>>;
  railCatalog: SpendRailCatalogEntry[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

function panelTitle(editing: SpendExperience | null): string {
  if (editing) return 'Edit spend experience';
  return 'New spend experience';
}

function submitButtonContent(
  isSaving: boolean,
  editing: SpendExperience | null
): ReactNode {
  if (isSaving) {
    return (
      <>
        <Loader2 className="mr-2 size-4 animate-spin" />
        Saving…
      </>
    );
  }
  if (editing) return 'Save changes';
  return 'Create';
}

export function SpendExperienceFormPanel({
  open,
  editing,
  form,
  setForm,
  railCatalog,
  isSaving,
  onClose,
  onSubmit,
}: SpendExperienceFormPanelProps) {
  if (!open) return null;

  const selectedCatalogRow = editing
    ? railCatalog.find((r) => r.rail === editing.spend_rail)
    : railCatalog.find((r) => r.rail === form.spend_rail);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#171717]">
            {panelTitle(editing)}
          </h2>
          <button
            type="button"
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="se-title">Title</Label>
            <Input
              id="se-title"
              value={form.title}
              onChange={(ev) =>
                setForm((f) => ({ ...f, title: ev.target.value }))
              }
              placeholder="e.g. Spring launch pilot"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="se-desc">Description</Label>
            <Textarea
              id="se-desc"
              className="min-h-[88px]"
              value={form.description}
              onChange={(ev) =>
                setForm((f) => ({ ...f, description: ev.target.value }))
              }
              placeholder="Shown in the spend flow"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="se-event">Event ID (optional)</Label>
            <Input
              id="se-event"
              value={form.event_id}
              onChange={(ev) =>
                setForm((f) => ({ ...f, event_id: ev.target.value }))
              }
              placeholder="External event id if linked"
            />
          </div>
          {!editing && (
            <div className="space-y-2">
              <Label>Payment network</Label>
              {railCatalog.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Loading payment networks…
                </p>
              ) : (
                <Select
                  value={form.spend_rail}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      spend_rail: v as SpendExperienceFormState['spend_rail'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {railCatalog.map((row) => (
                      <SelectItem
                        key={row.rail}
                        value={row.rail}
                        disabled={!row.allowsNewSpendWork}
                      >
                        {row.displayName} — {row.networkLabel} ·{' '}
                        {row.assetSymbol}
                        {!row.allowsNewSpendWork ? ' (unavailable)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedCatalogRow && !selectedCatalogRow.allowsNewSpendWork && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  <p className="font-medium">This network is not ready</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {selectedCatalogRow.adminUnavailableReasons.map(
                      (reason) => (
                        <li key={reason}>{reason}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
          {editing && selectedCatalogRow && (
            <div className="space-y-2">
              <Label>Payment network</Label>
              <p className="text-sm text-neutral-700">
                {selectedCatalogRow.displayName} —{' '}
                {selectedCatalogRow.networkLabel} ·{' '}
                {selectedCatalogRow.assetSymbol}
              </p>
              {!selectedCatalogRow.allowsNewSpendWork && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  <p className="font-medium">Operational issues detected</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {selectedCatalogRow.adminUnavailableReasons.map(
                      (reason) => (
                        <li key={reason}>{reason}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
          {(selectedCatalogRow?.receivingWalletAddress ?? '') !== '' && (
            <div className="space-y-2">
              <Label>Receiving wallet (read-only)</Label>
              <Input
                readOnly
                className="font-mono text-xs"
                value={selectedCatalogRow?.receivingWalletAddress ?? ''}
              />
              <p className="text-xs text-neutral-500">
                Global settlement address for this payment network. Shown for
                verification only.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  status: v as SpendExperienceStatus,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="se-rate">Points per $1 USDC</Label>
              <Input
                id="se-rate"
                type="number"
                min={1}
                step={1}
                value={form.points_to_usdc_rate}
                onChange={(ev) =>
                  setForm((f) => ({
                    ...f,
                    points_to_usdc_rate: ev.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="se-max">Max USDC per user</Label>
              <Input
                id="se-max"
                type="number"
                min={0}
                step="any"
                value={form.max_usdc_per_user}
                onChange={(ev) =>
                  setForm((f) => ({
                    ...f,
                    max_usdc_per_user: ev.target.value,
                  }))
                }
              />
            </div>
          </div>
          {editing?.server_wallet_address && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm">
              <div className="font-medium text-blue-950">
                Privy server wallet
              </div>
              <p className="mt-1 text-blue-900">
                Backend-managed on Base. Admins do not edit wallet addresses.
              </p>
              <code className="mt-2 block break-all text-xs text-blue-950">
                {editing.server_wallet_address}
              </code>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="se-start">Start (local)</Label>
              <Input
                id="se-start"
                type="datetime-local"
                value={form.start_time_local}
                onChange={(ev) =>
                  setForm((f) => ({
                    ...f,
                    start_time_local: ev.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="se-end">End (local)</Label>
              <Input
                id="se-end"
                type="datetime-local"
                value={form.end_time_local}
                onChange={(ev) =>
                  setForm((f) => ({
                    ...f,
                    end_time_local: ev.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={isSaving} onClick={() => onSubmit()}>
            {submitButtonContent(isSaving, editing)}
          </Button>
        </div>
      </div>
    </div>
  );
}
