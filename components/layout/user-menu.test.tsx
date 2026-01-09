import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import UserMenu from './user-menu'

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

// Mock Privy
const mockUsePrivy = vi.fn()
vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockUsePrivy(),
}))

// Mock useUserStats hook
const mockUseUserStats = vi.fn()
vi.mock('@/hooks/usePlayer', () => ({
  useUserStats: () => mockUseUserStats(),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
}))

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'TestWrapper'
  return Wrapper
}

describe('UserMenu', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onEditProfile: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    mockUsePrivy.mockReturnValue({
      user: {
        wallet: { address: '0x1234567890abcdef1234567890abcdef12345678' },
        email: { address: 'test@example.com' },
      },
    })
    mockUseUserStats.mockReturnValue({
      userStats: { total_points: 1500, rank: 42 },
      isLoading: false,
    })

    // Mock profile fetch
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/profile')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            website: 'https://example.com',
            twitter_handle: '@testuser',
            profile_picture_url: '',
          }),
        } as Response)
      }
      if (typeof url === 'string' && url.includes('/data/challenges')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { title: 'Challenge 1', description: 'Desc 1', points: 100 },
            { title: 'Challenge 2', description: 'Desc 2', points: 200 },
          ],
        } as Response)
      }
      return Promise.resolve({ ok: false } as Response)
    })
  })

  describe('Rendering', () => {
    it('should not render when user is null', () => {
      mockUsePrivy.mockReturnValue({ user: null })
      const { container } = render(
        <UserMenu {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      expect(container).toBeEmptyDOMElement()
    })

    it('should not render when isOpen is false', () => {
      const { container } = render(
        <UserMenu {...defaultProps} isOpen={false} />,
        { wrapper: createWrapper() }
      )

      expect(container).toBeEmptyDOMElement()
    })

    it('should render when isOpen is true and user exists', async () => {
      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByTestId('x-icon')).toBeInTheDocument()
      })
    })
  })

  describe('User Profile Section', () => {
    it('should display username', async () => {
      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('@testuser')).toBeInTheDocument()
      })
    })

    it('should show edit profile button', async () => {
      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument()
      })
    })

    it('should call onEditProfile and onClose when edit profile is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      const onEditProfile = vi.fn()
      render(
        <UserMenu isOpen={true} onClose={onClose} onEditProfile={onEditProfile} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Edit Profile'))

      expect(onClose).toHaveBeenCalled()
      expect(onEditProfile).toHaveBeenCalled()
    })
  })

  describe('Points and Rank Section', () => {
    it('should display user points', async () => {
      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeInTheDocument()
      })
    })

    it('should display user rank with ordinal suffix', async () => {
      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument()
        expect(screen.getByText('nd')).toBeInTheDocument()
      })
    })

    it('should show loading state when stats are loading', async () => {
      mockUseUserStats.mockReturnValue({
        userStats: null,
        isLoading: true,
      })

      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        const loadingElements = document.querySelectorAll('.animate-pulse')
        expect(loadingElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate to leaderboard when leaderboard button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(
        <UserMenu {...defaultProps} onClose={onClose} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Leaderboard')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Leaderboard'))

      expect(onClose).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/leaderboard')
    })

    it('should navigate to challenges when challenges button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(
        <UserMenu {...defaultProps} onClose={onClose} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Challenges')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Challenges'))

      expect(onClose).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/challenges')
    })
  })

  describe('Close Button', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(
        <UserMenu {...defaultProps} onClose={onClose} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByLabelText('Close menu')).toBeInTheDocument()
      })

      await user.click(screen.getByLabelText('Close menu'))

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Challenges Section', () => {
    it('should display challenges', async () => {
      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('EARN MORE POINTS')).toBeInTheDocument()
      })
    })

    it('should show loading state while fetching challenges', async () => {
      // Don't resolve the fetch immediately
      vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {}))

      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        const loadingElements = document.querySelectorAll('.animate-pulse')
        expect(loadingElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Website and Social Links', () => {
    it('should display website when available', async () => {
      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument()
      })
    })

    it('should display no website message when not available', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/profile')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              username: 'testuser',
              website: '',
            }),
          } as Response)
        }
        return Promise.resolve({ ok: false } as Response)
      })

      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('No website')).toBeInTheDocument()
      })
    })

    it('should display no social links message when none available', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/profile')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              username: 'testuser',
              twitter_handle: '',
              farcaster_handle: '',
              telegram_handle: '',
              towns_handle: '',
            }),
          } as Response)
        }
        return Promise.resolve({ ok: false } as Response)
      })

      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('No social links')).toBeInTheDocument()
      })
    })
  })

  describe('Ordinal Suffix Helper', () => {
    it('should display correct ordinal suffix for 1st', async () => {
      mockUseUserStats.mockReturnValue({
        userStats: { total_points: 1500, rank: 1 },
        isLoading: false,
      })

      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('st')).toBeInTheDocument()
      })
    })

    it('should display correct ordinal suffix for 2nd', async () => {
      mockUseUserStats.mockReturnValue({
        userStats: { total_points: 1500, rank: 2 },
        isLoading: false,
      })

      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('nd')).toBeInTheDocument()
      })
    })

    it('should display correct ordinal suffix for 3rd', async () => {
      mockUseUserStats.mockReturnValue({
        userStats: { total_points: 1500, rank: 3 },
        isLoading: false,
      })

      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
        expect(screen.getByText('rd')).toBeInTheDocument()
      })
    })

    it('should display correct ordinal suffix for 11th (special case)', async () => {
      mockUseUserStats.mockReturnValue({
        userStats: { total_points: 1500, rank: 11 },
        isLoading: false,
      })

      render(<UserMenu {...defaultProps} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('11')).toBeInTheDocument()
        expect(screen.getByText('th')).toBeInTheDocument()
      })
    })
  })
})
