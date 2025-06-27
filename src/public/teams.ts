/**
 * Team Management TypeScript
 * Handles CRUD operations for teams with comprehensive error handling and validation
 */

(function() {
// Type definitions
interface Team {
	id: string;
	name: string;
	description?: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
	created_at: string;
	updated_at: string;
}

interface CreateTeamData {
	name: string;
	description?: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
}

interface ValidationError {
	message: string;
	field?: string;
	details?: string;
}

// State management
let teams: Team[] = [];
let currentTeam: Team | null = null;
let isEditing = false;

// DOM Elements
const loadingState = document.getElementById('loading-state') as HTMLElement;
const errorState = document.getElementById('error-state') as HTMLElement;
const teamsSection = document.getElementById('teams-section') as HTMLElement;
const teamsGrid = document.getElementById('teams-grid') as HTMLElement;
const emptyState = document.getElementById('empty-state') as HTMLElement;
const teamModal = document.getElementById('team-modal') as HTMLElement;
const deleteModal = document.getElementById('delete-modal') as HTMLElement;
const teamForm = document.getElementById('team-form') as HTMLFormElement;
const toast = document.getElementById('toast') as HTMLElement;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
	void loadTeams();
	setupEventListeners();
});

/**
 * Setup event listeners
 */
function setupEventListeners(): void {
	const createBtn = document.getElementById('create-team-btn') as HTMLButtonElement;
	const retryBtn = document.getElementById('retry-btn') as HTMLButtonElement;
	
	createBtn.addEventListener('click', showCreateTeamModal);
	retryBtn.addEventListener('click', () => {
		loadTeams().catch((error: Error) => {
			// eslint-disable-next-line no-console
			console.error('Failed to load teams:', error);
		});
	});
	teamForm.addEventListener('submit', (event: Event) => {
		handleTeamSubmit(event).catch((error: Error) => {
			// eslint-disable-next-line no-console
			console.error('Failed to submit team form:', error);
		});
	});
	
	// Modal close on backdrop click
	teamModal.addEventListener('click', function(e: MouseEvent) {
		if (e.target === teamModal) {
			closeTeamModal();
		}
	});
	
	deleteModal.addEventListener('click', function(e: MouseEvent) {
		if (e.target === deleteModal) {
			closeDeleteModal();
		}
	});
}

/**
 * Load teams from the API
 */
async function loadTeams(): Promise<void> {
	try {
		showLoadingState();
		
		const response = await fetch('/api/teams');
		
		if (!response.ok) {
			throw new Error(`Failed to load teams: ${response.status} ${response.statusText}`);
		}
		
		teams = await response.json() as Team[];
		renderTeams();
		hideLoadingState();
		
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error loading teams:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		showErrorState(errorMessage);
	}
}

/**
 * Render teams in the grid
 */
function renderTeams(): void {
	if (teams.length === 0) {
		teamsGrid.style.display = 'none';
		emptyState.style.display = 'block';
		return;
	}
	
	emptyState.style.display = 'none';
	teamsGrid.style.display = 'grid';
	
	teamsGrid.innerHTML = teams.map((team: Team): string => `
		<div class="team-card" data-team-id="${team.id}">
			<div class="team-header">
				<h3 class="team-name">${escapeHtml(team.name)}</h3>
				<div class="team-actions">
					<button class="btn-icon" onclick="editTeam('${team.id}')" title="Edit Team">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
						</svg>
					</button>
					<button class="btn-icon btn-danger" onclick="confirmDeleteTeam('${team.id}')" title="Delete Team">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
						</svg>
					</button>
				</div>
			</div>
			
			${team.description ? `<p class="team-description">${escapeHtml(team.description)}</p>` : ''}
			
			<div class="team-stats">
				<div class="stat">
					<span class="stat-label">Sprint Length</span>
					<span class="stat-value">${team.sprint_length_days} days</span>
				</div>
				<div class="stat">
					<span class="stat-label">Working Days</span>
					<span class="stat-value">${team.working_days_per_week}/week</span>
				</div>
				<div class="stat">
					<span class="stat-label">Velocity</span>
					<span class="stat-value">${team.velocity_baseline ?? 'TBD'} ${team.velocity_baseline ? 'pts' : ''}</span>
				</div>
			</div>
			
			<div class="team-footer">
				<small class="team-meta">Created ${formatDate(team.created_at)}</small>
				<button class="btn btn-outline btn-small" onclick="viewTeamDetails('${team.id}')">
					View Details
				</button>
			</div>
		</div>
	`).join('');
}

