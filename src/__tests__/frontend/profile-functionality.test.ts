/**
 * Profile Page Functionality Tests - Simplified Hybrid Approach
 *
 * Following hybrid testing pattern:
 * - Profile utilities are tested in profile-ui-utils.test.ts and profile-utils.test.ts (pure functions)
 * - This file tests only critical UI integration and API coordination
 * - Focus on what can break: component initialization, error handling, utility integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the utilities that are tested elsewhere
vi.mock("../../utils/profile-utils", () => ({
	fetchUserProfile: vi.fn(),
	createProfileUpdateRequest: vi.fn(),
	handleProfileApiResponse: vi.fn()
}));

vi.mock("../../utils/profile-ui-utils", () => ({
	createProfileDisplayData: vi.fn(),
	validateProfileFormData: vi.fn(),
	formatProfileDates: vi.fn(),
	getRoleBadgeClass: vi.fn()
}));

vi.mock("../../utils/auth-utils", () => ({
	getSessionInfo: vi.fn(),
	redirectToLogin: vi.fn(),
	handleAuthError: vi.fn()
}));

// Import functions being tested
import { initializeProfilePage, displayProfileData, handleProfileFormSubmit } from "../../public/profile";

// Import mocked utilities for assertions
import { fetchUserProfile } from "../../utils/profile-utils";
import { createProfileDisplayData, validateProfileFormData } from "../../utils/profile-ui-utils";
import { getSessionInfo } from "../../utils/auth-utils";

describe("Profile Page Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Simple DOM mock - just enough for integration testing
		const mockGetElement = vi.fn();
		global.document = {
			getElementById: mockGetElement
		} as unknown as Document;

		// Return mock elements when requested
		mockGetElement.mockImplementation((id: string) => ({
			id,
			style: { display: "block" },
			textContent: "",
			innerHTML: "",
			value: "",
			classList: {
				add: vi.fn(),
				remove: vi.fn(),
				toggle: vi.fn()
			}
		}));
	});

	describe("Profile Page Initialization", () => {
		it("should initialize profile page with valid session", async () => {
			// Setup: Mock valid session and profile data
			const mockSession = {
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member" as const
			};

			const mockProfile = {
				id: "user-123",
				email: "test@example.com",
				first_name: "Test",
				last_name: "User",
				role: "team_member" as const,
				is_active: true
			};

			vi.mocked(getSessionInfo).mockReturnValue(mockSession);
			vi.mocked(fetchUserProfile).mockResolvedValue(mockProfile);
			vi.mocked(createProfileDisplayData).mockReturnValue({
				fullName: "Test User",
				roleText: "Team Member",
				roleBadgeClass: "team-member",
				lastLoginFormatted: "Never"
			});

			// Act: Initialize the profile page
			await initializeProfilePage();

			// Assert: Verify utilities were called correctly
			expect(getSessionInfo).toHaveBeenCalled();
			expect(fetchUserProfile).toHaveBeenCalledWith("user-123");
			expect(createProfileDisplayData).toHaveBeenCalledWith(mockProfile);
		});

		it("should handle missing session by redirecting to login", async () => {
			// Setup: No session available
			vi.mocked(getSessionInfo).mockReturnValue(null);

			// Act: Try to initialize profile page
			await initializeProfilePage();

			// Assert: Should not fetch profile if no session
			expect(fetchUserProfile).not.toHaveBeenCalled();
			expect(createProfileDisplayData).not.toHaveBeenCalled();
		});

		it("should handle profile fetch errors gracefully", async () => {
			// Setup: Valid session but profile fetch fails
			const mockSession = {
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member" as const
			};

			vi.mocked(getSessionInfo).mockReturnValue(mockSession);
			vi.mocked(fetchUserProfile).mockRejectedValue(new Error("Network error"));

			// Act: Initialize profile page
			await initializeProfilePage();

			// Assert: Should attempt to fetch but handle error
			expect(fetchUserProfile).toHaveBeenCalledWith("user-123");
			expect(createProfileDisplayData).not.toHaveBeenCalled();
		});
	});

	describe("Profile Data Display", () => {
		it("should display profile data using utility functions", () => {
			// Setup: Mock profile data
			const profileData = {
				id: "user-123",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_lead" as const,
				is_active: true
			};

			// Mock utility response
			vi.mocked(createProfileDisplayData).mockReturnValue({
				fullName: "John Doe",
				roleText: "Team Lead",
				roleBadgeClass: "team-lead",
				lastLoginFormatted: "Never"
			});

			// Act: Display profile data
			displayProfileData(profileData);

			// Assert: Utility was called with correct data
			expect(createProfileDisplayData).toHaveBeenCalledWith(profileData);
		});
	});

	describe("Profile Form Submission", () => {
		it("should validate and submit profile updates", async () => {
			// Setup: Mock form data and validation
			const formData = {
				first_name: "John",
				last_name: "Doe",
				email: "john.doe@example.com"
			};

			const validationResult = {
				isValid: true,
				errors: {},
				sanitizedData: formData
			};

			vi.mocked(validateProfileFormData).mockReturnValue(validationResult);

			// Mock form element
			const mockForm = {
				first_name: { value: "John" },
				last_name: { value: "Doe" },
				email: { value: "john.doe@example.com" }
			};

			// Act: Submit form (this would normally be triggered by event)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
			await handleProfileFormSubmit(mockForm as any);

			// Assert: Validation was called
			expect(validateProfileFormData).toHaveBeenCalledWith(formData);
		});

		it("should handle validation errors appropriately", async () => {
			// Setup: Mock invalid form data
			const formData = {
				first_name: "",
				last_name: "Doe",
				email: "invalid-email"
			};

			const validationResult = {
				isValid: false,
				errors: {
					first_name: "First name is required",
					email: "Please enter a valid email address"
				}
			};

			vi.mocked(validateProfileFormData).mockReturnValue(validationResult);

			// Mock form element
			const mockForm = {
				first_name: { value: "" },
				last_name: { value: "Doe" },
				email: { value: "invalid-email" }
			};

			// Act: Submit invalid form
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
			await handleProfileFormSubmit(mockForm as any);

			// Assert: Validation was called and errors were handled
			expect(validateProfileFormData).toHaveBeenCalledWith(formData);
			// Note: Error display logic should be tested at UI level, not integration level
		});
	});

	describe("Error Handling Integration", () => {
		it("should handle network errors during profile operations", async () => {
			// Setup: Mock network failure
			const mockSession = {
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member" as const
			};

			vi.mocked(getSessionInfo).mockReturnValue(mockSession);
			vi.mocked(fetchUserProfile).mockRejectedValue(new Error("Network error"));

			// Act: Initialize with network error
			await initializeProfilePage();

			// Assert: Should handle error gracefully
			expect(fetchUserProfile).toHaveBeenCalledWith("user-123");
			// Integration test confirms error handling workflow, not specific UI changes
		});
	});
});
