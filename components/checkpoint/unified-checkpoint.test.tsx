import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UnifiedCheckpoint from './unified-checkpoint'
import type { Checkpoint } from '@/lib/types'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

// Mock footer
vi.mock('@/components/layout/footer', () => ({
  default: () => <footer data-testid="footer">Footer</footer>,
}))

// Mock Privy
const mockUsePrivy = vi.fn()
const mockCreateWallet = vi.fn()
vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockUsePrivy(),
  useCreateWallet: () => ({ createWallet: mockCreateWallet }),
}))

// Mock Stellar wallet hook
const mockUseStellarWallet = vi.fn()
vi.mock('@/hooks/useStellarWallet', () => ({
  useStellarWallet: () => mockUseStellarWallet(),
}))

describe('UnifiedCheckpoint', () => {
  const mockEvmCheckpoint: Checkpoint = {
    id: 'checkpoint-1',
    name: 'Test Checkpoint',
    points_value: 100,
    chain_type: 'evm',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  }

  const mockSolanaCheckpoint: Checkpoint = {
    ...mockEvmCheckpoint,
    chain_type: 'solana',
  }

  const mockStellarCheckpoint: Checkpoint = {
    ...mockEvmCheckpoint,
    chain_type: 'stellar',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    mockUseStellarWallet.mockReturnValue({
      address: null,
      connect: vi.fn(),
      isConnecting: false,
      isLoading: false,
      error: null,
    })
  })

  describe('Loading State', () => {
    it('should show loading when user is not available', () => {
      mockUsePrivy.mockReturnValue({ user: null })

      render(<UnifiedCheckpoint checkpoint={mockEvmCheckpoint} />)

      expect(screen.getByText('Loading ...')).toBeInTheDocument()
    })

    it('should show loading when Stellar wallet is loading', () => {
      mockUsePrivy.mockReturnValue({
        user: { wallet: { address: '0x123' }, email: { address: 'test@example.com' } },
      })
      mockUseStellarWallet.mockReturnValue({
        address: null,
        connect: vi.fn(),
        isConnecting: false,
        isLoading: true,
        error: null,
      })

      render(<UnifiedCheckpoint checkpoint={mockStellarCheckpoint} />)

      expect(screen.getByText('Loading ...')).toBeInTheDocument()
    })
  })

  describe('No Wallet State', () => {
    describe('EVM Checkpoint', () => {
      it('should show wallet required message for EVM checkpoint without wallet', () => {
        mockUsePrivy.mockReturnValue({
          user: { wallet: null, email: { address: 'test@example.com' } },
        })

        render(<UnifiedCheckpoint checkpoint={mockEvmCheckpoint} />)

        expect(screen.getByText('Wallet Required')).toBeInTheDocument()
        expect(screen.getByText(/please connect your wallet/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument()
      })

      it('should navigate home when Go Home button is clicked', async () => {
        const user = userEvent.setup()
        mockUsePrivy.mockReturnValue({
          user: { wallet: null, email: { address: 'test@example.com' } },
        })

        render(<UnifiedCheckpoint checkpoint={mockEvmCheckpoint} />)

        await user.click(screen.getByRole('button', { name: /go home/i }))

        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })

    describe('Solana Checkpoint', () => {
      it('should show create Solana wallet prompt', async () => {
        mockUsePrivy.mockReturnValue({
          user: {
            wallet: { address: '0x123' },
            email: { address: 'test@example.com' },
            linkedAccounts: [],
          },
        })

        render(<UnifiedCheckpoint checkpoint={mockSolanaCheckpoint} />)

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: /create solana wallet/i })).toBeInTheDocument()
        })
        expect(screen.getByRole('button', { name: /create solana wallet/i })).toBeInTheDocument()
      })

      it('should call createWallet when create Solana wallet button is clicked', async () => {
        const user = userEvent.setup()
        mockUsePrivy.mockReturnValue({
          user: {
            wallet: { address: '0x123' },
            email: { address: 'test@example.com' },
            linkedAccounts: [],
          },
        })

        render(<UnifiedCheckpoint checkpoint={mockSolanaCheckpoint} />)

        await user.click(screen.getByRole('button', { name: /create solana wallet/i }))

        expect(mockCreateWallet).toHaveBeenCalledWith({ createAdditional: true })
      })
    })

    describe('Stellar Checkpoint', () => {
      it('should show create Stellar wallet prompt', async () => {
        mockUsePrivy.mockReturnValue({
          user: {
            wallet: { address: '0x123' },
            email: { address: 'test@example.com' },
          },
        })
        mockUseStellarWallet.mockReturnValue({
          address: null,
          connect: vi.fn(),
          isConnecting: false,
          isLoading: false,
          error: null,
        })

        render(<UnifiedCheckpoint checkpoint={mockStellarCheckpoint} />)

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: /create stellar wallet/i })).toBeInTheDocument()
        })
        expect(screen.getByRole('button', { name: /create stellar wallet/i })).toBeInTheDocument()
      })

      it('should call connect when create Stellar wallet button is clicked', async () => {
        const user = userEvent.setup()
        const mockConnect = vi.fn()
        mockUsePrivy.mockReturnValue({
          user: {
            wallet: { address: '0x123' },
            email: { address: 'test@example.com' },
          },
        })
        mockUseStellarWallet.mockReturnValue({
          address: null,
          connect: mockConnect,
          isConnecting: false,
          isLoading: false,
          error: null,
        })

        render(<UnifiedCheckpoint checkpoint={mockStellarCheckpoint} />)

        await user.click(screen.getByRole('button', { name: /create stellar wallet/i }))

        expect(mockConnect).toHaveBeenCalled()
      })

      it('should show Stellar error message when present', () => {
        mockUsePrivy.mockReturnValue({
          user: {
            wallet: { address: '0x123' },
            email: { address: 'test@example.com' },
          },
        })
        mockUseStellarWallet.mockReturnValue({
          address: null,
          connect: vi.fn(),
          isConnecting: false,
          isLoading: false,
          error: 'Failed to connect to Stellar',
        })

        render(<UnifiedCheckpoint checkpoint={mockStellarCheckpoint} />)

        expect(screen.getByText('Failed to connect to Stellar')).toBeInTheDocument()
      })
    })
  })

  describe('Auto Check-in', () => {
    it('should auto check-in when wallet is available', async () => {
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
      })

      // Player stats fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, player: { total_points: 1000 } }),
      } as Response)

      // Check-in fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          pointsEarnedToday: 100,
          player: { total_points: 1100 },
        }),
      } as Response)

      render(<UnifiedCheckpoint checkpoint={mockEvmCheckpoint} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chain: 'evm',
            walletAddress: '0x1234567890abcdef',
            email: 'test@example.com',
            checkpoint: 'checkpoint-1',
          }),
        })
      })
    })

    it('should call unified endpoint for Solana checkpoint', async () => {
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x123' },
          email: { address: 'test@example.com' },
          linkedAccounts: [
            { type: 'wallet', chainType: 'solana', address: 'SolanaWallet123' },
          ],
        },
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, player: { total_points: 1000 } }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      render(<UnifiedCheckpoint checkpoint={mockSolanaCheckpoint} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chain: 'solana',
            walletAddress: 'SolanaWallet123',
            email: 'test@example.com',
            checkpoint: 'checkpoint-1',
          }),
        })
      })
    })

    it('should call unified endpoint for Stellar checkpoint', async () => {
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x123' },
          email: { address: 'test@example.com' },
        },
      })
      mockUseStellarWallet.mockReturnValue({
        address: 'StellarWallet123',
        connect: vi.fn(),
        isConnecting: false,
        isLoading: false,
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, player: { total_points: 1000 } }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      render(<UnifiedCheckpoint checkpoint={mockStellarCheckpoint} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chain: 'stellar',
            walletAddress: 'StellarWallet123',
            email: 'test@example.com',
            checkpoint: 'checkpoint-1',
          }),
        })
      })
    })
  })

  describe('Successful Check-in', () => {
    it('should show success screen with points earned', async () => {
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, player: { total_points: 1000 } }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          pointsEarnedToday: 100,
          player: { total_points: 1100 },
        }),
      } as Response)

      render(<UnifiedCheckpoint checkpoint={mockEvmCheckpoint} />)

      await waitFor(() => {
        expect(screen.getByText("YOU'RE IN")).toBeInTheDocument()
        expect(screen.getByText('YOU EARNED')).toBeInTheDocument()
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('PTS')).toBeInTheDocument()
      })
    })

    it('should show Go to IRL Map button', async () => {
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, player: { total_points: 1000 } }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      render(<UnifiedCheckpoint checkpoint={mockEvmCheckpoint} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to the irl map/i })).toBeInTheDocument()
      })
    })

    it('should navigate to map when button is clicked', async () => {
      const user = userEvent.setup()
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, player: { total_points: 1000 } }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      render(<UnifiedCheckpoint checkpoint={mockEvmCheckpoint} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to the irl map/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /go to the irl map/i }))

      expect(mockPush).toHaveBeenCalledWith('/interactive-map')
    })

    it('should show partner image when provided', async () => {
      const checkpointWithPartner: Checkpoint = {
        ...mockEvmCheckpoint,
        partner_image_url: '/images/partner.png',
      }

      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, player: { total_points: 1000 } }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      render(<UnifiedCheckpoint checkpoint={checkpointWithPartner} />)

      await waitFor(() => {
        expect(screen.getByRole('img', { name: 'Partner' })).toBeInTheDocument()
      })
    })
  })

  describe('Check-in Error', () => {
    it('should show error message when check-in fails', async () => {
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, player: { total_points: 1000 } }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Check-in failed' }),
      } as Response)

      render(<UnifiedCheckpoint checkpoint={mockEvmCheckpoint} />)

      await waitFor(() => {
        expect(screen.getByText('Check-in Error')).toBeInTheDocument()
        expect(screen.getByText('Check-in failed')).toBeInTheDocument()
      })
    })

    it('should show daily limit message when limit is reached', async () => {
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, player: { total_points: 1000 } }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Daily limit reached' }),
      } as Response)

      render(<UnifiedCheckpoint checkpoint={mockEvmCheckpoint} />)

      await waitFor(() => {
        expect(screen.getByText('Daily Limit Reached')).toBeInTheDocument()
        expect(screen.getByText(/up to 10 checkpoint visits per day/i)).toBeInTheDocument()
      })
    })

    it('should show Visit IRL.ENERGY button on error', async () => {
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, player: { total_points: 1000 } }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Error' }),
      } as Response)

      render(<UnifiedCheckpoint checkpoint={mockEvmCheckpoint} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /visit irl\.energy/i })).toBeInTheDocument()
      })
    })
  })

  describe('Checking In State', () => {
    it('should show checking in message while request is in progress', async () => {
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, player: { total_points: 1000 } }),
      } as Response)

      // Don't resolve the check-in request immediately
      vi.mocked(global.fetch).mockReturnValueOnce(
        new Promise(() => {})
      )

      render(<UnifiedCheckpoint checkpoint={mockEvmCheckpoint} />)

      await waitFor(() => {
        expect(screen.getByText('Checking in...')).toBeInTheDocument()
      })
    })
  })
})
