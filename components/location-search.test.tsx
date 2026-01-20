import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationSearch from './shared/location-search'

// Mock environment variable
vi.stubEnv('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN', 'test-token')

describe('LocationSearch', () => {
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Initial Rendering', () => {
    it('should render search button in collapsed state', () => {
      render(<LocationSearch onSelect={mockOnSelect} />)

      expect(screen.getByRole('button', { name: /search location/i })).toBeInTheDocument()
    })

    it('should show custom placeholder', () => {
      render(<LocationSearch onSelect={mockOnSelect} placeholder="Find a place" />)

      expect(screen.getByText('Find a place')).toBeInTheDocument()
    })
  })

  describe('Expanded State', () => {
    it('should expand to show input when button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<LocationSearch onSelect={mockOnSelect} />)

      await user.click(screen.getByRole('button', { name: /search location/i }))

      expect(screen.getByPlaceholderText('Search location')).toBeInTheDocument()
    })

    it('should show close button when expanded', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<LocationSearch onSelect={mockOnSelect} />)

      await user.click(screen.getByRole('button', { name: /search location/i }))

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    })

    it('should collapse when close button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<LocationSearch onSelect={mockOnSelect} />)

      await user.click(screen.getByRole('button', { name: /search location/i }))
      expect(screen.getByPlaceholderText('Search location')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /close/i }))

      expect(screen.queryByPlaceholderText('Search location')).not.toBeInTheDocument()
    })
  })

  describe('Search Suggestions', () => {
    it('should fetch suggestions after debounce when typing', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            { id: '1', mapbox_id: 'mapbox-1', name: 'New York', place_formatted: 'New York, NY, USA' },
            { id: '2', mapbox_id: 'mapbox-2', name: 'New Orleans', place_formatted: 'New Orleans, LA, USA' },
          ],
        }),
      } as Response)

      render(<LocationSearch onSelect={mockOnSelect} />)

      await user.click(screen.getByRole('button', { name: /search location/i }))
      await user.type(screen.getByPlaceholderText('Search location'), 'New')

      // Advance timer past debounce
      vi.advanceTimersByTime(300)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('api.mapbox.com/search/searchbox/v1/suggest')
        )
      })
    })

    it('should not fetch suggestions for queries shorter than 2 characters', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<LocationSearch onSelect={mockOnSelect} />)

      await user.click(screen.getByRole('button', { name: /search location/i }))
      await user.type(screen.getByPlaceholderText('Search location'), 'N')

      vi.advanceTimersByTime(300)

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should display suggestions in dropdown', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            { id: '1', mapbox_id: 'mapbox-1', name: 'New York', place_formatted: 'New York, NY, USA' },
          ],
        }),
      } as Response)

      render(<LocationSearch onSelect={mockOnSelect} />)

      await user.click(screen.getByRole('button', { name: /search location/i }))
      await user.type(screen.getByPlaceholderText('Search location'), 'New York')

      vi.advanceTimersByTime(300)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
        expect(screen.getByText('New York')).toBeInTheDocument()
        expect(screen.getByText('New York, NY, USA')).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should navigate suggestions with arrow keys', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            { id: '1', mapbox_id: 'mapbox-1', name: 'New York', place_formatted: 'New York, NY, USA' },
            { id: '2', mapbox_id: 'mapbox-2', name: 'New Orleans', place_formatted: 'New Orleans, LA, USA' },
          ],
        }),
      } as Response)

      render(<LocationSearch onSelect={mockOnSelect} />)

      await user.click(screen.getByRole('button', { name: /search location/i }))
      await user.type(screen.getByPlaceholderText('Search location'), 'New')

      vi.advanceTimersByTime(300)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('Search location')

      // First item should be active by default (index 0)
      let activeOption = screen.getByRole('option', { selected: true })
      expect(activeOption).toHaveTextContent('New York')

      // Arrow down to second item
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      activeOption = screen.getByRole('option', { selected: true })
      expect(activeOption).toHaveTextContent('New Orleans')

      // Arrow up back to first item
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      activeOption = screen.getByRole('option', { selected: true })
      expect(activeOption).toHaveTextContent('New York')
    })

    it('should close dropdown on Escape key', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            { id: '1', mapbox_id: 'mapbox-1', name: 'New York', place_formatted: 'New York, NY, USA' },
          ],
        }),
      } as Response)

      render(<LocationSearch onSelect={mockOnSelect} />)

      await user.click(screen.getByRole('button', { name: /search location/i }))
      await user.type(screen.getByPlaceholderText('Search location'), 'New')

      vi.advanceTimersByTime(300)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      fireEvent.keyDown(screen.getByPlaceholderText('Search location'), { key: 'Escape' })

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('should retrieve location details and call onSelect when suggestion is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      // First fetch: suggestions
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            { id: '1', mapbox_id: 'mapbox-1', name: 'New York', place_formatted: 'New York, NY, USA' },
          ],
        }),
      } as Response)

      render(<LocationSearch onSelect={mockOnSelect} />)

      await user.click(screen.getByRole('button', { name: /search location/i }))
      await user.type(screen.getByPlaceholderText('Search location'), 'New York')

      vi.advanceTimersByTime(300)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Second fetch: retrieve location details
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              id: 'mapbox-1',
              geometry: { type: 'Point', coordinates: [-74.006, 40.7128] },
              properties: {},
            },
          ],
        }),
      } as Response)

      await user.click(screen.getByText('New York'))

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith({
          longitude: -74.006,
          latitude: 40.7128,
          id: 'mapbox-1',
          name: 'New York',
          placeFormatted: 'New York, NY, USA',
        })
      })
    })

    it('should select with Enter key', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            { id: '1', mapbox_id: 'mapbox-1', name: 'New York', place_formatted: 'New York, NY, USA' },
          ],
        }),
      } as Response)

      render(<LocationSearch onSelect={mockOnSelect} />)

      await user.click(screen.getByRole('button', { name: /search location/i }))
      await user.type(screen.getByPlaceholderText('Search location'), 'New York')

      vi.advanceTimersByTime(300)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              id: 'mapbox-1',
              geometry: { type: 'Point', coordinates: [-74.006, 40.7128] },
            },
          ],
        }),
      } as Response)

      fireEvent.keyDown(screen.getByPlaceholderText('Search location'), { key: 'Enter' })

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalled()
      })
    })

    it('should close dropdown and update input after selection', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            { id: '1', mapbox_id: 'mapbox-1', name: 'New York', place_formatted: 'New York, NY, USA' },
          ],
        }),
      } as Response)

      render(<LocationSearch onSelect={mockOnSelect} />)

      await user.click(screen.getByRole('button', { name: /search location/i }))
      await user.type(screen.getByPlaceholderText('Search location'), 'New')

      vi.advanceTimersByTime(300)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              id: 'mapbox-1',
              geometry: { type: 'Point', coordinates: [-74.006, 40.7128] },
            },
          ],
        }),
      } as Response)

      await user.click(screen.getByText('New York'))

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
        expect(screen.getByPlaceholderText('Search location')).toHaveValue('New York, NY, USA')
      })
    })
  })

  describe('Proximity Parameter', () => {
    it('should include proximity parameter in API call when provided', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ suggestions: [] }),
      } as Response)

      render(
        <LocationSearch
          onSelect={mockOnSelect}
          proximity={{ longitude: -74.006, latitude: 40.7128 }}
        />
      )

      await user.click(screen.getByRole('button', { name: /search location/i }))
      await user.type(screen.getByPlaceholderText('Search location'), 'coffee')

      vi.advanceTimersByTime(300)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('proximity=-74.006,40.7128')
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should clear suggestions when API call fails', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      // First successful call
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            { id: '1', name: 'New York', place_formatted: 'New York, NY, USA' },
          ],
        }),
      } as Response)

      render(<LocationSearch onSelect={mockOnSelect} />)

      await user.click(screen.getByRole('button', { name: /search location/i }))
      await user.type(screen.getByPlaceholderText('Search location'), 'New')

      vi.advanceTimersByTime(300)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Failing call
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      await user.type(screen.getByPlaceholderText('Search location'), ' York')

      vi.advanceTimersByTime(300)

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })
  })
})