/**
 * Show create team modal
 */
function showCreateTeamModal(): void {
	isEditing = false;
	currentTeam = null;
	
	const modalTitle = document.getElementById('modal-title') as HTMLElement;
	const saveBtn = document.getElementById('save-team-btn') as HTMLElement;
	
	modalTitle.textContent = 'Create New Team';
	saveBtn.innerHTML = '<span class="btn-text">Create Team</span>';
	
	// Reset form
	teamForm.reset();
	clearFormErrors();
	
	// Set defaults
	(document.getElementById('sprint-length') as HTMLSelectElement).value = '14';
	(document.getElementById('working-days') as HTMLSelectElement).value = '5';
	(document.getElementById('velocity-baseline') as HTMLInputElement).value = '0';
	
	teamModal.style.display = 'flex';
	(document.getElementById('team-name') as HTMLInputElement).focus();
}

/**
 * Edit existing team
 */
function editTeam(teamId: string): void {
	try {
		const team = teams.find(t => t.id === teamId);
		if (!team) {
			throw new Error('Team not found');
		}
		
		isEditing = true;
		currentTeam = team;
		
		// Populate form
		(document.getElementById('team-name') as HTMLInputElement).value = team.name;
		(document.getElementById('team-description') as HTMLTextAreaElement).value = team.description ?? '';
		(document.getElementById('velocity-baseline') as HTMLInputElement).value = team.velocity_baseline.toString();
		(document.getElementById('sprint-length') as HTMLSelectElement).value = team.sprint_length_days.toString();
		(document.getElementById('working-days') as HTMLSelectElement).value = team.working_days_per_week.toString();
		
		// Update modal
		const modalTitle = document.getElementById('modal-title') as HTMLElement;
		const saveBtn = document.getElementById('save-team-btn') as HTMLElement;
		
		modalTitle.textContent = 'Edit Team';
		saveBtn.innerHTML = '<span class="btn-text">Update Team</span>';
		
		clearFormErrors();
		teamModal.style.display = 'flex';
		(document.getElementById('team-name') as HTMLInputElement).focus();
		
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		showToast(errorMessage, 'error');
	}
}

/**
 * Handle team form submission
 */
async function handleTeamSubmit(event: Event): Promise<void> {
	event.preventDefault();
	
	const formData = new FormData(teamForm);
	const teamData: CreateTeamData = {
		name: (formData.get('name') as string).trim(),
		description: (formData.get('description') as string).trim() ?? undefined,
		velocity_baseline: parseInt(formData.get('velocity_baseline') as string, 10) ?? 0,
		sprint_length_days: parseInt(formData.get('sprint_length_days') as string),
		working_days_per_week: parseInt(formData.get('working_days_per_week') as string)
	};
	
	// Client-side validation
	if (!validateTeamData(teamData)) {
		return;
	}
	
	try {
		setSaveButtonLoading(true);
		
		const url = isEditing ? `/api/teams/${currentTeam?.id}` : '/api/teams';
		if (isEditing && !currentTeam) {
			throw new Error('Current team not found');
		}
		const method = isEditing ? 'PUT' : 'POST';
		
		const response = await fetch(url, {
			method,
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(teamData)
		});
		
		if (!response.ok) {
			const errorData = await response.json().catch((): ValidationError => ({ message: 'Unknown error occurred' })) as ValidationError;
			throw new Error(errorData.message || `Server error: ${response.status}`);
		}
		
		const savedTeam = await response.json() as Team;
		
		// Update local state
		const wasEditing = isEditing; // Capture state before closing modal
		if (isEditing && currentTeam) {
			const teamToUpdate = currentTeam; // Assert non-null for TypeScript
			const index = teams.findIndex((t: Team) => t.id === teamToUpdate.id);
			if (index !== -1) {
				teams[index] = savedTeam;
			}
		} else {
			teams.push(savedTeam);
		}
		
		renderTeams();
		closeTeamModal();
		showToast(
			wasEditing ? 'Team updated successfully!' : 'Team created successfully!', 
			'success'
		);
		
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error saving team:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		showToast(errorMessage, 'error');
		
		// Handle validation errors
		if (errorMessage.includes('validation')) {
			handleValidationErrors(error as Error);
		}
		
	} finally {
		setSaveButtonLoading(false);
	}
}

