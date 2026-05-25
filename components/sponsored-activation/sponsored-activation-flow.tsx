'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SponsoredActivationPageShell } from '@/components/sponsored-activation/sponsored-activation-page-shell';
import { SponsoredActivationConfirm } from '@/components/sponsored-activation/sponsored-activation-confirm';
import { SponsoredActivationSuccess } from '@/components/sponsored-activation/sponsored-activation-success';
import { SponsoredActivationSwipeSlider } from '@/components/sponsored-activation/sponsored-activation-swipe-slider';
import { SponsoredActivationRedeemed } from '@/components/sponsored-activation/sponsored-activation-redeemed';
import { SponsoredActivationExpired } from '@/components/sponsored-activation/sponsored-activation-expired';
import { SponsoredActivationCancelled } from '@/components/sponsored-activation/sponsored-activation-cancelled';
import { SpendPrimaryButton } from '@/components/spend/spend-primary-button';
import { useCurrentPlayer } from '@/hooks/usePlayer';
import { useTiers } from '@/hooks/useTiers';
import type { ActivationRedemptionRow } from '@/lib/db/activation-redemptions';
import { apiClient, ApiError } from '@/lib/api/client';
import {
  apiClientBearerGet,
  apiClientBearerPost,
} from '@/lib/api/privy-bearer-client';
import { parseSponsoredActivationEligibilityDeeplink } from '@/lib/sponsored-activation/eligibility-deeplink';
import {
  isRedeemedLikeStatus,
  isSwipeAllowedForStatus,
  pickPrimaryActivationRedemption,
  resolveSponsoredActivationBaseScreen,
} from '@/lib/sponsored-activation/flow-routing';
import type { SponsoredActivationPublicReadResponse } from '@/lib/sponsored-activation/public-read';
import { resolveTierTitleForPoints } from '@/lib/sponsored-activation/tier-label';
import {
  isInitialized,
  trackSponsoredActivationViewed,
  trackSponsoredRedemptionConfirmViewed,
  trackSponsoredRedemptionSwipeStarted,
  waitForInitialization,
} from '@/lib/analytics';

type EligibilityPostResponse = {
  eligibilityEvent: { id: string; activation_id: string };
  redemptions: ActivationRedemptionRow[];
  eligible: boolean;
};

type EligibilityGetResponse = {
  redemptions: ActivationRedemptionRow[];
};

type ConfirmPurchaseResponse = {
  redemption: ActivationRedemptionRow;
  player: { total_points: number };
};

type SwipeRedeemResponse = {
  redemption: ActivationRedemptionRow;
};

type SponsoredActivationFlowProps = {
  activationKey: string;
  source: string | null;
  sourceRefId: string | null;
};

