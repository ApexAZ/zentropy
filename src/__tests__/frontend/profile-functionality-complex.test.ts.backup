import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

// Import functions we'll implement
import {
	initializeProfilePage,
	displayProfileData,
	enterEditMode,
	exitEditMode,
	handleProfileFormSubmit,
	showProfileSection,
	hideProfileSection,
	updateRoleBadge,
	showProfileToast,
	hideProfileToast
} from "../../public/profile";

// Mock DOM elements and browser APIs
const mockSessionStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};

const mockFetch = vi.fn();
global.fetch = mockFetch;
global.sessionStorage = mockSessionStorage as unknown as Storage;

// Mock location object
const mockLocation = {
	href: "",
	assign: vi.fn(),
	reload: vi.fn()
};
Object.defineProperty(global, "location", {
	value: mockLocation,
	writable: true
});

// Mock profile utilities
vi.mock("../../utils/profile-utils", () => ({
	fetchUserProfile: vi.fn(),
	validateProfileData: vi.fn(),
	sanitizeProfileInput: vi.fn(),
	createProfileUpdateRequest: vi.fn(),
	handleProfileApiResponse: vi.fn()
}));

// Mock auth utilities
vi.mock("../../utils/auth-utils", () => ({
	checkSessionStatus: vi.fn(),
	redirectToLogin: vi.fn(),
	handleAuthError: vi.fn(),
	getSessionInfo: vi.fn()
}));

// Mock navigation auth
vi.mock("../../utils/navigation-auth", () => ({
	initializeNavigation: vi.fn()
}));

// Mock profile UI utilities
vi.mock("../../utils/profile-ui-utils", () => ({
	getRoleBadgeClass: vi.fn().mockReturnValue("team-member"),
	validateProfileFormData: vi.fn().mockReturnValue({
		isValid: true,
		errors: {},
		sanitizedData: {
			first_name: "John",
			last_name: "Doe",
			email: "john.doe@example.com"
		}
	}),
	createProfileDisplayData: vi.fn().mockReturnValue({
		fullName: "John Doe",
		roleText: "Team Lead",
		roleBadgeClass: "team-lead",
		lastLoginFormatted: "Never",
		createdDateFormatted: "January 1, 2024",
		updatedDateFormatted: "January 1, 2024"
	})
}));

// Import the functions after mocking for test configuration
import { createProfileDisplayData, validateProfileFormData, getRoleBadgeClass } from "../../utils/profile-ui-utils";

