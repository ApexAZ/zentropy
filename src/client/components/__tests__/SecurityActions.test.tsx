import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import "@testing-library/jest-dom";
import { SecurityActions } from "../SecurityActions";
import type { AccountSecurityResponse } from "../../types";

describe("SecurityActions", () => {
	const mockOnLinkGoogle = vi.fn();
	const mockOnUnlinkGoogle = vi.fn();

	const defaultProps = {
		linkingLoading: false,
		unlinkingLoading: false,
		googleOAuthReady: true,
		oauthLoading: false,
		onLinkGoogle: mockOnLinkGoogle,
		onUnlinkGoogle: mockOnUnlinkGoogle
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
	});

	it("should show link button for email-only authentication", () => {
		render(<SecurityActions securityStatus={mockEmailOnlyResponse} {...defaultProps} />);

		expect(screen.getByRole("button", { name: "Link Google Account" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Unlink Google Account" })).not.toBeInTheDocument();

		// Should show link description
		expect(
			screen.getByText("Add Google OAuth as an additional authentication method for improved security.")
		).toBeInTheDocument();
	});

	it("should show unlink button for hybrid authentication", () => {
		render(<SecurityActions securityStatus={mockHybridResponse} {...defaultProps} />);

		expect(screen.getByRole("button", { name: "Unlink Google Account" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Link Google Account" })).not.toBeInTheDocument();

		// Should show unlink description
		expect(
			screen.getByText("Remove Google OAuth as an authentication method for your account.")
		).toBeInTheDocument();
	});

	it("should handle link button click", async () => {
		const user = userEvent.setup();

		render(<SecurityActions securityStatus={mockEmailOnlyResponse} {...defaultProps} />);

		const linkButton = screen.getByRole("button", { name: "Link Google Account" });
		await user.click(linkButton);

		expect(mockOnLinkGoogle).toHaveBeenCalledTimes(1);
	});

	it("should handle unlink button click", async () => {
		const user = userEvent.setup();

		render(<SecurityActions securityStatus={mockHybridResponse} {...defaultProps} />);

		const unlinkButton = screen.getByRole("button", { name: "Unlink Google Account" });
		await user.click(unlinkButton);

		expect(mockOnUnlinkGoogle).toHaveBeenCalledTimes(1);
	});

	it("should show linking loading state", () => {
		render(<SecurityActions securityStatus={mockEmailOnlyResponse} {...defaultProps} linkingLoading={true} />);

		const linkButton = screen.getByRole("button", { name: "Linking..." });
		expect(linkButton).toBeDisabled();
		expect(linkButton).toHaveTextContent("Linking...");
	});

	it("should show OAuth loading state", () => {
		render(<SecurityActions securityStatus={mockEmailOnlyResponse} {...defaultProps} oauthLoading={true} />);

		const linkButton = screen.getByRole("button", { name: "Starting OAuth..." });
		expect(linkButton).toBeDisabled();
		expect(linkButton).toHaveTextContent("Starting OAuth...");
	});

	it("should show unlinking loading state", () => {
		render(<SecurityActions securityStatus={mockHybridResponse} {...defaultProps} unlinkingLoading={true} />);

		const unlinkButton = screen.getByRole("button", { name: "Loading..." });
		expect(unlinkButton).toBeDisabled();
		expect(unlinkButton).toHaveTextContent("Loading...");
	});

	it("should disable link button when Google OAuth not ready", () => {
		render(<SecurityActions securityStatus={mockEmailOnlyResponse} {...defaultProps} googleOAuthReady={false} />);

		const linkButton = screen.getByRole("button", { name: "Link Google Account" });
		expect(linkButton).toBeDisabled();

		// Should show OAuth initialization message
		expect(screen.getByText("Google OAuth is being initialized. Please wait a moment.")).toBeInTheDocument();
	});

	it("should have correct ARIA attributes", () => {
		render(<SecurityActions securityStatus={mockEmailOnlyResponse} {...defaultProps} />);

		const linkButton = screen.getByRole("button", { name: "Link Google Account" });
		expect(linkButton).toHaveAttribute("aria-describedby", "link-description");
	});

	it("should show correct button variants", () => {
		// Test link button variant
		const { rerender } = render(<SecurityActions securityStatus={mockEmailOnlyResponse} {...defaultProps} />);

		const linkButton = screen.getByRole("button", { name: "Link Google Account" });
		expect(linkButton).toHaveClass("bg-interactive"); // Primary variant

		// Test unlink button variant
		rerender(<SecurityActions securityStatus={mockHybridResponse} {...defaultProps} />);

		const unlinkButton = screen.getByRole("button", { name: "Unlink Google Account" });
		expect(unlinkButton).toHaveClass("bg-red-600"); // Danger variant
	});
});
