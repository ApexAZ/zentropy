/**
 * Team Configuration TypeScript
 * Handles team configuration, member management, and sprint planning
 */

import { initializeNavigation } from "../utils/navigation-auth.js";

(function (): void {
	// Type definitions
	interface TeamMember {
		name: string;
		email: string;
		role: string;
	}

	interface Sprint {
		id: string;
		name: string;
		startDate: string;
		endDate: string;
		status: string;
	}

	interface TeamConfig {
		id: string;
		name: string;
		description: string;
		workingDays: number[];
		baselineVelocity: number;
		sprintLength: number;
	}

	// Team configuration state
	let teamMembers: TeamMember[] = [];
	let sprints: Sprint[] = [];

	// Generate or retrieve team ID
	function getTeamId(): string {
		// Check URL params first
		const urlParams = new URLSearchParams(window.location.search);
		const teamIdFromUrl = urlParams.get("teamId");
		if (teamIdFromUrl) {
			localStorage.setItem("currentTeamId", teamIdFromUrl);
			// Update URL to include team ID if not already there
			if (!window.location.search.includes("teamId")) {
				window.history.replaceState({}, "", `${window.location.pathname}?teamId=${teamIdFromUrl}`);
			}
			return teamIdFromUrl;
		}

		// Check localStorage for existing team
		const existingTeamId = localStorage.getItem("currentTeamId");
		if (existingTeamId) {
			// Skip old long team IDs and generate new simple one
			if (existingTeamId.startsWith("team-") && existingTeamId.length > 10) {
				// Old format detected, clear it
				localStorage.removeItem("currentTeamId");
			} else {
				// Valid simple ID, use it
				window.history.replaceState({}, "", `${window.location.pathname}?teamId=${existingTeamId}`);
				return existingTeamId;
			}
		}

		// Generate new team ID using simple counter
		let teamCounter = parseInt(localStorage.getItem("teamCounter") ?? "0");
		teamCounter++;
		localStorage.setItem("teamCounter", teamCounter.toString());

		const newTeamId = teamCounter.toString();
		localStorage.setItem("currentTeamId", newTeamId);

		// Update URL to include team ID
		window.history.replaceState({}, "", `${window.location.pathname}?teamId=${newTeamId}`);
		return newTeamId;
	}

	const teamId = getTeamId();

	let teamConfig: TeamConfig = {
		id: teamId,
		name: "",
		description: "",
		workingDays: [1, 2, 3, 4, 5],
		baselineVelocity: 50,
		sprintLength: 2
	};

	// Initialize page
	document.addEventListener("DOMContentLoaded", () => {
		// Initialize authentication-aware navigation
		initializeNavigation("nav-container");

		// Initialize team configuration functionality
		loadTeamConfiguration();
		renderTeamMembers();
		renderSprints();
	});

	// Team basic form submission
	document.getElementById("teamBasicForm")?.addEventListener("submit", (e: Event) => {
		e.preventDefault();
		const formData = new FormData(e.target as HTMLFormElement);

		teamConfig.name = formData.get("teamName") as string;
		teamConfig.description = formData.get("teamDescription") as string;
		teamConfig.workingDays = (formData.getAll("workingDays") as string[]).map(day => parseInt(day));

		void saveTeamConfiguration();
		alert("Team information saved successfully!");
	});

	// Velocity form submission
	document.getElementById("velocityForm")?.addEventListener("submit", (e: Event) => {
		e.preventDefault();
		const formData = new FormData(e.target as HTMLFormElement);

		teamConfig.baselineVelocity = parseInt(formData.get("baselineVelocity") as string);
		teamConfig.sprintLength = parseInt(formData.get("sprintLength") as string);

		void (async (): Promise<void> => {
			try {
				await fetch("/api/team/velocity", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						baselineVelocity: teamConfig.baselineVelocity,
						sprintLength: teamConfig.sprintLength
					})
				});
				alert("Velocity settings saved successfully!");
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error("Error saving velocity settings:", error);
				alert("Error saving velocity settings. Please try again.");
			}
		})();
	});

	// Load team configuration
	function loadTeamConfiguration(): void {
		// Load team-specific data from localStorage
		const savedConfig = localStorage.getItem(`team-${teamId}-config`);
		const savedSprints = localStorage.getItem(`team-${teamId}-sprints`);
		const savedMembers = localStorage.getItem(`team-${teamId}-members`);

		if (savedConfig) {
			const config = JSON.parse(savedConfig) as Partial<TeamConfig>;
			teamConfig = { ...teamConfig, ...config };
		}

		if (savedSprints) {
			sprints = JSON.parse(savedSprints) as Sprint[];
		}

		if (savedMembers) {
			teamMembers = JSON.parse(savedMembers) as TeamMember[];
		}

		// Update form fields
		const teamNameInput = document.getElementById("teamName") as HTMLInputElement;
		const baselineVelocityInput = document.getElementById("baselineVelocity") as HTMLInputElement;
		const sprintLengthSelect = document.getElementById("sprintLength") as HTMLSelectElement;

		if (teamNameInput) {teamNameInput.value = teamConfig.name || "My Development Team";}
		if (baselineVelocityInput) {baselineVelocityInput.value = teamConfig.baselineVelocity.toString();}
		if (sprintLengthSelect) {sprintLengthSelect.value = teamConfig.sprintLength.toString();}

		// Update working days checkboxes
		document.querySelectorAll<HTMLInputElement>('input[name="workingDays"]').forEach(checkbox => {
			checkbox.checked = teamConfig.workingDays.includes(parseInt(checkbox.value));
		});
	}

	// Save team configuration
	async function saveTeamConfiguration(): Promise<void> {
		// Save to localStorage with team-specific keys
		localStorage.setItem(`team-${teamId}-config`, JSON.stringify(teamConfig));
		localStorage.setItem(`team-${teamId}-sprints`, JSON.stringify(sprints));
		localStorage.setItem(`team-${teamId}-members`, JSON.stringify(teamMembers));

		try {
			await fetch("/api/team/basic", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(teamConfig)
			});
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error saving team configuration:", error);
		}
	}

	// Team member management
	function openAddMemberForm(): void {
		const form = document.getElementById("addMemberForm") as HTMLElement;
		if (form) {form.style.display = "block";}
	}

	function closeAddMemberForm(): void {
		const form = document.getElementById("addMemberForm") as HTMLElement;
		if (form) {form.style.display = "none";}
	}

	function submitAddMember(event: Event): void {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);

		const memberEmail = formData.get("memberEmail") as string | null;
		const memberRole = formData.get("memberRole") as string | null;
		
		if (!memberEmail || !memberRole) {
			// eslint-disable-next-line no-console
			console.error("Missing required member data");
			return;
		}

		const member: TeamMember = {
			name: (memberEmail.split("@")[0] ?? memberEmail).replace(".", " ").replace(/(^\w|\s\w)/g, m => m.toUpperCase()),
			email: memberEmail,
			role: memberRole
		};

		// Add member to the list
		teamMembers.push(member);
		renderTeamMembers();

		// In real implementation, this would POST to API
		// eslint-disable-next-line no-console
		console.log("Adding team member:", member);
		alert(`Team member ${member.email} added successfully!`);

		closeAddMemberForm();
		(event.target as HTMLFormElement).reset();
	}

	// Render team members list
	function renderTeamMembers(): void {
		const membersList = document.getElementById("teamMembersList") as HTMLElement;
		if (!membersList) {return;}

		membersList.innerHTML = "";

		if (teamMembers.length === 0) {
			membersList.innerHTML = '<div class="empty-state">No team members yet. Click "Add Team Member" to get started.</div>';
			return;
		}

		teamMembers.forEach(member => {
			const memberDiv = document.createElement("div");
			memberDiv.className = "member-item";
			memberDiv.innerHTML = `
				<div class="member-info">
					<span class="member-name">${member.name}</span>
					<span class="member-email">${member.email}</span>
					<span class="member-role">${member.role === "lead" ? "Team Lead" : "Team Member"}</span>
				</div>
				<div class="member-actions">
					${member.role === "lead" ? 
						'<span class="lead-indicator">Team Lead</span>' :
						`<button type="button" class="btn btn-secondary btn-sm" onclick="editMember('${member.email}')">Edit</button>
						<button type="button" class="btn btn-danger btn-sm" onclick="removeMember('${member.email}')">Remove</button>`
					}
				</div>
			`;
			membersList.appendChild(memberDiv);
		});
	}

	function removeMember(memberEmail: string): void {
		if (confirm(`Remove ${memberEmail} from the team?`)) {
			// Remove member from the list
			teamMembers = teamMembers.filter(m => m.email !== memberEmail);
			renderTeamMembers();

			// In real implementation, this would DELETE from API
			// eslint-disable-next-line no-console
			console.log("Removing team member:", memberEmail);
			alert(`${memberEmail} removed from team.`);
		}
	}

	function editMember(memberEmail: string): void {
		// In real implementation, this would open edit form
		alert(`Edit functionality for ${memberEmail} would open here.`);
	}

	// Sprint management
	function openSprintCreationForm(): void {
		const form = document.getElementById("sprintCreationForm") as HTMLElement;
		if (form) {form.style.display = "block";}
	}

	function closeSprintCreationForm(): void {
		const form = document.getElementById("sprintCreationForm") as HTMLElement;
		if (form) {form.style.display = "none";}
	}

	function submitCreateSprint(event: Event): void {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);

		const sprint: Sprint = {
			id: "sprint-" + Date.now().toString(),
			name: formData.get("sprintName") as string,
			startDate: formData.get("sprintStartDate") as string,
			endDate: formData.get("sprintEndDate") as string,
			status: new Date(formData.get("sprintStartDate") as string) > new Date() ? "planned" : "active"
		};

		// Add sprint to the list
		sprints.push(sprint);
		renderSprints();

		// In real implementation, this would POST to API
		// eslint-disable-next-line no-console
		console.log("Creating sprint:", sprint);
		alert(`Sprint "${sprint.name}" created successfully!`);

		closeSprintCreationForm();
		(event.target as HTMLFormElement).reset();
	}

	// Render sprints list
	function renderSprints(): void {
		const sprintsList = document.getElementById("sprintsList") as HTMLElement;
		if (!sprintsList) {return;}

		sprintsList.innerHTML = "";

		// Save sprints to localStorage with team-specific key
		localStorage.setItem(`team-${teamId}-sprints`, JSON.stringify(sprints));

		if (sprints.length === 0) {
			sprintsList.innerHTML = '<div class="empty-state">No sprints created yet. Click "Create New Sprint" or "Generate Multiple Sprints" to get started.</div>';
			return;
		}

		sprints.forEach(sprint => {
			const sprintDiv = document.createElement("div");
			sprintDiv.className = "sprint-item";
			const startDate = new Date(sprint.startDate).toLocaleDateString();
			const endDate = new Date(sprint.endDate).toLocaleDateString();

			sprintDiv.innerHTML = `
				<div class="sprint-info">
					<span class="sprint-name">${sprint.name}</span>
					<span class="sprint-dates">${startDate} - ${endDate}</span>
					<span class="sprint-status status-${sprint.status}">${sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}</span>
				</div>
				<div class="sprint-actions">
					<button type="button" class="btn btn-secondary btn-sm" onclick="editSprint('${sprint.id}')">Edit</button>
					<button type="button" class="btn btn-danger btn-sm" onclick="deleteSprint('${sprint.id}')">Delete</button>
				</div>
			`;
			sprintsList.appendChild(sprintDiv);
		});
	}

	function generateMultipleSprints(): void {
		const form = document.getElementById("multipleSprintsForm") as HTMLElement;
		if (form) {form.style.display = "block";}
	}

	function closeMultipleSprintsForm(): void {
		const form = document.getElementById("multipleSprintsForm") as HTMLElement;
		if (form) {form.style.display = "none";}
	}

	function submitGenerateMultipleSprints(event: Event): void {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);

		const startingNumberStr = formData.get("startingSprintNumber") as string | null;
		const numberOfSprintsStr = formData.get("numberOfSprints") as string | null;
		const firstStartDateStr = formData.get("firstSprintStartDate") as string | null;
		
		if (!startingNumberStr || !numberOfSprintsStr || !firstStartDateStr) {
			// eslint-disable-next-line no-console
			console.error("Missing required sprint generation data");
			return;
		}

		const config = {
			startingNumber: parseInt(startingNumberStr),
			numberOfSprints: parseInt(numberOfSprintsStr),
			firstStartDate: firstStartDateStr
		};

		// Generate sprints
		const sprintLengthWeeks = teamConfig.sprintLength || 2;
		let currentDate = new Date(config.firstStartDate);

		for (let i = 0; i < config.numberOfSprints; i++) {
			const sprintNum = config.startingNumber + i;
			const startDate = new Date(currentDate);
			const endDate = new Date(currentDate);
			endDate.setDate(endDate.getDate() + (sprintLengthWeeks * 7) - 1);

			const sprint: Sprint = {
				id: "sprint-" + Date.now().toString() + "-" + i.toString(),
				name: `Sprint ${sprintNum}`,
				startDate: startDate.toISOString().split("T")[0] ?? startDate.toISOString(),
				endDate: endDate.toISOString().split("T")[0] ?? endDate.toISOString(),
				status: startDate > new Date() ? "planned" : "active"
			};

			sprints.push(sprint);
			currentDate = new Date(endDate);
			currentDate.setDate(currentDate.getDate() + 1);
		}

		renderSprints();

		// In real implementation, this would POST to API
		// eslint-disable-next-line no-console
		console.log("Generating multiple sprints:", config);
		alert(`Generated ${config.numberOfSprints} sprints starting from Sprint ${config.startingNumber}!`);

		closeMultipleSprintsForm();
		(event.target as HTMLFormElement).reset();
	}

	function editSprint(sprintId: string): void {
		alert(`Edit functionality for ${sprintId} would open here.`);
	}

	function deleteSprint(sprintId: string): void {
		if (confirm("Delete this sprint? This action cannot be undone.")) {
			// Remove sprint from the list
			sprints = sprints.filter(s => s.id !== sprintId);
			renderSprints();

			// eslint-disable-next-line no-console
			console.log("Deleting sprint:", sprintId);
			alert("Sprint deleted successfully!");
		}
	}

	function exportTeamConfig(): void {
		// In real implementation, this would generate export file
		alert("Export functionality would download team configuration here.");
	}

	function viewTeamCalendar(): void {
		// Save current configuration before navigating
		void saveTeamConfiguration();
		// Navigate to calendar with team ID
		window.location.href = `/calendar.html?teamId=${teamId}`;
	}

	// Expose functions to global scope for onclick handlers
	// This is necessary because the functions are inside an IIFE
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).openAddMemberForm = openAddMemberForm;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).closeAddMemberForm = closeAddMemberForm;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).submitAddMember = submitAddMember;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).removeMember = removeMember;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).editMember = editMember;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).openSprintCreationForm = openSprintCreationForm;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).closeSprintCreationForm = closeSprintCreationForm;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).submitCreateSprint = submitCreateSprint;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).generateMultipleSprints = generateMultipleSprints;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).closeMultipleSprintsForm = closeMultipleSprintsForm;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).submitGenerateMultipleSprints = submitGenerateMultipleSprints;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).editSprint = editSprint;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).deleteSprint = deleteSprint;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).exportTeamConfig = exportTeamConfig;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
	(window as any).viewTeamCalendar = viewTeamCalendar;
})();