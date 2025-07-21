import React from "react";
import { screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
import PasswordRequirements from "../PasswordRequirements";

describe("PasswordRequirements", () => {
	it("should not render when password is empty", () => {
		const { result } = renderWithFullEnvironment(<PasswordRequirements password="" />);
		expect(result.container.firstChild).toBeNull();
	});

	it("should show all requirements as failing for empty password when password has content", () => {
		renderWithFullEnvironment(<PasswordRequirements password="a" />);

		expect(screen.getByText("✓ At least 8 characters")).toHaveClass("text-error");
		expect(screen.getByText("✓ One uppercase letter")).toHaveClass("text-error");
		expect(screen.getByText("✓ One lowercase letter")).toHaveClass("text-success");
		expect(screen.getByText("✓ One number")).toHaveClass("text-error");
		expect(screen.getByText("✓ One special character")).toHaveClass("text-error");
	});

	it("should show all requirements as passing for strong password", () => {
		renderWithFullEnvironment(<PasswordRequirements password="StrongPass123!" />);

		expect(screen.getByText("✓ At least 8 characters")).toHaveClass("text-success");
		expect(screen.getByText("✓ One uppercase letter")).toHaveClass("text-success");
		expect(screen.getByText("✓ One lowercase letter")).toHaveClass("text-success");
		expect(screen.getByText("✓ One number")).toHaveClass("text-success");
		expect(screen.getByText("✓ One special character")).toHaveClass("text-success");
	});

	it("should show password match requirement when enabled", () => {
		renderWithFullEnvironment(
			<PasswordRequirements
				password="StrongPass123!"
				confirmPassword="StrongPass123!"
				showMatchRequirement={true}
			/>
		);

		expect(screen.getByText("✓ Passwords match")).toHaveClass("text-success");
	});

	it("should show password mismatch when passwords don't match", () => {
		renderWithFullEnvironment(
			<PasswordRequirements
				password="StrongPass123!"
				confirmPassword="DifferentPass123!"
				showMatchRequirement={true}
			/>
		);

		expect(screen.getByText("✓ Passwords match")).toHaveClass("text-error");
	});

	it("should not show match requirement when disabled", () => {
		renderWithFullEnvironment(
			<PasswordRequirements
				password="StrongPass123!"
				confirmPassword="StrongPass123!"
				showMatchRequirement={false}
			/>
		);

		expect(screen.queryByText("✓ Passwords match")).not.toBeInTheDocument();
	});

	it("should handle partial password requirements", () => {
		renderWithFullEnvironment(<PasswordRequirements password="password123" />);

		expect(screen.getByText("✓ At least 8 characters")).toHaveClass("text-success");
		expect(screen.getByText("✓ One uppercase letter")).toHaveClass("text-error");
		expect(screen.getByText("✓ One lowercase letter")).toHaveClass("text-success");
		expect(screen.getByText("✓ One number")).toHaveClass("text-success");
		expect(screen.getByText("✓ One special character")).toHaveClass("text-error");
	});
});
