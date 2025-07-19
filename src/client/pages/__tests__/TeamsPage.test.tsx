import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamsPage from "../TeamsPage";
import { ToastProvider } from "../../contexts/ToastContext";

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = fetch as any;

// Test wrapper to provide ToastProvider context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
	React.createElement(ToastProvider, null, children);

describe("TeamsPage", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		mockFetch.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	const mockTeams = [
		{
			id: "1",
			name: "Frontend Team",
			description: "React development team",
			velocity_baseline: 40,
			sprint_length_days: 14,
			working_days_per_week: 5
		}
	];

	it("renders teams page with main elements", async () => {
		mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
		render(<TeamsPage />, { wrapper: TestWrapper });
		await act(async () => {});
		expect(screen.getByText("Team Management")).toBeInTheDocument();
	});

	it("displays loading state initially", () => {
		mockFetch.mockImplementation(() => new Promise(() => {}));
		render(<TeamsPage />, { wrapper: TestWrapper });
		expect(screen.getByText("Loading teams...")).toBeInTheDocument();
	});

	it("loads and displays teams", async () => {
		mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockTeams });
		render(<TeamsPage />, { wrapper: TestWrapper });
		await act(async () => {});
		expect(screen.getByText("Frontend Team")).toBeInTheDocument();
	});

	it("displays empty state when no teams", async () => {
		mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
		render(<TeamsPage />, { wrapper: TestWrapper });
		await act(async () => {});
		expect(screen.getByText("No Teams Yet")).toBeInTheDocument();
	});

	it("handles API errors gracefully", async () => {
		mockFetch.mockRejectedValueOnce(new Error("Network error"));
		render(<TeamsPage />, { wrapper: TestWrapper });
		await act(async () => {});
		expect(screen.getByText("Unable to Load Teams")).toBeInTheDocument();
	});

	it("opens create modal when Create New Team button is clicked", async () => {
		mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
		render(<TeamsPage />, { wrapper: TestWrapper });
		await act(async () => {});
		fireEvent.click(screen.getByText("Create New Team"));
		expect(screen.getByText("Basic Information")).toBeInTheDocument();
	});
});
