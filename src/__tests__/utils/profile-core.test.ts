/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	// ============= BUSINESS LOGIC FUNCTIONS =============
	processProfileForDisplay,
	validateProfileUpdate,
	calculateProfileCompleteness,
	generateSecurityRecommendations,
	formatProfileForSubmission,
	hasProfileChanged,
	validateProfileAccess,
	// ============= COORDINATION FUNCTIONS =============
	determineProfilePageState,
	extractProfileFormData,
	shouldProceedWithSubmission,
	createAuthError,
	getProfileInitializationSteps,
	// ============= API UTILITY FUNCTIONS =============
	fetchUserProfile,
	validateProfileData,
	sanitizeProfileInput,
	createProfileUpdateRequest,
	handleProfileApiResponse,
	// ============= TYPES =============
	type UserProfile,
	type ProfileFormData,
	type ProfileUpdateData,
	type SessionInfo
} from "../../utils/profile-core";

// Mock the dependencies
vi.mock("../../utils/validation-core", () => ({
	sanitizeInput: vi.fn((input: string) => {
		if (!input || typeof input !== "string") {
			return "";
		}
		return input
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
			.replace(/<[^>]*>/g, "") // Remove all HTML tags
			.replace(/javascript:/gi, "") // Remove javascript: protocol
			.replace(/vbscript:/gi, "") // Remove vbscript: protocol
			.replace(/data:/gi, "") // Remove data: protocol
			.trim();
	})
}));

vi.mock("../../utils/ui-core", () => ({
	validateProfileFormData: vi.fn(),
	createProfileDisplayData: vi.fn()
}));

import { validateProfileFormData, createProfileDisplayData } from "../../utils/ui-core";

// Mock fetch for API utility tests
global.fetch = vi.fn();

