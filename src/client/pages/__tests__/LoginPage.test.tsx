import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../LoginPage';

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = fetch as any;

describe('LoginPage', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Clear localStorage
    localStorage.clear();
  });

  it('renders login form with all required elements', () => {
    render(<LoginPage />);
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText('Email:')).toBeInTheDocument();
    expect(screen.getByLabelText('Password:')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Show')).toBeInTheDocument(); // Password visibility toggle
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const submitButton = screen.getByText('Sign In');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email:');
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByText('Sign In');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('validates password minimum length', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, '123'); // Too short

    const submitButton = screen.getByText('Sign In');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText('Password:') as HTMLInputElement;
    const toggleButton = screen.getByText('Show');

    // Initially password should be hidden
    expect(passwordInput.type).toBe('password');

    // Click to show password
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');
    expect(screen.getByText('Hide')).toBeInTheDocument();

    // Click to hide password again
    await user.click(screen.getByText('Hide'));
    expect(passwordInput.type).toBe('password');
    expect(screen.getByText('Show')).toBeInTheDocument();
  });

  it('successfully logs in with valid credentials', async () => {
    const user = userEvent.setup();
    
    // Mock successful login response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'fake_token',
        token_type: 'bearer',
        user: {
          id: '1',
          email: 'test@example.com',
          username: 'testuser'
        }
      })
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByText('Sign In');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'correct_password');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Login successful! Redirecting...')).toBeInTheDocument();
    });

    // Check that token is stored in localStorage
    expect(localStorage.getItem('access_token')).toBe('fake_token');
    expect(localStorage.getItem('user')).toBe(JSON.stringify({
      id: '1',
      email: 'test@example.com',
      username: 'testuser'
    }));
  });

  it('displays error for invalid credentials', async () => {
    const user = userEvent.setup();
    
    // Mock failed login response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        detail: 'Invalid credentials'
      })
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByText('Sign In');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrong_password');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    // Check that no token is stored
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByText('Sign In');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network error occurred. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows loading state during login request', async () => {
    const user = userEvent.setup();
    
    // Mock delayed response
    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    
    mockFetch.mockReturnValueOnce(loginPromise);

    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByText('Sign In');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Should show loading state
    expect(screen.getByText('Signing In...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Resolve the promise
    resolveLogin!({
      ok: true,
      json: async () => ({
        access_token: 'token',
        token_type: 'bearer',
        user: { id: '1', email: 'test@example.com', username: 'test' }
      })
    });

    await waitFor(() => {
      expect(screen.getByText('Login successful! Redirecting...')).toBeInTheDocument();
    });
  });

  it('disables form submission during loading', async () => {
    const user = userEvent.setup();
    
    // Mock delayed response
    const loginPromise = new Promise(() => {}); // Never resolves
    mockFetch.mockReturnValueOnce(loginPromise);

    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByText('Sign In');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Should be in loading state
    expect(screen.getByText('Signing In...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
  });

  it('handles different HTTP error status codes', async () => {
    const user = userEvent.setup();
    
    const testCases = [
      { status: 400, expectedMessage: 'Bad request. Please check your input.' },
      { status: 403, expectedMessage: 'Access forbidden. Please contact support.' },
      { status: 500, expectedMessage: 'Server error. Please try again later.' },
      { status: 429, expectedMessage: 'Too many attempts. Please wait before trying again.' }
    ];

    for (const testCase of testCases) {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: testCase.status,
        json: async () => ({ detail: 'Server error' })
      });

      render(<LoginPage />);

      const emailInput = screen.getByLabelText('Email:');
      const passwordInput = screen.getByLabelText('Password:');
      const submitButton = screen.getByText('Sign In');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(testCase.expectedMessage)).toBeInTheDocument();
      });

      // Clean up for next test
      screen.getByTestId('login-form').remove();
    }
  });

  it('clears error messages when user starts typing', async () => {
    const user = userEvent.setup();
    
    // First show an error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid credentials' })
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByText('Sign In');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrong_password');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    // Start typing again - error should clear
    await user.type(emailInput, 'a');

    expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
  });

  it('remembers user preference for password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText('Password:') as HTMLInputElement;
    const toggleButton = screen.getByText('Show');

    // Show password
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    // Type some text
    await user.type(passwordInput, 'password');

    // Password should still be visible
    expect(passwordInput.type).toBe('text');
    expect(screen.getByText('Hide')).toBeInTheDocument();
  });

  it('focuses on email input when page loads', () => {
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText('Email:');
    expect(emailInput).toHaveFocus();
  });

  it('allows keyboard navigation through form', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByText('Sign In');

    // Start at email input
    expect(emailInput).toHaveFocus();

    // Tab to password input
    await user.tab();
    expect(passwordInput).toHaveFocus();

    // Tab to password toggle
    await user.tab();
    expect(screen.getByText('Show')).toHaveFocus();

    // Tab to submit button
    await user.tab();
    expect(submitButton).toHaveFocus();
  });
});