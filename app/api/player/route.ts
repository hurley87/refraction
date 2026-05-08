import { NextRequest } from 'next/server';
import { createOrUpdatePlayer, getPlayerByWallet } from '@/lib/db/players';
import {
  isUsernameTakenByOther,
  isPostgresUniqueUsernameViolation,
} from '@/lib/db/profiles';
import type { Player } from '@/lib/types';
import {
  createPlayerRequestSchema,
  getPlayerRequestSchema,
  updatePlayerRequestSchema,
} from '@/lib/schemas/api';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { trackAccountCreated, resolveServerIdentity } from '@/lib/analytics';
import {
  accountCreatedAttributionFromPayload,
  signupAttributionPayloadHasData,
} from '@/lib/analytics/attribution-core';
import { setUserProperties as setUserPropertiesServer } from '@/lib/analytics/server';
import { addCampaignMonitorSubscriber } from '@/lib/campaign-monitor/subscribe';
import { captureHandledException } from '@/lib/monitoring/capture-handled-exception';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = createPlayerRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const { walletAddress, email, username, signup_attribution } =
      validationResult.data;
    const normalizedUsername = username.trim().toLowerCase();

    const taken = await isUsernameTakenByOther(
      normalizedUsername,
      walletAddress
    );
    if (taken) {
      return apiError('Username is already taken', 409);
    }

    // Check if player already exists
    const existingPlayer = await getPlayerByWallet(walletAddress);
    const isNewPlayer = !existingPlayer;

    // Create or update player
    const playerData: Omit<Player, 'id' | 'created_at' | 'updated_at'> = {
      wallet_address: walletAddress,
      email: email || undefined,
      username: normalizedUsername,
      total_points: 0,
    };

    let player;
    try {
      player = await createOrUpdatePlayer(playerData);
    } catch (err: unknown) {
      if (isPostgresUniqueUsernameViolation(err)) {
        return apiError('Username is already taken', 409);
      }
      throw err;
    }

    const distinctId = resolveServerIdentity({
      email,
      walletAddress,
      playerId: player.id,
    });

    setUserPropertiesServer(distinctId, {
      $email: email,
      wallet_address: walletAddress,
      wallet_type: 'EVM',
    });

    if (isNewPlayer) {
      const attributionProps =
        signup_attribution &&
        signupAttributionPayloadHasData(signup_attribution)
          ? accountCreatedAttributionFromPayload(signup_attribution)
          : {};

      trackAccountCreated(distinctId, {
        wallet_type: 'EVM',
        has_email: !!email,
        wallet_address: walletAddress,
        ...attributionProps,
      });
    }

    // === Sync the player data to Airtable via internal API ===
    try {
      // Derive the base URL (e.g., https://example.com) from the incoming request
      const baseUrl = new URL(request.url).origin;
      await fetch(`${baseUrl}/api/add-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdAt: player.created_at,
          email: player.email ?? '',
        }),
      });
    } catch (airtableSyncError) {
      console.error('Failed to sync user to Airtable:', airtableSyncError);
      captureHandledException(airtableSyncError, {
        route: '/api/player',
        operation: 'sync_user_to_airtable',
        statusCode: 500,
        extra: {
          hasEmail: Boolean(player.email),
        },
      });
      // We log the error but do NOT block the main response
    }

    if (isNewPlayer && email) {
      try {
        await addCampaignMonitorSubscriber({
          email,
          username: normalizedUsername,
        });
      } catch (campaignMonitorError) {
        console.error(
          JSON.stringify({
            source: 'api_player_post',
            message: 'campaign_monitor_sync_exception',
            walletAddressSuffix: walletAddress.slice(-8),
            error:
              campaignMonitorError instanceof Error
                ? campaignMonitorError.message
                : String(campaignMonitorError),
          })
        );
        captureHandledException(campaignMonitorError, {
          route: '/api/player',
          operation: 'campaign_monitor_subscribe',
          statusCode: 500,
          extra: {
            hasEmail: Boolean(email),
          },
        });
      }
    }

    return apiSuccess(
      { player },
      `Welcome ${username}! Your player profile has been created.`
    );
  } catch (error) {
    console.error('Player creation API error:', error);
    return apiError('Failed to create player profile', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    const validationResult = getPlayerRequestSchema.safeParse({
      walletAddress,
    });

    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const player = await getPlayerByWallet(validationResult.data.walletAddress);

    if (!player) {
      return apiError('Player not found', 404);
    }

    return apiSuccess({ player });
  } catch (error) {
    console.error('Get player API error:', error);
    return apiError('Failed to get player data', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = updatePlayerRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const { walletAddress, username } = validationResult.data;
    const normalizedUsername = username.trim().toLowerCase();

    // Get existing player
    const existingPlayer = await getPlayerByWallet(walletAddress);

    if (!existingPlayer) {
      return apiError('Player not found', 404);
    }

    if (
      normalizedUsername !==
      (existingPlayer.username ?? '').trim().toLowerCase()
    ) {
      const taken = await isUsernameTakenByOther(
        normalizedUsername,
        walletAddress
      );
      if (taken) {
        return apiError('Username is already taken', 409);
      }
    }

    // Update player
    const playerData: Omit<Player, 'id' | 'created_at' | 'updated_at'> = {
      wallet_address: walletAddress,
      email: existingPlayer.email,
      username: normalizedUsername,
      total_points: existingPlayer.total_points,
    };

    let updatedPlayer;
    try {
      updatedPlayer = await createOrUpdatePlayer(playerData);
    } catch (err: unknown) {
      if (isPostgresUniqueUsernameViolation(err)) {
        return apiError('Username is already taken', 409);
      }
      throw err;
    }

    return apiSuccess(
      { player: updatedPlayer },
      `Username updated to ${username}!`
    );
  } catch (error) {
    console.error('Player update API error:', error);
    return apiError('Failed to update player profile', 500);
  }
}
