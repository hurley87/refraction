import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewsletterForm from './newsletter-form'

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

describe('NewsletterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('Rendering', () => {
    it('should render the email input and submit button', () => {
      render(<NewsletterForm />)

      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /arrow-right/i })).toBeInTheDocument()
    })

    it('should have required attribute on email input', () => {
      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      expect(input).toHaveAttribute('required')
    })
  })

  describe('Form Submission', () => {
    it('should submit the form with valid email', async () => {
      const user = userEvent.setup()
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      await user.type(input, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /arrow-right/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      })
    })

    it('should show success message after successful submission', async () => {
      const user = userEvent.setup()
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      await user.type(input, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /arrow-right/i }))

      await waitFor(() => {
        expect(screen.getByText(/thanks for subscribing/i)).toBeInTheDocument()
      })
    })

    it('should show already subscribed message when user is already subscribed', async () => {
      const user = userEvent.setup()
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, alreadySubscribed: true }),
      } as Response)

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      await user.type(input, 'existing@example.com')
      await user.click(screen.getByRole('button', { name: /arrow-right/i }))

      await waitFor(() => {
        expect(screen.getByText(/already subscribed/i)).toBeInTheDocument()
      })
    })

    it('should clear the email input after successful submission', async () => {
      const user = userEvent.setup()
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText('Enter your email') as HTMLInputElement
      await user.type(input, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /arrow-right/i }))

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error message when API returns error', async () => {
      const user = userEvent.setup()
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid email address' }),
      } as Response)

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      // Need a valid email format to pass HTML5 validation
      await user.type(input, 'test@invalid.com')
      await user.click(screen.getByRole('button', { name: /arrow-right/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
      })
    })

    it('should show network error message when fetch fails', async () => {
      const user = userEvent.setup()
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      await user.type(input, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /arrow-right/i }))

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })

    it('should show generic error when response parsing fails', async () => {
      const user = userEvent.setup()
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error('Parse error')
        },
      } as Response)

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      await user.type(input, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /arrow-right/i }))

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('should disable input and button while submitting', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: Response) => void
      vi.mocked(global.fetch).mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve
        })
      )

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const button = screen.getByRole('button', { name: /arrow-right/i })

      await user.type(input, 'test@example.com')
      await user.click(button)

      // Check loading state
      expect(input).toBeDisabled()
      expect(button).toBeDisabled()

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      await waitFor(() => {
        expect(input).not.toBeDisabled()
        expect(button).not.toBeDisabled()
      })
    })

    it('should show spinner while submitting', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: Response) => void
      vi.mocked(global.fetch).mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve
        })
      )

      render(<NewsletterForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      await user.type(input, 'test@example.com')
      await user.click(screen.getByRole('button'))

      // Check for spinner (has animate-spin class)
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
      })
    })
  })
})
