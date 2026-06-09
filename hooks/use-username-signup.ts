'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSignupAttributionBodyFields } from '@/lib/analytics/attribution';
import { optionalPrivyEmailBody } from '@/lib/api/privy-email';

const DEFAULT_CREATE_ERROR = 'Unable to create your profile. Please try again.';
const NETWORK_ERROR = 'Something went wrong. Please try again.';

interface UseUsernameSignupOptions {
  /** When false, skip the GET /api/player probe (e.g. AuthWrapper when requireUsername is off). */
  checkEnabled: boolean;
  walletAddress?: string;
  emailAddress?: string;
}

export function useUsernameSignup({
  checkEnabled,
  walletAddress,
  emailAddress,
}: UseUsernameSignupOptions) {
  const [username, setUsername] = useState('');
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [createPlayerError, setCreatePlayerError] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!checkEnabled || !walletAddress) return;

    const checkPlayerData = async () => {
      try {
        const response = await fetch(
          `/api/player?walletAddress=${encodeURIComponent(walletAddress)}`
        );

        if (response.ok) {
          const responseData = await response.json();
          const result = responseData.data || responseData;
          const existingPlayer = result.player;

          if (existingPlayer && !existingPlayer.username) {
            setNeedsUsername(true);
          }
        } else if (response.status === 404) {
          setNeedsUsername(true);
        }
      } catch (error) {
        console.error('Error checking player data:', error);
        setNeedsUsername(true);
      }
    };

    checkPlayerData();
  }, [checkEnabled, walletAddress]);

  const handleCreatePlayer = useCallback(async () => {
    if (!username.trim() || !walletAddress) return;

    setIsCreatingPlayer(true);
    setCreatePlayerError(null);
    try {
      const response = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          ...optionalPrivyEmailBody(emailAddress),
          username: username.trim(),
          ...getSignupAttributionBodyFields(),
        }),
      });

      const responseData = await response.json();

      if (responseData.success) {
        setNeedsUsername(false);
      } else {
        const message = responseData.error || DEFAULT_CREATE_ERROR;
        setCreatePlayerError(message);
        console.error('Failed to create player:', message);
      }
    } catch (error) {
      setCreatePlayerError(NETWORK_ERROR);
      console.error('Error creating player:', error);
    } finally {
      setIsCreatingPlayer(false);
    }
  }, [username, walletAddress, emailAddress]);

  const handleUsernameChange = useCallback((value: string) => {
    setUsername(value);
    setCreatePlayerError(null);
  }, []);

  return {
    username,
    setUsername: handleUsernameChange,
    isCreatingPlayer,
    needsUsername,
    createPlayerError,
    handleCreatePlayer,
  };
}