export function SponsoredActivationFlow({
  activationKey,
  source,
  sourceRefId,
}: SponsoredActivationFlowProps) {
  const { user, login, getAccessToken } = usePrivy();
  const walletAddress = user?.wallet?.address ?? null;
  const accountEmail = user?.email?.address ?? null;
  const queryClient = useQueryClient();

  const { data: player, isFetched: playerDetailsFetched } = useCurrentPlayer();
  const { data: tiers } = useTiers();

  const [venueStep, setVenueStep] = useState<'success' | 'swipe'>('success');
  const [redemptionOverride, setRedemptionOverride] =
    useState<ActivationRedemptionRow | null>(null);
  const [swipeSliderKey, setSwipeSliderKey] = useState(0);

  const activationViewEmittedRef = useRef(false);
  const confirmScreenEmittedRef = useRef(false);
  const swipeGestureReportedRef = useRef(false);

  const deeplink = useMemo(
    () => parseSponsoredActivationEligibilityDeeplink(source, sourceRefId),
    [source, sourceRefId]
  );

  useEffect(() => {
    setVenueStep('success');
    setRedemptionOverride(null);
    activationViewEmittedRef.current = false;
    confirmScreenEmittedRef.current = false;
    swipeGestureReportedRef.current = false;
  }, [activationKey]);

  useEffect(() => {
    swipeGestureReportedRef.current = false;
  }, [swipeSliderKey]);

  const readQuery = useQuery({
    queryKey: ['sponsored-activation-read', activationKey] as const,
    queryFn: () =>
      apiClient<SponsoredActivationPublicReadResponse>(
        `/api/sponsored-activations/${encodeURIComponent(activationKey)}`
      ),
    enabled: Boolean(activationKey),
  });

  const recordEligibility = useMutation({
    mutationFn: async (input: {
      walletAddress: string;
      source: 'qr_scan' | 'checkpoint_checkin';
      sourceRefId: string;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Missing auth');
      return apiClientBearerPost<EligibilityPostResponse>(
        token,
        `/api/sponsored-activations/${encodeURIComponent(activationKey)}/eligibility`,
        {
          walletAddress: input.walletAddress,
          source: input.source,
          source_ref_id: input.sourceRefId,
        }
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['sponsored-activation-eligibility-get', activationKey],
      });
    },
  });

  useEffect(() => {
    if (!deeplink || !user || !walletAddress || !readQuery.isSuccess) return;
    if (
      recordEligibility.isPending ||
      recordEligibility.isSuccess ||
      recordEligibility.isError
    ) {
      return;
    }
    recordEligibility.mutate({
      walletAddress,
      source: deeplink.source,
      sourceRefId: deeplink.sourceRefId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid depending on the full mutation object
  }, [
    deeplink,
    user,
    walletAddress,
    readQuery.isSuccess,
    recordEligibility.isPending,
    recordEligibility.isSuccess,
    recordEligibility.isError,
    recordEligibility.mutate,
  ]);

  const resumeEligibility = useQuery({
    queryKey: [
      'sponsored-activation-eligibility-get',
      activationKey,
      walletAddress,
    ] as const,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token || !walletAddress) throw new Error('Missing auth');
      return apiClientBearerGet<EligibilityGetResponse>(
        token,
        `/api/sponsored-activations/${encodeURIComponent(activationKey)}/eligibility?walletAddress=${encodeURIComponent(walletAddress)}`
      );
    },
    enabled: Boolean(user && walletAddress && readQuery.isSuccess),
    retry: false,
  });

  const eligibilityResumeReady =
    !readQuery.isSuccess || !walletAddress || resumeEligibility.isFetched;

  const playerIdentityReady = !walletAddress || playerDetailsFetched;

  const activationViewReady =
    readQuery.isSuccess &&
    Boolean(readQuery.data) &&
    eligibilityResumeReady &&
    playerIdentityReady;

  useEffect(() => {
    if (!activationViewReady || !readQuery.data) return;
    if (activationViewEmittedRef.current) return;
    activationViewEmittedRef.current = true;
    const snapshot = readQuery.data;
    void waitForInitialization().then(() => {
      if (!isInitialized()) return;
      trackSponsoredActivationViewed({
        activation_id: snapshot.activation.id,
        settlement_rail: snapshot.activation.settlement_rail,
        user_id: player?.id,
        reward_item_id: snapshot.rewardItem.id,
      });
    });
  }, [activationViewReady, readQuery.data, player?.id]);

  const redemptionsFromServer = useMemo(() => {
    const fromGet = resumeEligibility.data?.redemptions ?? [];
    const fromPost = recordEligibility.data?.redemptions ?? [];
    const byId = new Map<string, ActivationRedemptionRow>();
    for (const row of fromGet) {
      byId.set(row.id, row);
    }
    for (const row of fromPost) {
      byId.set(row.id, row);
    }
    return Array.from(byId.values());
  }, [recordEligibility.data, resumeEligibility.data]);

  const rewardItemId = readQuery.data?.rewardItem.id;

  const pickedRedemption = useMemo(() => {
    if (!rewardItemId) return null;
    return pickPrimaryActivationRedemption(redemptionsFromServer, rewardItemId);
  }, [redemptionsFromServer, rewardItemId]);

  const redemption = redemptionOverride ?? pickedRedemption;

  const baseScreen = resolveSponsoredActivationBaseScreen(redemption?.status);

  useEffect(() => {
    if (baseScreen !== 'confirm' || !readQuery.data) return;
    if (confirmScreenEmittedRef.current) return;
    confirmScreenEmittedRef.current = true;
    const snapshot = readQuery.data;
    void waitForInitialization().then(() => {
      if (!isInitialized()) return;
      trackSponsoredRedemptionConfirmViewed({
        activation_id: snapshot.activation.id,
        settlement_rail: snapshot.activation.settlement_rail,
        user_id: player?.id,
        reward_item_id: snapshot.rewardItem.id,
        redemption_id: redemption?.id,
      });
    });
  }, [baseScreen, readQuery.data, redemption?.id, player?.id]);

  const confirmMutation = useMutation({
    mutationFn: async (redemptionId: string) => {
      const token = await getAccessToken();
      if (!token || !walletAddress) throw new Error('Missing auth');
      return apiClientBearerPost<ConfirmPurchaseResponse>(
        token,
        `/api/sponsored-activations/${encodeURIComponent(activationKey)}/confirm-purchase`,
        { walletAddress, redemptionId }
      );
    },
    onSuccess: (data) => {
      setRedemptionOverride(data.redemption);
      setVenueStep('success');
      void queryClient.invalidateQueries({
        queryKey: ['sponsored-activation-eligibility-get', activationKey],
      });
      if (data.redemption.status === 'ready_to_redeem') {
        toast.success('Purchase confirmed');
      }
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
    },
  });

  const swipeMutation = useMutation({
    mutationFn: async (redemptionId: string) => {
      const token = await getAccessToken();
      if (!token || !walletAddress) throw new Error('Missing auth');
      return apiClientBearerPost<SwipeRedeemResponse>(
        token,
        `/api/sponsored-activations/${encodeURIComponent(activationKey)}/swipe-redeem`,
        { walletAddress, redemptionId }
      );
    },
    onSuccess: (data) => {
      setRedemptionOverride(data.redemption);
      void queryClient.invalidateQueries({
        queryKey: ['sponsored-activation-eligibility-get', activationKey],
      });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 400) {
        const details = err.details as
          | { redemption?: ActivationRedemptionRow }
          | undefined;
        if (details?.redemption) {
          setRedemptionOverride(details.redemption);
          if (details.redemption.status === 'expired') {
            toast.error(err.message);
            return;
          }
        }
      }
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
      setSwipeSliderKey((k) => k + 1);
    },
  });

  const handleSwipeComplete = useCallback(() => {
    if (!redemption?.id || swipeMutation.isPending) return;
    if (!isSwipeAllowedForStatus(redemption.status)) return;
    swipeMutation.mutate(redemption.id);
  }, [redemption, swipeMutation]);

  const handleSwipeGestureStart = useCallback(() => {
    if (!readQuery.data || swipeGestureReportedRef.current) return;
    swipeGestureReportedRef.current = true;
    const read = readQuery.data;
    void waitForInitialization().then(() => {
      if (!isInitialized()) return;
      trackSponsoredRedemptionSwipeStarted({
        activation_id: read.activation.id,
        settlement_rail: read.activation.settlement_rail,
        user_id: player?.id,
        reward_item_id: read.rewardItem.id,
        redemption_id: redemption?.id,
      });
    });
  }, [readQuery.data, player?.id, redemption?.id]);

  const balanceAfterPoints =
    confirmMutation.data?.player.total_points ?? player?.total_points ?? 0;
  const pointsSpent =
    redemption?.points_spent ?? readQuery.data?.rewardItem.points_cost ?? 0;
  const tierTitle = resolveTierTitleForPoints(tiers, balanceAfterPoints);

  const recordFlowLoading =
    Boolean(deeplink) &&
    !recordEligibility.isSuccess &&
    !recordEligibility.isError;

  const resumeFlowLoading =
    Boolean(user && walletAddress && readQuery.isSuccess) &&
    resumeEligibility.isLoading;

  const eligibilityLoading =
    Boolean(user && walletAddress && readQuery.isSuccess) &&
    (recordFlowLoading || resumeFlowLoading);

  if (readQuery.isLoading) {
    return (
      <SponsoredActivationPageShell showCard={false}>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-white/60" aria-hidden />
        </div>
      </SponsoredActivationPageShell>
    );
  }

  if (readQuery.error || !readQuery.data) {
    return (
      <SponsoredActivationPageShell>
        <p className="body-medium font-grotesk p-6 text-center text-white/80">
          This activation link is not available.
        </p>
      </SponsoredActivationPageShell>
    );
  }

  const read = readQuery.data;

  if (!user) {
    return (
      <SponsoredActivationPageShell>
        <div className="flex flex-col gap-6 p-6">
          <h1 className="title2 text-white">{read.activation.title}</h1>
          <p className="body-medium font-grotesk text-white/70">
            Log in to continue with this activation.
          </p>
          <SpendPrimaryButton onClick={login}>
            Log in to continue
          </SpendPrimaryButton>
        </div>
      </SponsoredActivationPageShell>
    );
  }

  if (!walletAddress) {
    return (
      <SponsoredActivationPageShell>
        <p className="body-medium font-grotesk p-6 text-center text-white/80">
          A wallet is required on your IRL account to use this activation.
        </p>
      </SponsoredActivationPageShell>
    );
  }

  if (eligibilityLoading) {
    return (
      <SponsoredActivationPageShell showCard={false}>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
          <Loader2 className="size-8 animate-spin text-white/60" aria-hidden />
          <p className="body-small font-grotesk text-white/50">
            Checking your activation…
          </p>
        </div>
      </SponsoredActivationPageShell>
    );
  }

  if (deeplink && recordEligibility.isError) {
    const apiMsg =
      recordEligibility.error instanceof Error
        ? recordEligibility.error.message
        : null;
    return (
      <SponsoredActivationPageShell>
        <p className="body-medium font-grotesk p-6 text-center text-white/80">
          {apiMsg ??
            'We could not verify eligibility from this link. Please scan again or check with staff.'}
        </p>
      </SponsoredActivationPageShell>
    );
  }

  if (resumeEligibility.isError) {
    return (
      <SponsoredActivationPageShell>
        <p className="body-medium font-grotesk p-6 text-center text-white/80">
          We could not load your activation status. Please try again.
        </p>
      </SponsoredActivationPageShell>
    );
  }

  if (!redemption) {
    return (
      <SponsoredActivationPageShell>
        <div className="flex flex-col gap-4 p-6 text-center">
          <h1 className="title2 text-white">{read.activation.title}</h1>
          <p className="body-medium font-grotesk text-white/75">
            {deeplink
              ? 'You do not have an available redemption for this perk yet.'
              : 'No redemption is on file for this activation. Open the link from your QR code or checkpoint to continue.'}
          </p>
        </div>
      </SponsoredActivationPageShell>
    );
  }

  if (baseScreen === 'expired') {
    return (
      <SponsoredActivationPageShell>
        <SponsoredActivationExpired />
      </SponsoredActivationPageShell>
    );
  }

  if (baseScreen === 'cancelled') {
    return (
      <SponsoredActivationPageShell>
        <SponsoredActivationCancelled />
      </SponsoredActivationPageShell>
    );
  }

  if (baseScreen === 'redeemed') {
    return (
      <SponsoredActivationPageShell>
        <SponsoredActivationRedeemed perkName={read.rewardItem.name} />
      </SponsoredActivationPageShell>
    );
  }

  if (baseScreen === 'confirm') {
    return (
      <SponsoredActivationPageShell>
        <SponsoredActivationConfirm
          read={read}
          accountEmail={accountEmail}
          currentPoints={player?.total_points ?? 0}
          pending={confirmMutation.isPending}
          onConfirm={() => {
            if (!redemption.id) return;
            confirmMutation.mutate(redemption.id);
          }}
        />
      </SponsoredActivationPageShell>
    );
  }

  if (baseScreen === 'success_swipe') {
    const showSwipe = venueStep === 'swipe';
    const swipeDisabled =
      swipeMutation.isPending ||
      isRedeemedLikeStatus(redemption.status) ||
      !isSwipeAllowedForStatus(redemption.status);

    return (
      <SponsoredActivationPageShell>
        {!showSwipe ? (
          <SponsoredActivationSuccess
            pointsSpent={pointsSpent}
            balanceAfter={balanceAfterPoints}
            tierTitle={tierTitle}
            perkName={read.rewardItem.name}
            onContinueToSwipe={() => setVenueStep('swipe')}
          />
        ) : (
          <div className="flex flex-col gap-6 p-4 md:p-6">
            <div>
              <h1 className="title2 text-white">Swipe to redeem</h1>
              <p className="mt-2 body-medium font-grotesk text-white/70">
                Complete the swipe when staff asks you to redeem{' '}
                <span className="font-semibold text-white">
                  {read.rewardItem.name}
                </span>
                .
              </p>
            </div>
            <SponsoredActivationSwipeSlider
              key={swipeSliderKey}
              disabled={swipeDisabled}
              onSwipeGestureStart={handleSwipeGestureStart}
              onComplete={handleSwipeComplete}
            />
          </div>
        )}
      </SponsoredActivationPageShell>
    );
  }

  return (
    <SponsoredActivationPageShell>
      <div className="p-6 text-center">
        <p className="body-medium font-grotesk text-white/80">
          This activation is not available for your account right now.
        </p>
      </div>
    </SponsoredActivationPageShell>
  );
}