describe("Profile Page Functionality", () => {
	// Mock DOM elements with proper TypeScript types
	interface MockElement {
		id: string;
		tagName: string;
		style: Record<string, string>;
		classList: {
			add: Mock;
			remove: Mock;
			contains: Mock;
			toggle: Mock;
		};
		setAttribute: Mock;
		getAttribute: Mock;
		addEventListener: Mock;
		removeEventListener: Mock;
		textContent: string;
		innerHTML: string;
		value: string;
		checked: boolean;
		disabled: boolean;
		focus: Mock;
		blur: Mock;
		click: Mock;
		reset: Mock;
		querySelector: Mock;
	}

	interface MockDocument {
		getElementById: Mock;
		addEventListener: Mock;
		querySelector: Mock;
		querySelectorAll: Mock;
	}

	let mockDocument: MockDocument;

	beforeEach((): void => {
		vi.clearAllMocks();

		// Reset mock location
		mockLocation.href = "";

		// Create comprehensive DOM mock
		mockDocument = {
			getElementById: vi.fn(),
			addEventListener: vi.fn(),
			querySelector: vi.fn(),
			querySelectorAll: vi.fn()
		};

		// Mock global document
		global.document = mockDocument as unknown as Document;

		// Mock common DOM elements
		const createMockElement = (id: string, type = "div"): MockElement => {
			const element = {
				id,
				tagName: type.toUpperCase(),
				style: { display: "" },
				classList: {
					add: vi.fn(),
					remove: vi.fn(),
					contains: vi.fn().mockReturnValue(false),
					toggle: vi.fn()
				},
				setAttribute: vi.fn(),
				getAttribute: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				textContent: "",
				innerHTML: "",
				value: "",
				checked: false,
				disabled: false,
				focus: vi.fn(),
				blur: vi.fn(),
				click: vi.fn(),
				reset: vi.fn(),
				querySelector: vi.fn().mockReturnValue(null)
			};
			return element as MockElement;
		};

		// Set up DOM element mocks
		mockDocument.getElementById.mockImplementation((id: string) => {
			const elementMap: Record<string, MockElement> = {
				"loading-state": createMockElement("loading-state"),
				"error-state": createMockElement("error-state"),
				"profile-content": createMockElement("profile-content"),
				"profile-display": createMockElement("profile-display"),
				"profile-edit": createMockElement("profile-edit"),
				"password-display": createMockElement("password-display"),
				"password-change": createMockElement("password-change"),
				"display-full-name": createMockElement("display-full-name"),
				"display-email": createMockElement("display-email"),
				"display-role-text": createMockElement("display-role-text"),
				"display-role-badge": createMockElement("display-role-badge"),
				"display-created-date": createMockElement("display-created-date"),
				"display-updated-date": createMockElement("display-updated-date"),
				"display-user-id": createMockElement("display-user-id"),
				"display-last-login": createMockElement("display-last-login"),
				"edit-first-name": createMockElement("edit-first-name", "input"),
				"edit-last-name": createMockElement("edit-last-name", "input"),
				"edit-email": createMockElement("edit-email", "input"),
				"profile-form": createMockElement("profile-form", "form"),
				"edit-profile-btn": createMockElement("edit-profile-btn", "button"),
				"cancel-edit-btn": createMockElement("cancel-edit-btn", "button"),
				"save-profile-btn": ((): MockElement => {
					const btn = createMockElement("save-profile-btn", "button");
					const spinner = createMockElement("btn-spinner");
					const text = createMockElement("btn-text");
					btn.querySelector.mockImplementation((selector: string) => {
						if (selector === ".btn-spinner") {
							return spinner;
						}
						if (selector === ".btn-text") {
							return text;
						}
						return null;
					});
					return btn;
				})(),
				toast: createMockElement("toast"),
				"toast-message": createMockElement("toast-message"),
				"error-message-text": createMockElement("error-message-text"),
				"retry-btn": createMockElement("retry-btn", "button")
			};
			return elementMap[id] ?? null;
		});

		// Mock querySelectorAll for form error clearing
		mockDocument.querySelectorAll.mockImplementation((selector: string) => {
			if (selector === ".field-error") {
				return [] as unknown as NodeListOf<Element>; // Return empty array for now
			}
			return [] as unknown as NodeListOf<Element>;
		});

		// Reset utility function mocks
		vi.mocked(createProfileDisplayData).mockReturnValue({
			fullName: "John Doe",
			roleText: "Team Lead",
			roleBadgeClass: "team-lead",
			lastLoginFormatted: "Never",
			createdDateFormatted: "January 1, 2024",
			updatedDateFormatted: "January 1, 2024"
		});

		vi.mocked(validateProfileFormData).mockReturnValue({
			isValid: true,
			errors: {},
			sanitizedData: {
				first_name: "John",
				last_name: "Doe",
				email: "john.doe@example.com"
			}
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Page Initialization", () => {
		it("should initialize profile page successfully", async () => {
			const mockProfileData = {
				id: "user-123",
				email: "test@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member" as const,
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-15T00:00:00.000Z"
			};

			// Mock successful profile fetch
			const { fetchUserProfile } = await import("../../utils/profile-utils");
			vi.mocked(fetchUserProfile).mockResolvedValue(mockProfileData);

			const { getSessionInfo } = await import("../../utils/auth-utils");
			vi.mocked(getSessionInfo).mockReturnValue({
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member"
			});

			await initializeProfilePage();

			expect(fetchUserProfile).toHaveBeenCalledWith("user-123");
			// Verify that the expected DOM manipulation functions were called
			expect(mockDocument.getElementById).toHaveBeenCalledWith("loading-state");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("profile-content");
		});

		it("should handle missing session during initialization", async () => {
			const { getSessionInfo } = await import("../../utils/auth-utils");
			vi.mocked(getSessionInfo).mockReturnValue(null);

			const { redirectToLogin } = await import("../../utils/auth-utils");

			await initializeProfilePage();

			expect(redirectToLogin).toHaveBeenCalled();
		});

		it("should handle profile fetch errors", async () => {
			const { fetchUserProfile } = await import("../../utils/profile-utils");
			vi.mocked(fetchUserProfile).mockRejectedValue(new Error("Network error"));

			const { getSessionInfo } = await import("../../utils/auth-utils");
			vi.mocked(getSessionInfo).mockReturnValue({
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member"
			});

			await initializeProfilePage();

			// Verify that error handling UI manipulation was called
			expect(mockDocument.getElementById).toHaveBeenCalledWith("loading-state");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("error-state");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("error-message-text");
		});
	});

	describe("Profile Data Display", () => {
		it("should display profile data correctly", () => {
			const profileData = {
				id: "user-123",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_lead" as const,
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-15T00:00:00.000Z",
				last_login_at: "2024-01-14T10:30:00.000Z"
			};

			displayProfileData(profileData);

			// Verify that createProfileDisplayData was called with the profile data
			expect(createProfileDisplayData).toHaveBeenCalledWith(profileData);

			// Verify that DOM elements were accessed for display
			expect(mockDocument.getElementById).toHaveBeenCalledWith("display-full-name");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("display-email");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("display-role-text");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("display-user-id");
		});

		it("should handle missing optional profile fields", () => {
			const profileData = {
				id: "user-123",
				email: "test@example.com",
				first_name: "Test",
				last_name: "User",
				role: "team_member" as const,
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
				// No last_login_at
			};

			displayProfileData(profileData);

			// Verify that createProfileDisplayData was called
			expect(createProfileDisplayData).toHaveBeenCalledWith(profileData);

			// Verify that last login element was accessed
			expect(mockDocument.getElementById).toHaveBeenCalledWith("display-last-login");
		});

		it("should update role badge correctly", () => {
			// Mock getRoleBadgeClass to return appropriate values for each call
			vi.mocked(getRoleBadgeClass).mockReturnValueOnce("team-lead");

			updateRoleBadge("team_lead");

			// Verify that DOM element was accessed and utility function called
			expect(mockDocument.getElementById).toHaveBeenCalledWith("display-role-badge");
			expect(getRoleBadgeClass).toHaveBeenCalledWith("team_lead");
		});
	});

	describe("Edit Mode Management", () => {
		it("should enter edit mode correctly", () => {
			const profileData = {
				id: "user-123",
				email: "test@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member" as const
			};

			enterEditMode(profileData);

			// Verify that DOM elements were accessed for edit mode
			expect(mockDocument.getElementById).toHaveBeenCalledWith("profile-display");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("profile-edit");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("edit-first-name");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("edit-last-name");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("edit-email");
		});

		it("should exit edit mode correctly", () => {
			exitEditMode();

			// Verify that DOM elements were accessed for exit mode
			expect(mockDocument.getElementById).toHaveBeenCalledWith("profile-display");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("profile-edit");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("profile-form");
		});
	});

	describe("Form Submission", () => {
		it("should handle successful profile update", async () => {
			// Create proper form mock with FormData support
			const mockFormData = new Map([
				["first_name", "John"],
				["last_name", "Doe"],
				["email", "john.doe@example.com"]
			]);

			const mockForm = {
				elements: {
					first_name: { value: "John" },
					last_name: { value: "Doe" },
					email: { value: "john.doe@example.com" }
				}
			};

			const mockEvent = {
				preventDefault: vi.fn(),
				target: mockForm
			};

			// Mock FormData constructor
			global.FormData = vi.fn().mockImplementation(
				(): FormData =>
					({
						get: (key: string) => mockFormData.get(key)
					}) as FormData
			);

			const { createProfileUpdateRequest } = await import("../../utils/profile-utils");
			const { getSessionInfo } = await import("../../utils/auth-utils");

			vi.mocked(getSessionInfo).mockReturnValue({
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member"
			});
			vi.mocked(createProfileUpdateRequest).mockReturnValue({
				url: "/api/users/user-123",
				options: {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ first_name: "John", last_name: "Doe", email: "john.doe@example.com" })
				}
			});

			mockFetch.mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({ message: "Profile updated successfully" })
			});

			await handleProfileFormSubmit(mockEvent as unknown as Event);

			expect(mockEvent.preventDefault).toHaveBeenCalled();
			expect(createProfileUpdateRequest).toHaveBeenCalledWith("user-123", {
				first_name: "John",
				last_name: "Doe",
				email: "john.doe@example.com"
			});
			expect(mockFetch).toHaveBeenCalled();
		});

		it("should handle form validation errors", async () => {
			// Create proper form mock with invalid data
			const mockFormData = new Map([
				["first_name", ""], // Empty required field
				["last_name", "Doe"],
				["email", "invalid-email"] // Invalid email
			]);

			const mockForm = {
				elements: {
					first_name: { value: "" },
					last_name: { value: "Doe" },
					email: { value: "invalid-email" }
				}
			};

			const mockEvent = {
				preventDefault: vi.fn(),
				target: mockForm
			};

			// Mock FormData constructor
			global.FormData = vi.fn().mockImplementation(
				(): FormData =>
					({
						get: (key: string) => mockFormData.get(key)
					}) as FormData
			);

			const { validateProfileFormData } = await import("../../utils/profile-ui-utils");
			vi.mocked(validateProfileFormData).mockReturnValue({
				isValid: false,
				errors: {
					first_name: "First name is required",
					email: "Please enter a valid email address"
				},
				sanitizedData: {
					first_name: "",
					last_name: "Doe",
					email: "invalid-email"
				}
			});

			await handleProfileFormSubmit(mockEvent as unknown as Event);

			expect(mockEvent.preventDefault).toHaveBeenCalled();
			// Should not attempt to submit if validation fails
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should handle API errors during submission", async () => {
			// Create proper form mock for API error test
			const mockFormData = new Map([
				["first_name", "John"],
				["last_name", "Doe"],
				["email", "john.doe@example.com"]
			]);

			const mockForm = {
				elements: {
					first_name: { value: "John" },
					last_name: { value: "Doe" },
					email: { value: "john.doe@example.com" }
				}
			};

			const mockEvent = {
				preventDefault: vi.fn(),
				target: mockForm
			};

			// Mock FormData constructor
			global.FormData = vi.fn().mockImplementation(
				(): FormData =>
					({
						get: (key: string) => mockFormData.get(key)
					}) as FormData
			);

			const { getSessionInfo } = await import("../../utils/auth-utils");
			const { createProfileUpdateRequest } = await import("../../utils/profile-utils");

			vi.mocked(getSessionInfo).mockReturnValue({
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member"
			});
			vi.mocked(createProfileUpdateRequest).mockReturnValue({
				url: "/api/users/user-123",
				options: {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ first_name: "John", last_name: "Doe", email: "john.doe@example.com" })
				}
			});

			mockFetch.mockResolvedValue({
				ok: false,
				status: 400,
				json: vi.fn().mockResolvedValue({ message: "Email already exists" })
			});

			await handleProfileFormSubmit(mockEvent as unknown as Event);

			expect(mockEvent.preventDefault).toHaveBeenCalled();
			// Should call API but handle error gracefully
			expect(mockFetch).toHaveBeenCalled();
		});
	});

	describe("UI State Management", () => {
		it("should show profile section correctly", () => {
			showProfileSection("profile-content");

			// Verify that getElementById was called with correct ID
			expect(mockDocument.getElementById).toHaveBeenCalledWith("profile-content");
		});

		it("should hide profile section correctly", () => {
			hideProfileSection("loading-state");

			// Verify that getElementById was called with correct ID
			expect(mockDocument.getElementById).toHaveBeenCalledWith("loading-state");
		});

		it("should show toast notification", () => {
			showProfileToast("Profile updated successfully", "success");

			// Verify that DOM elements were accessed for toast display
			expect(mockDocument.getElementById).toHaveBeenCalledWith("toast");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("toast-message");
		});

		it("should hide toast notification", () => {
			hideProfileToast();

			// Verify that DOM element was accessed for toast hiding
			expect(mockDocument.getElementById).toHaveBeenCalledWith("toast");
		});
	});

	describe("Error Handling", () => {
		it("should handle network errors gracefully", async () => {
			const { getSessionInfo } = await import("../../utils/auth-utils");
			vi.mocked(getSessionInfo).mockReturnValue({
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member"
			});

			const { fetchUserProfile } = await import("../../utils/profile-utils");
			vi.mocked(fetchUserProfile).mockRejectedValue(new Error("Network error"));

			await initializeProfilePage();

			// Verify that error state DOM elements were accessed
			expect(mockDocument.getElementById).toHaveBeenCalledWith("error-state");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("error-message-text");
		});

		it("should handle authentication errors", async () => {
			const { getSessionInfo } = await import("../../utils/auth-utils");
			vi.mocked(getSessionInfo).mockReturnValue({
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member"
			});

			const { fetchUserProfile } = await import("../../utils/profile-utils");
			vi.mocked(fetchUserProfile).mockRejectedValue(new Error("Session expired"));

			await initializeProfilePage();

			// Verify that error state DOM elements were accessed (profile errors are handled in loadProfileData, not via handleAuthError)
			expect(mockDocument.getElementById).toHaveBeenCalledWith("error-state");
			expect(mockDocument.getElementById).toHaveBeenCalledWith("error-message-text");
		});
	});
});