/**
 * Validate team data on client side
 */
function validateTeamData(data: CreateTeamData): boolean {
	clearFormErrors();
	let isValid = true;
	
	// Name validation
	if (!data.name || data.name.length < 2) {
		showFieldError('name-error', 'Team name must be at least 2 characters');
		isValid = false;
	} else if (data.name.length > 100) {
		showFieldError('name-error', 'Team name must be less than 100 characters');
		isValid = false;
	}
	
	// Description validation
	if (data.description && data.description.length > 500) {
		showFieldError('description-error', 'Description must be less than 500 characters');
		isValid = false;
	}
	
	// Velocity validation
	if (data.velocity_baseline < 0) {
		showFieldError('velocity-error', 'Velocity baseline cannot be negative');
		isValid = false;
	}
	
	// Sprint length validation
	if (![7, 14, 21, 28].includes(data.sprint_length_days)) {
		showFieldError('sprint-length-error', 'Please select a valid sprint length');
		isValid = false;
	}
	
	// Working days validation
	if (![3, 4, 5, 6].includes(data.working_days_per_week)) {
		showFieldError('working-days-error', 'Please select valid working days per week');
		isValid = false;
	}
	
	return isValid;
}

/**
 * Confirm team deletion
 */
function confirmDeleteTeam(teamId: string): void {
	const team = teams.find(t => t.id === teamId);
	if (!team) {
		showToast('Team not found', 'error');
		return;
	}
	
	currentTeam = team;
	(document.getElementById('delete-team-name') as HTMLElement).textContent = team.name;
	deleteModal.style.display = 'flex';
	
	// Setup delete confirmation
	const confirmBtn = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
	confirmBtn.onclick = (): void => {
		void deleteTeam(teamId);
	};
}

/**
 * Delete team
 */
async function deleteTeam(teamId: string): Promise<void> {
	try {
		setDeleteButtonLoading(true);
		
		const response = await fetch(`/api/teams/${teamId}`, {
			method: 'DELETE'
		});
		
		if (!response.ok) {
			const errorData = await response.json().catch((): ValidationError => ({ message: 'Unknown error occurred' })) as ValidationError;
			throw new Error(errorData.message || `Failed to delete team: ${response.status}`);
		}
		
		// Remove from local state
		teams = teams.filter((t: Team) => t.id !== teamId);
		renderTeams();
		closeDeleteModal();
		showToast('Team deleted successfully!', 'success');
		
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error deleting team:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		showToast(errorMessage, 'error');
	} finally {
		setDeleteButtonLoading(false);
	}
}

/**
 * View team details (placeholder for future implementation)
 */
function viewTeamDetails(teamId: string): void {
	const team = teams.find(t => t.id === teamId);
	if (team) {
		// For now, just show a simple alert
		// In the future, this could navigate to a detailed team view
		showToast(`Team details for "${team.name}" - Feature coming soon!`, 'info');
	}
}

/**
 * Close team modal
 */
function closeTeamModal(): void {
	teamModal.style.display = 'none';
	clearFormErrors();
	teamForm.reset();
	currentTeam = null;
	isEditing = false;
}

/**
 * Close delete modal
 */
function closeDeleteModal(): void {
	deleteModal.style.display = 'none';
	currentTeam = null;
}

/**
 * UI State Management
 */
