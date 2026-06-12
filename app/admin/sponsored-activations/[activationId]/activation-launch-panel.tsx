'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Loader2,
  Pause,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { balanceUsdcToMicro } from '@/lib/activation/usdc-micro';
import { adminApiAuthHeaders } from '@/lib/admin-api-auth-headers';
import { readApiErrorMessage } from '@/lib/admin/read-api-error-message';
import { unwrapAdminJson } from '@/lib/admin/unwrap-admin-json';
import type {
  SettlementRail,
  SponsoredActivationStatus,
} from '@/lib/db/sponsored-activations';
import {
  sponsoredActivationQrGuestSharePath,
  sponsoredActivationQrGuestShareSourceRefId,
  sponsoredActivationQrGuestShareUrl,
} from '@/lib/sponsored-activation/admin-public-url';

type ActivationAdminRow = {
  id: string;
  slug: string;
  title: string;
  status: SponsoredActivationStatus;
  settlement_rail: SettlementRail;
  campaign_wallet_address: string;
  campaign_wallet_explorer_url: string | null;
  venue_settlement_wallet_address: string;
  venue_settlement_wallet_explorer_url: string | null;
  max_usdc_budget: number | null;
  max_redemptions: number | null;
  campaign_wallet_usdc_balance?: number | null;
  campaign_wallet_reserved_usdc?: number;
};

type RewardItemRow = {
  id: string;
  name: string;
  hero_image_url: string | null;
  points_cost: number;
  usdc_amount: number;
  is_active: boolean;
};

async function uploadActivationHeroImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  const json = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    throw new Error(
      typeof json.error === 'string' ? json.error : 'Failed to upload image'
    );
  }
  const payload = (json.data ?? json) as {
    imageUrl?: string;
    url?: string;
  };
  const imageUrl = payload.imageUrl ?? payload.url;
  if (!imageUrl) {
    throw new Error('Image upload succeeded but no URL was returned');
  }
  return imageUrl;
}

type ActivationLaunchPanelProps = {
  activationId: string;
  getAccessToken: () => Promise<string | null>;
  dashboardQueryKey: readonly ['admin-sponsored-activation-dashboard', string];
};

function fmtUsdcHint(n: number | null): string {
  if (n == null || Number.isNaN(n)) return 'your planned USDC budget';
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtUsdc(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  const rounded = Math.round(n * 1e6) / 1e6;
  return `$${rounded.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })}`;
}

function railLabel(rail: SettlementRail): string {
  return rail === 'base' ? 'Base' : 'Stellar';
}

function usdcAssetHint(rail: SettlementRail): string {
  return rail === 'base' ? 'USDC on Base' : 'USDC on Stellar';
}

function statusUpdateToastLabel(status: SponsoredActivationStatus): string {
  if (status === 'active') return 'Activation is live';
  if (status === 'paused') return 'Activation paused';
  return 'Activation updated';
}

function mutationErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

type RewardItemHeroUploadProps = {
  item: RewardItemRow;
  isRowUploading: boolean;
  onFilePicked: (file: File) => void;
};

function RewardItemHeroUpload({
  item,
  isRowUploading,
  onFilePicked,
}: RewardItemHeroUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  let buttonContent: ReactNode;
  if (isRowUploading) {
    buttonContent = <Loader2 className="size-4 animate-spin" />;
  } else if (item.hero_image_url) {
    buttonContent = 'Replace hero image';
  } else {
    buttonContent = 'Upload hero image';
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      {item.hero_image_url ? (
        <Image
          src={item.hero_image_url}
          alt={`${item.name} hero`}
          width={64}
          height={80}
          className="h-20 w-16 rounded-md border object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-20 w-16 items-center justify-center rounded-md border border-dashed border-neutral-300 text-[10px] text-neutral-500">
          No image
        </div>
      )}
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            onFilePicked(file);
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isRowUploading}
          onClick={() => inputRef.current?.click()}
        >
          {buttonContent}
        </Button>
      </div>
    </div>
  );
}

