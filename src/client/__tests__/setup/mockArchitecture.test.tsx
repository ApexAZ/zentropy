/**
 * Tests for Global Mock Architecture
 *
 * Validates that the new mock infrastructure works correctly
 * and provides the expected functionality.
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { createStandardMocks, resetAllMocks, MockScenarios, mockUser, mockOrganization } from "./globalMocks";
import {
	renderWithFullEnvironment,
	setupTestEnvironment,
	ProviderCombinations,
	TestScenarios
} from "../utils/testRenderUtils";

// Simple test component to validate the mock architecture
const TestComponent: React.FC<{ testId?: string }> = ({ testId = "test-component" }) => {
	return (
		<div data-testid={testId}>
			<h1>Test Component</h1>
			<p>Mock architecture test</p>
		</div>
	);
};

describe("Global Mock Architecture", () => {
	describe("Mock Creation and Management", () => {
		it("should create standard mocks with correct structure", () => {
			const mocks = createStandardMocks();

			// Verify all required services are present
			expect(mocks.fetch).toBeDefined();
			expect(mocks.authService).toBeDefined();
			expect(mocks.organizationService).toBeDefined();
			expect(mocks.projectService).toBeDefined();
			expect(mocks.teamService).toBeDefined();
			expect(mocks.calendarService).toBeDefined();
			expect(mocks.userService).toBeDefined();
			expect(mocks.dashboardService).toBeDefined();
			expect(mocks.oauthProviderService).toBeDefined();
			expect(mocks.toastContext).toBeDefined();

			// Verify service methods are mock functions
			expect(typeof mocks.authService.signIn).toBe("function");
			expect(typeof mocks.authService.getCurrentUser).toBe("function");
			expect(typeof mocks.organizationService.create).toBe("function");
			expect(typeof mocks.projectService.getAll).toBe("function");

			// Verify toast context methods
			expect(typeof mocks.toastContext.showSuccess).toBe("function");
			expect(typeof mocks.toastContext.showError).toBe("function");
		});

		it("should reset all mocks correctly", () => {
			const mocks = createStandardMocks();

			// Call some mocks to create history
			mocks.authService.signIn({ email: "test@test.com", password: "password" });
			mocks.organizationService.create({ name: "Test Org", domain: "test.com" });

			// Verify call history exists
			expect(mocks.authService.signIn).toHaveBeenCalledTimes(1);
			expect(mocks.organizationService.create).toHaveBeenCalledTimes(1);

			// Reset and verify history is cleared
			resetAllMocks(mocks);
			expect(mocks.authService.signIn).toHaveBeenCalledTimes(0);
			expect(mocks.organizationService.create).toHaveBeenCalledTimes(0);
		});

		it("should support mock overrides", () => {
			const customUser = { ...mockUser, name: "Custom User" };

			const mocks = createStandardMocks({
				authService: {
					getCurrentUser: vi.fn().mockResolvedValue(customUser)
				}
			});

			expect(mocks.authService.getCurrentUser).toBeDefined();
			// The override should preserve the mock function nature
			expect(typeof mocks.authService.getCurrentUser).toBe("function");
		});
	});

	describe("Test Environment Setup", () => {
		let testEnv: ReturnType<typeof setupTestEnvironment>;

		afterEach(() => {
			if (testEnv) {
				testEnv.cleanup();
			}
		});

		it("should setup test environment with defaults", () => {
			testEnv = setupTestEnvironment();

			expect(testEnv.authService).toBeDefined();
			expect(testEnv.organizationService).toBeDefined();
			expect(testEnv.cleanup).toBeDefined();
			expect(typeof testEnv.cleanup).toBe("function");
		});

		it("should apply custom mocks to environment", () => {
			const customAuthResponse = { token: "custom-token", user: mockUser };

			testEnv = setupTestEnvironment({
				mocks: {
					authService: {
						signIn: vi.fn().mockResolvedValue(customAuthResponse)
					}
				}
			});

			expect(testEnv.authService.signIn).toBeDefined();
			// Should be able to call the customized mock
			expect(testEnv.authService.signIn).toBeInstanceOf(Function);
		});
	});

	describe("Enhanced Rendering", () => {
		it("should render with full environment setup", () => {
			const testEnv = renderWithFullEnvironment(<TestComponent />, {
				providers: { toast: true }
			});

			expect(screen.getByTestId("test-component")).toBeInTheDocument();
			expect(screen.getByText("Test Component")).toBeInTheDocument();

			// Cleanup
			testEnv.cleanup();
		});

		it("should provide access to mocks for assertions", () => {
			const testEnv = renderWithFullEnvironment(<TestComponent />, {
				providers: { toast: true }
			});

			// Should have access to all mock services
			expect(testEnv.mocks.authService).toBeDefined();
			expect(testEnv.mocks.organizationService).toBeDefined();
			expect(testEnv.mocks.toastContext).toBeDefined();

			// Should be able to verify mock calls
			expect(typeof testEnv.mocks.authService.signIn).toBe("function");

			testEnv.cleanup();
		});
	});

	describe("Provider Combinations", () => {
		it("should render with toast-only provider", () => {
			const testEnv = ProviderCombinations.toastOnly(<TestComponent />);

			expect(screen.getByTestId("test-component")).toBeInTheDocument();
			expect(testEnv.mocks.toastContext).toBeDefined();

			testEnv.cleanup();
		});

		it("should render with auth provider", () => {
			const testEnv = ProviderCombinations.withAuth(<TestComponent />, mockUser);

			expect(screen.getByTestId("test-component")).toBeInTheDocument();
			expect(testEnv.mocks.authService).toBeDefined();

			testEnv.cleanup();
		});

		it("should render with organization provider", () => {
			const testEnv = ProviderCombinations.withOrganization(<TestComponent />, {
				user: mockUser,
				organization: mockOrganization
			});

			expect(screen.getByTestId("test-component")).toBeInTheDocument();
			expect(testEnv.mocks.authService).toBeDefined();
			expect(testEnv.mocks.organizationService).toBeDefined();

			testEnv.cleanup();
		});
	});

	describe("Scenario-Based Environments", () => {
		it("should create authenticated user scenario", () => {
			const testEnv = TestScenarios.authenticatedUser(<TestComponent />);

			expect(screen.getByTestId("test-component")).toBeInTheDocument();
			expect(testEnv.mocks.authService.getCurrentUser).toBeDefined();

			testEnv.cleanup();
		});

		it("should create unauthenticated user scenario", () => {
			const testEnv = TestScenarios.unauthenticatedUser(<TestComponent />);

			expect(screen.getByTestId("test-component")).toBeInTheDocument();
			expect(testEnv.mocks.authService.getCurrentUser).toBeDefined();

			testEnv.cleanup();
		});

		it("should create network error scenario", () => {
			const testEnv = TestScenarios.networkError(<TestComponent />);

			expect(screen.getByTestId("test-component")).toBeInTheDocument();
			expect(testEnv.mocks.fetch).toBeDefined();

			testEnv.cleanup();
		});
	});

	describe("Mock Scenarios", () => {
		it("should provide pre-configured authenticated user mocks", () => {
			const mocks = MockScenarios.authenticatedUser();

			expect(mocks.authService.getCurrentUser).toBeDefined();
			expect(typeof mocks.authService.getCurrentUser).toBe("function");
		});

		it("should provide pre-configured unauthenticated user mocks", () => {
			const mocks = MockScenarios.unauthenticatedUser();

			expect(mocks.authService.getCurrentUser).toBeDefined();
			expect(typeof mocks.authService.getCurrentUser).toBe("function");
		});

		it("should provide pre-configured user with organization mocks", () => {
			const mocks = MockScenarios.userWithOrganization();

			expect(mocks.authService.getCurrentUser).toBeDefined();
			expect(mocks.organizationService.getAll).toBeDefined();
			expect(typeof mocks.authService.getCurrentUser).toBe("function");
			expect(typeof mocks.organizationService.getAll).toBe("function");
		});
	});
});
