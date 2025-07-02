import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "../RegisterPage";

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = fetch as any;

describe("RegisterPage", () => {
	beforeEach(() => {
		mockFetch.mockClear();
		// Mock successful email check by default
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ available: true })
		});
	});

	it("renders registration form with all required elements", () => {
		render(<RegisterPage />);

		expect(screen.getByText("Create Your Account")).toBeInTheDocument();
		expect(screen.getByLabelText("First Name")).toBeInTheDocument();
		expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
		expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
		expect(screen.getByLabelText("Organization")).toBeInTheDocument();
		expect(screen.getByLabelText("Role")).toBeInTheDocument();
		expect(screen.getByLabelText("Password")).toBeInTheDocument();
		expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
		expect(screen.getByText("Create Account")).toBeInTheDocument();
	});

	it("validates required fields", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		const submitButton = screen.getByText("Create Account");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("First name is required")).toBeInTheDocument();
			expect(screen.getByText("Last name is required")).toBeInTheDocument();
			expect(screen.getByText("Email is required")).toBeInTheDocument();
			expect(screen.getByText("Organization is required")).toBeInTheDocument();
			expect(screen.getByText("Please select your role")).toBeInTheDocument();
			expect(screen.getByText("Password is required")).toBeInTheDocument();
			expect(screen.getByText("Please confirm your password")).toBeInTheDocument();
			expect(screen.getByText("You must agree to the Terms of Service and Privacy Policy")).toBeInTheDocument();
		});
	});

	it("validates email format", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		const emailInput = screen.getByLabelText("Email Address");
		await user.type(emailInput, "invalid-email");

		const submitButton = screen.getByText("Create Account");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
		});
	});

	it("validates name length limits", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		// Test first name too long
		const firstNameInput = screen.getByLabelText("First Name");
		await user.type(firstNameInput, "a".repeat(51)); // Too long

		const submitButton = screen.getByText("Create Account");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("First name must be less than 50 characters")).toBeInTheDocument();
		});

		// Test last name too long
		await user.clear(firstNameInput);
		await user.type(firstNameInput, "Valid");

		const lastNameInput = screen.getByLabelText("Last Name");
		await user.type(lastNameInput, "a".repeat(51)); // Too long

		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Last name must be less than 50 characters")).toBeInTheDocument();
		});
	});

	it("validates organization field requirements", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		const organizationInput = screen.getByLabelText("Organization");
		const submitButton = screen.getByText("Create Account");

		// Test organization too long
		await user.type(organizationInput, "a".repeat(101)); // Too long (100 char limit)
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Organization name must be less than 100 characters")).toBeInTheDocument();
		});

		// Test valid organization
		await user.clear(organizationInput);
		await user.type(organizationInput, "Acme Corporation");

		// Should not show length error anymore
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.queryByText("Organization name must be less than 100 characters")).not.toBeInTheDocument();
		});
	});

	it("accepts valid organization names", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		const organizationInput = screen.getByLabelText("Organization");

		// Test various valid organization formats
		const validOrgs = [
			"Acme Corp",
			"TechStart Inc.",
			"Global Solutions LLC",
			"Non-Profit Foundation",
			"University of Technology",
			"123 Industries"
		];

		for (const org of validOrgs) {
			await user.clear(organizationInput);
			await user.type(organizationInput, org);
			expect(organizationInput).toHaveValue(org);
		}
	});

	it("shows password strength indicator", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		const passwordInput = screen.getByLabelText("Password");

		// Test weak password
		await user.type(passwordInput, "weak");
		expect(screen.getByText("Very Weak")).toBeInTheDocument();

		// Test stronger password
		await user.clear(passwordInput);
		await user.type(passwordInput, "StrongPass123!");

		await waitFor(() => {
			expect(screen.getByText("Excellent")).toBeInTheDocument();
		});
	});

	it("validates password requirements", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		const passwordInput = screen.getByLabelText("Password");

		// Type a password that doesn't meet all requirements
		await user.type(passwordInput, "weak");

		// Check that requirements are shown
		expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
		expect(screen.getByText("One uppercase letter (A-Z)")).toBeInTheDocument();
		expect(screen.getByText("One lowercase letter (a-z)")).toBeInTheDocument();
		expect(screen.getByText("One number (0-9)")).toBeInTheDocument();
		expect(screen.getByText("One symbol (!@#$%^&*)")).toBeInTheDocument();

		// Try to submit with weak password
		const submitButton = screen.getByText("Create Account");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Password does not meet all requirements")).toBeInTheDocument();
		});
	});

	it("validates password confirmation", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		const passwordInput = screen.getByLabelText("Password");
		const confirmPasswordInput = screen.getByLabelText("Confirm Password");

		await user.type(passwordInput, "StrongPass123!");
		await user.type(confirmPasswordInput, "DifferentPassword");

		const submitButton = screen.getByText("Create Account");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
		});
	});

	it("toggles password visibility", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
		const confirmPasswordInput = screen.getByLabelText("Confirm Password") as HTMLInputElement;

		// Initially passwords should be hidden
		expect(passwordInput.type).toBe("password");
		expect(confirmPasswordInput.type).toBe("password");

		// Show password
		const showPasswordButtons = screen.getAllByText("Show");
		await user.click(showPasswordButtons[0]);
		expect(passwordInput.type).toBe("text");
		expect(screen.getByText("Hide")).toBeInTheDocument();

		// Show confirm password
		await user.click(showPasswordButtons[1]);
		expect(confirmPasswordInput.type).toBe("text");

		// Hide password again
		await user.click(screen.getByText("Hide"));
		expect(passwordInput.type).toBe("password");
	});

	it("checks email availability", async () => {
		const user = userEvent.setup();

		// Mock email availability check
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ available: true })
		});

		render(<RegisterPage />);

		const emailInput = screen.getByLabelText("Email Address");
		await user.type(emailInput, "test@example.com");

		await waitFor(() => {
			expect(screen.getByText("✓ Email is available")).toBeInTheDocument();
		});
	});

	it("shows error when email is already registered", async () => {
		const user = userEvent.setup();

		// Mock email already taken
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ available: false })
		});

		render(<RegisterPage />);

		const emailInput = screen.getByLabelText("Email Address");
		await user.type(emailInput, "taken@example.com");

		await waitFor(() => {
			expect(screen.getByText("✗ Email is already registered")).toBeInTheDocument();
		});

		// Try to submit with taken email
		await user.type(screen.getByLabelText("First Name"), "Test");
		await user.type(screen.getByLabelText("Last Name"), "User");
		await user.type(screen.getByLabelText("Organization"), "Test Corp");
		await user.selectOptions(screen.getByLabelText("Role"), "team_member");
		await user.type(screen.getByLabelText("Password"), "StrongPass123!");
		await user.type(screen.getByLabelText("Confirm Password"), "StrongPass123!");
		await user.click(screen.getByRole("checkbox"));

		const submitButton = screen.getByText("Create Account");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("This email address is already registered")).toBeInTheDocument();
		});
	});

	it("validates terms agreement", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		// Fill form but don't check terms
		await user.type(screen.getByLabelText("First Name"), "Test");
		await user.type(screen.getByLabelText("Last Name"), "User");
		await user.type(screen.getByLabelText("Email Address"), "test@example.com");
		await user.type(screen.getByLabelText("Organization"), "Test Corp");
		await user.selectOptions(screen.getByLabelText("Role"), "team_member");
		await user.type(screen.getByLabelText("Password"), "StrongPass123!");
		await user.type(screen.getByLabelText("Confirm Password"), "StrongPass123!");

		const submitButton = screen.getByText("Create Account");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("You must agree to the Terms of Service and Privacy Policy")).toBeInTheDocument();
		});
	});

	it("successfully registers user with valid data", async () => {
		const user = userEvent.setup();

		// Mock email check
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ available: true })
		});

		// Mock successful registration
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "1",
				email: "test@example.com",
				first_name: "Test",
				last_name: "User"
			})
		});

		render(<RegisterPage />);

		// Fill valid form
		await user.type(screen.getByLabelText("First Name"), "Test");
		await user.type(screen.getByLabelText("Last Name"), "User");
		await user.type(screen.getByLabelText("Email Address"), "test@example.com");
		await user.type(screen.getByLabelText("Organization"), "Test Corporation");
		await user.selectOptions(screen.getByLabelText("Role"), "team_member");
		await user.type(screen.getByLabelText("Password"), "StrongPass123!");
		await user.type(screen.getByLabelText("Confirm Password"), "StrongPass123!");
		await user.click(screen.getByRole("checkbox"));

		const submitButton = screen.getByText("Create Account");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Account Created Successfully!")).toBeInTheDocument();
		});

		expect(
			screen.getByText("Welcome to Zentropy! Your account has been created and you're now logged in.")
		).toBeInTheDocument();
		expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
	});

	it("handles registration API errors", async () => {
		const user = userEvent.setup();

		// Mock email check
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ available: true })
		});

		// Mock registration error
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({ message: "Registration failed: Email already exists" })
		});

		render(<RegisterPage />);

		// Fill valid form
		await user.type(screen.getByLabelText("First Name"), "Test");
		await user.type(screen.getByLabelText("Last Name"), "User");
		await user.type(screen.getByLabelText("Email Address"), "test@example.com");
		await user.type(screen.getByLabelText("Organization"), "Test Corporation");
		await user.selectOptions(screen.getByLabelText("Role"), "team_member");
		await user.type(screen.getByLabelText("Password"), "StrongPass123!");
		await user.type(screen.getByLabelText("Confirm Password"), "StrongPass123!");
		await user.click(screen.getByRole("checkbox"));

		const submitButton = screen.getByText("Create Account");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Registration failed: Email already exists")).toBeInTheDocument();
		});
	});

	it("shows loading state during registration", async () => {
		const user = userEvent.setup();

		// Mock email check
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ available: true })
		});

		// Mock delayed registration response
		let resolveRegistration: (value: any) => void;
		const registrationPromise = new Promise(resolve => {
			resolveRegistration = resolve;
		});

		mockFetch.mockReturnValueOnce(registrationPromise);

		render(<RegisterPage />);

		// Fill valid form
		await user.type(screen.getByLabelText("First Name"), "Test");
		await user.type(screen.getByLabelText("Last Name"), "User");
		await user.type(screen.getByLabelText("Email Address"), "test@example.com");
		await user.type(screen.getByLabelText("Organization"), "Test Corporation");
		await user.selectOptions(screen.getByLabelText("Role"), "team_member");
		await user.type(screen.getByLabelText("Password"), "StrongPass123!");
		await user.type(screen.getByLabelText("Confirm Password"), "StrongPass123!");
		await user.click(screen.getByRole("checkbox"));

		const submitButton = screen.getByText("Create Account");
		await user.click(submitButton);

		// Should show loading state
		expect(screen.getByText("Creating Account...")).toBeInTheDocument();
		expect(submitButton).toBeDisabled();

		// Resolve the promise
		resolveRegistration!({
			ok: true,
			json: async () => ({ id: "1", email: "test@example.com" })
		});

		await waitFor(() => {
			expect(screen.getByText("Account Created Successfully!")).toBeInTheDocument();
		});
	});

	it("disables submit button when form is invalid", async () => {
		const user = userEvent.setup();
		render(<RegisterPage />);

		const submitButton = screen.getByText("Create Account");

		// Initially disabled
		expect(submitButton).toBeDisabled();

		// Still disabled with partial form
		await user.type(screen.getByLabelText("First Name"), "Test");
		expect(submitButton).toBeDisabled();

		// Still disabled with weak password
		await user.type(screen.getByLabelText("Last Name"), "User");
		await user.type(screen.getByLabelText("Email Address"), "test@example.com");
		await user.type(screen.getByLabelText("Organization"), "Test Corp");
		await user.selectOptions(screen.getByLabelText("Role"), "team_member");
		await user.type(screen.getByLabelText("Password"), "weak");
		await user.type(screen.getByLabelText("Confirm Password"), "weak");
		await user.click(screen.getByRole("checkbox"));

		expect(submitButton).toBeDisabled();
	});

	it("enables submit button when form is valid", async () => {
		const user = userEvent.setup();

		// Mock email availability
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ available: true })
		});

		render(<RegisterPage />);

		// Fill complete valid form
		await user.type(screen.getByLabelText("First Name"), "Test");
		await user.type(screen.getByLabelText("Last Name"), "User");
		await user.type(screen.getByLabelText("Email Address"), "test@example.com");
		await user.type(screen.getByLabelText("Organization"), "Test Corp");
		await user.selectOptions(screen.getByLabelText("Role"), "team_member");
		await user.type(screen.getByLabelText("Password"), "StrongPass123!");
		await user.type(screen.getByLabelText("Confirm Password"), "StrongPass123!");
		await user.click(screen.getByRole("checkbox"));

		await waitFor(() => {
			const submitButton = screen.getByText("Create Account");
			expect(submitButton).not.toBeDisabled();
		});
	});

	it("handles network errors during email check gracefully", async () => {
		const user = userEvent.setup();

		// Mock network error for email check
		mockFetch.mockRejectedValueOnce(new Error("Network error"));

		render(<RegisterPage />);

		const emailInput = screen.getByLabelText("Email Address");
		await user.type(emailInput, "test@example.com");

		// Should not crash and email availability should be null (no indicator shown)
		await waitFor(
			() => {
				expect(screen.queryByText("✓ Email is available")).not.toBeInTheDocument();
				expect(screen.queryByText("✗ Email is already registered")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});

	it("shows role selection help text", () => {
		render(<RegisterPage />);

		expect(screen.getByText("Team Leads can manage team settings and member access")).toBeInTheDocument();
	});

	it("shows rate limiting information", () => {
		render(<RegisterPage />);

		expect(
			screen.getByText("For security, only 2 account registrations are allowed per hour from each location.")
		).toBeInTheDocument();
	});

	it("has link to login page", () => {
		render(<RegisterPage />);

		expect(screen.getByText("Already have an account?")).toBeInTheDocument();
		expect(screen.getByText("Sign in here")).toBeInTheDocument();
	});

	it("auto-dismisses toast after 5 seconds", async () => {
		vi.useFakeTimers();

		const user = userEvent.setup();

		// Mock email check and failed registration
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ available: true })
		});

		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({ message: "Test error" })
		});

		render(<RegisterPage />);

		// Fill form and submit to trigger error toast
		await user.type(screen.getByLabelText("First Name"), "Test");
		await user.type(screen.getByLabelText("Last Name"), "User");
		await user.type(screen.getByLabelText("Email Address"), "test@example.com");
		await user.type(screen.getByLabelText("Organization"), "Test Corp");
		await user.selectOptions(screen.getByLabelText("Role"), "team_member");
		await user.type(screen.getByLabelText("Password"), "StrongPass123!");
		await user.type(screen.getByLabelText("Confirm Password"), "StrongPass123!");
		await user.click(screen.getByRole("checkbox"));
		await user.click(screen.getByText("Create Account"));

		await waitFor(() => {
			expect(screen.getByText("Test error")).toBeInTheDocument();
		});

		// Fast-forward 5 seconds
		vi.advanceTimersByTime(5000);

		await waitFor(() => {
			expect(screen.queryByText("Test error")).not.toBeInTheDocument();
		});

		vi.useRealTimers();
	});

	it("allows manual dismissal of toast", async () => {
		const user = userEvent.setup();

		// Mock email check and failed registration
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ available: true })
		});

		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({ message: "Test error" })
		});

		render(<RegisterPage />);

		// Fill form and submit to trigger error toast
		await user.type(screen.getByLabelText("First Name"), "Test");
		await user.type(screen.getByLabelText("Last Name"), "User");
		await user.type(screen.getByLabelText("Email Address"), "test@example.com");
		await user.type(screen.getByLabelText("Organization"), "Test Corp");
		await user.selectOptions(screen.getByLabelText("Role"), "team_member");
		await user.type(screen.getByLabelText("Password"), "StrongPass123!");
		await user.type(screen.getByLabelText("Confirm Password"), "StrongPass123!");
		await user.click(screen.getByRole("checkbox"));
		await user.click(screen.getByText("Create Account"));

		await waitFor(() => {
			expect(screen.getByText("Test error")).toBeInTheDocument();
		});

		// Click dismiss button
		const dismissButton = screen.getByText("×");
		await user.click(dismissButton);

		expect(screen.queryByText("Test error")).not.toBeInTheDocument();
	});

	it("redirects to dashboard when success modal button is clicked", async () => {
		const user = userEvent.setup();

		// Mock window.location.href
		const mockLocation = { href: "" };
		Object.defineProperty(window, "location", {
			value: mockLocation,
			writable: true
		});

		// Mock email check and successful registration
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ available: true })
		});

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ id: "1", email: "test@example.com" })
		});

		render(<RegisterPage />);

		// Fill form and submit
		await user.type(screen.getByLabelText("First Name"), "Test");
		await user.type(screen.getByLabelText("Last Name"), "User");
		await user.type(screen.getByLabelText("Email Address"), "test@example.com");
		await user.type(screen.getByLabelText("Organization"), "Test Corp");
		await user.selectOptions(screen.getByLabelText("Role"), "team_member");
		await user.type(screen.getByLabelText("Password"), "StrongPass123!");
		await user.type(screen.getByLabelText("Confirm Password"), "StrongPass123!");
		await user.click(screen.getByRole("checkbox"));
		await user.click(screen.getByText("Create Account"));

		await waitFor(() => {
			expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
		});

		// Click dashboard button
		await user.click(screen.getByText("Go to Dashboard"));

		expect(mockLocation.href).toBe("/dashboard");
	});
});
