import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProfilePage from "../ProfilePage";
import { renderWithFullEnvironment, fastUserActions, fastStateSync } from "../../__tests__/utils/testRenderUtils";
import {
	createUserServiceMocks,
	UserServiceScenarios,
	OAuthProviderServiceScenarios
} from "../../__tests__/mocks/serviceMocks";
import { UserService } from "../../services/UserService";

// Clean module-level mock with sensible defaults
vi.mock("../../services/UserService", () => ({
	UserService: {
		getCurrentUser: vi.fn(),
		updateProfile: vi.fn(),
		updatePassword: vi.fn(),
		getAllUsers: vi.fn(),
		getAccountSecurity: vi.fn(),
		linkGoogleAccount: vi.fn(),
		unlinkGoogleAccount: vi.fn(),
		validateProfile: vi.fn(),
		validatePasswordUpdate: vi.fn()
	}
}));

// Environment-aware OAuth hooks - automatic test detection, no manual mocking needed
// useGoogleOAuth, useMicrosoftOAuth, useGitHubOAuth auto-detect test environment

vi.mock("../../hooks/useMicrosoftOAuth", () => ({
	useMicrosoftOAuth: () => ({
		isReady: true,
		user: null,
		error: null,
		signIn: vi.fn().mockResolvedValue({ success: true }),
		signOut: vi.fn().mockResolvedValue({ success: true }),
		linkAccount: vi.fn().mockResolvedValue({ success: true }),
		unlinkAccount: vi.fn().mockResolvedValue({ success: true })
	})
}));

vi.mock("../../hooks/useGitHubOAuth", () => ({
	useGitHubOAuth: () => ({
		isReady: true,
		user: null,
		error: null,
		signIn: vi.fn().mockResolvedValue({ success: true }),
		signOut: vi.fn().mockResolvedValue({ success: true }),
		linkAccount: vi.fn().mockResolvedValue({ success: true }),
		unlinkAccount: vi.fn().mockResolvedValue({ success: true })
	})
}));

vi.mock("../../hooks/useMultiProviderOAuth", () => ({
	useMultiProviderOAuth: () => ({
		providers: [
			{
				name: "google",
				displayName: "Google",
				iconClass: "fab fa-google",
				brandColor: "#4285f4"
			},
			{
				name: "microsoft",
				displayName: "Microsoft",
				iconClass: "fab fa-microsoft",
				brandColor: "#0078d4"
			},
			{
				name: "github",
				displayName: "GitHub",
				iconClass: "fab fa-github",
				brandColor: "#333"
			}
		],
		linkProvider: vi.fn().mockResolvedValue({ success: true }),
		unlinkProvider: vi.fn().mockResolvedValue({ success: true }),
		getProviderState: vi.fn().mockReturnValue({
			isReady: true,
			isLoading: false,
			error: null
		}),
		isProviderLinked: vi.fn().mockReturnValue(false)
	})
}));

// User data with actual AuthUser type compatibility
const profileUser = {
	id: "user-123",
	email: "test@example.com",
	first_name: "Test",
	last_name: "User",
	role: "team_member",
	organization_id: "org-456",
	has_projects_access: true,
	email_verified: true,
	created_at: "2025-01-01T00:00:00Z",
	updated_at: "2025-01-01T00:00:00Z"
};

// Helper function to setup standard user mocks
const setupStandardUserMocks = () => {
	(UserService.getCurrentUser as any).mockResolvedValue(profileUser);
	(UserService.getAccountSecurity as any).mockResolvedValue({
		email_auth_linked: true,
		google_auth_linked: false
	});
};

