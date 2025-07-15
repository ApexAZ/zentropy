import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import ProfilePage from "../ProfilePage";
import { ToastProvider } from "../../contexts/ToastContext";

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = fetch as any;

const mockUser = {
	id: "user-123",
	username: "testuser",
	email: "test@example.com",
	first_name: "Test",
	last_name: "User",
	role: "team_member",
	created_at: "2025-01-01T00:00:00Z",
	updated_at: "2025-01-01T00:00:00Z"
};

// Helper function to render ProfilePage with required providers
const renderProfilePage = () => {
	return render(
		<ToastProvider>
			<ProfilePage />
		</ToastProvider>
	);
};

describe("ProfilePage", () => {
	beforeEach(() => {
		mockFetch.mockClear();
		vi.useRealTimers(); // Ensure real timers before each test
		// Mock all ProfilePage API calls by default with robust URL-based implementation
		mockFetch.mockImplementation((url: string, options?: any) => {
			if (url.includes("/api/v1/users/me") && !options?.method) {
				// GET /api/v1/users/me - Load profile
				return Promise.resolve({
					ok: true,
					json: async () => mockUser
				});
			}
			if (url.includes("/api/v1/users/me") && options?.method === "PUT") {
				// PUT /api/v1/users/me - Update profile
				return Promise.resolve({
					ok: true,
					json: async () => mockUser
				});
			}
			if (url.includes("/api/v1/users/me/password") && options?.method === "PUT") {
				// PUT /api/v1/users/me/password - Update password
				return Promise.resolve({
					ok: true,
					json: async () => ({ message: "Password updated successfully" })
				});
			}
			return Promise.reject(new Error(`Unhandled API call in mock: ${url}`));
		});
	});

	afterEach(() => {
		vi.useRealTimers(); // Cleanup fake timers after each test
	});

	it("renders profile page with main elements", async () => {
		await act(async () => {
			renderProfilePage();
		});

		expect(screen.getByText("My Profile")).toBeInTheDocument();
		expect(screen.getByText("Manage your account information and security settings")).toBeInTheDocument();
	});

	it("displays loading state initially", async () => {
		// Add a delay to the mock to see loading state
		mockFetch.mockImplementationOnce(
			() =>
				new Promise(resolve =>
					setTimeout(
						() =>
							resolve({
								ok: true,
								json: async () => mockUser
							}),
						100
					)
				)
		);

		await act(async () => {
			renderProfilePage();
		});

		expect(screen.getByText("Loading profile...")).toBeInTheDocument();
	});

	it("loads and displays user profile", async () => {
		renderProfilePage();

		await waitFor(() => {
			expect(screen.getByText("Profile Information")).toBeInTheDocument();
		});

		expect(screen.getByText("Test User")).toBeInTheDocument();
		expect(screen.getByText("test@example.com")).toBeInTheDocument();
		expect(screen.getAllByText("Team Member")).toHaveLength(2); // Role label and badge
		expect(screen.getByText("testuser")).toBeInTheDocument();
		expect(screen.getByText("user-123")).toBeInTheDocument();
	});

	it("handles API errors gracefully", async () => {
		mockFetch.mockRejectedValueOnce(new Error("Network error"));

		renderProfilePage();

		await waitFor(() => {
			expect(screen.getByText("Unable to Load Profile")).toBeInTheDocument();
		});

		expect(screen.getByText("Network error")).toBeInTheDocument();
		expect(screen.getByText("Retry")).toBeInTheDocument();
	});

	it("displays different role badges correctly", async () => {
		const adminUser = { ...mockUser, role: "admin" };
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => adminUser
		});

		renderProfilePage();

		await waitFor(() => {
			expect(screen.getAllByText("Administrator")).toHaveLength(2); // Role label and badge
		});
	});

	it("opens profile edit form when Edit Profile button is clicked", async () => {
		const user = userEvent.setup();
		renderProfilePage();

		await waitFor(() => {
			expect(screen.getByText("Edit Profile")).toBeInTheDocument();
		});

		const editButton = screen.getByText("Edit Profile");
		await user.click(editButton);

		expect(screen.getByLabelText("First Name")).toBeInTheDocument();
		expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
		expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
		expect(screen.getByText("Save Changes")).toBeInTheDocument();
		expect(screen.getByText("Cancel")).toBeInTheDocument();
	});

	it("validates profile form fields", async () => {
		const user = userEvent.setup();
		renderProfilePage();

		await waitFor(() => {
			expect(screen.getByText("Edit Profile")).toBeInTheDocument();
		});

		// Open edit form
		await user.click(screen.getByText("Edit Profile"));

		// Wait for form to be ready and inputs to be populated
		await waitFor(() => {
			expect(screen.getByLabelText("First Name")).toBeInTheDocument();
			expect((screen.getByLabelText("First Name") as HTMLInputElement).value).toBe("Test");
		});

		// Clear the first name field to make it invalid
		const firstNameInput = screen.getByLabelText("First Name") as HTMLInputElement;
		await user.clear(firstNameInput);
		expect(firstNameInput.value).toBe("");

		// Make email invalid too
		const emailInput = screen.getByLabelText("Email Address") as HTMLInputElement;
		await user.clear(emailInput);
		await user.type(emailInput, "invalid-email");
		expect(emailInput.value).toBe("invalid-email");

		// Submit the form by triggering the form submit event
		const form = document.querySelector("form");
		fireEvent.submit(form!);

		// Wait for validation errors to appear
		await waitFor(() => {
			expect(screen.getByText("First name is required")).toBeInTheDocument();
		});

		expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
	});

	it("validates profile field length limits", async () => {
		const user = userEvent.setup();
		renderProfilePage();

		await waitFor(() => {
			expect(screen.getByText("Edit Profile")).toBeInTheDocument();
		});

		// Open edit form
		await user.click(screen.getByText("Edit Profile"));

		// Test first name too long
		const firstNameInput = screen.getByLabelText("First Name");
		await user.clear(firstNameInput);
		await user.type(firstNameInput, "a".repeat(101)); // Too long

		const submitButton = screen.getByText("Save Changes");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("First name must be less than 100 characters")).toBeInTheDocument();
		});
	});

	it("successfully updates profile with valid data", async () => {
		const user = userEvent.setup();

		// Mock initial load and successful update
		const updatedUser = { ...mockUser, first_name: "Updated", last_name: "Name" };
		mockFetch.mockImplementation((url: string, options?: any) => {
			if (url.includes("/api/v1/users/me") && !options?.method) {
				// GET /api/v1/users/me - Initial load
				return Promise.resolve({
					ok: true,
					json: async () => mockUser
				});
			}
			if (url.includes("/api/v1/users/me") && options?.method === "PUT") {
				// PUT /api/v1/users/me - Update profile
				return Promise.resolve({
					ok: true,
					json: async () => updatedUser
				});
			}
			return Promise.reject(new Error(`Unhandled API call: ${url}`));
		});

		renderProfilePage();

		await waitFor(() => {
			expect(screen.getByText("Edit Profile")).toBeInTheDocument();
		});

		// Open edit form
		await user.click(screen.getByText("Edit Profile"));

		// Update name
		const firstNameInput = screen.getByLabelText("First Name");
		await user.clear(firstNameInput);
		await user.type(firstNameInput, "Updated");

		const lastNameInput = screen.getByLabelText("Last Name");
		await user.clear(lastNameInput);
		await user.type(lastNameInput, "Name");

		const submitButton = screen.getByText("Save Changes");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Profile updated successfully!")).toBeInTheDocument();
		});

		// Should exit edit mode and show updated data
		await waitFor(() => {
			expect(screen.getByText("Updated Name")).toBeInTheDocument();
		});
		expect(screen.queryByLabelText("First Name")).not.toBeInTheDocument();
	});

	it("handles profile update API errors", async () => {
		const user = userEvent.setup();

		// Mock initial load success and update error
		mockFetch.mockImplementation((url: string, options?: any) => {
			if (url.includes("/api/v1/users/me") && !options?.method) {
				// GET /api/v1/users/me - Initial load succeeds
				return Promise.resolve({
					ok: true,
					json: async () => mockUser
				});
			}
			if (url.includes("/api/v1/users/me") && options?.method === "PUT") {
				// PUT /api/v1/users/me - Update fails
				return Promise.resolve({
					ok: false,
					status: 400,
					json: async () => ({ message: "Email already exists" })
				});
			}
			return Promise.reject(new Error(`Unhandled API call: ${url}`));
		});

		renderProfilePage();

		await waitFor(() => {
			expect(screen.getByText("Edit Profile")).toBeInTheDocument();
		});

		// Open edit form and submit
		await user.click(screen.getByText("Edit Profile"));
		await user.click(screen.getByText("Save Changes"));

		await waitFor(() => {
			expect(screen.getByText("Email already exists")).toBeInTheDocument();
		});
	});

	it("cancels profile edit and restores original data", async () => {
		const user = userEvent.setup();
		renderProfilePage();

		await waitFor(() => {
			expect(screen.getByText("Edit Profile")).toBeInTheDocument();
		});

		// Open edit form
		await user.click(screen.getByText("Edit Profile"));

		// Make changes
		const firstNameInput = screen.getByLabelText("First Name");
		await user.clear(firstNameInput);
		await user.type(firstNameInput, "Changed");

		// Cancel
		const cancelButton = screen.getByText("Cancel");
		await user.click(cancelButton);

		// Should restore original data and exit edit mode
		expect(screen.getByText("Test User")).toBeInTheDocument();
		expect(screen.queryByLabelText("First Name")).not.toBeInTheDocument();
	});

	it("opens password change form when Change Password button is clicked", async () => {
		const user = userEvent.setup();
		renderProfilePage();

		// Navigate to Security tab first
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
		});

		const securityTab = screen.getByRole("tab", { name: "Security" });
		await user.click(securityTab);

		await waitFor(() => {
			expect(screen.getByText("Change Password")).toBeInTheDocument();
		});

		const changePasswordButton = screen.getByText("Change Password");
		await user.click(changePasswordButton);

		expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
		expect(screen.getByLabelText("New Password")).toBeInTheDocument();
		expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
		expect(screen.getByText("Update Password")).toBeInTheDocument();
	});

	it("validates password change form", async () => {
		const user = userEvent.setup();
		renderProfilePage();

		// Navigate to Security tab first
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
		});

		const securityTab = screen.getByRole("tab", { name: "Security" });
		await user.click(securityTab);

		await waitFor(() => {
			expect(screen.getByText("Change Password")).toBeInTheDocument();
		});

		// Open password change form
		await user.click(screen.getByText("Change Password"));

		// Try to submit empty form
		const submitButton = screen.getByText("Update Password");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Current password is required")).toBeInTheDocument();
			expect(screen.getByText("New password is required")).toBeInTheDocument();
			expect(screen.getByText("Please confirm your new password")).toBeInTheDocument();
		});
	});

	it("validates new password requirements", async () => {
		const user = userEvent.setup();
		renderProfilePage();

		// Navigate to Security tab first
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
		});

		const securityTab = screen.getByRole("tab", { name: "Security" });
		await user.click(securityTab);

		await waitFor(() => {
			expect(screen.getByText("Change Password")).toBeInTheDocument();
		});

		// Open password change form
		await user.click(screen.getByText("Change Password"));

		// Fill with weak password
		await user.type(screen.getByLabelText("Current Password"), "current123");
		await user.type(screen.getByLabelText("New Password"), "weak");
		await user.type(screen.getByLabelText("Confirm New Password"), "weak");

		const submitButton = screen.getByText("Update Password");
		await user.click(submitButton);

		await waitFor(() => {
			expect(
				screen.getByText(
					"Password must contain at least 8 characters, one uppercase letter, one number, one special character"
				)
			).toBeInTheDocument();
		});
	});

	it("validates password confirmation match", async () => {
		const user = userEvent.setup();
		renderProfilePage();

		// Navigate to Security tab first
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
		});

		const securityTab = screen.getByRole("tab", { name: "Security" });
		await user.click(securityTab);

		await waitFor(() => {
			expect(screen.getByText("Change Password")).toBeInTheDocument();
		});

		// Open password change form
		await user.click(screen.getByText("Change Password"));

		// Fill with mismatched passwords
		await user.type(screen.getByLabelText("Current Password"), "current123");
		await user.type(screen.getByLabelText("New Password"), "StrongPass123!");
		await user.type(screen.getByLabelText("Confirm New Password"), "DifferentPass123!");

		const submitButton = screen.getByText("Update Password");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
		});
	});

	it("successfully updates password with valid data", async () => {
		const user = userEvent.setup();

		// Mock successful password update
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ message: "Password updated successfully" })
		});

		renderProfilePage();

		// Navigate to Security tab first
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
		});

		const securityTab = screen.getByRole("tab", { name: "Security" });
		await user.click(securityTab);

		await waitFor(() => {
			expect(screen.getByText("Change Password")).toBeInTheDocument();
		});

		// Open password change form
		await user.click(screen.getByText("Change Password"));

		// Fill with valid data
		await user.type(screen.getByLabelText("Current Password"), "current123");
		await user.type(screen.getByLabelText("New Password"), "NewStrongPass123!");
		await user.type(screen.getByLabelText("Confirm New Password"), "NewStrongPass123!");

		const submitButton = screen.getByText("Update Password");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Password updated successfully!")).toBeInTheDocument();
		});

		// Should exit password change mode
		expect(screen.queryByLabelText("Current Password")).not.toBeInTheDocument();
	});

	it("handles password update API errors", async () => {
		const user = userEvent.setup();

		// Mock successful initial load and failed password update
		mockFetch.mockImplementation((url: string, options?: any) => {
			if (url.includes("/api/v1/users/me") && !options?.method) {
				// GET /api/v1/users/me - Initial load succeeds
				return Promise.resolve({
					ok: true,
					json: async () => mockUser
				});
			}
			if (url.includes("/api/v1/users/me/password") && options?.method === "PUT") {
				// PUT /api/v1/users/me/password - Password update fails
				return Promise.resolve({
					ok: false,
					status: 400,
					json: async () => ({ message: "Current password is incorrect" })
				});
			}
			return Promise.reject(new Error(`Unhandled API call: ${url}`));
		});

		renderProfilePage();

		// Navigate to Security tab first
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
		});

		const securityTab = screen.getByRole("tab", { name: "Security" });
		await user.click(securityTab);

		await waitFor(() => {
			expect(screen.getByText("Change Password")).toBeInTheDocument();
		});

		// Open password change form and submit
		await user.click(screen.getByText("Change Password"));
		await user.type(screen.getByLabelText("Current Password"), "wrong123");
		await user.type(screen.getByLabelText("New Password"), "NewStrongPass123!");
		await user.type(screen.getByLabelText("Confirm New Password"), "NewStrongPass123!");
		await user.click(screen.getByText("Update Password"));

		await waitFor(() => {
			expect(screen.getByText("Current password is incorrect")).toBeInTheDocument();
		});
	});

	it("cancels password change and clears form", async () => {
		const user = userEvent.setup();
		renderProfilePage();

		// Navigate to Security tab first
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
		});

		const securityTab = screen.getByRole("tab", { name: "Security" });
		await user.click(securityTab);

		await waitFor(() => {
			expect(screen.getByText("Change Password")).toBeInTheDocument();
		});

		// Open password change form
		await user.click(screen.getByText("Change Password"));

		// Fill form
		await user.type(screen.getByLabelText("Current Password"), "current123");
		await user.type(screen.getByLabelText("New Password"), "NewStrongPass123!");

		// Cancel
		const cancelButton = screen.getByText("Cancel");
		await user.click(cancelButton);

		// Should exit password change mode
		expect(screen.queryByLabelText("Current Password")).not.toBeInTheDocument();
	});

	it("toggles password visibility", async () => {
		const user = userEvent.setup();
		renderProfilePage();

		// Navigate to Security tab first
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
		});

		const securityTab = screen.getByRole("tab", { name: "Security" });
		await user.click(securityTab);

		await waitFor(() => {
			expect(screen.getByText("Change Password")).toBeInTheDocument();
		});

		// Open password change form
		await user.click(screen.getByText("Change Password"));

		const currentPasswordInput = screen.getByLabelText("Current Password") as HTMLInputElement;
		const newPasswordInput = screen.getByLabelText("New Password") as HTMLInputElement;
		const confirmPasswordInput = screen.getByLabelText("Confirm New Password") as HTMLInputElement;

		// Initially passwords should be hidden
		expect(currentPasswordInput.type).toBe("password");
		expect(newPasswordInput.type).toBe("password");
		expect(confirmPasswordInput.type).toBe("password");

		// Toggle visibility - find by emoji
		const eyeButtons = screen.getAllByText("👁️");
		await user.click(eyeButtons[0]); // Current password
		expect(currentPasswordInput.type).toBe("text");
		expect(screen.getByText("🙈")).toBeInTheDocument();

		await user.click(eyeButtons[1]); // New password
		expect(newPasswordInput.type).toBe("text");

		await user.click(eyeButtons[2]); // Confirm password
		expect(confirmPasswordInput.type).toBe("text");
	});

	it("displays password requirements help text", async () => {
		const user = userEvent.setup();
		renderProfilePage();

		// Navigate to Security tab first
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
		});

		const securityTab = screen.getByRole("tab", { name: "Security" });
		await user.click(securityTab);

		await waitFor(() => {
			expect(screen.getByText("Change Password")).toBeInTheDocument();
		});

		// Open password change form
		await user.click(screen.getByText("Change Password"));

		// Type a strong password and confirm to trigger all validations
		await user.type(screen.getByLabelText("New Password"), "StrongPass123!");
		await user.type(screen.getByLabelText("Confirm New Password"), "StrongPass123!");

		// Check for all requirement indicators to be displayed (the validation feedback)
		expect(screen.getByText("✓ At least 8 characters")).toBeInTheDocument();
		expect(screen.getByText("✓ One uppercase letter")).toBeInTheDocument();
		expect(screen.getByText("✓ One lowercase letter")).toBeInTheDocument();
		expect(screen.getByText("✓ One number")).toBeInTheDocument();
		expect(screen.getByText("✓ One special character")).toBeInTheDocument();
		expect(screen.getByText("✓ Passwords match")).toBeInTheDocument();
	});

	it("displays security status and account information", async () => {
		const user = userEvent.setup();
		renderProfilePage();

		// Check Account Information in Profile tab
		await waitFor(() => {
			expect(screen.getByText("Account Information")).toBeInTheDocument();
		});
		expect(screen.getByText("Active")).toBeInTheDocument();

		// Navigate to Security tab to check password security
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
		});

		const securityTab = screen.getByRole("tab", { name: "Security" });
		await user.click(securityTab);

		await waitFor(() => {
			expect(screen.getByText("Password & Security")).toBeInTheDocument();
		});

		expect(screen.getByText("••••••••••••")).toBeInTheDocument();
		expect(screen.getByText("Last changed: Recent")).toBeInTheDocument();
		expect(screen.getByText("Secure")).toBeInTheDocument();
		expect(screen.getByText("Your account meets all security requirements")).toBeInTheDocument();
	});

	it("formats dates correctly", async () => {
		const userWithDates = {
			...mockUser,
			created_at: "2024-12-25T00:00:00Z",
			updated_at: "2025-01-15T00:00:00Z"
		};

		// Clear and reset mock implementation for this test
		mockFetch.mockClear();
		mockFetch.mockImplementation((url: string, options?: any) => {
			if (url.includes("/api/v1/users/me") && !options?.method) {
				return Promise.resolve({
					ok: true,
					json: async () => userWithDates
				});
			}
			return Promise.reject(new Error(`Unhandled API call: ${url}`));
		});

		renderProfilePage();

		await waitFor(() => {
			expect(screen.getByText("Profile Information")).toBeInTheDocument();
		});

		expect(screen.getByText("December 24, 2024")).toBeInTheDocument();
		expect(screen.getByText("January 14, 2025")).toBeInTheDocument();
	});

	it("auto-dismisses toast after 5 seconds", async () => {
		// Store original setTimeout
		const originalSetTimeout = window.setTimeout;
		let capturedCallback: (() => void) | null = null;

		// Mock setTimeout to capture the 5000ms timer specifically
		window.setTimeout = vi.fn((callback: () => void, delay: number) => {
			if (delay === 5000) {
				capturedCallback = callback;
				return 123 as any; // Return fake timer ID
			}
			// For other delays (like userEvent), use original setTimeout
			return originalSetTimeout(callback, delay);
		}) as any;

		const user = userEvent.setup();
		renderProfilePage();

		// Wait for component to load
		await waitFor(() => {
			expect(screen.getByText("Edit Profile")).toBeInTheDocument();
		});

		// Open edit form and submit to trigger success toast
		await user.click(screen.getByText("Edit Profile"));
		await user.click(screen.getByText("Save Changes"));

		// Wait for success toast to appear
		await waitFor(() => {
			expect(screen.getByText("Profile updated successfully!")).toBeInTheDocument();
		});

		// Verify setTimeout was called with correct parameters
		expect(window.setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
		expect(capturedCallback).toBeTruthy();

		// Execute the captured callback to simulate timer firing
		if (capturedCallback) {
			act(() => {
				capturedCallback!();
			});
		}

		// Wait for toast to disappear
		await waitFor(() => {
			expect(screen.queryByText("Profile updated successfully!")).not.toBeInTheDocument();
		});

		// Restore original setTimeout
		window.setTimeout = originalSetTimeout;
	});

	it("allows manual dismissal of toast", async () => {
		// Mock initial profile load and failed update
		mockFetch.mockImplementation((url: string, options?: any) => {
			if (url.includes("/api/v1/users/me") && !options?.method) {
				return Promise.resolve({
					ok: true,
					json: async () => mockUser
				});
			}
			if (url.includes("/api/v1/users/me") && options?.method === "PUT") {
				return Promise.resolve({
					ok: false,
					status: 400,
					json: async () => ({ message: "Update failed" })
				});
			}
			return Promise.reject(new Error(`Unhandled API call: ${url}`));
		});

		const user = userEvent.setup();
		renderProfilePage();

		await waitFor(() => {
			expect(screen.getByText("Edit Profile")).toBeInTheDocument();
		});

		// Open edit form and submit to trigger error toast
		await user.click(screen.getByText("Edit Profile"));
		await user.click(screen.getByText("Save Changes"));

		await waitFor(() => {
			expect(screen.getByText("Update failed")).toBeInTheDocument();
		});

		// Find and click dismiss button (×)
		const dismissButton = screen.getByRole("button", { name: /dismiss notification/i });
		await user.click(dismissButton);

		// Toast should be dismissed immediately
		expect(screen.queryByText("Update failed")).not.toBeInTheDocument();
	});

	it("retries loading profile when retry button is clicked", async () => {
		let callCount = 0;

		// Mock first call to fail, second to succeed
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/v1/users/me")) {
				callCount++;
				if (callCount === 1) {
					return Promise.reject(new Error("Network error"));
				} else {
					return Promise.resolve({
						ok: true,
						json: async () => mockUser
					});
				}
			}
			return Promise.reject(new Error(`Unhandled API call: ${url}`));
		});

		const user = userEvent.setup();
		renderProfilePage();

		// Wait for error state to appear
		await waitFor(() => {
			expect(screen.getByText("Unable to Load Profile")).toBeInTheDocument();
		});

		expect(screen.getByText("Network error")).toBeInTheDocument();

		// Click retry button
		const retryButton = screen.getByText("Retry");
		await user.click(retryButton);

		// Wait for successful load
		await waitFor(() => {
			expect(screen.getByText("Profile Information")).toBeInTheDocument();
		});

		expect(screen.getByText("Test User")).toBeInTheDocument();
		expect(callCount).toBe(2); // Verify retry actually triggered another API call
	});

	// Tab Interface Tests
	describe("Tabbed Interface", () => {
		it("should render tab navigation with Profile and Security tabs", async () => {
			renderProfilePage();

			await waitFor(() => {
				expect(screen.getByRole("tablist")).toBeInTheDocument();
			});

			expect(screen.getByRole("tab", { name: "Profile" })).toBeInTheDocument();
			expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
		});

		it("should show Profile tab as active by default", async () => {
			renderProfilePage();

			await waitFor(() => {
				expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
			});

			expect(screen.getByRole("tab", { name: "Security" })).toHaveAttribute("aria-selected", "false");
		});

		it("should switch to Security tab when clicked", async () => {
			const user = userEvent.setup();
			renderProfilePage();

			await waitFor(() => {
				expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
			});

			const securityTab = screen.getByRole("tab", { name: "Security" });
			await user.click(securityTab);

			expect(screen.getByRole("tab", { name: "Security" })).toHaveAttribute("aria-selected", "true");
			expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "false");
		});

		it("should show Profile content in Profile tab", async () => {
			renderProfilePage();

			await waitFor(() => {
				expect(screen.getByText("Profile Information")).toBeInTheDocument();
			});

			expect(screen.getByText("Edit Profile")).toBeInTheDocument();
			expect(screen.getByText("Account Information")).toBeInTheDocument();
		});

		it("should show Security content in Security tab", async () => {
			const user = userEvent.setup();
			renderProfilePage();

			// Switch to Security tab
			await waitFor(() => {
				expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
			});

			const securityTab = screen.getByRole("tab", { name: "Security" });
			await user.click(securityTab);

			// Should show Security content
			await waitFor(() => {
				expect(screen.getByText("Account Security")).toBeInTheDocument();
			});

			expect(screen.getByText("Password & Security")).toBeInTheDocument();
			expect(screen.getByText("Change Password")).toBeInTheDocument();
		});

		it("should hide Profile content when Security tab is active", async () => {
			const user = userEvent.setup();
			renderProfilePage();

			// Initially shows Profile content
			await waitFor(() => {
				expect(screen.getByText("Edit Profile")).toBeInTheDocument();
			});

			// Switch to Security tab
			const securityTab = screen.getByRole("tab", { name: "Security" });
			await user.click(securityTab);

			// Profile content should be hidden
			expect(screen.queryByText("Edit Profile")).not.toBeInTheDocument();
			expect(screen.queryByText("Profile Information")).not.toBeInTheDocument();
		});

		it("should support keyboard navigation between tabs", async () => {
			renderProfilePage();

			await waitFor(() => {
				expect(screen.getByRole("tablist")).toBeInTheDocument();
			});

			const tablist = screen.getByRole("tablist");
			const profileTab = screen.getByRole("tab", { name: "Profile" });
			const securityTab = screen.getByRole("tab", { name: "Security" });

			// Initially Profile is active
			expect(profileTab).toHaveAttribute("aria-selected", "true");

			// Simulate ArrowRight key with act() wrapper for state updates
			act(() => {
				fireEvent.keyDown(tablist, { key: "ArrowRight" });
			});

			// Wait for state to stabilize and check Security tab is active
			await waitFor(() => {
				expect(securityTab).toHaveAttribute("aria-selected", "true");
				expect(profileTab).toHaveAttribute("aria-selected", "false");
			});
		});

		it("should maintain correct tabIndex for accessibility", async () => {
			renderProfilePage();

			await waitFor(() => {
				expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("tabIndex", "0");
			});

			expect(screen.getByRole("tab", { name: "Security" })).toHaveAttribute("tabIndex", "-1");
		});
	});
});