function showLoadingState(): void {
	loadingState.style.display = 'flex';
	errorState.style.display = 'none';
	teamsSection.style.display = 'none';
}

function hideLoadingState(): void {
	loadingState.style.display = 'none';
	teamsSection.style.display = 'block';
}

function showErrorState(message: string): void {
	errorState.style.display = 'flex';
	loadingState.style.display = 'none';
	teamsSection.style.display = 'none';
	(document.getElementById('error-message-text') as HTMLElement).textContent = message;
}

function setSaveButtonLoading(loading: boolean): void {
	const btn = document.getElementById('save-team-btn') as HTMLButtonElement;
	const text = btn?.querySelector('.btn-text') as HTMLElement | null;
	const spinner = btn?.querySelector('.btn-spinner') as HTMLElement | null;
	
	if (!btn || !text || !spinner) {return;}
	
	if (loading) {
		btn.disabled = true;
		text.style.display = 'none';
		spinner.style.display = 'inline-block';
	} else {
		btn.disabled = false;
		text.style.display = 'inline';
		spinner.style.display = 'none';
	}
}

function setDeleteButtonLoading(loading: boolean): void {
	const btn = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
	const text = btn?.querySelector('.btn-text') as HTMLElement | null;
	const spinner = btn?.querySelector('.btn-spinner') as HTMLElement | null;
	
	if (!btn || !text || !spinner) {return;}
	
	if (loading) {
		btn.disabled = true;
		text.style.display = 'none';
		spinner.style.display = 'inline-block';
	} else {
		btn.disabled = false;
		text.style.display = 'inline';
		spinner.style.display = 'none';
	}
}

/**
 * Form validation helpers
 */
function clearFormErrors(): void {
	const errorElements = document.querySelectorAll<HTMLElement>('.field-error');
	errorElements.forEach((el: HTMLElement) => {
		el.textContent = '';
		el.style.display = 'none';
	});
	
	const inputs = document.querySelectorAll<HTMLElement>('.form-group input, .form-group textarea, .form-group select');
	inputs.forEach((input: HTMLElement) => input.classList.remove('error'));
}

function showFieldError(errorId: string, message: string): void {
	const errorElement = document.getElementById(errorId);
	if (errorElement) {
		errorElement.textContent = message;
		errorElement.style.display = 'block';
		
		// Highlight the corresponding input
		const inputId = errorId.replace('-error', '');
		const input = document.getElementById(inputId) ?? document.getElementById(`team-${inputId}`);
		if (input) {
			input.classList.add('error');
		}
	}
}

function handleValidationErrors(error: Error): void {
	// This would handle server-side validation errors
	// For now, just show the general error message
	// eslint-disable-next-line no-console
	console.warn('Validation error:', error);
}

/**
 * Toast notifications
 */
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
	const toastElement = document.getElementById('toast') as HTMLElement;
	const messageElement = document.getElementById('toast-message') as HTMLElement;
	
	messageElement.textContent = message;
	toastElement.className = `toast toast-${type}`;
	toastElement.style.display = 'block';
	
	// Auto-hide after 5 seconds
	setTimeout(hideToast, 5000);
}

function hideToast(): void {
	(toast).style.display = 'none';
}

/**
 * Utility functions
 */
function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', { 
		year: 'numeric', 
		month: 'short', 
		day: 'numeric' 
	});
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e: KeyboardEvent) {
	// Escape key closes modals
	if (e.key === 'Escape') {
		if (teamModal.style.display === 'flex') {
			closeTeamModal();
		} else if (deleteModal.style.display === 'flex') {
			closeDeleteModal();
		}
	}
	
	// Ctrl/Cmd + N creates new team
	if ((e.ctrlKey || e.metaKey) && e.key === 'n' && teamModal.style.display === 'none') {
		e.preventDefault();
		showCreateTeamModal();
	}
});

// Make functions available globally for onclick handlers
(window as any).editTeam = editTeam;
(window as any).confirmDeleteTeam = confirmDeleteTeam;
(window as any).viewTeamDetails = viewTeamDetails;

})();