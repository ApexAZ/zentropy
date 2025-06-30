/**
 * Profile Coordination Utilities Tests
 *
 * Following hybrid testing pattern - comprehensive unit tests for pure functions
 * extracted from profile page coordination logic.
 *
 * These tests cover the business logic of profile page state management
 * without complex DOM mocking.
 */

import { describe, it, expect } from "vitest";
import {
	determineProfilePageState,
	extractProfileFormData,
	shouldProceedWithSubmission,
	createAuthError,
	getProfileInitializationSteps,
	type SessionInfo,
	type ProfileFormData
} from "../../utils/profile-core";

describe("Profile Coordination Utilities", () => {
	describe("determineProfilePageState", () => {
		const mockSessionInfo: SessionInfo = {
			id: "user-123",
			email: "test@example.com",
			name: "Test User",
			role: "team_member"
		};

		const mockProfileData = {
			id: "user-123",
			email: "test@example.com",
			first_name: "Test",
			last_name: "User",
			role: "team_member" as const,
			is_active: true
		};

		it("should return redirect_to_login when no session", () => {
			const result = determineProfilePageState(null, null, null);

			expect(result).toEqual({ type: "redirect_to_login" });
		});

		it("should return show_error when error exists", () => {
			const error = new Error("Network error");
			const result = determineProfilePageState(mockSessionInfo, null, error);

			expect(result).toEqual({
				type: "show_error",
				errorMessage: "Network error"
			});
		});

		it("should return show_error with default message for error without message", () => {
			const error = new Error("");
			const result = determineProfilePageState(mockSessionInfo, null, error);

			expect(result).toEqual({
				type: "show_error",
				errorMessage: "Failed to load profile"
			});
		});

		it("should return loading when session exists but no profile data", () => {
			const result = determineProfilePageState(mockSessionInfo, null, null);

			expect(result).toEqual({ type: "loading" });
		});

		it("should return show_profile when session and profile data exist", () => {
			const result = determineProfilePageState(mockSessionInfo, mockProfileData, null);

			expect(result).toEqual({
				type: "show_profile",
				profileData: mockProfileData
			});
		});

		it("should prioritize error over profile data", () => {
			const error = new Error("API error");
			const result = determineProfilePageState(mockSessionInfo, mockProfileData, error);

			expect(result).toEqual({
				type: "show_error",
				errorMessage: "API error"
			});
		});

		it("should prioritize session check over everything", () => {
			const error = new Error("Some error");
			const result = determineProfilePageState(null, mockProfileData, error);

			expect(result).toEqual({ type: "redirect_to_login" });
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

		it("should trim whitespace from form fields", () => {
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

		it("should handle missing form elements", () => {
			const formElements = {
				first_name: { value: "John" }
				// missing last_name and email
			};

			const result = extractProfileFormData(formElements);

			expect(result).toEqual({
				first_name: "John",
				last_name: "",
				email: ""
			});
		});

		it("should handle empty form values", () => {
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

		it("should handle undefined form elements", () => {
			const formElements = {};

			const result = extractProfileFormData(formElements);

			expect(result).toEqual({
				first_name: "",
				last_name: "",
				email: ""
			});
		});
	});

	describe("shouldProceedWithSubmission", () => {
		const validFormData: ProfileFormData = {
			first_name: "John",
			last_name: "Doe",
			email: "john.doe@example.com"
		};

		it("should proceed with valid data and validation", () => {
			const validationResult = { isValid: true, errors: {} };
			const result = shouldProceedWithSubmission(validFormData, validationResult);

			expect(result).toEqual({ proceed: true });
		});

		it("should not proceed when validation fails", () => {
			const validationResult = {
				isValid: false,
				errors: { email: "Invalid email format" }
			};
			const result = shouldProceedWithSubmission(validFormData, validationResult);

			expect(result).toEqual({
				proceed: false,
				reason: "Invalid email format"
			});
		});

		it("should not proceed when validation fails with generic message", () => {
			const validationResult = { isValid: false, errors: {} };
			const result = shouldProceedWithSubmission(validFormData, validationResult);

			expect(result).toEqual({
				proceed: false,
				reason: "Validation failed"
			});
		});

		it("should not proceed when first_name is empty", () => {
			const formData = { ...validFormData, first_name: "" };
			const validationResult = { isValid: true, errors: {} };
			const result = shouldProceedWithSubmission(formData, validationResult);

			expect(result).toEqual({
				proceed: false,
				reason: "All fields are required"
			});
		});

		it("should not proceed when last_name is empty", () => {
			const formData = { ...validFormData, last_name: "" };
			const validationResult = { isValid: true, errors: {} };
			const result = shouldProceedWithSubmission(formData, validationResult);

			expect(result).toEqual({
				proceed: false,
				reason: "All fields are required"
			});
		});

		it("should not proceed when email is empty", () => {
			const formData = { ...validFormData, email: "" };
			const validationResult = { isValid: true, errors: {} };
			const result = shouldProceedWithSubmission(formData, validationResult);

			expect(result).toEqual({
				proceed: false,
				reason: "All fields are required"
			});
		});

		it("should prioritize validation errors over empty field errors", () => {
			const formData = { ...validFormData, first_name: "" };
			const validationResult = {
				isValid: false,
				errors: { email: "Email already exists" }
			};
			const result = shouldProceedWithSubmission(formData, validationResult);

			expect(result).toEqual({
				proceed: false,
				reason: "Email already exists"
			});
		});
	});

	describe("createAuthError", () => {
		it("should create auth error with message", () => {
			const error = new Error("Authentication failed");
			const result = createAuthError(error);

			expect(result).toEqual({
				type: "server",
				message: "Authentication failed",
				redirectRequired: true
			});
		});

		it("should create auth error with default message when no message", () => {
			const error = new Error("");
			const result = createAuthError(error);

			expect(result).toEqual({
				type: "server",
				message: "Unknown error",
				redirectRequired: true
			});
		});

		it("should handle error without message property", () => {
			const error = new Error();
			error.message = "";
			const result = createAuthError(error);

			expect(result).toEqual({
				type: "server",
				message: "Unknown error",
				redirectRequired: true
			});
		});
	});

	describe("getProfileInitializationSteps", () => {
		const mockSessionInfo: SessionInfo = {
			id: "user-123",
			email: "test@example.com",
			name: "Test User",
			role: "team_member"
		};

		it("should return full initialization steps with valid session", () => {
			const result = getProfileInitializationSteps(mockSessionInfo);

			expect(result).toEqual([
				"initialize_navigation",
				"show_loading_state",
				"fetch_profile_data",
				"setup_event_listeners"
			]);
		});

		it("should return login redirect steps with no session", () => {
			const result = getProfileInitializationSteps(null);

			expect(result).toEqual(["initialize_navigation", "redirect_to_login"]);
		});
	});

	describe("Integration Scenarios", () => {
		it("should handle complete successful workflow", () => {
			const sessionInfo: SessionInfo = {
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member"
			};

			const profileData = {
				id: "user-123",
				email: "test@example.com",
				first_name: "Test",
				last_name: "User",
				role: "team_member" as const,
				is_active: true
			};

			// Check initialization steps
			const steps = getProfileInitializationSteps(sessionInfo);
			expect(steps).toContain("fetch_profile_data");

			// Check successful state
			const pageState = determineProfilePageState(sessionInfo, profileData, null);
			expect(pageState.type).toBe("show_profile");

			// Check form submission
			const formData = extractProfileFormData({
				first_name: { value: "Test" },
				last_name: { value: "User" },
				email: { value: "test@example.com" }
			});

			const submission = shouldProceedWithSubmission(formData, { isValid: true, errors: {} });
			expect(submission.proceed).toBe(true);
		});

		it("should handle complete error workflow", () => {
			const sessionInfo: SessionInfo = {
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member"
			};

			const error = new Error("Network failure");

			// Check error state
			const pageState = determineProfilePageState(sessionInfo, null, error);
			expect(pageState).toEqual({
				type: "show_error",
				errorMessage: "Network failure"
			});

			// Check auth error creation
			const authError = createAuthError(error);
			expect(authError.redirectRequired).toBe(true);
		});

		it("should handle no session workflow", () => {
			// Check initialization steps
			const steps = getProfileInitializationSteps(null);
			expect(steps).toEqual(["initialize_navigation", "redirect_to_login"]);

			// Check page state
			const pageState = determineProfilePageState(null, null, null);
			expect(pageState.type).toBe("redirect_to_login");
		});
	});
});
