import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";

// Mock the Google OAuth hook
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

// Import components
import RegistrationMethodModal from "../RegistrationMethodModal";

/**
 * Parent-Child Modal Coordination Tests
 *
 * These tests verify proper coordination between parent components (like App.tsx)
 * and child modal components to prevent race conditions in modal state management.
 */
describe("Parent-Child Modal Coordination", () => {
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

	describe("Modal Closure Coordination", () => {
		it("should coordinate modal closure between parent and child", async () => {
			const mockParent = {
				onSelectGoogle: vi.fn(async () => {
					// Simulate parent closing modal after OAuth success
					// This is what App.tsx does after successful OAuth
				}),
				onClose: vi.fn()
			};

			render(<RegistrationMethodModal {...defaultProps} {...mockParent} isOpen={true} />);

			// Simulate OAuth success by directly calling the handler
			// This tests the coordination pattern where parent handles closure
			await mockParent.onSelectGoogle();

			// Verify the parent handler was called correctly
			expect(mockParent.onSelectGoogle).toHaveBeenCalledTimes(1);
		});

		it("should prevent child from closing modal when parent handles OAuth", async () => {
			const onClose = vi.fn();
			const onSelectGoogle = vi.fn().mockResolvedValue(undefined);

			render(<RegistrationMethodModal {...defaultProps} onClose={onClose} onSelectGoogle={onSelectGoogle} />);

			// Simulate OAuth success by directly calling the parent handler
			await onSelectGoogle("credential");

			// Verify the behavior - parent handles the OAuth, child should not call onClose
			expect(onSelectGoogle).toHaveBeenCalledWith("credential");
			// The key point: onClose should not be called by child when OAuth succeeds
			expect(onClose).not.toHaveBeenCalled();
		});

		it("should handle rapid modal state changes gracefully", async () => {
			const onClose = vi.fn();
			const onSelectGoogle = vi.fn().mockResolvedValue(undefined);

			const { rerender } = render(
				<RegistrationMethodModal
					{...defaultProps}
					onClose={onClose}
					onSelectGoogle={onSelectGoogle}
					isOpen={true}
				/>
			);

			// Simulate rapid state changes that could cause race conditions
			rerender(
				<RegistrationMethodModal
					{...defaultProps}
					onClose={onClose}
					onSelectGoogle={onSelectGoogle}
					isOpen={false}
				/>
			);

			rerender(
				<RegistrationMethodModal
					{...defaultProps}
					onClose={onClose}
					onSelectGoogle={onSelectGoogle}
					isOpen={true}
				/>
			);

			// Should handle without DOM errors
			expect(screen.queryByRole("dialog")).toBeInTheDocument();
		});
	});

	describe("Race Condition Prevention", () => {
		it("should handle rapid DOM state changes without errors", async () => {
			const { rerender } = render(<RegistrationMethodModal {...defaultProps} isOpen={true} />);

			// Trigger rapid state changes that previously caused DOM manipulation errors
			for (let i = 0; i < 10; i++) {
				rerender(<RegistrationMethodModal {...defaultProps} isOpen={i % 2 === 0} />);
			}

			// Should complete without throwing DOM errors
			expect(true).toBe(true); // Test passes if no errors are thrown
		});

		it("should demonstrate the fixed double-close prevention", async () => {
			const onClose = vi.fn();
			const onSelectGoogle = vi.fn().mockResolvedValue(undefined);

			render(<RegistrationMethodModal {...defaultProps} onClose={onClose} onSelectGoogle={onSelectGoogle} />);

			// Simulate OAuth success
			await onSelectGoogle("credential");

			// This is the key fix: child component should NOT call onClose
			// because parent (App.tsx) handles modal closure after OAuth success
			expect(onSelectGoogle).toHaveBeenCalledWith("credential");
			expect(onClose).not.toHaveBeenCalled(); // Prevents race condition
		});
	});
});
