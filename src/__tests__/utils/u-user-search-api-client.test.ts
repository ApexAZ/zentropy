import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import {
	buildUserSearchUrl,
	createUserSearchRequest,
	handleUserSearchResponse,
	makeUserSearchRequest
} from "../../utils/user-search-api-client";
import type { UserSearchResponse } from "../../utils/user-search-api-client";

// Mock fetch for API calls
global.fetch = vi.fn();
const mockFetch = fetch as Mock;

describe("User Search API Client", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("buildUserSearchUrl", () => {
		it("should build URL with query parameter", () => {
			const url = buildUserSearchUrl("john");
			expect(url).toBe("/api/users/search?q=john&limit=20");
		});

		it("should build URL with query and role filter", () => {
			const url = buildUserSearchUrl("john", "basic_user");
			expect(url).toBe("/api/users/search?q=john&role=basic_user&limit=20");
		});

		it("should build URL with custom limit", () => {
			const url = buildUserSearchUrl("john", undefined, 10);
			expect(url).toBe("/api/users/search?q=john&limit=10");
		});

		it("should build URL with all parameters", () => {
			const url = buildUserSearchUrl("jane smith", "team_member", 5);
			expect(url).toBe("/api/users/search?q=jane+smith&role=team_member&limit=5");
		});

		it("should handle empty query", () => {
			const url = buildUserSearchUrl("");
			expect(url).toBe("/api/users/search?q=&limit=20");
		});

		it("should encode special characters in query", () => {
			const url = buildUserSearchUrl("test@example.com");
			expect(url).toBe("/api/users/search?q=test%40example.com&limit=20");
		});
	});

	describe("createUserSearchRequest", () => {
		it("should create correct request configuration", () => {
			const request = createUserSearchRequest("john");

			expect(request.method).toBe("GET");
			expect(request.credentials).toBe("include");
		});

		it("should create same configuration regardless of parameters", () => {
			const request1 = createUserSearchRequest("john");
			const request2 = createUserSearchRequest("jane", "team_lead", 10);

			expect(request1).toEqual(request2);
		});
	});

	describe("handleUserSearchResponse", () => {
		it("should parse successful response", async () => {
			const mockResponseData: UserSearchResponse = {
				users: [
					{
						id: "user-1",
						email: "john@example.com",
						first_name: "John",
						last_name: "Doe",
						role: "basic_user",
						is_active: true,
						created_at: "2024-01-01T00:00:00.000Z",
						updated_at: "2024-01-01T00:00:00.000Z"
					}
				],
				query: "john",
				roleFilter: null,
				limit: 20,
				count: 1,
				hasMore: false
			};

			const mockResponse = {
				ok: true,
				json: () => Promise.resolve(mockResponseData)
			} as Response;

			const result = await handleUserSearchResponse(mockResponse);
			expect(result).toEqual(mockResponseData);
		});

		it("should handle error responses", async () => {
			const errorData = { message: "Insufficient permissions" };
			const mockResponse = {
				ok: false,
				json: () => Promise.resolve(errorData)
			} as Response;

			await expect(handleUserSearchResponse(mockResponse)).rejects.toThrow("Insufficient permissions");
		});

		it("should handle JSON parsing errors", async () => {
			const mockResponse = {
				ok: true,
				json: () => Promise.reject(new Error("Invalid JSON"))
			} as Response;

			await expect(handleUserSearchResponse(mockResponse)).rejects.toThrow("Invalid JSON");
		});
	});

	describe("makeUserSearchRequest", () => {
		it("should make successful API request", async () => {
			const mockResponseData: UserSearchResponse = {
				users: [],
				query: "john",
				roleFilter: null,
				limit: 20,
				count: 0,
				hasMore: false
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponseData)
			});

			const result = await makeUserSearchRequest("john");

			expect(mockFetch).toHaveBeenCalledWith("/api/users/search?q=john&limit=20", {
				method: "GET",
				credentials: "include"
			});
			expect(result).toEqual(mockResponseData);
		});

		it("should make request with role filter", async () => {
			const mockResponseData: UserSearchResponse = {
				users: [],
				query: "john",
				roleFilter: "basic_user",
				limit: 20,
				count: 0,
				hasMore: false
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponseData)
			});

			await makeUserSearchRequest("john", "basic_user");

			expect(mockFetch).toHaveBeenCalledWith("/api/users/search?q=john&role=basic_user&limit=20", {
				method: "GET",
				credentials: "include"
			});
		});

		it("should make request with custom limit", async () => {
			const mockResponseData: UserSearchResponse = {
				users: [],
				query: "john",
				roleFilter: null,
				limit: 10,
				count: 0,
				hasMore: false
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponseData)
			});

			await makeUserSearchRequest("john", undefined, 10);

			expect(mockFetch).toHaveBeenCalledWith("/api/users/search?q=john&limit=10", {
				method: "GET",
				credentials: "include"
			});
		});

		it("should handle API errors", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				json: () => Promise.resolve({ message: "Unauthorized" })
			});

			await expect(makeUserSearchRequest("john")).rejects.toThrow("Unauthorized");
		});

		it("should handle network errors", async () => {
			mockFetch.mockRejectedValue(new Error("Network error"));

			await expect(makeUserSearchRequest("john")).rejects.toThrow("Network error");
		});

		it("should handle unknown errors as network errors", async () => {
			mockFetch.mockRejectedValue("Unknown error");

			await expect(makeUserSearchRequest("john")).rejects.toThrow("Network error");
		});

		it("should handle response parsing errors", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.reject(new Error("Parse error"))
			});

			await expect(makeUserSearchRequest("john")).rejects.toThrow("Parse error");
		});
	});
});