export function ActivationLaunchPanel({
  activationId,
  getAccessToken,
  dashboardQueryKey,
}: ActivationLaunchPanelProps) {
  const queryClient = useQueryClient();
  const [rewardName, setRewardName] = useState('');
  const [rewardPoints, setRewardPoints] = useState('0');
  const [rewardUsdc, setRewardUsdc] = useState('1');
  const [rewardHeroFile, setRewardHeroFile] = useState<File | null>(null);
  const [withdrawDestination, setWithdrawDestination] = useState('');
  const rewardHeroPreviewUrl = useMemo(
    () => (rewardHeroFile ? URL.createObjectURL(rewardHeroFile) : null),
    [rewardHeroFile]
  );
  useEffect(() => {
    return () => {
      if (rewardHeroPreviewUrl) URL.revokeObjectURL(rewardHeroPreviewUrl);
    };
  }, [rewardHeroPreviewUrl]);
  const rewardHeroInputRef = useRef<HTMLInputElement>(null);

  const activationQueryKey = [
    'admin-sponsored-activation-detail',
    activationId,
  ] as const;
  const rewardItemsQueryKey = [
    'admin-sponsored-activation-reward-items',
    activationId,
  ] as const;

  const { data: activation, isLoading: activationLoading } =
    useQuery<ActivationAdminRow>({
      queryKey: activationQueryKey,
      queryFn: async () => {
        const auth = await adminApiAuthHeaders(getAccessToken);
        const response = await fetch(
          `/api/admin/sponsored-activations/${encodeURIComponent(activationId)}`,
          { headers: auth }
        );
        const json = await response.json();
        if (!response.ok) {
          throw new Error(
            readApiErrorMessage(
              json as Record<string, unknown>,
              'Failed to load activation'
            )
          );
        }
        const payload = unwrapAdminJson<{ activation: ActivationAdminRow }>(
          json
        );
        if (!payload.activation) throw new Error('Invalid activation response');
        return payload.activation;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    });

  const { data: rewardItems = [], isLoading: itemsLoading } = useQuery<
    RewardItemRow[]
  >({
    queryKey: rewardItemsQueryKey,
    queryFn: async () => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch(
        `/api/admin/sponsored-activations/${encodeURIComponent(activationId)}/reward-items`,
        { headers: auth }
      );
      const json = await response.json();
      if (!response.ok) {
        throw new Error(
          readApiErrorMessage(
            json as Record<string, unknown>,
            'Failed to load reward items'
          )
        );
      }
      const payload = unwrapAdminJson<{ rewardItems: RewardItemRow[] }>(json);
      return payload.rewardItems ?? [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const activeRewardCount = rewardItems.filter((i) => i.is_active).length;

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: activationQueryKey }),
      queryClient.invalidateQueries({ queryKey: rewardItemsQueryKey }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKey }),
    ]);
  };

  const patchStatusMutation = useMutation({
    mutationFn: async (status: SponsoredActivationStatus) => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch(
        `/api/admin/sponsored-activations/${encodeURIComponent(activationId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...auth },
          body: JSON.stringify({ status }),
        }
      );
      const body = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        throw new Error(readApiErrorMessage(body, 'Update failed'));
      }
      return body;
    },
    onSuccess: async (_data, status) => {
      toast.success(statusUpdateToastLabel(status));
      await invalidateAll();
    },
    onError: (e: unknown) => toast.error(mutationErrorMessage(e)),
  });

  const patchRewardHeroMutation = useMutation({
    mutationFn: async (input: { itemId: string; file: File }) => {
      const heroImageUrl = await uploadActivationHeroImage(input.file);
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch(
        `/api/admin/sponsored-activations/${encodeURIComponent(activationId)}/reward-items/${encodeURIComponent(input.itemId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...auth },
          body: JSON.stringify({ hero_image_url: heroImageUrl }),
        }
      );
      const body = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        throw new Error(
          readApiErrorMessage(body, 'Could not update hero image')
        );
      }
      return body;
    },
    onSuccess: async () => {
      toast.success('Hero image updated');
      await invalidateAll();
    },
    onError: (e: unknown) => toast.error(mutationErrorMessage(e)),
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const trimmed = withdrawDestination.trim();
      if (!trimmed) throw new Error('Refund address is required');
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch(
        `/api/admin/sponsored-activations/${encodeURIComponent(activationId)}/campaign-wallet/withdraw`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...auth },
          body: JSON.stringify({ destinationAddress: trimmed }),
        }
      );
      const body = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        throw new Error(readApiErrorMessage(body, 'Withdrawal failed'));
      }
      return body;
    },
    onSuccess: async () => {
      toast.success('Campaign wallet withdrawal submitted');
      setWithdrawDestination('');
      await queryClient.invalidateQueries({ queryKey: activationQueryKey });
    },
    onError: (e: unknown) => toast.error(mutationErrorMessage(e)),
  });

  const createRewardMutation = useMutation({
    mutationFn: async () => {
      const points = Number(rewardPoints);
      const usdc = Number(rewardUsdc);
      if (!rewardName.trim()) throw new Error('Reward name is required');
      if (!Number.isFinite(points) || points < 0) {
        throw new Error('Points must be zero or greater');
      }
      if (!Number.isFinite(usdc) || usdc <= 0) {
        throw new Error('USDC amount must be greater than zero');
      }
      const heroImageUrl = rewardHeroFile
        ? await uploadActivationHeroImage(rewardHeroFile)
        : null;
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch(
        `/api/admin/sponsored-activations/${encodeURIComponent(activationId)}/reward-items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...auth },
          body: JSON.stringify({
            name: rewardName.trim(),
            points_cost: points,
            usdc_amount: usdc,
            is_active: true,
            hero_image_url: heroImageUrl,
          }),
        }
      );
      const body = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        throw new Error(readApiErrorMessage(body, 'Could not create reward'));
      }
      return body;
    },
    onSuccess: async () => {
      toast.success('Reward added');
      setRewardName('');
      setRewardHeroFile(null);
      if (rewardHeroInputRef.current) {
        rewardHeroInputRef.current.value = '';
      }
      await invalidateAll();
    },
    onError: (e: unknown) => toast.error(mutationErrorMessage(e)),
  });

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  if (activationLoading || itemsLoading || !activation) {
    return (
      <section className="mb-8 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
        <Loader2 className="size-4 animate-spin" />
        Loading launch checklist…
      </section>
    );
  }

  const activationKey = activation.slug || activation.id;
  const qrGuestShareSourceRefId =
    sponsoredActivationQrGuestShareSourceRefId(activation);
  const guestShareUrl =
    typeof window !== 'undefined'
      ? sponsoredActivationQrGuestShareUrl(
          activationKey,
          window.location.origin,
          qrGuestShareSourceRefId
        )
      : '';

  const hasActiveReward = activeRewardCount > 0;
  const isDraft = activation.status === 'draft';
  const isLive = activation.status === 'active';
  const isPaused = activation.status === 'paused';
  const canGoLive = isDraft && hasActiveReward;

  let liveStepBody: string;
  if (isDraft) {
    liveStepBody =
      'While status is Draft, the public link shows the activation as unavailable.';
  } else if (isPaused) {
    liveStepBody = 'Paused activations are hidden from new redemptions.';
  } else {
    liveStepBody = 'This activation is live for eligible guests.';
  }

  const steps = [
    {
      id: 'reward',
      done: hasActiveReward,
      title: 'Add at least one active reward',
      body: hasActiveReward
        ? `${activeRewardCount} active reward${activeRewardCount === 1 ? '' : 's'} configured.`
        : 'Users need a reward (name, points cost, USDC payout) before the activation can go live.',
    },
    {
      id: 'fund',
      done: false,
      title: `Fund the campaign wallet (${usdcAssetHint(activation.settlement_rail)})`,
      body:
        activation.settlement_rail === 'stellar'
          ? `Fund the shared Stellar campaign wallet below with ${fmtUsdcHint(activation.max_usdc_budget)} or more USDC. All Stellar activations settle from this wallet.`
          : `Send ${fmtUsdcHint(activation.max_usdc_budget)} or more to the campaign wallet below. Settlements pull from this wallet when guests redeem.`,
    },
    {
      id: 'live',
      done: isLive || isPaused,
      title: 'Set status to Active',
      body: liveStepBody,
    },
    {
      id: 'share',
      done: isLive,
      title: 'Share the guest link',
      body: 'Send this URL (not the admin dashboard URL). It includes QR check-in params (?source=qr_scan&source_ref_id); source_ref_id is this activation’s name (title), or slug/id if the title is blank.',
    },
  ];

  return (
    <section className="mb-8 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Launch checklist
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
            Draft activations are admin-only until you add a reward, fund the
            campaign wallet, and set status to Active.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <Button
              type="button"
              className="gap-1 bg-emerald-700 text-white hover:bg-emerald-800"
              disabled={!canGoLive || patchStatusMutation.isPending}
              onClick={() => patchStatusMutation.mutate('active')}
            >
              {patchStatusMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              Go live
            </Button>
          )}
          {isLive && (
            <Button
              type="button"
              variant="outline"
              className="gap-1"
              disabled={patchStatusMutation.isPending}
              onClick={() => patchStatusMutation.mutate('paused')}
            >
              <Pause className="size-4" />
              Pause
            </Button>
          )}
          {isPaused && (
            <Button
              type="button"
              className="gap-1 bg-emerald-700 text-white hover:bg-emerald-800"
              disabled={patchStatusMutation.isPending}
              onClick={() => patchStatusMutation.mutate('active')}
            >
              <Play className="size-4" />
              Resume
            </Button>
          )}
          {guestShareUrl && (
            <Button
              type="button"
              variant="outline"
              className="gap-1"
              onClick={() => void copyText(guestShareUrl, 'Guest link copied')}
            >
              <Copy className="size-3.5" />
              Copy guest link
            </Button>
          )}
        </div>
      </div>

      {!canGoLive && isDraft && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Add an active reward before going live.
          {activation.max_usdc_budget != null && (
            <>
              {' '}
              Planned budget cap: {fmtUsdcHint(activation.max_usdc_budget)} (
              {activation.max_redemptions ?? '∞'} max redemptions).
            </>
          )}
        </p>
      )}

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="mt-0.5 shrink-0">
              {step.done ? (
                <CheckCircle2 className="size-5 text-emerald-600" />
              ) : (
                <Circle className="size-5 text-neutral-300 dark:text-neutral-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {index + 1}. {step.title}
              </div>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {step.body}
              </p>

              {step.id === 'reward' && (
                <div className="mt-3 space-y-3">
                  {rewardItems.length > 0 && (
                    <ul className="space-y-3 text-xs text-neutral-700 dark:text-neutral-300">
                      {rewardItems.map((item) => (
                        <li
                          key={item.id}
                          className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
                        >
                          <div>
                            <span className="font-medium">{item.name}</span>
                            {' · '}
                            {item.points_cost} pts · ${item.usdc_amount} USDC
                            {!item.is_active && (
                              <span className="text-amber-700">
                                {' '}
                                (inactive)
                              </span>
                            )}
                          </div>
                          <RewardItemHeroUpload
                            item={item}
                            isRowUploading={
                              patchRewardHeroMutation.isPending &&
                              patchRewardHeroMutation.variables?.itemId ===
                                item.id
                            }
                            onFilePicked={(file) =>
                              patchRewardHeroMutation.mutate({
                                itemId: item.id,
                                file,
                              })
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                  {isDraft && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1 sm:col-span-1">
                        <Label htmlFor="launch-reward-name">Reward name</Label>
                        <Input
                          id="launch-reward-name"
                          value={rewardName}
                          onChange={(e) => setRewardName(e.target.value)}
                          placeholder="e.g. Drink credit"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="launch-reward-points">
                          Points cost
                        </Label>
                        <Input
                          id="launch-reward-points"
                          type="number"
                          min={0}
                          value={rewardPoints}
                          onChange={(e) => setRewardPoints(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="launch-reward-usdc">USDC payout</Label>
                        <Input
                          id="launch-reward-usdc"
                          type="number"
                          min={0}
                          step="any"
                          value={rewardUsdc}
                          onChange={(e) => setRewardUsdc(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-3">
                        <Label htmlFor="launch-reward-hero">Hero image</Label>
                        <Input
                          ref={rewardHeroInputRef}
                          id="launch-reward-hero"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setRewardHeroFile(file);
                          }}
                        />
                        {rewardHeroPreviewUrl && (
                          <Image
                            src={rewardHeroPreviewUrl}
                            alt="Hero preview"
                            width={120}
                            height={150}
                            className="mt-2 h-[150px] w-[120px] rounded-md border object-cover"
                            unoptimized
                          />
                        )}
                      </div>
                      <div className="sm:col-span-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={createRewardMutation.isPending}
                          onClick={() => createRewardMutation.mutate()}
                        >
                          {createRewardMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            'Add reward'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step.id === 'fund' && (
                <div className="mt-3 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <code className="block max-w-full break-all rounded-lg bg-neutral-50 p-2 font-mono text-xs text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
                      {activation.campaign_wallet_address}
                    </code>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() =>
                          void copyText(
                            activation.campaign_wallet_address,
                            'Campaign wallet copied'
                          )
                        }
                      >
                        <Copy className="size-3.5" />
                        Copy wallet
                      </Button>
                      {activation.campaign_wallet_explorer_url && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          asChild
                        >
                          <a
                            href={activation.campaign_wallet_explorer_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View on {railLabel(activation.settlement_rail)}
                            <ExternalLink className="size-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                    <p className="w-full text-xs text-neutral-500">
                      {activation.settlement_rail === 'stellar'
                        ? 'Shared Stellar campaign wallet (server-configured). Fund with USDC before redemptions settle.'
                        : 'Send funds here (campaign wallet, provisioned via Privy).'}{' '}
                      Redemptions settle USDC to the venue wallet{' '}
                      <span className="font-mono text-[11px]">
                        {activation.venue_settlement_wallet_address}
                      </span>
                      {activation.venue_settlement_wallet_explorer_url ? (
                        <>
                          {' '}
                          (
                          <a
                            href={
                              activation.venue_settlement_wallet_explorer_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 hover:underline dark:text-blue-400"
                          >
                            venue explorer
                          </a>
                          )
                        </>
                      ) : null}
                      .
                    </p>
                  </div>

                  <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
                    <div className="text-sm">
                      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        USDC balance
                      </div>
                      <div className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">
                        {fmtUsdc(activation.campaign_wallet_usdc_balance)}
                      </div>
                      {(activation.campaign_wallet_reserved_usdc ?? 0) > 0 && (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                          {fmtUsdc(activation.campaign_wallet_reserved_usdc)} is
                          earmarked for pending redemptions or settlements.
                          Withdrawal includes this balance; in-flight
                          settlements may fail afterward.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-3 sm:gap-y-1.5">
                        <Label
                          htmlFor="campaign-withdraw-destination"
                          className="order-1 text-neutral-500 sm:col-start-1 sm:row-start-1"
                        >
                          Refund to address
                        </Label>
                        <Input
                          id="campaign-withdraw-destination"
                          type="text"
                          placeholder={
                            activation.settlement_rail === 'base' ? '0x…' : 'G…'
                          }
                          autoComplete="off"
                          spellCheck={false}
                          value={withdrawDestination}
                          onChange={(e) =>
                            setWithdrawDestination(e.target.value)
                          }
                          disabled={withdrawMutation.isPending}
                          className="order-2 w-full font-mono text-xs sm:col-start-1 sm:row-start-2"
                        />
                        <p className="order-3 text-xs text-neutral-500 sm:col-start-1 sm:row-start-3">
                          Withdraws the full on-chain USDC balance to the
                          address above, including funds earmarked for pending
                          activity.
                          {activation.settlement_rail === 'base'
                            ? ' Gas is sponsored on Base.'
                            : ' Stellar uses the shared campaign wallet; confirm the destination before sending.'}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="order-4 w-full shrink-0 whitespace-nowrap sm:order-none sm:col-start-2 sm:row-start-2 sm:w-auto sm:self-end"
                          disabled={
                            withdrawMutation.isPending ||
                            !withdrawDestination.trim() ||
                            activation.campaign_wallet_usdc_balance == null ||
                            balanceUsdcToMicro(
                              activation.campaign_wallet_usdc_balance
                            ) <= 0
                          }
                          onClick={() => withdrawMutation.mutate()}
                        >
                          {withdrawMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 size-4 animate-spin" />
                              Withdrawing…
                            </>
                          ) : (
                            'Withdraw USDC'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step.id === 'share' && guestShareUrl && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code className="block max-w-full flex-1 break-all rounded-lg bg-neutral-50 p-2 text-xs text-blue-800 dark:bg-neutral-950 dark:text-blue-300">
                    {guestShareUrl}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() =>
                      void copyText(guestShareUrl, 'Guest link copied')
                    }
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </Button>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <Link
                      href={sponsoredActivationQrGuestSharePath(
                        activationKey,
                        qrGuestShareSourceRefId
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Preview
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
