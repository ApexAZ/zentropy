import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useAccountSecurity } from "../useAccountSecurity";
import { UserService } from "../../services/UserService";
import { useGoogleOAuth } from "../useGoogleOAuth";
import type { AccountSecurityResponse } from "../../types";

// Mock UserService
vi.mock("../../services/UserService", () => ({
	UserService: {
		getAccountSecurity: vi.fn(),
		linkGoogleAccount: vi.fn(),
		unlinkGoogleAccount: vi.fn()
	}
}));

// Mock useGoogleOAuth hook
vi.mock("../useGoogleOAuth", () => ({
	useGoogleOAuth: vi.fn()
}));

describe("useAccountSecurity", () => {
	const mockOnSecurityUpdate = vi.fn();
	const mockOnError = vi.fn();
	const mockTriggerOAuth = vi.fn();

	const defaultProps = {
		onSecurityUpdate: mockOnSecurityUpdate,
		onError: mockOnError
	};

	const mockEmailOnlyResponse: AccountSecurityResponse = {
		email_auth_linked: true,
		google_auth_linked: false,
		google_email: undefined
	};

	const mockHybridResponse: AccountSecurityResponse = {
		email_auth_linked: true,
		google_auth_linked: true,
		google_email: "john@gmail.com"
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock for useGoogleOAuth
		(useGoogleOAuth as any).mockReturnValue({
			triggerOAuth: mockTriggerOAuth,
			isReady: true,
			isLoading: false,
			error: null,
			clearError: vi.fn()
		});
	});

	it("should load security status on mount", async () => {
		(UserService.getAccountSecurity as any).mockResolvedValue(mockEmailOnlyResponse);

		const { result } = renderHook(() => useAccountSecurity(defaultProps));

		// Initially loading
		expect(result.current.loading).toBe(true);
		expect(result.current.securityStatus).toBeNull();

		// Wait for loading to complete
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.securityStatus).toEqual(mockEmailOnlyResponse);
		expect(UserService.getAccountSecurity).toHaveBeenCalledTimes(1);
	});

	it("should handle Google account linking successfully", async () => {
		(UserService.getAccountSecurity as any).mockResolvedValue(mockEmailOnlyResponse);
		(UserService.linkGoogleAccount as any).mockResolvedValue({
			message: "Google account linked successfully",
			google_email: "john@gmail.com"
		});

		const { result } = renderHook(() => useAccountSecurity(defaultProps));

		// Wait for initial load
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		// Trigger Google linking
		act(() => {
			result.current.handleLinkGoogle();
		});

		expect(result.current.linkingLoading).toBe(true);
		expect(mockTriggerOAuth).toHaveBeenCalled();

		// Simulate successful OAuth
		const oauthHook = (useGoogleOAuth as any).mock.calls[0][0];
		await act(async () => {
			await oauthHook.onSuccess("real-google-credential-token");
		});

		expect(UserService.linkGoogleAccount).toHaveBeenCalledWith({
			google_credential: "real-google-credential-token"
		});
		expect(mockOnSecurityUpdate).toHaveBeenCalled();
		expect(result.current.linkingLoading).toBe(false);
	});

	it("should handle Google account unlinking successfully", async () => {
		(UserService.getAccountSecurity as any).mockResolvedValue(mockHybridResponse);
		(UserService.unlinkGoogleAccount as any).mockResolvedValue({
			message: "Google account unlinked successfully"
		});

		const { result } = renderHook(() => useAccountSecurity(defaultProps));

		// Wait for initial load
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		// Trigger unlinking
		await act(async () => {
			await result.current.handleUnlinkGoogle("current-password");
		});

		expect(UserService.unlinkGoogleAccount).toHaveBeenCalledWith({
			password: "current-password"
		});
		expect(mockOnSecurityUpdate).toHaveBeenCalled();
		expect(result.current.unlinkingLoading).toBe(false);
	});

	it("should handle security status loading errors", async () => {
		const errorMessage = "Failed to load security status";
		(UserService.getAccountSecurity as any).mockRejectedValue(new Error(errorMessage));

		const { result } = renderHook(() => useAccountSecurity(defaultProps));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error).toBe(errorMessage);
		expect(result.current.securityStatus).toBeNull();
		expect(mockOnError).toHaveBeenCalledWith(errorMessage);
	});

	it("should handle Google linking errors", async () => {
		(UserService.getAccountSecurity as any).mockResolvedValue(mockEmailOnlyResponse);
		(UserService.linkGoogleAccount as any).mockRejectedValue(
			new Error("Google email does not match account email")
		);

		const { result } = renderHook(() => useAccountSecurity(defaultProps));

		// Wait for initial load
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		// Trigger Google linking
		act(() => {
			result.current.handleLinkGoogle();
		});

		// Simulate successful OAuth but failed linking
		const oauthHook = (useGoogleOAuth as any).mock.calls[0][0];
		await act(async () => {
			await oauthHook.onSuccess("real-google-credential-token");
		});

		expect(mockOnError).toHaveBeenCalledWith("Google email does not match account email");
		expect(result.current.linkingLoading).toBe(false);
	});

	it("should handle Google unlinking errors", async () => {
		(UserService.getAccountSecurity as any).mockResolvedValue(mockHybridResponse);
		(UserService.unlinkGoogleAccount as any).mockRejectedValue(new Error("Incorrect password"));

		const { result } = renderHook(() => useAccountSecurity(defaultProps));

		// Wait for initial load
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		// Trigger unlinking - should throw error
		await act(async () => {
			try {
				await result.current.handleUnlinkGoogle("wrong-password");
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toBe("Incorrect password");
			}
		});

		expect(result.current.unlinkingLoading).toBe(false);
	});

	it("should handle OAuth errors", async () => {
		(UserService.getAccountSecurity as any).mockResolvedValue(mockEmailOnlyResponse);

		const { result } = renderHook(() => useAccountSecurity(defaultProps));

		// Wait for initial load
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		// Trigger Google linking
		act(() => {
			result.current.handleLinkGoogle();
		});

		// Simulate OAuth error
		const oauthHook = (useGoogleOAuth as any).mock.calls[0][0];
		act(() => {
			oauthHook.onError("Google Sign-In was cancelled");
		});

		expect(mockOnError).toHaveBeenCalledWith("Google Sign-In was cancelled");
		expect(result.current.linkingLoading).toBe(false);
	});

	it("should expose OAuth state correctly", () => {
		(UserService.getAccountSecurity as any).mockResolvedValue(mockEmailOnlyResponse);

		// Mock OAuth not ready
		(useGoogleOAuth as any).mockReturnValue({
			triggerOAuth: mockTriggerOAuth,
			isReady: false,
			isLoading: true,
			error: null,
			clearError: vi.fn()
		});

		const { result } = renderHook(() => useAccountSecurity(defaultProps));

		expect(result.current.googleOAuthReady).toBe(false);
		expect(result.current.oauthLoading).toBe(true);
	});

	it("should allow manual security status refresh", async () => {
		(UserService.getAccountSecurity as any).mockResolvedValue(mockEmailOnlyResponse);

		const { result } = renderHook(() => useAccountSecurity(defaultProps));

		// Wait for initial load
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		// Clear the mock call count
		vi.clearAllMocks();

		// Manually refresh
		await act(async () => {
			await result.current.loadSecurityStatus();
		});

		expect(UserService.getAccountSecurity).toHaveBeenCalledTimes(1);
	});
});
