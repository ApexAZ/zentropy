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

	beforeEach(() => {
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
		global.document = mockDocument;

		// Mock common DOM elements
		const createMockElement = (id: string, type = "div"): MockElement => ({
			id,
			tagName: type.toUpperCase(),
			style: {},
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
		});

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
				"save-profile-btn": (() => {
					const btn = createMockElement("save-profile-btn", "button");
					const spinner = createMockElement("btn-spinner");
					const text = createMockElement("btn-text");
					btn.querySelector.mockImplementation((selector: string) => {
						if (selector === ".btn-spinner") {return spinner;}
						if (selector === ".btn-text") {return text;}
						return null;
					});
					return btn;
				})(),
				"toast": createMockElement("toast"),
				"toast-message": createMockElement("toast-message"),
				"error-message-text": createMockElement("error-message-text"),
				"retry-btn": createMockElement("retry-btn", "button")
			};
			return elementMap[id] || null;
		});

		// Mock querySelectorAll for form error clearing
		mockDocument.querySelectorAll.mockImplementation((selector: string) => {
			if (selector === ".field-error") {
				return []; // Return empty array for now
			}
			return [];
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
			vi.mocked(getSessionInfo).mockReturnValue({ id: "user-123", email: "test@example.com", name: "Test User", role: "team_member" });

			await initializeProfilePage();

			expect(fetchUserProfile).toHaveBeenCalledWith("user-123");
			expect(mockDocument.getElementById("loading-state").style.display).toBe("none");
			expect(mockDocument.getElementById("profile-content").style.display).toBe("block");
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
			vi.mocked(getSessionInfo).mockReturnValue({ id: "user-123", email: "test@example.com", name: "Test User", role: "team_member" });

			await initializeProfilePage();

			expect(mockDocument.getElementById("loading-state").style.display).toBe("none");
			expect(mockDocument.getElementById("error-state").style.display).toBe("block");
			expect(mockDocument.getElementById("error-message-text").textContent).toContain("Network error");
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

			expect(mockDocument.getElementById("display-full-name").textContent).toBe("John Doe");
			expect(mockDocument.getElementById("display-email").textContent).toBe("john.doe@example.com");
			expect(mockDocument.getElementById("display-role-text").textContent).toBe("Team Lead");
			expect(mockDocument.getElementById("display-user-id").textContent).toBe("user-123");
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

			expect(mockDocument.getElementById("display-last-login").textContent).toBe("Never");
		});

		it("should update role badge correctly", () => {
			const roleBadgeElement = mockDocument.getElementById("display-role-badge");

			updateRoleBadge("team_lead");
			expect(roleBadgeElement.classList.remove).toHaveBeenCalledWith("team-member");
			expect(roleBadgeElement.classList.add).toHaveBeenCalledWith("team-lead");

			updateRoleBadge("team_member");
			expect(roleBadgeElement.classList.remove).toHaveBeenCalledWith("team-lead");
			expect(roleBadgeElement.classList.add).toHaveBeenCalledWith("team-member");
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

			expect(mockDocument.getElementById("profile-display").style.display).toBe("none");
			expect(mockDocument.getElementById("profile-edit").style.display).toBe("block");
			expect(mockDocument.getElementById("edit-first-name").value).toBe("John");
			expect(mockDocument.getElementById("edit-last-name").value).toBe("Doe");
			expect(mockDocument.getElementById("edit-email").value).toBe("test@example.com");
		});

		it("should exit edit mode correctly", () => {
			exitEditMode();

			expect(mockDocument.getElementById("profile-display").style.display).toBe("block");
			expect(mockDocument.getElementById("profile-edit").style.display).toBe("none");
			expect(mockDocument.getElementById("profile-form").reset).toHaveBeenCalled();
		});
	});

	describe("Form Submission", () => {
		it("should handle successful profile update", async () => {
			const mockEvent = {
				preventDefault: vi.fn(),
				target: {
					elements: {
						first_name: { value: "John" },
						last_name: { value: "Doe" },
						email: { value: "john.doe@example.com" }
					}
				}
			};

			const { createProfileUpdateRequest, handleProfileApiResponse } = await import("../../utils/profile-utils");
			const { getSessionInfo } = await import("../../utils/auth-utils");

			vi.mocked(getSessionInfo).mockReturnValue({ id: "user-123", email: "test@example.com", name: "Test User", role: "team_member" });
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

			await handleProfileFormSubmit(mockEvent as any);

			expect(mockEvent.preventDefault).toHaveBeenCalled();
			expect(createProfileUpdateRequest).toHaveBeenCalledWith("user-123", {
				first_name: "John",
				last_name: "Doe",
				email: "john.doe@example.com"
			});
			expect(mockFetch).toHaveBeenCalled();
		});

		it("should handle form validation errors", async () => {
			const mockEvent = {
				preventDefault: vi.fn(),
				target: {
					elements: {
						first_name: { value: "" }, // Empty required field
						last_name: { value: "Doe" },
						email: { value: "invalid-email" } // Invalid email
					}
				}
			};

			const { validateProfileData } = await import("../../utils/profile-utils");
			vi.mocked(validateProfileData).mockReturnValue({
				isValid: false,
				errors: {
					first_name: "First name is required",
					email: "Please enter a valid email address"
				}
			});

			await handleProfileFormSubmit(mockEvent as any);

			expect(mockEvent.preventDefault).toHaveBeenCalled();
			// Should not attempt to submit if validation fails
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should handle API errors during submission", async () => {
			const mockEvent = {
				preventDefault: vi.fn(),
				target: {
					elements: {
						first_name: { value: "John" },
						last_name: { value: "Doe" },
						email: { value: "john.doe@example.com" }
					}
				}
			};

			const { getSessionInfo } = await import("../../utils/auth-utils");
			vi.mocked(getSessionInfo).mockReturnValue({ id: "user-123", email: "test@example.com", name: "Test User", role: "team_member" });

			mockFetch.mockResolvedValue({
				ok: false,
				status: 400,
				json: vi.fn().mockResolvedValue({ message: "Email already exists" })
			});

			await handleProfileFormSubmit(mockEvent as any);

			expect(mockEvent.preventDefault).toHaveBeenCalled();
			// Should show error message but not crash
		});
	});

	describe("UI State Management", () => {
		it("should show profile section correctly", () => {
			showProfileSection("profile-content");

			const element = mockDocument.getElementById("profile-content");
			expect(element.style.display).toBe("block");
		});

		it("should hide profile section correctly", () => {
			hideProfileSection("loading-state");

			const element = mockDocument.getElementById("loading-state");
			expect(element.style.display).toBe("none");
		});

		it("should show toast notification", () => {
			showProfileToast("Profile updated successfully", "success");

			const toastElement = mockDocument.getElementById("toast");
			const messageElement = mockDocument.getElementById("toast-message");

			expect(toastElement.style.display).toBe("block");
			expect(messageElement.textContent).toBe("Profile updated successfully");
			expect(toastElement.classList.add).toHaveBeenCalledWith("toast-success");
		});

		it("should hide toast notification", () => {
			hideProfileToast();

			const toastElement = mockDocument.getElementById("toast");
			expect(toastElement.style.display).toBe("none");
			expect(toastElement.classList.remove).toHaveBeenCalledWith("toast-success", "toast-error");
		});
	});

	describe("Error Handling", () => {
		it("should handle network errors gracefully", async () => {
			const { getSessionInfo } = await import("../../utils/auth-utils");
			vi.mocked(getSessionInfo).mockReturnValue({ id: "user-123", email: "test@example.com", name: "Test User", role: "team_member" });

			const { fetchUserProfile } = await import("../../utils/profile-utils");
			vi.mocked(fetchUserProfile).mockRejectedValue(new Error("Network error"));

			await initializeProfilePage();

			expect(mockDocument.getElementById("error-state").style.display).toBe("block");
			expect(mockDocument.getElementById("error-message-text").textContent).toContain("Network error");
		});

		it("should handle authentication errors", async () => {
			const { getSessionInfo } = await import("../../utils/auth-utils");
			vi.mocked(getSessionInfo).mockReturnValue({ id: "user-123", email: "test@example.com", name: "Test User", role: "team_member" });

			const { fetchUserProfile } = await import("../../utils/profile-utils");
			vi.mocked(fetchUserProfile).mockRejectedValue(new Error("Session expired"));

			const { handleAuthError } = await import("../../utils/auth-utils");

			await initializeProfilePage();

			expect(handleAuthError).toHaveBeenCalledWith(expect.any(Error));
		});
	});
});