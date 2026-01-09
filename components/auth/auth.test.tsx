import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Auth from './auth'

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

// Mock Privy
const mockLogin = vi.fn()
const mockLinkEmail = vi.fn()
const mockUsePrivy = vi.fn()

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockUsePrivy(),
}))

describe('Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock - override in specific tests
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ player: { id: '123', username: 'existinguser' } }),
    } as Response)
  })

  describe('Loading State', () => {
    it('should show loading when Privy is not ready', () => {
      mockUsePrivy.mockReturnValue({
        user: null,
        ready: false,
        login: mockLogin,
        linkEmail: mockLinkEmail,
      })

      render(<Auth><div>Children</div></Auth>)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Unauthenticated State', () => {
    it('should show welcome screen when user is not logged in', () => {
      mockUsePrivy.mockReturnValue({
        user: null,
        ready: true,
        login: mockLogin,
        linkEmail: mockLinkEmail,
      })

      render(<Auth><div>Children</div></Auth>)

      expect(screen.getByText('Welcome to IRL')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /check-in/i })).toBeInTheDocument()
      expect(screen.getByText('POWERED BY')).toBeInTheDocument()
      expect(screen.getByText('REFRACTION')).toBeInTheDocument()
    })

    it('should call login when check-in button is clicked', async () => {
      const user = userEvent.setup()
      mockUsePrivy.mockReturnValue({
        user: null,
        ready: true,
        login: mockLogin,
        linkEmail: mockLinkEmail,
      })

      render(<Auth><div>Children</div></Auth>)

      await user.click(screen.getByRole('button', { name: /check-in/i }))

      expect(mockLogin).toHaveBeenCalled()
    })
  })

  describe('Email Linking State', () => {
    it('should show email link prompt when user has no email', async () => {
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: null,
        },
        ready: true,
        login: mockLogin,
        linkEmail: mockLinkEmail,
      })

      render(<Auth><div>Children</div></Auth>)

      // Wait for state to settle after fetch
      await waitFor(() => {
        expect(screen.getByText('Link your email for updates')).toBeInTheDocument()
      })
      // The button has aria-label="Link your email"
      expect(screen.getByRole('button', { name: /link your email/i })).toBeInTheDocument()
    })

    it('should call linkEmail when link email button is clicked', async () => {
      const user = userEvent.setup()
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: null,
        },
        ready: true,
        login: mockLogin,
        linkEmail: mockLinkEmail,
      })

      render(<Auth><div>Children</div></Auth>)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /link your email/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /link your email/i }))

      expect(mockLinkEmail).toHaveBeenCalled()
    })
  })

  describe('Username Creation State', () => {
    it('should show username prompt for new player', async () => {
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
        ready: true,
        login: mockLogin,
        linkEmail: mockLinkEmail,
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      render(<Auth><div>Children</div></Auth>)

      await waitFor(() => {
        expect(screen.getByText('Choose your username to start earning points')).toBeInTheDocument()
      })

      expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /start earning/i })).toBeInTheDocument()
    })

    it('should show username prompt when existing player has no username', async () => {
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
        ready: true,
        login: mockLogin,
        linkEmail: mockLinkEmail,
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ player: { id: '123', username: null } }),
      } as Response)

      render(<Auth><div>Children</div></Auth>)

      await waitFor(() => {
        expect(screen.getByText('Choose your username to start earning points')).toBeInTheDocument()
      })
    })

    it('should disable submit button when username is empty', async () => {
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
        ready: true,
        login: mockLogin,
        linkEmail: mockLinkEmail,
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      render(<Auth><div>Children</div></Auth>)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start earning/i })).toBeDisabled()
      })
    })

    it('should enable submit button when username is entered', async () => {
      const user = userEvent.setup()
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
        ready: true,
        login: mockLogin,
        linkEmail: mockLinkEmail,
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      render(<Auth><div>Children</div></Auth>)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('Enter your username'), 'testuser')

      expect(screen.getByRole('button', { name: /start earning/i })).not.toBeDisabled()
    })

    it('should create player when form is submitted', async () => {
      const user = userEvent.setup()
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
        ready: true,
        login: mockLogin,
        linkEmail: mockLinkEmail,
      })

      // First call: check player data (404)
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      render(<Auth><div>Children</div></Auth>)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument()
      })

      // Second call: create player
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, player: { id: '123', username: 'testuser' } }),
      } as Response)

      await user.type(screen.getByPlaceholderText('Enter your username'), 'testuser')
      await user.click(screen.getByRole('button', { name: /start earning/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: '0x1234567890abcdef',
            email: 'test@example.com',
            username: 'testuser',
          }),
        })
      })
    })

    it('should show creating player text while submitting', async () => {
      const user = userEvent.setup()
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
        ready: true,
        login: mockLogin,
        linkEmail: mockLinkEmail,
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      render(<Auth><div>Children</div></Auth>)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument()
      })

      let resolvePromise: (value: Response) => void
      vi.mocked(global.fetch).mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve
        })
      )

      await user.type(screen.getByPlaceholderText('Enter your username'), 'testuser')
      await user.click(screen.getByRole('button', { name: /start earning/i }))

      expect(screen.getByText('CREATING PLAYER...')).toBeInTheDocument()

      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)
    })
  })

  describe('Authenticated State', () => {
    it('should render children when user is fully authenticated with username', async () => {
      mockUsePrivy.mockReturnValue({
        user: {
          wallet: { address: '0x1234567890abcdef' },
          email: { address: 'test@example.com' },
        },
        ready: true,
        login: mockLogin,
        linkEmail: mockLinkEmail,
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ player: { id: '123', username: 'existinguser' } }),
      } as Response)

      render(<Auth><div data-testid="children">Children Content</div></Auth>)

      await waitFor(() => {
        expect(screen.getByTestId('children')).toBeInTheDocument()
      })

      expect(screen.getByText('Children Content')).toBeInTheDocument()
    })
  })
})