describe("Profile Core - Consolidated Profile Management Module", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(fetch).mockClear();
	});

	// ============= BUSINESS LOGIC FUNCTIONS (from profile-business-logic.test.ts) =============
	describe("Business Logic Functions", () => {
		describe("processProfileForDisplay", () => {
			it("should successfully process valid profile data", () => {
				const userProfile: UserProfile = {
					id: "user123",
					email: "john.doe@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				};

				const mockDisplayData = {
					fullName: "John Doe",
					roleText: "Team Member",
					roleBadgeClass: "team-member",
					lastLoginFormatted: "Never"
				};

				vi.mocked(createProfileDisplayData).mockReturnValue(mockDisplayData);

				const result = processProfileForDisplay(userProfile);

				expect(result.success).toBe(true);
				expect(result.data).toEqual(mockDisplayData);
				expect(result.error).toBeUndefined();
				expect(createProfileDisplayData).toHaveBeenCalledWith(userProfile);
			});

			it("should handle missing required fields", () => {
				const invalidProfile = {
					id: "",
					email: "",
					first_name: "John",
					last_name: "Doe",
					role: "team_member" as const,
					is_active: true,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				};

				const result = processProfileForDisplay(invalidProfile);

				expect(result.success).toBe(false);
				expect(result.error).toBe("Invalid profile data: missing required fields");
				expect(result.data).toBeUndefined();
			});

			it("should handle processing errors gracefully", () => {
				const userProfile: UserProfile = {
					id: "user123",
					email: "john.doe@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				};

				vi.mocked(createProfileDisplayData).mockImplementation(() => {
					throw new Error("Processing failed");
				});

				const result = processProfileForDisplay(userProfile);

				expect(result.success).toBe(false);
				expect(result.error).toBe("Processing failed");
			});
		});

		describe("validateProfileUpdate", () => {
			it("should validate correct profile update data", () => {
				const formData: ProfileFormData = {
					first_name: "John",
					last_name: "Doe",
					email: "john.doe@example.com"
				};

				vi.mocked(validateProfileFormData).mockReturnValue({
					isValid: true,
					errors: {},
					sanitizedData: formData
				});

				const result = validateProfileUpdate(formData);

				expect(result.success).toBe(true);
				expect(result.validationErrors).toBeUndefined();
				expect(validateProfileFormData).toHaveBeenCalledWith(formData);
			});

			it("should reject same first and last names", () => {
				const formData: ProfileFormData = {
					first_name: "John",
					last_name: "John",
					email: "john.john@example.com"
				};

				vi.mocked(validateProfileFormData).mockReturnValue({
					isValid: true,
					errors: {},
					sanitizedData: formData
				});

				const result = validateProfileUpdate(formData);

				expect(result.success).toBe(false);
				expect(result.validationErrors).toEqual({
					last_name: "Last name should be different from first name"
				});
			});

			it("should reject invalid email domains", () => {
				const formData: ProfileFormData = {
					first_name: "John",
					last_name: "Doe",
					email: "invalid-email"
				};

				vi.mocked(validateProfileFormData).mockReturnValue({
					isValid: true,
					errors: {},
					sanitizedData: formData
				});

				const result = validateProfileUpdate(formData);

				expect(result.success).toBe(false);
				expect(result.validationErrors).toEqual({
					email: "Please enter a valid email address"
				});
			});

			it("should return validation errors from utility function", () => {
				const formData: ProfileFormData = {
					first_name: "",
					last_name: "Doe",
					email: "invalid"
				};

				vi.mocked(validateProfileFormData).mockReturnValue({
					isValid: false,
					errors: {
						first_name: "First name is required",
						email: "Please enter a valid email address"
					}
				});

				const result = validateProfileUpdate(formData);

				expect(result.success).toBe(false);
				expect(result.validationErrors).toEqual({
					first_name: "First name is required",
					email: "Please enter a valid email address"
				});
			});

			it("should handle validation errors gracefully", () => {
				const formData: ProfileFormData = {
					first_name: "John",
					last_name: "Doe",
					email: "john.doe@example.com"
				};

				vi.mocked(validateProfileFormData).mockImplementation(() => {
					throw new Error("Validation service error");
				});

				const result = validateProfileUpdate(formData);

				expect(result.success).toBe(false);
				expect(result.error).toBe("Validation service error");
			});
		});

		describe("calculateProfileCompleteness", () => {
			it("should calculate 100% for complete profile", () => {
				const completeProfile: UserProfile = {
					id: "user123",
					email: "john.doe@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				};

				const completeness = calculateProfileCompleteness(completeProfile);

				expect(completeness).toBe(100);
			});

			it("should calculate 75% for profile missing one field", () => {
				const partialProfile: UserProfile = {
					id: "user123",
					email: "john.doe@example.com",
					first_name: "John",
					last_name: "", // Missing last name
					role: "team_member",
					is_active: true,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				};

				const completeness = calculateProfileCompleteness(partialProfile);

				expect(completeness).toBe(75);
			});

			it("should calculate 25% for empty profile", () => {
				const emptyProfile: UserProfile = {
					id: "user123",
					email: "",
					first_name: "",
					last_name: "",
					role: "team_member", // This counts as filled
					is_active: true,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				};

				const completeness = calculateProfileCompleteness(emptyProfile);

				expect(completeness).toBe(25); // Only role is filled
			});

			it("should handle whitespace-only fields as empty", () => {
				const whitespaceProfile: UserProfile = {
					id: "user123",
					email: "   ", // Whitespace only
					first_name: "  ", // Whitespace only
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				};

				const completeness = calculateProfileCompleteness(whitespaceProfile);

				expect(completeness).toBe(50); // Only last_name and role are filled
			});
		});

		describe("generateSecurityRecommendations", () => {
			it("should recommend login for users who never logged in", () => {
				const userProfile: UserProfile = {
					id: "user123",
					email: "john.doe@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					last_login_at: null,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				};

				const recommendations = generateSecurityRecommendations(userProfile);

				expect(recommendations).toContain("Consider logging in regularly to keep your account secure");
			});

			it("should recommend password update for old logins", () => {
				const oldDate = new Date();
				oldDate.setDate(oldDate.getDate() - 35); // 35 days ago

				const userProfile: UserProfile = {
					id: "user123",
					email: "john.doe@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					last_login_at: oldDate.toISOString(),
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				};

				const recommendations = generateSecurityRecommendations(userProfile);

				expect(recommendations).toContain(
					"It's been a while since your last login. Consider updating your password"
				);
			});

			it("should recommend better names for matching first/last names", () => {
				const userProfile: UserProfile = {
					id: "user123",
					email: "john.doe@example.com",
					first_name: "John",
					last_name: "John", // Same as first name
					role: "team_member",
					is_active: true,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				};

				const recommendations = generateSecurityRecommendations(userProfile);

				expect(recommendations).toContain("Consider using your full legal name for better account verification");
			});

			it("should recommend work email for personal email domains", () => {
				const userProfile: UserProfile = {
					id: "user123",
					email: "john.doe@gmail.com", // Personal email
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				};

				const recommendations = generateSecurityRecommendations(userProfile);

				expect(recommendations).toContain("Consider using your work email for better team integration");
			});

			it("should return empty array for optimal profile", () => {
				const recentDate = new Date();
				recentDate.setDate(recentDate.getDate() - 1); // Yesterday

				const userProfile: UserProfile = {
					id: "user123",
					email: "john.doe@company.com", // Work email
					first_name: "John",
					last_name: "Doe", // Different from first name
					role: "team_member",
					is_active: true,
					last_login_at: recentDate.toISOString(), // Recent login
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				};

				const recommendations = generateSecurityRecommendations(userProfile);

				expect(recommendations).toHaveLength(0);
			});
		});

		describe("formatProfileForSubmission", () => {
			it("should format profile data correctly", () => {
				const formData: ProfileFormData = {
					first_name: "  John  ",
					last_name: "  Doe  ",
					email: "  John.Doe@EXAMPLE.COM  "
				};

				const result = formatProfileForSubmission(formData);

				expect(result).toEqual({
					first_name: "John", // Sanitized and trimmed
					last_name: "Doe", // Sanitized and trimmed
					email: "john.doe@example.com" // Trimmed and lowercased
				});
			});

			it("should sanitize XSS attempts", () => {
				const formData: ProfileFormData = {
					first_name: "<script>alert('xss')</script>John",
					last_name: "<img src=x onerror=alert(1)>Doe",
					email: "john.doe@example.com"
				};

				const result = formatProfileForSubmission(formData);

				expect(result.first_name).toBe("John"); // Script tags and HTML removed, trimmed
				expect(result.last_name).toBe("Doe"); // HTML tags removed, trimmed
				expect(result.email).toBe("john.doe@example.com");
			});
		});

		describe("hasProfileChanged", () => {
			const originalProfile: UserProfile = {
				id: "user123",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member",
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			it("should return false when no changes made", () => {
				const updatedData: ProfileFormData = {
					first_name: "John",
					last_name: "Doe",
					email: "john.doe@example.com"
				};

				const result = hasProfileChanged(originalProfile, updatedData);

				expect(result).toBe(false);
			});

			it("should return true when first name changed", () => {
				const updatedData: ProfileFormData = {
					first_name: "Johnny",
					last_name: "Doe",
					email: "john.doe@example.com"
				};

				const result = hasProfileChanged(originalProfile, updatedData);

				expect(result).toBe(true);
			});

			it("should return true when email changed", () => {
				const updatedData: ProfileFormData = {
					first_name: "John",
					last_name: "Doe",
					email: "johnny.doe@example.com"
				};

				const result = hasProfileChanged(originalProfile, updatedData);

				expect(result).toBe(true);
			});

			it("should handle whitespace differences correctly", () => {
				const updatedData: ProfileFormData = {
					first_name: "  John  ", // Extra whitespace
					last_name: "Doe",
					email: "john.doe@example.com"
				};

				const result = hasProfileChanged(originalProfile, updatedData);

				expect(result).toBe(false); // Whitespace is trimmed in comparison
			});

			it("should handle email case differences", () => {
				const updatedData: ProfileFormData = {
					first_name: "John",
					last_name: "Doe",
					email: "John.Doe@EXAMPLE.COM" // Different case
				};

				const result = hasProfileChanged(originalProfile, updatedData);

				expect(result).toBe(false); // Email is lowercased in comparison
			});
		});

		describe("validateProfileAccess", () => {
			it("should allow users to edit their own profile", () => {
				const result = validateProfileAccess("user123", "user123", "team_member");

				expect(result).toBe(true);
			});

			it("should allow team leads to edit any profile", () => {
				const result = validateProfileAccess("lead123", "user456", "team_lead");

				expect(result).toBe(true);
			});

			it("should deny team members from editing other profiles", () => {
				const result = validateProfileAccess("user123", "user456", "team_member");

				expect(result).toBe(false);
			});

			it("should handle edge case of same user ID for team lead", () => {
				const result = validateProfileAccess("user123", "user123", "team_lead");

				expect(result).toBe(true);
			});
		});
	});

	// ============= COORDINATION FUNCTIONS (from profile-coordination-utils.test.ts) =============
	describe("Coordination Functions", () => {
		describe("determineProfilePageState", () => {
			it("should return show_profile state with valid session and profile", () => {
				const sessionInfo: SessionInfo = {
					id: "user123",
					email: "john@example.com",
					name: "John Doe",
					role: "team_member"
				};

				const profileData: UserProfile = {
					id: "user123",
					email: "john@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				};

				const result = determineProfilePageState(sessionInfo, profileData, null);

				expect(result.type).toBe("show_profile");
				if (result.type === "show_profile") {
					expect(result.profileData).toEqual(profileData);
				}
			});

			it("should return redirect_to_login state with no session", () => {
				const result = determineProfilePageState(null, null, null);

				expect(result.type).toBe("redirect_to_login");
			});

			it("should return show_error state when error provided", () => {
				const sessionInfo: SessionInfo = {
					id: "user123",
					email: "john@example.com",
					name: "John Doe",
					role: "team_member"
				};

				const error = new Error("Failed to load profile");

				const result = determineProfilePageState(sessionInfo, null, error);

				expect(result.type).toBe("show_error");
				if (result.type === "show_error") {
					expect(result.errorMessage).toBe("Failed to load profile");
				}
			});

			it("should return loading state when session exists but no profile data", () => {
				const sessionInfo: SessionInfo = {
					id: "user123",
					email: "john@example.com",
					name: "John Doe",
					role: "team_member"
				};

				const result = determineProfilePageState(sessionInfo, null, null);

				expect(result.type).toBe("loading");
			});
		});

		describe("extractProfileFormData", () => {
			it("should extract valid form data", () => {
				const formElements = {
					first_name: { value: "John" },
					last_name: { value: "Doe" },
					email: { value: "john.doe@example.com" }
				};

				const result = extractProfileFormData(formElements);

				expect(result).toEqual({
					first_name: "John",
					last_name: "Doe",
					email: "john.doe@example.com"
				});
			});

			it("should handle missing form elements", () => {
				const formElements = {
					first_name: { value: "John" }
					// Missing last_name and email
				};

				const result = extractProfileFormData(formElements);

				expect(result).toEqual({
					first_name: "John",
					last_name: "",
					email: ""
				});
			});

			it("should trim whitespace from values", () => {
				const formElements = {
					first_name: { value: "  John  " },
					last_name: { value: "  Doe  " },
					email: { value: "  john.doe@example.com  " }
				};

				const result = extractProfileFormData(formElements);

				expect(result).toEqual({
					first_name: "John",
					last_name: "Doe",
					email: "john.doe@example.com"
				});
			});

			it("should handle empty values", () => {
				const formElements = {
					first_name: { value: "" },
					last_name: { value: "" },
					email: { value: "" }
				};

				const result = extractProfileFormData(formElements);

				expect(result).toEqual({
					first_name: "",
					last_name: "",
					email: ""
				});
			});
		});

		describe("shouldProceedWithSubmission", () => {
			it("should allow submission with valid data", () => {
				const formData: ProfileFormData = {
					first_name: "John",
					last_name: "Doe",
					email: "john.doe@example.com"
				};

				const validationResult = {
					isValid: true,
					errors: {}
				};

				const result = shouldProceedWithSubmission(formData, validationResult);

				expect(result.proceed).toBe(true);
				expect(result.reason).toBeUndefined();
			});

			it("should block submission with validation errors", () => {
				const formData: ProfileFormData = {
					first_name: "",
					last_name: "Doe",
					email: "invalid-email"
				};

				const validationResult = {
					isValid: false,
					errors: {
						first_name: "First name is required",
						email: "Invalid email format"
					}
				};

				const result = shouldProceedWithSubmission(formData, validationResult);

				expect(result.proceed).toBe(false);
				expect(result.reason).toContain("Please correct the validation errors");
			});

			it("should block submission with empty required fields", () => {
				const formData: ProfileFormData = {
					first_name: "",
					last_name: "",
					email: ""
				};

				const validationResult = {
					isValid: true,
					errors: {}
				};

				const result = shouldProceedWithSubmission(formData, validationResult);

				expect(result.proceed).toBe(false);
				expect(result.reason).toContain("All fields are required");
			});

			it("should allow submission with whitespace that trims to valid content", () => {
				const formData: ProfileFormData = {
					first_name: "  John  ",
					last_name: "  Doe  ",
					email: "  john.doe@example.com  "
				};

				const validationResult = {
					isValid: true,
					errors: {}
				};

				const result = shouldProceedWithSubmission(formData, validationResult);

				expect(result.proceed).toBe(true);
			});
		});

		describe("createAuthError", () => {
			it("should create auth error for server errors", () => {
				const error = new Error("Server connection failed");

				const result = createAuthError(error);

				expect(result.type).toBe("server");
				expect(result.message).toBe("Server connection failed");
				expect(result.redirectRequired).toBe(false);
			});

			it("should create auth error for authentication failures", () => {
				const error = new Error("Unauthorized access");

				const result = createAuthError(error);

				expect(result.type).toBe("server");
				expect(result.message).toBe("Unauthorized access");
				expect(result.redirectRequired).toBe(false);
			});

			it("should handle network errors", () => {
				const error = new Error("Network request failed");

				const result = createAuthError(error);

				expect(result.type).toBe("server");
				expect(result.message).toBe("Network request failed");
				expect(result.redirectRequired).toBe(false);
			});
		});

		describe("getProfileInitializationSteps", () => {
			it("should return initialization steps for authenticated user", () => {
				const sessionInfo: SessionInfo = {
					id: "user123",
					email: "john@example.com",
					name: "John Doe",
					role: "team_member"
				};

				const steps = getProfileInitializationSteps(sessionInfo);

				expect(steps).toContain("Load user session");
				expect(steps).toContain("Fetch profile data");
				expect(steps).toContain("Initialize form");
				expect(steps).toContain("Setup event handlers");
				expect(steps.length).toBeGreaterThan(0);
			});

			it("should return different steps for unauthenticated user", () => {
				const steps = getProfileInitializationSteps(null);

				expect(steps).toContain("Redirect to login");
				expect(steps).not.toContain("Fetch profile data");
			});

			it("should include team lead specific steps", () => {
				const sessionInfo: SessionInfo = {
					id: "lead123",
					email: "lead@example.com",
					name: "Team Lead",
					role: "team_lead"
				};

				const steps = getProfileInitializationSteps(sessionInfo);

				expect(steps).toContain("Setup team lead permissions");
			});
		});
	});

	// ============= API UTILITY FUNCTIONS (from profile-utils.test.ts) =============
	describe("API Utility Functions", () => {
		describe("fetchUserProfile", () => {
			it("should fetch user profile successfully", async () => {
				const mockProfile: UserProfile = {
					id: "user123",
					email: "john.doe@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				};

				vi.mocked(fetch).mockResolvedValue({
					ok: true,
					json: () => Promise.resolve(mockProfile)
				} as Response);

				const result = await fetchUserProfile("user123");

				expect(result).toEqual(mockProfile);
				expect(fetch).toHaveBeenCalledWith("/api/users/user123", {
					method: "GET",
					credentials: "include",
					headers: {
						"Content-Type": "application/json"
					}
				});
			});

			it("should throw error for failed requests", async () => {
				vi.mocked(fetch).mockResolvedValue({
					ok: false,
					status: 404,
					statusText: "Not Found"
				} as Response);

				await expect(fetchUserProfile("user123")).rejects.toThrow("Failed to fetch profile: 404 Not Found");
			});

			it("should handle network errors", async () => {
				vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

				await expect(fetchUserProfile("user123")).rejects.toThrow("Network error");
			});
		});

		describe("validateProfileData", () => {
			it("should validate complete profile data", () => {
				const profileData: Partial<UserProfile> = {
					id: "user123",
					email: "john.doe@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_member"
				};

				const result = validateProfileData(profileData);

				expect(result.isValid).toBe(true);
				expect(result.errors).toEqual({});
			});

			it("should validate required fields", () => {
				const profileData: Partial<UserProfile> = {
					id: "",
					email: "",
					first_name: "",
					last_name: ""
				};

				const result = validateProfileData(profileData);

				expect(result.isValid).toBe(false);
				expect(result.errors.id).toBe("ID is required");
				expect(result.errors.email).toBe("Email is required");
				expect(result.errors.first_name).toBe("First name is required");
				expect(result.errors.last_name).toBe("Last name is required");
			});

			it("should validate email format", () => {
				const profileData: Partial<UserProfile> = {
					id: "user123",
					email: "invalid-email",
					first_name: "John",
					last_name: "Doe"
				};

				const result = validateProfileData(profileData);

				expect(result.isValid).toBe(false);
				expect(result.errors.email).toBe("Invalid email format");
			});

			it("should validate field lengths", () => {
				const profileData: Partial<UserProfile> = {
					id: "user123",
					email: "john@example.com",
					first_name: "A".repeat(51), // Too long
					last_name: "B".repeat(51) // Too long
				};

				const result = validateProfileData(profileData);

				expect(result.isValid).toBe(false);
				expect(result.errors.first_name).toBe("First name must be less than 50 characters");
				expect(result.errors.last_name).toBe("Last name must be less than 50 characters");
			});
		});

		describe("sanitizeProfileInput", () => {
			it("should sanitize XSS attempts", () => {
				const maliciousInput: ProfileUpdateData = {
					first_name: "<script>alert('xss')</script>John",
					last_name: "<img src=x onerror=alert(1)>Doe",
					email: "john@example.com"
				};

				const result = sanitizeProfileInput(maliciousInput);

				expect(result.first_name).toBe("John");
				expect(result.last_name).toBe("Doe");
				expect(result.email).toBe("john@example.com");
			});

			it("should preserve safe content", () => {
				const safeInput: ProfileUpdateData = {
					first_name: "John",
					last_name: "Doe",
					email: "john.doe@example.com"
				};

				const result = sanitizeProfileInput(safeInput);

				expect(result).toEqual(safeInput);
			});

			it("should handle various HTML tags", () => {
				const htmlInput: ProfileUpdateData = {
					first_name: "<b>John</b>",
					last_name: "<i>Doe</i>",
					email: "john@example.com"
				};

				const result = sanitizeProfileInput(htmlInput);

				expect(result.first_name).toBe("John");
				expect(result.last_name).toBe("Doe");
				expect(result.email).toBe("john@example.com");
			});
		});

		describe("createProfileUpdateRequest", () => {
			it("should create proper update request", () => {
				const profileData: ProfileUpdateData = {
					first_name: "John",
					last_name: "Doe",
					email: "john.doe@example.com"
				};

				const result = createProfileUpdateRequest("user123", profileData);

				expect(result.url).toBe("/api/users/user123");
				expect(result.options.method).toBe("PUT");
				expect(result.options.headers["Content-Type"]).toBe("application/json");
				expect(result.options.credentials).toBe("include");
				expect(JSON.parse(result.options.body)).toEqual(profileData);
			});

			it("should handle empty profile data", () => {
				const profileData: ProfileUpdateData = {
					first_name: "",
					last_name: "",
					email: ""
				};

				const result = createProfileUpdateRequest("user123", profileData);

				expect(result.url).toBe("/api/users/user123");
				expect(JSON.parse(result.options.body)).toEqual(profileData);
			});
		});

		describe("handleProfileApiResponse", () => {
			it("should handle successful responses", async () => {
				const mockData = { id: "user123", name: "John Doe" };
				const mockResponse = {
					ok: true,
					json: () => Promise.resolve(mockData)
				} as Response;

				const result = await handleProfileApiResponse(mockResponse);

				expect(result).toEqual(mockData);
			});

			it("should handle error responses", async () => {
				const mockResponse = {
					ok: false,
					status: 400,
					statusText: "Bad Request",
					json: () => Promise.resolve({ error: "Invalid data" })
				} as Response;

				await expect(handleProfileApiResponse(mockResponse)).rejects.toThrow("Invalid data");
			});

			it("should handle responses without error message", async () => {
				const mockResponse = {
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
					json: () => Promise.resolve({})
				} as Response;

				await expect(handleProfileApiResponse(mockResponse)).rejects.toThrow("Request failed: 500 Internal Server Error");
			});

			it("should handle JSON parsing errors", async () => {
				const mockResponse = {
					ok: true,
					json: () => Promise.reject(new Error("Invalid JSON"))
				} as Response;

				await expect(handleProfileApiResponse(mockResponse)).rejects.toThrow("Invalid JSON");
			});
		});
	});

	// ============= INTEGRATION TESTS =============
	describe("Integration Scenarios", () => {
		it("should handle complete profile workflow", () => {
			// Test integration between business logic and coordination functions
			const sessionInfo: SessionInfo = {
				id: "user123",
				email: "john@example.com",
				name: "John Doe",
				role: "team_member"
			};

			const profileData: UserProfile = {
				id: "user123",
				email: "john@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member",
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			// Test page state determination
			const pageState = determineProfilePageState(sessionInfo, profileData, null);
			expect(pageState.type).toBe("show_profile");

			// Test profile completeness
			const completeness = calculateProfileCompleteness(profileData);
			expect(completeness).toBe(100);

			// Test security recommendations
			const recommendations = generateSecurityRecommendations(profileData);
			expect(Array.isArray(recommendations)).toBe(true);
		});

		it("should handle form submission workflow", () => {
			const formElements = {
				first_name: { value: "John" },
				last_name: { value: "Doe" },
				email: { value: "john.doe@example.com" }
			};

			// Extract form data
			const formData = extractProfileFormData(formElements);
			
			// Mock validation
			vi.mocked(validateProfileFormData).mockReturnValue({
				isValid: true,
				errors: {},
				sanitizedData: formData
			});

			// Validate business logic
			const businessValidation = validateProfileUpdate(formData);
			expect(businessValidation.success).toBe(true);

			// Check submission readiness
			const submissionCheck = shouldProceedWithSubmission(formData, { isValid: true, errors: {} });
			expect(submissionCheck.proceed).toBe(true);

			// Format for submission
			const submissionData = formatProfileForSubmission(formData);
			expect(submissionData.email).toBe("john.doe@example.com");
		});

		it("should handle error scenarios across modules", () => {
			// Test error propagation through the system
			const error = new Error("Database connection failed");
			const authError = createAuthError(error);
			
			expect(authError.type).toBe("server");
			expect(authError.message).toBe("Database connection failed");

			// Test page state with no session
			const pageState = determineProfilePageState(null, null, error);
			expect(pageState.type).toBe("redirect_to_login");
		});
	});
});