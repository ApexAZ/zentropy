/**
 * Team-specific validation utilities
 */
import { validateString, validatePositiveInteger, ValidationError } from "./validation";
import type { CreateTeamData } from "../models/Team";

/**
 * Validate team input data for creation or updates
 */
export function validateTeamInput(body: unknown): CreateTeamData;
export function validateTeamInput(body: unknown, isUpdate: true): Partial<CreateTeamData>;
export function validateTeamInput(body: unknown, isUpdate = false): CreateTeamData | Partial<CreateTeamData> {
	if (!body || typeof body !== "object") {
		throw new ValidationError("Request body must be an object");
	}
	
	const data = body as Record<string, unknown>;
	
	// Validate required fields for creation, optional for updates
	const name = validateString(data.name, "name", { 
		required: !isUpdate, 
		minLength: 2, 
		maxLength: 100 
	});
	
	// Optional description
	const description = data.description !== undefined && data.description !== null
		? validateString(data.description, "description", { 
			required: false, 
			maxLength: 500 
		}) || undefined
		: undefined;
	
	// Validate sprint configuration
	const velocityBaseline = data.velocity_baseline !== undefined
		? validatePositiveInteger(data.velocity_baseline, "velocity_baseline", { min: 0, max: 1000 })
		: isUpdate ? undefined : 0;
	
	const sprintLengthDays = data.sprint_length_days !== undefined
		? validateSprintLength(data.sprint_length_days)
		: isUpdate ? undefined : 14;
	
	const workingDaysPerWeek = data.working_days_per_week !== undefined
		? validateWorkingDays(data.working_days_per_week)
		: isUpdate ? undefined : 5;
	
	const result: Partial<CreateTeamData> = {};
	
	if (name) {
		result.name = name;
	}
	if (description !== undefined) {
		result.description = description;
	}
	if (velocityBaseline !== undefined) {
		result.velocity_baseline = velocityBaseline;
	}
	if (sprintLengthDays !== undefined) {
		result.sprint_length_days = sprintLengthDays;
	}
	if (workingDaysPerWeek !== undefined) {
		result.working_days_per_week = workingDaysPerWeek;
	}
	
	return result;
}

/**
 * Validate sprint length is one of the allowed values
 */
export function validateSprintLength(value: unknown): number {
	const validLengths = [7, 14, 21, 28];
	const length = validatePositiveInteger(value, "sprint_length_days", { min: 1, max: 28 });
	
	if (!validLengths.includes(length)) {
		throw new ValidationError(
			`Sprint length must be one of: ${validLengths.join(", ")} days`,
			"sprint_length_days",
			value
		);
	}
	
	return length;
}

/**
 * Validate working days per week is one of the allowed values
 */
export function validateWorkingDays(value: unknown): number {
	const validDays = [3, 4, 5, 6];
	const days = validatePositiveInteger(value, "working_days_per_week", { min: 1, max: 7 });
	
	if (!validDays.includes(days)) {
		throw new ValidationError(
			`Working days per week must be one of: ${validDays.join(", ")}`,
			"working_days_per_week",
			value
		);
	}
	
	return days;
}