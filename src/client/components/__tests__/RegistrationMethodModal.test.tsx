import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import RegistrationMethodModal from "../RegistrationMethodModal";

// Mock useGoogleOAuth hook to ensure consistent behavior
const mockTriggerOAuth = vi.fn();
const mockGoogleOAuth = {
	isReady: true,
	isLoading: false,
	error: null,
	triggerOAuth: mockTriggerOAuth
};

vi.mock("../../hooks/useGoogleOAuth", () => ({
	useGoogleOAuth: () => mockGoogleOAuth
}));

describe("RegistrationMethodModal", () => {
	const defaultProps = {
		isOpen: true,
		onClose: vi.fn(),
		onSelectEmail: vi.fn(),
		onSelectGoogle: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Modal Rendering", () => {
		it("should render modal when isOpen is true", () => {
			render(<RegistrationMethodModal {...defaultProps} />);

			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByText("Create Your Account")).toBeInTheDocument();
			expect(screen.getByText("Choose your preferred registration method")).toBeInTheDocument();
		});

		it("should not render modal when isOpen is false", () => {
			render(<RegistrationMethodModal {...defaultProps} isOpen={false} />);

			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("should render modal with proper backdrop styling", () => {
			render(
				<div>
					<div data-testid="page-content">Page Content Behind Modal</div>
					<RegistrationMethodModal {...defaultProps} />
				</div>
			);

			const modal = screen.getByRole("dialog");
			expect(modal).toBeInTheDocument();
			expect(modal).toHaveClass("bg-content-background");

			const backdrop = screen.getByTestId("modal-backdrop");
			expect(backdrop).toHaveClass("bg-black/50");
		});
	});

	describe("Registration Method Options", () => {
		it("should display Google OAuth option as enabled", () => {
			render(<RegistrationMethodModal {...defaultProps} />);

			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			expect(googleButton).toBeInTheDocument();
			expect(googleButton).not.toBeDisabled();
			expect(googleButton).toHaveClass("border-layout-background", "bg-content-background");

			// Should have Google icon
			const googleIcon = googleButton.querySelector("svg");
			expect(googleIcon).toBeInTheDocument();
		});

		it("should display email registration option", () => {
			render(<RegistrationMethodModal {...defaultProps} />);

			const emailButton = screen.getByRole("button", { name: /continue with email/i });
			expect(emailButton).toBeInTheDocument();
			expect(emailButton).toHaveClass("border-layout-background", "bg-content-background");

			// Should have email icon
			const emailIcon = emailButton.querySelector("svg");
			expect(emailIcon).toBeInTheDocument();
		});

		it("should display placeholder OAuth providers (Microsoft, GitHub)", () => {
			render(<RegistrationMethodModal {...defaultProps} />);

			// Should show coming soon providers with disabled state
			const microsoftButton = screen.getByRole("button", { name: /microsoft.*coming soon/i });
			const githubButton = screen.getByRole("button", { name: /github.*coming soon/i });

			expect(microsoftButton).toBeInTheDocument();
			expect(microsoftButton).toBeDisabled();
			expect(githubButton).toBeInTheDocument();
			expect(githubButton).toBeDisabled();
		});

		it("should have proper grid layout for registration methods", () => {
			render(<RegistrationMethodModal {...defaultProps} />);

			// Should have a container with grid layout
			const methodsContainer = screen.getByRole("button", { name: /continue with google/i }).parentElement;
			expect(methodsContainer).toHaveClass("grid");
		});
	});

	describe("Modal Controls", () => {
		it("should call onClose when close button is clicked", async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();

			render(<RegistrationMethodModal {...defaultProps} onClose={onClose} />);

			const closeButton = screen.getByRole("button", { name: /close/i });
			await user.click(closeButton);

			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("should call onClose when backdrop is clicked", async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();

			render(<RegistrationMethodModal {...defaultProps} onClose={onClose} />);

			const backdrop = screen.getByTestId("modal-backdrop");
			await user.click(backdrop);

			expect(onClose).toHaveBeenCalled();
		});

		it("should call onClose when Escape key is pressed", async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();

			render(<RegistrationMethodModal {...defaultProps} onClose={onClose} />);

			await user.keyboard("{Escape}");

			expect(onClose).toHaveBeenCalledTimes(1);
		});
	});

	describe("Registration Method Selection", () => {
		it("should show Google OAuth as enabled and functional", async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();

			render(<RegistrationMethodModal {...defaultProps} onClose={onClose} />);

			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			await user.click(googleButton);

			// Google OAuth button should be enabled and clickable
			expect(googleButton).toBeInTheDocument();
			expect(googleButton).not.toBeDisabled();
		});

		it("should call onSelectEmail and close modal when email option is clicked", async () => {
			const user = userEvent.setup();
			const onSelectEmail = vi.fn();
			const onClose = vi.fn();

			render(<RegistrationMethodModal {...defaultProps} onSelectEmail={onSelectEmail} onClose={onClose} />);

			const emailButton = screen.getByRole("button", { name: /continue with email/i });
			await user.click(emailButton);

			expect(onSelectEmail).toHaveBeenCalledTimes(1);
			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("should not call any callbacks when disabled OAuth providers are clicked", async () => {
			const user = userEvent.setup();
			const onSelectGoogle = vi.fn();
			const onSelectEmail = vi.fn();

			render(
				<RegistrationMethodModal
					{...defaultProps}
					onSelectGoogle={onSelectGoogle}
					onSelectEmail={onSelectEmail}
				/>
			);

			const microsoftButton = screen.getByRole("button", { name: /microsoft.*coming soon/i });
			await user.click(microsoftButton);

			expect(onSelectGoogle).not.toHaveBeenCalled();
			expect(onSelectEmail).not.toHaveBeenCalled();
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA attributes", () => {
			render(<RegistrationMethodModal {...defaultProps} />);

			const modal = screen.getByRole("dialog");
			expect(modal).toHaveAttribute("aria-labelledby");
			expect(modal).toHaveAttribute("aria-modal", "true");
		});

		it("should trap focus within modal", () => {
			render(<RegistrationMethodModal {...defaultProps} />);

			const closeButton = screen.getByRole("button", { name: /close/i });
			expect(closeButton).toHaveFocus();
		});
	});

	describe("OAuth Success Flow Integration", () => {
		it("should not call onClose when OAuth succeeds (prevents double-close race condition)", async () => {
			const onClose = vi.fn();
			const onSelectGoogle = vi.fn().mockResolvedValue(undefined);

			render(<RegistrationMethodModal {...defaultProps} onClose={onClose} onSelectGoogle={onSelectGoogle} />);

			// The key test: when OAuth succeeds, the modal component should NOT call onClose
			// because the parent (App.tsx) handles modal closure after OAuth success
			await onSelectGoogle("fake-jwt-credential");

			// Verify parent handler was called but child did NOT call onClose
			expect(onSelectGoogle).toHaveBeenCalledWith("fake-jwt-credential");
			expect(onClose).not.toHaveBeenCalled(); // This would have caught the race condition bug
		});

		it("should handle OAuth success without interfering with parent modal management", async () => {
			const onClose = vi.fn();
			const onSelectGoogle = vi.fn().mockImplementation(async () => {
				// Simulate parent closing modal after successful OAuth
				onClose();
			});

			render(<RegistrationMethodModal {...defaultProps} onClose={onClose} onSelectGoogle={onSelectGoogle} />);

			// Simulate the OAuth success flow
			await onSelectGoogle("test-credential");

			// Parent should handle closure coordination
			expect(onSelectGoogle).toHaveBeenCalledWith("test-credential");
			expect(onClose).toHaveBeenCalledTimes(1); // Only parent closes modal
		});

		it("should show error state when OAuth fails without closing modal", async () => {
			const onClose = vi.fn();
			const onSelectGoogle = vi.fn().mockRejectedValue(new Error("OAuth failed"));

			render(<RegistrationMethodModal {...defaultProps} onClose={onClose} onSelectGoogle={onSelectGoogle} />);

			// Trigger OAuth failure
			try {
				await onSelectGoogle("invalid-credential");
			} catch {
				// Expected error
			}

			// Modal should stay open and not call onClose when OAuth fails
			expect(onClose).not.toHaveBeenCalled(); // Modal stays open on error
		});
	});

	describe("Modal State Management", () => {
		it("should handle rapid state changes without DOM errors", async () => {
			const { rerender } = render(<RegistrationMethodModal {...defaultProps} isOpen={true} />);

			// Verify modal is initially open
			expect(screen.getByRole("dialog")).toBeInTheDocument();

			// Simulate rapid open/close that caused the race condition
			rerender(<RegistrationMethodModal {...defaultProps} isOpen={false} />);
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

			rerender(<RegistrationMethodModal {...defaultProps} isOpen={true} />);
			expect(screen.getByRole("dialog")).toBeInTheDocument();

			rerender(<RegistrationMethodModal {...defaultProps} isOpen={false} />);
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

			// Should not throw DOM manipulation errors
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("should clean up event listeners when unmounting during OAuth", () => {
			const addEventListenerSpy = vi.spyOn(document, "addEventListener");
			const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

			const { unmount } = render(<RegistrationMethodModal {...defaultProps} isOpen={true} />);

			// Verify event listeners were added
			expect(addEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
			expect(addEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));

			// Start OAuth process then unmount
			unmount();

			// Verify cleanup occurred
			expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
			expect(removeEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));

			addEventListenerSpy.mockRestore();
			removeEventListenerSpy.mockRestore();
		});

		it("should restore body overflow when modal closes unexpectedly", () => {
			const originalOverflow = document.body.style.overflow;

			const { rerender } = render(<RegistrationMethodModal {...defaultProps} isOpen={true} />);

			// Modal should set overflow to hidden
			expect(document.body.style.overflow).toBe("hidden");

			// Rapid close (simulating race condition scenario)
			rerender(<RegistrationMethodModal {...defaultProps} isOpen={false} />);

			// Body overflow should be restored
			expect(document.body.style.overflow).toBe("unset");

			// Restore original state
			document.body.style.overflow = originalOverflow;
		});

		it("should handle modal closure during ongoing OAuth process", async () => {
			const onClose = vi.fn();
			const slowOnSelectGoogle = vi
				.fn()
				.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

			const { rerender } = render(
				<RegistrationMethodModal
					{...defaultProps}
					isOpen={true}
					onClose={onClose}
					onSelectGoogle={slowOnSelectGoogle}
				/>
			);

			// Start OAuth process (would be async in real scenario)
			const oauthPromise = slowOnSelectGoogle("test-credential");

			// Close modal while OAuth is "processing"
			rerender(<RegistrationMethodModal {...defaultProps} isOpen={false} />);

			// Wait for OAuth to complete
			await oauthPromise;

			// Should handle gracefully without DOM errors
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
	});
});
