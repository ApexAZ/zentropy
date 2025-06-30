import type { User } from "../models/User";
import {
	formatUserForDisplay,
	validateTeamManagementPermissions,
	createErrorMessage,
	isRetryableError
} from "./user-display-utils";
import { makeUserSearchRequest } from "./api-client-core";

// API response user type (subset of User for display)
interface ApiUser {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	role: "basic_user" | "team_member" | "team_lead";
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

/**
 * Render user search results in the specified container using tested utilities
 *
 * @param users - Array of users to render
 * @param container - DOM container element to render results in
 */
export function renderUserSearchResults(users: User[] | ApiUser[], container: HTMLElement): void {
	// Clear existing content
	container.innerHTML = "";

	if (users.length === 0) {
		// Render empty state
		const emptyDiv = document.createElement("div");
		emptyDiv.className = "user-search-empty";
		emptyDiv.textContent = "No users found";
		container.appendChild(emptyDiv);
		return;
	}

	// Render user items using tested display utilities
	users.forEach(user => {
		// Convert ApiUser to User-compatible format for display
		const userForDisplay = user as User;
		const displayData = formatUserForDisplay(userForDisplay);

		const userItem = document.createElement("div");
		userItem.className = "user-search-item";
		userItem.dataset.userId = user.id;

		// Create user display content
		const userInfo = document.createElement("div");
		userInfo.className = "user-info";
		userInfo.innerHTML = `
			<div class="user-name">${displayData.displayName}</div>
			<div class="user-email">${displayData.email}</div>
			<div class="user-role">${displayData.roleDisplayName}</div>
		`;

		// Create add button
		const addButton = document.createElement("button");
		addButton.className = "add-user-button";
		addButton.textContent = "Add to Team";
		addButton.dataset.action = "add-user-to-team";
		addButton.dataset.userId = user.id;

		// Assemble user item
		userItem.appendChild(userInfo);
		userItem.appendChild(addButton);
		container.appendChild(userItem);
	});
}

/**
 * Handle user search input with debouncing and validation using tested utilities
 */
export async function handleUserSearch(): Promise<void> {
	const searchInput = document.getElementById("user-search-input") as HTMLInputElement;
	const resultsContainer = document.getElementById("search-results") as HTMLElement;

	if (!searchInput || !resultsContainer) {
		return;
	}

	const query = searchInput.value.trim();

	// Clear results if empty query
	if (query === "") {
		resultsContainer.innerHTML = "";
		return;
	}

	// Don't search for very short queries
	if (query.length < 2) {
		return;
	}

	try {
		// Show loading state
		showLoadingState(resultsContainer);

		// Perform search using tested API client
		const searchResults = await makeUserSearchRequest({ query });

		// Hide loading state
		hideLoadingState(resultsContainer);

		// Render results using API users
		renderUserSearchResults(searchResults.users, resultsContainer);
	} catch (error) {
		// Hide loading state
		hideLoadingState(resultsContainer);

		// Display error using tested utilities
		const errorMessage = createErrorMessage(error, "search users");
		const showRetry = isRetryableError(error);
		displaySearchError(errorMessage, resultsContainer, showRetry);
	}
}

/**
 * Show or hide team management UI based on user permissions using tested utilities
 *
 * @param user - Current user object
 * @param teamId - ID of the team being managed
 */
export function showTeamManagementUI(user: User, teamId: string): void {
	const container = document.getElementById("team-management-container") as HTMLElement;

	if (!container) {
		return;
	}

	// Use tested permission validation
	if (!validateTeamManagementPermissions(user)) {
		// Hide UI for unauthorized users
		container.style.display = "none";
		return;
	}

	// Show UI and initialize search components
	container.style.display = "block";

	// Create search input if it doesn't exist
	if (!container.querySelector("#user-search-input")) {
		const searchInput = document.createElement("input");
		searchInput.type = "text";
		searchInput.id = "user-search-input";
		searchInput.placeholder = "Search users to add to team...";
		container.appendChild(searchInput);
	}

	// Create results container if it doesn't exist
	if (!container.querySelector("#search-results")) {
		const resultsContainer = document.createElement("div");
		resultsContainer.id = "search-results";
		container.appendChild(resultsContainer);
	}

	// Store team ID for later use
	container.dataset.teamId = teamId;
}

/**
 * Display search error message in the results container
 *
 * @param message - Error message to display
 * @param container - Container element to display error in
 * @param showRetry - Whether to show a retry button (default: false)
 */
export function displaySearchError(message: string, container: HTMLElement, showRetry: boolean = false): void {
	// Clear existing content
	container.innerHTML = "";

	// Create error element
	const errorDiv = document.createElement("div");
	errorDiv.className = "search-error";
	errorDiv.textContent = message;

	container.appendChild(errorDiv);

	// Add retry button if requested
	if (showRetry) {
		const retryButton = document.createElement("button");
		retryButton.className = "retry-button";
		retryButton.textContent = "Retry";
		retryButton.dataset.action = "retry-search";
		container.appendChild(retryButton);
	}
}

/**
 * Show loading indicator in the search results container
 *
 * @param container - Container element to show loading state in
 */
export function showLoadingState(container: HTMLElement): void {
	container.innerHTML = "";

	const loadingDiv = document.createElement("div");
	loadingDiv.className = "loading-indicator";
	loadingDiv.textContent = "Searching users...";

	container.appendChild(loadingDiv);
}

/**
 * Remove loading indicator from the search results container
 *
 * @param container - Container element to remove loading state from
 */
export function hideLoadingState(container: HTMLElement): void {
	const loadingIndicator = container.querySelector(".loading-indicator");
	if (loadingIndicator) {
		loadingIndicator.remove();
	}
}
