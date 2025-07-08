// Central utility functions for formatting and labeling
// This file provides a single source of truth for all formatting utilities

/**
 * Format a date string to localized format
 * @param dateString - ISO date string to format
 * @param monthFormat - Format for month display ("short" | "long")
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, monthFormat: "short" | "long" = "short"): string => {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: monthFormat,
		day: "numeric"
	});
};

/**
 * Get display label for calendar entry types
 * @param type - Entry type identifier
 * @returns Human-readable label
 */
export const getEntryTypeLabel = (type: string): string => {
	const labels = {
		pto: "PTO / Vacation",
		holiday: "Holiday",
		sick: "Sick Leave",
		personal: "Personal Time"
	};
	return labels[type as keyof typeof labels] ?? type;
};

/**
 * Get display label for user roles
 * @param role - Role identifier
 * @returns Human-readable role label
 */
export const getRoleLabel = (role: string): string => {
	const labels = {
		team_member: "Team Member",
		team_lead: "Team Lead",
		admin: "Administrator"
	};
	return labels[role as keyof typeof labels] ?? role;
};

/**
 * Get Tailwind CSS classes for role badge styling
 * @param role - Role identifier
 * @returns CSS class string for badge styling
 */
export const getRoleBadgeColor = (role: string): string => {
	const colors = {
		team_member: "bg-blue-100 text-blue-800",
		team_lead: "bg-green-100 text-green-800",
		admin: "bg-purple-100 text-purple-800"
	};
	return colors[role as keyof typeof colors] || "bg-gray-100 text-text-contrast";
};

/**
 * Get Tailwind CSS classes for entry type badge styling
 * @param type - Entry type identifier
 * @returns CSS class string for badge styling
 */
export const getEntryTypeColor = (type: string): string => {
	const colors = {
		pto: "bg-blue-100 text-blue-800",
		holiday: "bg-green-100 text-green-800",
		sick: "bg-red-100 text-red-800",
		personal: "bg-purple-100 text-purple-800"
	};
	return colors[type as keyof typeof colors] ?? "bg-gray-100 text-text-contrast";
};

/**
 * Get human-readable day name from day number
 * @param day - Day number (0-6, where 0 is Sunday)
 * @returns Day name
 */
export const getDayName = (day: number): string => {
	const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	return names[day] || "Unknown";
};

/**
 * Get velocity status with label and color
 * @param velocity - Velocity number
 * @returns Object with status label and color class
 */
export const getVelocityStatus = (velocity: number): { label: string; color: string } => {
	if (velocity === 0) {
		return { label: "Not Set", color: "text-text-primary" };
	}
	if (velocity < 20) {
		return { label: "Low", color: "text-orange-600" };
	}
	if (velocity < 40) {
		return { label: "Medium", color: "text-interactive" };
	}
	return { label: "High", color: "text-green-600" };
};

/**
 * Generate month options for date picker
 * @param rangeMonths - Number of months before and after current month (default: 6)
 * @returns Array of month options with value and label
 */
export const generateMonthOptions = (rangeMonths: number = 6): { value: string; label: string }[] => {
	const options = [];
	const currentDate = new Date();

	for (let i = -rangeMonths; i <= rangeMonths; i++) {
		const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
		const value = date.toISOString().slice(0, 7);
		const label = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
		options.push({ value, label });
	}

	return options;
};

/**
 * Format velocity for display
 * @param velocity - Velocity number
 * @returns Formatted velocity string
 */
export const formatVelocity = (velocity: number): string => {
	return velocity > 0 ? `${velocity} points` : "Not set";
};

/**
 * Format sprint length for display
 * @param days - Sprint length in days
 * @returns Formatted sprint length string
 */
export const formatSprintLength = (days: number): string => {
	return `${days} ${days === 1 ? "day" : "days"}`;
};

/**
 * Format working days per week for display
 * @param days - Working days per week
 * @returns Formatted working days string
 */
export const formatWorkingDays = (days: number): string => {
	return `${days} ${days === 1 ? "day" : "days"}/week`;
};