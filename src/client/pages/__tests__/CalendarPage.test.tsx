import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarPage from '../CalendarPage';

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = fetch as any;

describe('CalendarPage', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Mock successful responses by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ([])
    });
  });

  it('renders calendar page with main elements', () => {
    render(<CalendarPage />);
    
    expect(screen.getByText('Calendar Management')).toBeInTheDocument();
    expect(screen.getByText('Create Entry')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by Team:')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by Month:')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<CalendarPage />);
    
    expect(screen.getByText('Loading calendar entries...')).toBeInTheDocument();
  });

  it('loads and displays calendar entries', async () => {
    const mockEntries = [
      {
        id: '1',
        title: 'Summer Vacation',
        description: 'Annual summer vacation',
        start_date: '2025-07-15',
        end_date: '2025-07-25',
        entry_type: 'PTO',
        user_id: 'user1',
        team_id: 'team1'
      }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEntries
    });

    render(<CalendarPage />);

    await waitFor(() => {
      expect(screen.getByText('Summer Vacation')).toBeInTheDocument();
    });

    expect(screen.getByText('Annual summer vacation')).toBeInTheDocument();
    expect(screen.getByText('PTO')).toBeInTheDocument();
  });

  it('opens create modal when Create Entry button is clicked', async () => {
    const user = userEvent.setup();
    render(<CalendarPage />);

    const createButton = screen.getByText('Create Entry');
    await user.click(createButton);

    expect(screen.getByText('Create Calendar Entry')).toBeInTheDocument();
    expect(screen.getByLabelText('Title:')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date:')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date:')).toBeInTheDocument();
  });

  it('validates form fields when creating entry', async () => {
    const user = userEvent.setup();
    render(<CalendarPage />);

    // Open create modal
    await user.click(screen.getByText('Create Entry'));

    // Try to submit empty form
    const submitButton = screen.getByText('Create');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });
  });

  it('validates date range when creating entry', async () => {
    const user = userEvent.setup();
    render(<CalendarPage />);

    // Open create modal
    await user.click(screen.getByText('Create Entry'));

    // Fill form with invalid date range (end before start)
    await user.type(screen.getByLabelText('Title:'), 'Test Entry');
    await user.type(screen.getByLabelText('Start Date:'), '2025-07-20');
    await user.type(screen.getByLabelText('End Date:'), '2025-07-15');

    const submitButton = screen.getByText('Create');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
    });
  });

  it('successfully creates new calendar entry', async () => {
    const user = userEvent.setup();
    
    // Mock successful creation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: '2',
        title: 'New Entry',
        description: 'Test description',
        start_date: '2025-07-15',
        end_date: '2025-07-15',
        entry_type: 'MEETING',
        user_id: 'user1',
        team_id: 'team1'
      })
    });

    render(<CalendarPage />);

    // Open create modal
    await user.click(screen.getByText('Create Entry'));

    // Fill form with valid data
    await user.type(screen.getByLabelText('Title:'), 'New Entry');
    await user.type(screen.getByLabelText('Description:'), 'Test description');
    await user.type(screen.getByLabelText('Start Date:'), '2025-07-15');
    await user.type(screen.getByLabelText('End Date:'), '2025-07-15');
    await user.selectOptions(screen.getByLabelText('Type:'), 'MEETING');

    const submitButton = screen.getByText('Create');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Calendar entry created successfully!')).toBeInTheDocument();
    });

    // Modal should close
    expect(screen.queryByText('Create Calendar Entry')).not.toBeInTheDocument();
  });

  it('handles API errors when creating entry', async () => {
    const user = userEvent.setup();
    
    // Mock API error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Invalid data provided' })
    });

    render(<CalendarPage />);

    // Open create modal and fill form
    await user.click(screen.getByText('Create Entry'));
    await user.type(screen.getByLabelText('Title:'), 'Test Entry');
    await user.type(screen.getByLabelText('Start Date:'), '2025-07-15');
    await user.type(screen.getByLabelText('End Date:'), '2025-07-15');

    const submitButton = screen.getByText('Create');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error creating calendar entry: Invalid data provided')).toBeInTheDocument();
    });
  });

  it('filters entries by team selection', async () => {
    const user = userEvent.setup();
    render(<CalendarPage />);

    const teamFilter = screen.getByLabelText('Filter by Team:');
    await user.selectOptions(teamFilter, 'team1');

    // Should trigger API call with team filter
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('team=team1'),
        expect.any(Object)
      );
    });
  });

  it('filters entries by month selection', async () => {
    const user = userEvent.setup();
    render(<CalendarPage />);

    const monthFilter = screen.getByLabelText('Filter by Month:');
    await user.selectOptions(monthFilter, '2025-08');

    // Should trigger API call with month filter
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('month=2025-08'),
        expect.any(Object)
      );
    });
  });

  it('opens edit modal when entry is clicked', async () => {
    const user = userEvent.setup();
    
    const mockEntries = [
      {
        id: '1',
        title: 'Existing Entry',
        description: 'Test description',
        start_date: '2025-07-15',
        end_date: '2025-07-15',
        entry_type: 'PTO',
        user_id: 'user1',
        team_id: 'team1'
      }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEntries
    });

    render(<CalendarPage />);

    await waitFor(() => {
      expect(screen.getByText('Existing Entry')).toBeInTheDocument();
    });

    // Click on the entry
    await user.click(screen.getByText('Existing Entry'));

    expect(screen.getByText('Edit Calendar Entry')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing Entry')).toBeInTheDocument();
  });

  it('successfully updates existing entry', async () => {
    const user = userEvent.setup();
    
    const mockEntries = [
      {
        id: '1',
        title: 'Original Entry',
        description: 'Original description',
        start_date: '2025-07-15',
        end_date: '2025-07-15',
        entry_type: 'PTO',
        user_id: 'user1',
        team_id: 'team1'
      }
    ];

    // Mock initial load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEntries
    });

    // Mock successful update
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockEntries[0],
        title: 'Updated Entry'
      })
    });

    render(<CalendarPage />);

    await waitFor(() => {
      expect(screen.getByText('Original Entry')).toBeInTheDocument();
    });

    // Click to edit
    await user.click(screen.getByText('Original Entry'));

    // Update title
    const titleInput = screen.getByDisplayValue('Original Entry');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Entry');

    const updateButton = screen.getByText('Update');
    await user.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('Calendar entry updated successfully!')).toBeInTheDocument();
    });
  });

  it('successfully deletes entry', async () => {
    const user = userEvent.setup();
    
    const mockEntries = [
      {
        id: '1',
        title: 'Entry to Delete',
        description: 'Will be deleted',
        start_date: '2025-07-15',
        end_date: '2025-07-15',
        entry_type: 'PTO',
        user_id: 'user1',
        team_id: 'team1'
      }
    ];

    // Mock initial load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEntries
    });

    // Mock successful deletion
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Calendar entry deleted successfully' })
    });

    render(<CalendarPage />);

    await waitFor(() => {
      expect(screen.getByText('Entry to Delete')).toBeInTheDocument();
    });

    // Click to edit/view entry
    await user.click(screen.getByText('Entry to Delete'));

    // Click delete button
    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Calendar entry deleted successfully!')).toBeInTheDocument();
    });
  });

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<CalendarPage />);

    // Open create modal
    await user.click(screen.getByText('Create Entry'));
    expect(screen.getByText('Create Calendar Entry')).toBeInTheDocument();

    // Click cancel
    await user.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Create Calendar Entry')).not.toBeInTheDocument();
  });

  it('displays empty state when no entries', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([])
    });

    render(<CalendarPage />);

    await waitFor(() => {
      expect(screen.getByText('No calendar entries found.')).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<CalendarPage />);

    await waitFor(() => {
      expect(screen.getByText('Error loading calendar entries. Please try again.')).toBeInTheDocument();
    });
  });
});