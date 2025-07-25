import { vi, describe, it, expect, beforeEach } from "vitest";
import { UserService } from "../UserService";
import { AuthService } from "../AuthService";
import type {
	User,
	ProfileUpdateData,
	PasswordUpdateData,
	AccountSecurityResponse,
	LinkGoogleAccountRequest,
	UnlinkGoogleAccountRequest,
	LinkAccountResponse,
	UnlinkAccountResponse
} from "../../types";
import * as authUtils from "../../utils/auth";

// Mock fetch globally

global.fetch = vi.fn();

// Mock AuthService dependency
vi.mock("../AuthService");

// Mock auth utils
vi.mock("../../utils/auth", () => ({
	createAuthHeaders: vi.fn(() => ({
		"Content-Type": "application/json",
		Authorization: "Bearer mock-token"
	}))
}));

describe("UserService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Test data
	const mockUser: User = {
		id: "user-123",
		username: "johndoe",
		email: "john@example.com",
		first_name: "John",
		last_name: "Doe",
		phone_number: "+1 (555) 123-4567",
		role: "developer",
		has_projects_access: true,
		email_verified: true,
		created_at: "2025-01-08T12:00:00Z",
		updated_at: "2025-01-08T12:00:00Z"
	};

	const mockUsers: User[] = [
		mockUser,
		{
			id: "user-456",
			username: "janesmith",
			email: "jane@example.com",
			first_name: "Jane",
			last_name: "Smith",
			phone_number: "+1 (555) 987-6543",
			role: "manager",
			has_projects_access: true,
			email_verified: true,
			created_at: "2025-01-08T12:00:00Z",
			updated_at: "2025-01-08T12:00:00Z"
		}
	];

	// Helper function to mock successful fetch response
	const mockSuccessResponse = <T>(data: T) => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(data)
		} as Response);
	};

	// Helper function to mock error response
	const mockErrorResponse = (status: number, message: string) => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status,
			statusText: status === 400 ? "Bad Request" : "Internal Server Error",
			json: () => Promise.resolve({ message })
		} as Response);
	};

	// Helper function to mock network error
	const mockNetworkError = () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));
	};

	describe("getCurrentUser", () => {
		it("should retrieve current user successfully", async () => {
			mockSuccessResponse(mockUser);

			const result = await UserService.getCurrentUser();

			expect(result).toEqual(mockUser);
			expect(fetch).toHaveBeenCalledWith("/api/v1/users/me", {
				headers: {
					Authorization: "Bearer mock-token",
					"Content-Type": "application/json"
				}
			});
		});

		it("should handle unauthorized error", async () => {
			mockErrorResponse(401, "Unauthorized");

			await expect(UserService.getCurrentUser()).rejects.toThrow("Unauthorized");
		});

		it("should handle API errors when retrieving current user", async () => {
			mockErrorResponse(500, "Server error");

			await expect(UserService.getCurrentUser()).rejects.toThrow("Server error");
		});

		it("should handle network errors when retrieving current user", async () => {
			mockNetworkError();

			await expect(UserService.getCurrentUser()).rejects.toThrow("Network error");
		});
	});

	describe("updateProfile", () => {
		const profileData: ProfileUpdateData = {
			first_name: "John",
			last_name: "Updated",
			email: "john.updated@example.com",
			phone_number: "+1 (555) 123-4567"
		};

		it("should update user profile successfully", async () => {
			const updatedUser = { ...mockUser, last_name: "Updated", email: "john.updated@example.com" };
			mockSuccessResponse(updatedUser);

			const result = await UserService.updateProfile(profileData);

			expect(result).toEqual(updatedUser);
			expect(fetch).toHaveBeenCalledWith("/api/v1/users/me", {
				method: "PUT",
				headers: {
					Authorization: "Bearer mock-token",
					"Content-Type": "application/json"
				},
				body: JSON.stringify(profileData)
			});
		});

		it("should handle validation errors when updating profile", async () => {
			mockErrorResponse(400, "Invalid email address");

			await expect(UserService.updateProfile(profileData)).rejects.toThrow("Invalid email address");
		});

		it("should handle email already exists error", async () => {
			mockErrorResponse(409, "Email already in use");

			await expect(UserService.updateProfile(profileData)).rejects.toThrow("Email already in use");
		});

		it("should handle API errors when updating profile", async () => {
			mockErrorResponse(500, "Server error");

			await expect(UserService.updateProfile(profileData)).rejects.toThrow("Server error");
		});

		it("should handle network errors when updating profile", async () => {
			mockNetworkError();

			await expect(UserService.updateProfile(profileData)).rejects.toThrow("Network error");
		});

		it("should update profile with phone number", async () => {
			const profileDataWithPhone: ProfileUpdateData = {
				first_name: "Jane",
				last_name: "Smith",
				email: "jane@example.com",
				phone_number: "+1 (555) 987-6543"
			};

			const updatedUser = { ...mockUser, ...profileDataWithPhone };
			mockSuccessResponse(updatedUser);

			const result = await UserService.updateProfile(profileDataWithPhone);

			expect(result).toEqual(updatedUser);
			expect(fetch).toHaveBeenCalledWith("/api/v1/users/me", {
				method: "PUT",
				headers: {
					Authorization: "Bearer mock-token",
					"Content-Type": "application/json"
				},
				body: JSON.stringify(profileDataWithPhone)
			});
		});

		it("should update profile without phone number", async () => {
			const profileDataNoPhone: ProfileUpdateData = {
				first_name: "Jane",
				last_name: "Smith",
				email: "jane@example.com"
			};

			const updatedUser = { ...mockUser, ...profileDataNoPhone };
			mockSuccessResponse(updatedUser);

			const result = await UserService.updateProfile(profileDataNoPhone);

			expect(result).toEqual(updatedUser);
			expect(fetch).toHaveBeenCalledWith("/api/v1/users/me", {
				method: "PUT",
				headers: {
					Authorization: "Bearer mock-token",
					"Content-Type": "application/json"
				},
				body: JSON.stringify(profileDataNoPhone)
			});
		});
	});

	describe("updatePassword", () => {
		const passwordData: PasswordUpdateData = {
			current_password: "currentpass123",
			new_password: "NewSecurePass123!",
			confirm_new_password: "NewSecurePass123!"
		};

		it("should update password successfully", async () => {
			const successResponse = { message: "Password updated successfully!" };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(successResponse)
			} as Response);

			const result = await UserService.updatePassword(passwordData);

			expect(result).toEqual(successResponse);
			expect(fetch).toHaveBeenCalledWith("/api/v1/users/me/change-password", {
				method: "POST",
				headers: {
					Authorization: "Bearer mock-token",
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					current_password: passwordData.current_password,
					new_password: passwordData.new_password
				})
			});
		});

		it("should handle password update with custom success message", async () => {
			const customResponse = { message: "Password changed successfully" };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(customResponse)
			} as Response);

			const result = await UserService.updatePassword(passwordData);

			expect(result).toEqual(customResponse);
		});

		it("should handle password update with no message in response", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({})
			} as Response);

			const result = await UserService.updatePassword(passwordData);

			expect(result).toEqual({ message: "Password updated successfully!" });
		});

		it("should handle current password incorrect error", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: () => Promise.resolve({ message: "Current password is incorrect" })
			} as Response);

			await expect(UserService.updatePassword(passwordData)).rejects.toThrow("Current password is incorrect");
		});

		it("should handle password validation errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: () => Promise.resolve({ message: "Password does not meet requirements" })
			} as Response);

			await expect(UserService.updatePassword(passwordData)).rejects.toThrow(
				"Password does not meet requirements"
			);
		});

		it("should handle malformed JSON error response", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.reject(new Error("Invalid JSON"))
			} as Response);

			await expect(UserService.updatePassword(passwordData)).rejects.toThrow("Unknown error");
		});

		it("should handle unknown error format", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.resolve({})
			} as Response);

			await expect(UserService.updatePassword(passwordData)).rejects.toThrow("Failed to update password");
		});

		it("should handle API errors when updating password", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.resolve({ message: "Server error" })
			} as Response);

			await expect(UserService.updatePassword(passwordData)).rejects.toThrow("Server error");
		});

		it("should handle network errors when updating password", async () => {
			mockNetworkError();

			await expect(UserService.updatePassword(passwordData)).rejects.toThrow("Network error");
		});
	});

	describe("getAllUsers", () => {
		it("should retrieve all users successfully", async () => {
			mockSuccessResponse(mockUsers);

			const result = await UserService.getAllUsers();

			expect(result).toEqual(mockUsers);
			expect(fetch).toHaveBeenCalledWith("/api/v1/users", {
				headers: {
					Authorization: "Bearer mock-token",
					"Content-Type": "application/json"
				}
			});
		});

		it("should handle empty users list", async () => {
			mockSuccessResponse([]);

			const result = await UserService.getAllUsers();

			expect(result).toEqual([]);
			expect(fetch).toHaveBeenCalledWith("/api/v1/users", {
				headers: {
					Authorization: "Bearer mock-token",
					"Content-Type": "application/json"
				}
			});
		});

		it("should handle API errors when retrieving all users", async () => {
			mockErrorResponse(500, "Server error");

			await expect(UserService.getAllUsers()).rejects.toThrow("Server error");
		});

		it("should handle network errors when retrieving all users", async () => {
			mockNetworkError();

			await expect(UserService.getAllUsers()).rejects.toThrow("Network error");
		});
	});

	describe("validateProfile", () => {
		it("should validate valid profile data successfully", () => {
			const validProfileData: ProfileUpdateData = {
				first_name: "John",
				last_name: "Doe",
				email: "john@example.com"
			};

			const result = UserService.validateProfile(validProfileData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it("should return error for empty first name", () => {
			const invalidProfileData: ProfileUpdateData = {
				first_name: "",
				last_name: "Doe",
				email: "john@example.com"
			};

			const result = UserService.validateProfile(invalidProfileData);

			expect(result.isValid).toBe(false);
			expect(result.errors.first_name).toBe("First name is required");
		});

		it("should return error for whitespace-only first name", () => {
			const invalidProfileData: ProfileUpdateData = {
				first_name: "   ",
				last_name: "Doe",
				email: "john@example.com"
			};

			const result = UserService.validateProfile(invalidProfileData);

			expect(result.isValid).toBe(false);
			expect(result.errors.first_name).toBe("First name is required");
		});

		it("should return error for first name too long", () => {
			const invalidProfileData: ProfileUpdateData = {
				first_name: "A".repeat(101),
				last_name: "Doe",
				email: "john@example.com"
			};

			const result = UserService.validateProfile(invalidProfileData);

			expect(result.isValid).toBe(false);
			expect(result.errors.first_name).toBe("First name must be less than 100 characters");
		});

		it("should return error for empty last name", () => {
			const invalidProfileData: ProfileUpdateData = {
				first_name: "John",
				last_name: "",
				email: "john@example.com"
			};

			const result = UserService.validateProfile(invalidProfileData);

			expect(result.isValid).toBe(false);
			expect(result.errors.last_name).toBe("Last name is required");
		});

		it("should return error for whitespace-only last name", () => {
			const invalidProfileData: ProfileUpdateData = {
				first_name: "John",
				last_name: "   ",
				email: "john@example.com"
			};

			const result = UserService.validateProfile(invalidProfileData);

			expect(result.isValid).toBe(false);
			expect(result.errors.last_name).toBe("Last name is required");
		});

		it("should return error for last name too long", () => {
			const invalidProfileData: ProfileUpdateData = {
				first_name: "John",
				last_name: "A".repeat(101),
				email: "john@example.com"
			};

			const result = UserService.validateProfile(invalidProfileData);

			expect(result.isValid).toBe(false);
			expect(result.errors.last_name).toBe("Last name must be less than 100 characters");
		});

		it("should return error for empty email", () => {
			const invalidProfileData: ProfileUpdateData = {
				first_name: "John",
				last_name: "Doe",
				email: ""
			};

			const result = UserService.validateProfile(invalidProfileData);

			expect(result.isValid).toBe(false);
			expect(result.errors.email).toBe("Email is required");
		});

		it("should return error for whitespace-only email", () => {
			const invalidProfileData: ProfileUpdateData = {
				first_name: "John",
				last_name: "Doe",
				email: "   "
			};

			const result = UserService.validateProfile(invalidProfileData);

			expect(result.isValid).toBe(false);
			expect(result.errors.email).toBe("Email is required");
		});

		it("should return error for invalid email format", () => {
			const invalidEmails = [
				"invalid-email",
				"@example.com",
				"user@",
				"user.example.com",
				"user@.com",
				"user@example.",
				"user name@example.com"
			];

			invalidEmails.forEach(email => {
				const invalidProfileData: ProfileUpdateData = {
					first_name: "John",
					last_name: "Doe",
					email
				};

				const result = UserService.validateProfile(invalidProfileData);

				expect(result.isValid).toBe(false);
				expect(result.errors.email).toBe("Please enter a valid email address");
			});
		});

		it("should accept valid email formats", () => {
			const validEmails = [
				"user@example.com",
				"user.name@example.com",
				"user+tag@example.co.uk",
				"user_name@sub.example.org",
				"123@example.com"
			];

			validEmails.forEach(email => {
				const validProfileData: ProfileUpdateData = {
					first_name: "John",
					last_name: "Doe",
					email
				};

				const result = UserService.validateProfile(validProfileData);

				expect(result.isValid).toBe(true);
				expect(result.errors).toEqual({});
			});
		});

		it("should return multiple validation errors", () => {
			const invalidProfileData: ProfileUpdateData = {
				first_name: "",
				last_name: "A".repeat(101),
				email: "invalid-email"
			};

			const result = UserService.validateProfile(invalidProfileData);

			expect(result.isValid).toBe(false);
			expect(result.errors.first_name).toBe("First name is required");
			expect(result.errors.last_name).toBe("Last name must be less than 100 characters");
			expect(result.errors.email).toBe("Please enter a valid email address");
		});

		// Phone number validation tests
		it("should validate valid phone number formats", () => {
			const validPhoneNumbers = [
				"+1 (555) 123-4567",
				"555-123-4567",
				"(555) 123-4567",
				"+1 555 123 4567",
				"+12345678901",
				"555.123.4567"
			];

			validPhoneNumbers.forEach(phoneNumber => {
				const profileData: ProfileUpdateData = {
					first_name: "John",
					last_name: "Doe",
					email: "john@example.com",
					phone_number: phoneNumber
				};

				const result = UserService.validateProfile(profileData);

				expect(result.isValid).toBe(true);
				expect(result.errors.phone_number).toBeUndefined();
			});
		});

		it("should validate when phone number is empty or undefined", () => {
			const profileDataEmpty: ProfileUpdateData = {
				first_name: "John",
				last_name: "Doe",
				email: "john@example.com",
				phone_number: ""
			};

			const profileDataUndefined: ProfileUpdateData = {
				first_name: "John",
				last_name: "Doe",
				email: "john@example.com"
			};

			const resultEmpty = UserService.validateProfile(profileDataEmpty);
			const resultUndefined = UserService.validateProfile(profileDataUndefined);

			expect(resultEmpty.isValid).toBe(true);
			expect(resultEmpty.errors.phone_number).toBeUndefined();
			expect(resultUndefined.isValid).toBe(true);
			expect(resultUndefined.errors.phone_number).toBeUndefined();
		});

		it("should return error for invalid phone number formats", () => {
			const invalidPhoneNumbers = [
				"123-456",
				"not-a-phone",
				"555-555-555555555",
				"++1 555 123 4567",
				"555-abc-defg"
			];

			invalidPhoneNumbers.forEach(phoneNumber => {
				const profileData: ProfileUpdateData = {
					first_name: "John",
					last_name: "Doe",
					email: "john@example.com",
					phone_number: phoneNumber
				};

				const result = UserService.validateProfile(profileData);

				expect(result.isValid).toBe(false);
				expect(result.errors.phone_number).toBe(
					"Please enter a valid phone number (e.g., +1 (555) 123-4567, 555-123-4567)"
				);
			});
		});

		it("should return error for phone number that is too long", () => {
			const profileData: ProfileUpdateData = {
				first_name: "John",
				last_name: "Doe",
				email: "john@example.com",
				phone_number: "+1234567890123456789012"
			};

			const result = UserService.validateProfile(profileData);

			expect(result.isValid).toBe(false);
			expect(result.errors.phone_number).toBe("Phone number must be less than 20 characters");
		});

		it("should validate profile with phone number and other fields", () => {
			const profileData: ProfileUpdateData = {
				first_name: "John",
				last_name: "Doe",
				email: "john@example.com",
				phone_number: "+1 (555) 123-4567"
			};

			const result = UserService.validateProfile(profileData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});
	});

	describe("validatePasswordUpdate", () => {
		const mockPasswordValidation = {
			isValid: true,
			requirements: {
				length: true,
				uppercase: true,
				lowercase: true,
				number: true,
				symbol: true
			}
		};

		beforeEach(() => {
			vi.mocked(AuthService.validatePassword).mockReturnValue(mockPasswordValidation);
		});

		it("should validate valid password update data successfully", () => {
			const validPasswordData: PasswordUpdateData = {
				current_password: "currentpass123",
				new_password: "NewSecurePass123!",
				confirm_new_password: "NewSecurePass123!"
			};

			const result = UserService.validatePasswordUpdate(validPasswordData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
			expect(AuthService.validatePassword).toHaveBeenCalledWith("NewSecurePass123!", "NewSecurePass123!");
		});

		it("should return error for missing current password", () => {
			const invalidPasswordData: PasswordUpdateData = {
				current_password: "",
				new_password: "NewSecurePass123!",
				confirm_new_password: "NewSecurePass123!"
			};

			const result = UserService.validatePasswordUpdate(invalidPasswordData);

			expect(result.isValid).toBe(false);
			expect(result.errors.current_password).toBe("Current password is required");
		});

		it("should return error for missing new password", () => {
			const invalidPasswordData: PasswordUpdateData = {
				current_password: "currentpass123",
				new_password: "",
				confirm_new_password: "NewSecurePass123!"
			};

			const result = UserService.validatePasswordUpdate(invalidPasswordData);

			expect(result.isValid).toBe(false);
			expect(result.errors.new_password).toBe("New password is required");
		});

		it("should return error for missing confirm password", () => {
			const invalidPasswordData: PasswordUpdateData = {
				current_password: "currentpass123",
				new_password: "NewSecurePass123!",
				confirm_new_password: ""
			};

			const result = UserService.validatePasswordUpdate(invalidPasswordData);

			expect(result.isValid).toBe(false);
			expect(result.errors.confirm_new_password).toBe("Please confirm your new password");
		});

		it("should return error when passwords do not match", () => {
			const invalidPasswordData: PasswordUpdateData = {
				current_password: "currentpass123",
				new_password: "NewSecurePass123!",
				confirm_new_password: "DifferentPassword123!"
			};

			const result = UserService.validatePasswordUpdate(invalidPasswordData);

			expect(result.isValid).toBe(false);
			expect(result.errors.confirm_new_password).toBe("Passwords do not match");
		});

		it("should return error for weak password (missing length)", () => {
			const weakPasswordValidation = {
				isValid: false,
				requirements: {
					length: false,
					uppercase: true,
					lowercase: true,
					number: true,
					symbol: true
				}
			};
			vi.mocked(AuthService.validatePassword).mockReturnValue(weakPasswordValidation);

			const invalidPasswordData: PasswordUpdateData = {
				current_password: "currentpass123",
				new_password: "Short1!",
				confirm_new_password: "Short1!"
			};

			const result = UserService.validatePasswordUpdate(invalidPasswordData);

			expect(result.isValid).toBe(false);
			expect(result.errors.new_password).toBe("Password must contain at least 8 characters");
		});

		it("should return error for weak password (multiple missing requirements)", () => {
			const weakPasswordValidation = {
				isValid: false,
				requirements: {
					length: false,
					uppercase: false,
					lowercase: true,
					number: false,
					symbol: false
				}
			};
			vi.mocked(AuthService.validatePassword).mockReturnValue(weakPasswordValidation);

			const invalidPasswordData: PasswordUpdateData = {
				current_password: "currentpass123",
				new_password: "weak",
				confirm_new_password: "weak"
			};

			const result = UserService.validatePasswordUpdate(invalidPasswordData);

			expect(result.isValid).toBe(false);
			expect(result.errors.new_password).toBe(
				"Password must contain at least 8 characters, one uppercase letter, one number, one special character"
			);
		});

		it("should return multiple validation errors", () => {
			const weakPasswordValidation = {
				isValid: false,
				requirements: {
					length: false,
					uppercase: true,
					lowercase: true,
					number: true,
					symbol: true
				}
			};
			vi.mocked(AuthService.validatePassword).mockReturnValue(weakPasswordValidation);

			const invalidPasswordData: PasswordUpdateData = {
				current_password: "",
				new_password: "short",
				confirm_new_password: "different"
			};

			const result = UserService.validatePasswordUpdate(invalidPasswordData);

			expect(result.isValid).toBe(false);
			expect(result.errors.current_password).toBe("Current password is required");
			expect(result.errors.new_password).toBe("Password must contain at least 8 characters");
			expect(result.errors.confirm_new_password).toBe("Passwords do not match");
		});
	});

	describe("error handling", () => {
		it("should handle malformed JSON responses", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.reject(new Error("Invalid JSON"))
			} as Response);

			await expect(UserService.getCurrentUser()).rejects.toThrow("Unknown error");
		});

		it("should handle unknown error format", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.resolve({})
			} as Response);

			await expect(UserService.getCurrentUser()).rejects.toThrow("HTTP 500: Internal Server Error");
		});

		it("should handle fetch network errors", async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

			await expect(UserService.getCurrentUser()).rejects.toThrow("Failed to fetch");
		});
	});

	describe("getAccountSecurity", () => {
		const mockSecurityResponse: AccountSecurityResponse = {
			email_auth_linked: true,
			google_auth_linked: false,
			google_email: undefined
		};

		const mockHybridSecurityResponse: AccountSecurityResponse = {
			email_auth_linked: true,
			google_auth_linked: true,
			google_email: "john@gmail.com"
		};

		it("should retrieve account security status successfully", async () => {
			mockSuccessResponse(mockSecurityResponse);

			const result = await UserService.getAccountSecurity();

			expect(result).toEqual(mockSecurityResponse);
			expect(fetch).toHaveBeenCalledWith("/api/v1/users/me/security", {
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer mock-token"
				}
			});
			expect(authUtils.createAuthHeaders).toHaveBeenCalled();
		});

		it("should retrieve hybrid account security status", async () => {
			mockSuccessResponse(mockHybridSecurityResponse);

			const result = await UserService.getAccountSecurity();

			expect(result).toEqual(mockHybridSecurityResponse);
			expect(result.google_auth_linked).toBe(true);
			expect(result.google_email).toBe("john@gmail.com");
		});

		it("should handle unauthorized error with user-friendly message", async () => {
			mockErrorResponse(401, "Unauthorized");

			await expect(UserService.getAccountSecurity()).rejects.toThrow(
				"Your session has expired. Please sign in again."
			);
		});

		it("should handle API errors with user-friendly message", async () => {
			mockErrorResponse(500, "Internal server error");

			await expect(UserService.getAccountSecurity()).rejects.toThrow(
				"A server error occurred. Please try again."
			);
		});

		it("should handle network errors with user-friendly message", async () => {
			mockNetworkError();

			await expect(UserService.getAccountSecurity()).rejects.toThrow(
				"Connection problem. Please check your internet connection and try again."
			);
		});

		it("should handle unknown errors with fallback message", async () => {
			mockErrorResponse(400, "Some unknown error");

			await expect(UserService.getAccountSecurity()).rejects.toThrow(
				"Unable to load account security information."
			);
		});
	});

	describe("linkGoogleAccount", () => {
		const linkRequest: LinkGoogleAccountRequest = {
			google_credential: "google-oauth-credential-token-123"
		};

		const backendResponse = {
			message: "Google account linked successfully",
			google_email: "john@gmail.com"
		};

		const expectedResponse: LinkAccountResponse = {
			message: "Google account linked successfully",
			google_email: "john@gmail.com",
			success: true
		};

		it("should link Google account successfully", async () => {
			mockSuccessResponse(backendResponse);

			const result = await UserService.linkGoogleAccount(linkRequest);

			expect(result).toEqual(expectedResponse);
			expect(fetch).toHaveBeenCalledWith("/api/v1/users/me/link-google", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer mock-token"
				},
				body: JSON.stringify(linkRequest)
			});
			expect(authUtils.createAuthHeaders).toHaveBeenCalled();
		});

		it("should handle email mismatch error with user-friendly message", async () => {
			mockErrorResponse(400, "Google email does not match account email");

			await expect(UserService.linkGoogleAccount(linkRequest)).rejects.toThrow(
				"The Google account email doesn't match your account email."
			);
		});

		it("should handle already linked error with user-friendly message", async () => {
			mockErrorResponse(409, "Google account already linked to another user");

			await expect(UserService.linkGoogleAccount(linkRequest)).rejects.toThrow(
				"This Google account is already linked to another user."
			);
		});

		it("should handle invalid Google credential error with user-friendly message", async () => {
			mockErrorResponse(400, "Invalid Google credential");

			await expect(UserService.linkGoogleAccount(linkRequest)).rejects.toThrow(
				"Google sign-in was not completed successfully."
			);
		});

		it("should handle unauthorized error with user-friendly message", async () => {
			mockErrorResponse(401, "Unauthorized");

			await expect(UserService.linkGoogleAccount(linkRequest)).rejects.toThrow(
				"Your session has expired. Please sign in again."
			);
		});

		it("should handle API errors with user-friendly message", async () => {
			mockErrorResponse(500, "Internal server error");

			await expect(UserService.linkGoogleAccount(linkRequest)).rejects.toThrow(
				"A server error occurred. Please try again."
			);
		});

		it("should handle network errors with user-friendly message", async () => {
			mockNetworkError();

			await expect(UserService.linkGoogleAccount(linkRequest)).rejects.toThrow(
				"Connection problem. Please check your internet connection and try again."
			);
		});

		it("should handle unknown errors with fallback message", async () => {
			mockErrorResponse(400, "Some unknown error");

			await expect(UserService.linkGoogleAccount(linkRequest)).rejects.toThrow("Unable to link Google account.");
		});
	});

	describe("unlinkGoogleAccount", () => {
		const unlinkRequest: UnlinkGoogleAccountRequest = {
			password: "current-password-123"
		};

		const backendResponse = {
			message: "Google account unlinked successfully"
		};

		const expectedResponse: UnlinkAccountResponse = {
			message: "Google account unlinked successfully",
			success: true
		};

		it("should unlink Google account successfully", async () => {
			mockSuccessResponse(backendResponse);

			const result = await UserService.unlinkGoogleAccount(unlinkRequest);

			expect(result).toEqual(expectedResponse);
			expect(fetch).toHaveBeenCalledWith("/api/v1/users/me/unlink-google", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer mock-token"
				},
				body: JSON.stringify(unlinkRequest)
			});
			expect(authUtils.createAuthHeaders).toHaveBeenCalled();
		});

		it("should handle incorrect password error with user-friendly message", async () => {
			mockErrorResponse(400, "Incorrect password");

			await expect(UserService.unlinkGoogleAccount(unlinkRequest)).rejects.toThrow(
				"The password you entered is incorrect."
			);
		});

		it("should handle no Google account linked error with user-friendly message", async () => {
			mockErrorResponse(400, "No Google account is currently linked");

			await expect(UserService.unlinkGoogleAccount(unlinkRequest)).rejects.toThrow(
				"No Google account is currently linked to your account."
			);
		});

		it("should handle last authentication method error with user-friendly message", async () => {
			mockErrorResponse(400, "Cannot remove last authentication method");

			await expect(UserService.unlinkGoogleAccount(unlinkRequest)).rejects.toThrow(
				"You can't remove your last authentication method."
			);
		});

		it("should handle unauthorized error with user-friendly message", async () => {
			mockErrorResponse(401, "Unauthorized");

			await expect(UserService.unlinkGoogleAccount(unlinkRequest)).rejects.toThrow(
				"Your session has expired. Please sign in again."
			);
		});

		it("should handle API errors with user-friendly message", async () => {
			mockErrorResponse(500, "Internal server error");

			await expect(UserService.unlinkGoogleAccount(unlinkRequest)).rejects.toThrow(
				"A server error occurred. Please try again."
			);
		});

		it("should handle network errors with user-friendly message", async () => {
			mockNetworkError();

			await expect(UserService.unlinkGoogleAccount(unlinkRequest)).rejects.toThrow(
				"Connection problem. Please check your internet connection and try again."
			);
		});

		it("should handle unknown errors with fallback message", async () => {
			mockErrorResponse(400, "Some unknown error");

			await expect(UserService.unlinkGoogleAccount(unlinkRequest)).rejects.toThrow(
				"Unable to unlink Google account."
			);
		});
	});
});
