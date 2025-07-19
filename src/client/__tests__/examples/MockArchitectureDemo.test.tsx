/**
 * Mock Architecture Demonstration
 *
 * This file demonstrates how to use the new Global Mock Architecture
 * for different types of tests. It serves as a reference for developers
 * migrating from old patterns to the new standardized approach.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import {
	renderWithFullEnvironment,
	setupTestEnvironment,
	ProviderCombinations,
	TestScenarios
} from "../utils/testRenderUtils";
import {
	createAuthServiceMocks,
	AuthServiceScenarios,
	createOrganizationServiceMocks,
	OrganizationServiceScenarios
} from "../mocks/serviceMocks";
import { mockUser, mockOrganization } from "../setup/globalMocks";

// Demo components for testing
const SimpleComponent: React.FC = () => (
	<div data-testid="simple-component">
		<h1>Simple Component</h1>
		<button>Click me</button>
	</div>
);

const AuthAwareComponent: React.FC = () => {
	// This would use useAuth hook in real implementation
	return (
		<div data-testid="auth-component">
			<h1>Auth Component</h1>
			<p>User: {mockUser.name}</p>
			<button>Sign out</button>
		</div>
	);
};

const ComplexComponent: React.FC = () => {
	// This would use multiple services in real implementation
	return (
		<div data-testid="complex-component">
			<h1>Complex Component</h1>
			<p>Organization: {mockOrganization.name}</p>
			<button>Create Project</button>
			<button>Invite Member</button>
		</div>
	);
};

describe("Mock Architecture Demonstration", () => {
	// =============================================================================
	// LEVEL 1: FETCH MOCKING EXAMPLES (Service/Integration Tests)
	// =============================================================================

	describe("Level 1: Fetch Mocking (Service Tests)", () => {
		let testEnv: ReturnType<typeof setupTestEnvironment>;

		beforeEach(() => {
			vi.clearAllMocks();
			testEnv = setupTestEnvironment();
		});

		afterEach(() => {
			testEnv.cleanup();
		});

		it("demonstrates fetch-level mocking for service testing", async () => {
			// Configure fetch mock with specific responses
			testEnv.fetch
				.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							token: "demo-token",
							user: mockUser
						})
				} as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							organizations: [mockOrganization]
						})
				} as Response);

			// Test actual service calls (this would be in a service test file)
			// const signInResult = await AuthService.signIn(credentials);
			// const orgsResult = await OrganizationService.getAll();

			// Verify fetch calls
			expect(testEnv.fetch).toHaveBeenCalledTimes(0); // No calls in this demo

			// In real tests, you'd verify the fetch calls:
			// expect(testEnv.fetch).toHaveBeenCalledWith('/api/v1/auth/signin', { ... });
		});

		it("demonstrates error handling with fetch mocks", async () => {
			// Mock network error
			testEnv.fetch.mockRejectedValueOnce(new Error("Network error"));

			// In real tests, you'd test service error handling:
			// await expect(AuthService.signIn(credentials)).rejects.toThrow('Network error');

			expect(testEnv.fetch).toBeDefined();
		});
	});

	// =============================================================================
	// LEVEL 2: SERVICE MOCKING EXAMPLES (Component Integration Tests)
	// =============================================================================

	describe("Level 2: Service Mocking (Component Integration)", () => {
		it("demonstrates basic service mocking", () => {
			// Create custom service mocks
			const authMocks = createAuthServiceMocks({
				getCurrentUser: vi.fn().mockResolvedValue(mockUser),
				signOut: vi.fn().mockResolvedValue(undefined)
			});

			const testEnv = renderWithFullEnvironment(<AuthAwareComponent />, {
				providers: { toast: true, auth: true },
				mocks: { authService: authMocks }
			});

			expect(screen.getByTestId("auth-component")).toBeInTheDocument();
			expect(screen.getByText("Auth Component")).toBeInTheDocument();

			// In real tests, you might interact with the component:
			// fireEvent.click(screen.getByText("Sign out"));
			// expect(authMocks.signOut).toHaveBeenCalled();

			testEnv.cleanup();
		});

		it("demonstrates scenario-based service mocking", () => {
			// Use pre-configured scenarios
			const authMocks = AuthServiceScenarios.successfulSignIn();
			const orgMocks = OrganizationServiceScenarios.domainFound();

			const testEnv = renderWithFullEnvironment(<ComplexComponent />, {
				providers: { toast: true, auth: true, organization: true },
				mocks: {
					authService: authMocks,
					organizationService: orgMocks
				}
			});

			expect(screen.getByTestId("complex-component")).toBeInTheDocument();
			expect(screen.getByText("Complex Component")).toBeInTheDocument();

			testEnv.cleanup();
		});

		it("demonstrates error scenario testing", () => {
			// Test error scenarios
			const authMocks = AuthServiceScenarios.failedSignIn();
			const orgMocks = OrganizationServiceScenarios.noPermissions();

			const testEnv = renderWithFullEnvironment(<ComplexComponent />, {
				providers: { toast: true },
				mocks: {
					authService: authMocks,
					organizationService: orgMocks
				}
			});

			// In real tests, you'd trigger actions and verify error handling:
			// fireEvent.click(screen.getByText("Create Project"));
			// await waitFor(() => {
			//   expect(screen.getByText(/error/i)).toBeInTheDocument();
			// });

			testEnv.cleanup();
		});
	});

	// =============================================================================
	// LEVEL 3: HOOK MOCKING EXAMPLES (Component Unit Tests)
	// =============================================================================

	describe("Level 3: Hook Mocking (Component Unit Tests)", () => {
		it("demonstrates pure component testing", () => {
			// For simple components, no complex mocking needed
			const testEnv = ProviderCombinations.toastOnly(<SimpleComponent />);

			expect(screen.getByTestId("simple-component")).toBeInTheDocument();
			expect(screen.getByText("Simple Component")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();

			testEnv.cleanup();
		});

		// Note: Hook mocking at Level 3 would typically use vi.mock() at the top level
		// This example shows the pattern but doesn't actually mock hooks since it would
		// affect other tests in the same file.
	});

	// =============================================================================
	// PROVIDER COMBINATION EXAMPLES
	// =============================================================================

	describe("Provider Combinations", () => {
		it("demonstrates toast-only provider", () => {
			const testEnv = ProviderCombinations.toastOnly(<SimpleComponent />);

			expect(screen.getByTestId("simple-component")).toBeInTheDocument();
			expect(testEnv.mocks.toastContext).toBeDefined();
			expect(testEnv.mocks.toastContext.showSuccess).toBeDefined();

			testEnv.cleanup();
		});

		it("demonstrates auth provider with custom user", () => {
			const customUser = { ...mockUser, name: "Custom User" };

			const testEnv = ProviderCombinations.withAuth(<AuthAwareComponent />, customUser);

			expect(screen.getByTestId("auth-component")).toBeInTheDocument();
			expect(testEnv.mocks.authService).toBeDefined();

			testEnv.cleanup();
		});

		it("demonstrates organization provider", () => {
			const testEnv = ProviderCombinations.withOrganization(<ComplexComponent />, {
				user: mockUser,
				organization: mockOrganization
			});

			expect(screen.getByTestId("complex-component")).toBeInTheDocument();
			expect(testEnv.mocks.authService).toBeDefined();
			expect(testEnv.mocks.organizationService).toBeDefined();

			testEnv.cleanup();
		});
	});

	// =============================================================================
	// SCENARIO-BASED TESTING EXAMPLES
	// =============================================================================

	describe("Scenario-Based Testing", () => {
		it("demonstrates authenticated user scenario", () => {
			const testEnv = TestScenarios.authenticatedUser(<AuthAwareComponent />);

			expect(screen.getByTestId("auth-component")).toBeInTheDocument();
			expect(testEnv.mocks.authService.getCurrentUser).toBeDefined();

			testEnv.cleanup();
		});

		it("demonstrates unauthenticated user scenario", () => {
			const testEnv = TestScenarios.unauthenticatedUser(<AuthAwareComponent />);

			expect(screen.getByTestId("auth-component")).toBeInTheDocument();
			expect(testEnv.mocks.authService.getCurrentUser).toBeDefined();

			testEnv.cleanup();
		});

		it("demonstrates network error scenario", () => {
			const testEnv = TestScenarios.networkError(<ComplexComponent />);

			expect(screen.getByTestId("complex-component")).toBeInTheDocument();
			expect(testEnv.mocks.fetch).toBeDefined();

			testEnv.cleanup();
		});

		it("demonstrates rate limited scenario", () => {
			const testEnv = TestScenarios.rateLimited(<ComplexComponent />);

			expect(screen.getByTestId("complex-component")).toBeInTheDocument();
			expect(testEnv.mocks.authService.signIn).toBeDefined();

			testEnv.cleanup();
		});
	});

	// =============================================================================
	// DYNAMIC MOCK UPDATING EXAMPLES
	// =============================================================================

	describe("Dynamic Mock Updates", () => {
		it("demonstrates updating mocks during test execution", () => {
			const testEnv = renderWithFullEnvironment(<ComplexComponent />, {
				providers: { toast: true, auth: true }
			});

			// Initial state verification
			expect(screen.getByTestId("complex-component")).toBeInTheDocument();

			// Update mocks dynamically
			testEnv.updateMocks({
				authService: {
					getCurrentUser: vi.fn().mockResolvedValue(null) // Simulate logout
				}
			});

			// In real tests, you'd trigger re-renders and verify new behavior:
			// testEnv.rerender(<ComplexComponent />);
			// expect(screen.getByText(/please sign in/i)).toBeInTheDocument();

			testEnv.cleanup();
		});
	});

	// =============================================================================
	// PERFORMANCE COMPARISON EXAMPLES
	// =============================================================================

	describe("Performance Demonstrations", () => {
		it("fast unit test with minimal setup", () => {
			const start = performance.now();

			const testEnv = ProviderCombinations.toastOnly(<SimpleComponent />);
			expect(screen.getByTestId("simple-component")).toBeInTheDocument();
			testEnv.cleanup();

			const duration = performance.now() - start;
			expect(duration).toBeLessThan(50); // Should be very fast
		});

		it("integration test with service mocks", () => {
			const start = performance.now();

			const testEnv = renderWithFullEnvironment(<ComplexComponent />, {
				providers: { toast: true, auth: true, organization: true },
				mocks: {
					authService: createAuthServiceMocks(),
					organizationService: createOrganizationServiceMocks()
				}
			});

			expect(screen.getByTestId("complex-component")).toBeInTheDocument();
			testEnv.cleanup();

			const duration = performance.now() - start;
			expect(duration).toBeLessThan(100); // Still fast for integration test
		});
	});
});

// =============================================================================
// MIGRATION EXAMPLES
// =============================================================================

describe("Migration Examples: Before vs After", () => {
	describe("Before: Old Patterns", () => {
		it("shows old pattern - global fetch mock", () => {
			// OLD PATTERN (don't use this)
			const mockFetch = vi.fn();
			global.fetch = mockFetch;

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockUser)
			});

			// Tests would use global.fetch directly
			expect(global.fetch).toBe(mockFetch);

			// Manual cleanup required
			vi.clearAllMocks();
		});
	});

	describe("After: New Patterns", () => {
		it("shows new pattern - structured test environment", () => {
			// NEW PATTERN (use this)
			const testEnv = setupTestEnvironment({
				mocks: {
					fetch: vi.fn().mockResolvedValueOnce({
						ok: true,
						json: () => Promise.resolve(mockUser)
					} as Response)
				}
			});

			// Structured access to mocks
			expect(testEnv.fetch).toBeDefined();
			expect(testEnv.authService).toBeDefined();
			expect(testEnv.organizationService).toBeDefined();

			// Automatic cleanup
			testEnv.cleanup();
		});
	});
});