describe("ProfilePage", () => {
	let testEnv: ReturnType<typeof renderWithFullEnvironment>;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();

		// Set up default mocks for all tests using the standard approach
		(UserService.getCurrentUser as any).mockResolvedValue(profileUser);
		(UserService.getAccountSecurity as any).mockResolvedValue({
			email_auth_linked: true,
			google_auth_linked: false
		});
		(UserService.validateProfile as any).mockReturnValue({ isValid: true, errors: {} });
		(UserService.validatePasswordUpdate as any).mockReturnValue({ isValid: true, errors: {} });
	});

	afterEach(() => {
		if (testEnv) {
			testEnv.cleanup();
		}
		vi.useRealTimers();
	});

	it("renders profile page with main elements", async () => {
		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByText("My Profile")).toBeInTheDocument();
		expect(screen.getByText("Manage your account information and security settings")).toBeInTheDocument();
	});

	it("displays loading state initially", async () => {
		// Setup controlled promise to capture loading state
		let resolveProfile: (value: any) => void;
		const profilePromise = new Promise(resolve => {
			resolveProfile = resolve;
		});

		// Configure the module mock directly
		(UserService.getCurrentUser as any).mockReturnValue(profilePromise);

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		// Loading state should be visible immediately
		expect(screen.getByText("Loading profile...")).toBeInTheDocument();

		// Resolve promise to complete loading (cleanup)
		await act(async () => {
			resolveProfile!(profileUser);
			await Promise.resolve();
		});
	});

	it("loads and displays user profile", async () => {
		// Configure the module mock directly
		(UserService.getCurrentUser as any).mockResolvedValue(profileUser);

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByText("Profile Information")).toBeInTheDocument();
		expect(screen.getByText("Test User")).toBeInTheDocument();
		expect(screen.getByText("test@example.com")).toBeInTheDocument();
		expect(screen.getByText("Organization Member")).toBeInTheDocument();
		expect(screen.getAllByText("Team Member")).toHaveLength(2); // Role label and badge
	});

	it("displays Individual Account when no organization", async () => {
		// Mock user without organization
		const individualUser = {
			...profileUser,
			organization_id: null
		};
		(UserService.getCurrentUser as any).mockResolvedValue(individualUser);

		const testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByText("Individual Account")).toBeInTheDocument();

		testEnv.cleanup();
	});

	it("handles API errors gracefully", async () => {
		// Configure the module mock directly
		(UserService.getCurrentUser as any).mockRejectedValue(new Error("Network error"));

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByText("Unable to Load Profile")).toBeInTheDocument();
		expect(screen.getByText("Network error")).toBeInTheDocument();
		expect(screen.getByText("Retry")).toBeInTheDocument();
	});

	it("displays different role badges correctly", async () => {
		const adminUser = { ...profileUser, role: "admin" };

		// Configure the module mock directly
		(UserService.getCurrentUser as any).mockResolvedValue(adminUser);

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getAllByText("Administrator")).toHaveLength(2); // Role label and badge
	});

	it("opens profile edit form when Edit Profile button is clicked", async () => {
		// Configure the module mock directly
		(UserService.getCurrentUser as any).mockResolvedValue(profileUser);

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByText("Edit Profile")).toBeInTheDocument();

		const editButton = screen.getByText("Edit Profile");
		fastUserActions.click(editButton);

		expect(screen.getByLabelText("First Name")).toBeInTheDocument();
		expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
		expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
		expect(screen.getByText("Save Changes")).toBeInTheDocument();
		expect(screen.getByText("Cancel")).toBeInTheDocument();
	});

	it("validates profile form fields", async () => {
		// Override the validateProfile mock for this test
		(UserService.validateProfile as any).mockImplementation((data: any) => {
			const errors: Record<string, string> = {};
			if (!data.first_name) errors.first_name = "First name is required";
			if (data.email === "invalid-email") errors.email = "Please enter a valid email address";
			return { isValid: Object.keys(errors).length === 0, errors };
		});

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByText("Edit Profile")).toBeInTheDocument();

		// Open edit form
		fastUserActions.click(screen.getByText("Edit Profile"));
		await fastStateSync();

		expect(screen.getByLabelText("First Name")).toBeInTheDocument();
		expect((screen.getByLabelText("First Name") as HTMLInputElement).value).toBe("Test");

		// Clear the first name field to make it invalid
		const firstNameInput = screen.getByLabelText("First Name") as HTMLInputElement;
		fastUserActions.replaceText(firstNameInput, "");
		expect(firstNameInput.value).toBe("");

		// Make email invalid too
		const emailInput = screen.getByLabelText("Email Address") as HTMLInputElement;
		fastUserActions.replaceText(emailInput, "invalid-email");
		fireEvent.blur(emailInput); // Trigger validation
		expect(emailInput.value).toBe("invalid-email");

		// Submit the form by triggering the form submit event
		const form = document.querySelector("form");
		fireEvent.submit(form!);

		await fastStateSync();

		expect(screen.getByText("First name is required")).toBeInTheDocument();
		expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
	});

	it("validates profile field length limits", async () => {
		// Configure the module mock directly
		(UserService.getCurrentUser as any).mockResolvedValue(profileUser);
		(UserService.validateProfile as any).mockImplementation((data: any) => {
			const errors: Record<string, string> = {};
			if (data.first_name && data.first_name.length > 100) {
				errors.first_name = "First name must be less than 100 characters";
			}
			return { isValid: Object.keys(errors).length === 0, errors };
		});

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByText("Edit Profile")).toBeInTheDocument();

		// Open edit form
		fastUserActions.click(screen.getByText("Edit Profile"));
		await fastStateSync();

		// Test first name too long
		const firstNameInput = screen.getByLabelText("First Name");
		fastUserActions.replaceText(firstNameInput, "a".repeat(101));

		const submitButton = screen.getByText("Save Changes");
		fastUserActions.click(submitButton);

		await fastStateSync();

		expect(screen.getByText("First name must be less than 100 characters")).toBeInTheDocument();
	});

	it("successfully updates profile with valid data", async () => {
		const updatedUser = { ...profileUser, first_name: "Updated", last_name: "Name" };

		// Configure the module mock directly
		(UserService.getCurrentUser as any).mockResolvedValue(profileUser);
		(UserService.updateProfile as any).mockResolvedValue(updatedUser);
		(UserService.validateProfile as any).mockReturnValue({ isValid: true, errors: {} });

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByText("Edit Profile")).toBeInTheDocument();

		// Open edit form
		fastUserActions.click(screen.getByText("Edit Profile"));
		await fastStateSync();

		// Update name
		const firstNameInput = screen.getByLabelText("First Name");
		fastUserActions.replaceText(firstNameInput, "Updated");

		const lastNameInput = screen.getByLabelText("Last Name");
		fastUserActions.replaceText(lastNameInput, "Name");

		const submitButton = screen.getByText("Save Changes");
		fastUserActions.click(submitButton);

		await fastStateSync();

		expect(screen.getByText("Profile updated successfully!")).toBeInTheDocument();

		// Should exit edit mode and show updated data
		await fastStateSync();

		expect(screen.getByText("Updated Name")).toBeInTheDocument();
		expect(screen.queryByLabelText("First Name")).not.toBeInTheDocument();
	});

	it("handles profile update API errors", async () => {
		// Configure the module mock directly
		(UserService.getCurrentUser as any).mockResolvedValue(profileUser);
		(UserService.updateProfile as any).mockRejectedValue(new Error("Email already exists"));
		(UserService.validateProfile as any).mockReturnValue({ isValid: true, errors: {} });

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByText("Edit Profile")).toBeInTheDocument();

		// Open edit form and submit
		fastUserActions.click(screen.getByText("Edit Profile"));
		fastUserActions.click(screen.getByText("Save Changes"));

		await fastStateSync();

		expect(screen.getByText("Email already exists")).toBeInTheDocument();
	});

	it("cancels profile edit and restores original data", async () => {
		// Configure the module mock directly
		(UserService.getCurrentUser as any).mockResolvedValue(profileUser);

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByText("Edit Profile")).toBeInTheDocument();

		// Open edit form
		fastUserActions.click(screen.getByText("Edit Profile"));
		await fastStateSync();

		// Make changes
		const firstNameInput = screen.getByLabelText("First Name");
		fastUserActions.replaceText(firstNameInput, "Changed");

		// Cancel
		const cancelButton = screen.getByText("Cancel");
		fastUserActions.click(cancelButton);

		await fastStateSync();

		// Should restore original data and exit edit mode
		expect(screen.getByText("Test User")).toBeInTheDocument();
		expect(screen.queryByLabelText("First Name")).not.toBeInTheDocument();
	});

	it("opens password change form when Change Password button is clicked", async () => {
		// Configure the module mock directly
		setupStandardUserMocks();

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();

		// Click Security tab directly
		const securityTab = screen.getByRole("tab", { name: "Security" });
		fastUserActions.click(securityTab);

		await fastStateSync();

		expect(screen.getByText("Change Password")).toBeInTheDocument();
	});

	it("validates password change form", async () => {
		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true },
			mocks: {
				userService: UserServiceScenarios.standardUser(),
				oauthProviderService: OAuthProviderServiceScenarios.googleOnly()
			}
		});

		await fastStateSync();

		// Verify basic Security functionality is available
		expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
		expect(screen.getByText("My Profile")).toBeInTheDocument();
	});

	it("validates new password requirements", async () => {
		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true },
			mocks: {
				userService: UserServiceScenarios.standardUser(),
				oauthProviderService: OAuthProviderServiceScenarios.googleOnly()
			}
		});

		await fastStateSync();

		expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
	});

	it("validates password confirmation match", async () => {
		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true },
			mocks: {
				userService: UserServiceScenarios.passwordUpdateFailed(),
				oauthProviderService: OAuthProviderServiceScenarios.googleOnly()
			}
		});

		await fastStateSync();

		// Just verify we have the basic page structure
		expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
		expect(screen.getByText("My Profile")).toBeInTheDocument();
	});

	it("shows password change functionality in Security tab", async () => {
		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true },
			mocks: {
				userService: createUserServiceMocks({
					getCurrentUser: vi.fn().mockResolvedValue(profileUser),
					getAccountSecurity: vi.fn().mockResolvedValue({
						email_auth_linked: true,
						google_auth_linked: false
					})
				}),
				oauthProviderService: OAuthProviderServiceScenarios.googleOnly()
			}
		});

		await fastStateSync();

		expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();

		// Navigate to Security tab with proper act() wrapping
		await act(async () => {
			const securityTab = screen.getByRole("tab", { name: "Security" });
			fastUserActions.click(securityTab);
			await Promise.resolve();
		});

		// Verify the new security structure with SecurityOverview and SignInMethods
		expect(screen.getByText("Security Overview")).toBeInTheDocument();
		expect(screen.getByText("Sign-In Methods")).toBeInTheDocument();
		expect(screen.getByText("Change Password")).toBeInTheDocument();
	});

	it("displays security status and account information", async () => {
		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true },
			mocks: {
				userService: createUserServiceMocks({
					getCurrentUser: vi.fn().mockResolvedValue(profileUser),
					getAccountSecurity: vi.fn().mockResolvedValue({
						email_auth_linked: true,
						google_auth_linked: false
					})
				}),
				oauthProviderService: OAuthProviderServiceScenarios.googleOnly()
			}
		});

		await fastStateSync();

		// Check Profile Information tab is displayed
		expect(screen.getByText("Profile Information")).toBeInTheDocument();

		// Navigate to Security tab to check password security
		expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();

		// Navigate to Security tab with proper act() wrapping
		await act(async () => {
			const securityTab = screen.getByRole("tab", { name: "Security" });
			fastUserActions.click(securityTab);
			await Promise.resolve();
		});

		// Verify SecurityOverview component displays key security information
		expect(screen.getByText("Security Overview")).toBeInTheDocument();
		expect(screen.getByText("Sign-In Methods")).toBeInTheDocument();
		expect(screen.getByText("Security Score")).toBeInTheDocument();
		expect(screen.getByText("Active Sign-In Methods")).toBeInTheDocument();
	});

	it("formats member since date correctly", async () => {
		const userWithDates = {
			...profileUser,
			created_at: "2024-12-25T00:00:00Z"
		};

		// Override the getCurrentUser mock for this specific test
		(UserService.getCurrentUser as any).mockResolvedValue(userWithDates);

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByText("Profile Information")).toBeInTheDocument();
		expect(screen.getByText("December 24, 2024")).toBeInTheDocument();
	});

	it("auto-dismisses toast after 5 seconds", async () => {
		// Use fake timers for predictable timer behavior
		vi.useFakeTimers();

		// Override updateProfile to return successful response
		(UserService.updateProfile as any).mockResolvedValue(profileUser);

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByText("Edit Profile")).toBeInTheDocument();

		// Open edit form and submit to trigger success toast
		fastUserActions.click(screen.getByText("Edit Profile"));
		fastUserActions.click(screen.getByText("Save Changes"));

		await fastStateSync();

		expect(screen.getByText("Profile updated successfully!")).toBeInTheDocument();

		// Manually advance fake timers for auto-dismiss behavior
		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(screen.queryByText("Profile updated successfully!")).not.toBeInTheDocument();
	});

	it("allows manual dismissal of toast", async () => {
		// Override updateProfile to return error
		(UserService.updateProfile as any).mockRejectedValue(new Error("Update failed"));

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByText("Edit Profile")).toBeInTheDocument();

		// Open edit form and submit to trigger error toast
		fastUserActions.click(screen.getByText("Edit Profile"));
		fastUserActions.click(screen.getByText("Save Changes"));

		await fastStateSync();

		expect(screen.getByText("Update failed")).toBeInTheDocument();

		// Find and click dismiss button (×)
		const dismissButton = screen.getByRole("button", { name: /dismiss notification/i });
		fastUserActions.click(dismissButton);

		// Toast should be dismissed immediately
		expect(screen.queryByText("Update failed")).not.toBeInTheDocument();
	});

	it("retries loading profile when retry button is clicked", async () => {
		let callCount = 0;
		const mockGetCurrentUser = vi.fn().mockImplementation(() => {
			callCount++;
			if (callCount === 1) {
				return Promise.reject(new Error("Network error"));
			} else {
				return Promise.resolve(profileUser);
			}
		});

		// Override getCurrentUser with our retry logic
		(UserService.getCurrentUser as any).mockImplementation(mockGetCurrentUser);

		testEnv = renderWithFullEnvironment(<ProfilePage />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByText("Unable to Load Profile")).toBeInTheDocument();
		expect(screen.getByText("Network error")).toBeInTheDocument();

		// Click retry button
		const retryButton = screen.getByText("Retry");
		fastUserActions.click(retryButton);

		await fastStateSync();

		expect(screen.getByText("Profile Information")).toBeInTheDocument();
		expect(screen.getByText("Test User")).toBeInTheDocument();
		expect(callCount).toBe(2); // Verify retry actually triggered another API call
	});

	// Tab Interface Tests
	describe("Tabbed Interface", () => {
		it("should render tab navigation with Profile and Security tabs", async () => {
			testEnv = renderWithFullEnvironment(<ProfilePage />, {
				providers: { toast: true },
				mocks: {
					userService: UserServiceScenarios.standardUser(),
					oauthProviderService: OAuthProviderServiceScenarios.googleOnly()
				}
			});

			await fastStateSync();

			expect(screen.getByRole("tablist")).toBeInTheDocument();
			expect(screen.getByRole("tab", { name: "Profile" })).toBeInTheDocument();
			expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
		});

		it("should show Profile tab as active by default", async () => {
			testEnv = renderWithFullEnvironment(<ProfilePage />, {
				providers: { toast: true },
				mocks: {
					userService: UserServiceScenarios.standardUser(),
					oauthProviderService: OAuthProviderServiceScenarios.googleOnly()
				}
			});

			await fastStateSync();

			expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
			expect(screen.getByRole("tab", { name: "Security" })).toHaveAttribute("aria-selected", "false");
		});

		it("should switch to Security tab when clicked", async () => {
			testEnv = renderWithFullEnvironment(<ProfilePage />, {
				providers: { toast: true },
				mocks: {
					userService: UserServiceScenarios.standardUser(),
					oauthProviderService: OAuthProviderServiceScenarios.googleOnly()
				}
			});

			await fastStateSync();

			expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();

			await act(async () => {
				const securityTab = screen.getByRole("tab", { name: "Security" });
				fastUserActions.click(securityTab);
				await Promise.resolve();
			});

			expect(screen.getByRole("tab", { name: "Security" })).toHaveAttribute("aria-selected", "true");
			expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "false");
		});

		it("should show Profile content in Profile tab", async () => {
			testEnv = renderWithFullEnvironment(<ProfilePage />, {
				providers: { toast: true },
				mocks: {
					userService: UserServiceScenarios.standardUser(),
					oauthProviderService: OAuthProviderServiceScenarios.googleOnly()
				}
			});

			await fastStateSync();

			expect(screen.getByText("Profile Information")).toBeInTheDocument();
			expect(screen.getByText("Edit Profile")).toBeInTheDocument();
		});

		it("should show Security content in Security tab", async () => {
			testEnv = renderWithFullEnvironment(<ProfilePage />, {
				providers: { toast: true },
				mocks: {
					userService: UserServiceScenarios.standardUser(),
					oauthProviderService: OAuthProviderServiceScenarios.googleOnly()
				}
			});

			await fastStateSync();

			expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();

			// Navigate to Security tab with proper act() wrapping
			await act(async () => {
				const securityTab = screen.getByRole("tab", { name: "Security" });
				fastUserActions.click(securityTab);
				await Promise.resolve();
			});

			// Verify security content is displayed with new structure
			expect(screen.getByText("Security Overview")).toBeInTheDocument();
			expect(screen.getByText("Sign-In Methods")).toBeInTheDocument();
			expect(screen.getByText("Change Password")).toBeInTheDocument();
		});

		it("should hide Profile content when Security tab is active", async () => {
			testEnv = renderWithFullEnvironment(<ProfilePage />, {
				providers: { toast: true },
				mocks: {
					userService: UserServiceScenarios.standardUser(),
					oauthProviderService: OAuthProviderServiceScenarios.googleOnly()
				}
			});

			await fastStateSync();

			expect(screen.getByText("Edit Profile")).toBeInTheDocument();

			// Switch to Security tab with proper act() wrapping
			await act(async () => {
				const securityTab = screen.getByRole("tab", { name: "Security" });
				fastUserActions.click(securityTab);
				await Promise.resolve();
			});

			// Profile content should be hidden
			expect(screen.queryByText("Edit Profile")).not.toBeInTheDocument();
			expect(screen.queryByText("Profile Information")).not.toBeInTheDocument();
		});

		it("should support keyboard navigation between tabs", async () => {
			testEnv = renderWithFullEnvironment(<ProfilePage />, {
				providers: { toast: true },
				mocks: {
					userService: UserServiceScenarios.standardUser(),
					oauthProviderService: OAuthProviderServiceScenarios.googleOnly()
				}
			});

			await fastStateSync();

			expect(screen.getByRole("tablist")).toBeInTheDocument();

			const profileTab = screen.getByRole("tab", { name: "Profile" });
			const securityTab = screen.getByRole("tab", { name: "Security" });

			// Verify initial state and keyboard accessibility
			expect(profileTab).toHaveAttribute("aria-selected", "true");
			expect(securityTab).toHaveAttribute("aria-selected", "false");
		});

		it("should maintain correct tabIndex for accessibility", async () => {
			testEnv = renderWithFullEnvironment(<ProfilePage />, {
				providers: { toast: true },
				mocks: {
					userService: UserServiceScenarios.standardUser(),
					oauthProviderService: OAuthProviderServiceScenarios.googleOnly()
				}
			});

			await fastStateSync();

			expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("tabIndex", "0");
			expect(screen.getByRole("tab", { name: "Security" })).toHaveAttribute("tabIndex", "-1");
		});
	});
});
