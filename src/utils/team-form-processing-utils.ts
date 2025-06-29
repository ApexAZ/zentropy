/**
 * Team Form Processing Utilities
 * Pure functions extracted from teams-type-safety.test.ts following hybrid testing approach
 * These functions handle form data processing and validation without DOM dependencies
 */

export interface CreateTeamData {
	name: string;
	description?: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
}

export interface TeamFormValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
	sanitizedData?: CreateTeamData | undefined;
}

export interface FormFieldConfig {
	key: string;
	type: "string" | "number";
	required: boolean;
	min?: number;
	max?: number;
	defaultValue?: string | number;
}

/**
 * Extract string value from FormData with safe fallbacks
 * @param formData - The FormData object
 * @param key - The form field key
 * @param defaultValue - Fallback value if null/empty
 * @returns Trimmed string value or default
 */
export function extractStringFromFormData(formData: FormData, key: string, defaultValue = ""): string {
	const value = formData.get(key);
	if (value === null || typeof value !== "string") {
		return defaultValue;
	}
	return value.trim() || defaultValue;
}

/**
 * Extract number value from FormData with safe conversion and fallbacks
 * @param formData - The FormData object
 * @param key - The form field key
 * @param defaultValue - Fallback value if invalid/null
 * @returns Parsed number or default
 */
export function extractNumberFromFormData(formData: FormData, key: string, defaultValue = 0): number {
	const value = formData.get(key);
	if (value === null || typeof value !== "string") {
		return defaultValue;
	}

	const parsed = parseInt(value.trim(), 10);
	return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Mock FormData getter for testing purposes
 * @param data - Mock form data as key-value pairs
 * @returns Function that simulates FormData.get()
 */
export function createMockFormDataGetter(data: Record<string, string>): (key: string) => string | null {
	return (key: string): string | null => {
		return data[key] ?? null;
	};
}

/**
 * Validate team form data with comprehensive error checking
 * @param formData - The FormData containing team information
 * @returns Validation result with errors and sanitized data
 */
export function validateTeamFormData(formData: FormData): TeamFormValidationResult {
	const errors: Record<string, string> = {};

	// Extract and validate required string fields
	const name = extractStringFromFormData(formData, "name");
	if (!name) {
		errors.name = "Team name is required";
	} else if (name.length < 2) {
		errors.name = "Team name must be at least 2 characters";
	} else if (name.length > 100) {
		errors.name = "Team name must be less than 100 characters";
	}

	// Extract optional description
	const description = extractStringFromFormData(formData, "description");
	if (description && description.length > 500) {
		errors.description = "Team description must be less than 500 characters";
	}

	// Extract and validate numeric fields
	const velocity_baseline = extractNumberFromFormData(formData, "velocity_baseline", 0);
	if (velocity_baseline <= 0) {
		errors.velocity_baseline = "Velocity baseline must be greater than 0";
	} else if (velocity_baseline > 200) {
		errors.velocity_baseline = "Velocity baseline cannot exceed 200 points";
	}

	const sprint_length_days = extractNumberFromFormData(formData, "sprint_length_days", 0);
	if (sprint_length_days < 1) {
		errors.sprint_length_days = "Sprint length must be at least 1 day";
	} else if (sprint_length_days > 30) {
		errors.sprint_length_days = "Sprint length cannot exceed 30 days";
	}

	const working_days_per_week = extractNumberFromFormData(formData, "working_days_per_week", 0);
	if (working_days_per_week < 1) {
		errors.working_days_per_week = "Working days per week must be at least 1";
	} else if (working_days_per_week > 7) {
		errors.working_days_per_week = "Working days per week cannot exceed 7";
	}

	// Create sanitized data if valid
	const isValid = Object.keys(errors).length === 0;
	const sanitizedData: CreateTeamData | undefined = isValid
		? {
				name,
				...(description ? { description } : {}),
				velocity_baseline,
				sprint_length_days,
				working_days_per_week
			}
		: undefined;

	return {
		isValid,
		errors,
		sanitizedData
	};
}

/**
 * Process team form data with type safety and error handling
 * @param formData - The FormData to process
 * @returns Processed team data or validation errors
 */
export function processTeamFormData(formData: FormData): CreateTeamData | { errors: Record<string, string> } {
	const validation = validateTeamFormData(formData);

	if (validation.isValid && validation.sanitizedData) {
		return validation.sanitizedData;
	}

	return { errors: validation.errors };
}

/**
 * Convert form field configuration to validation rules
 * @param fields - Array of form field configurations
 * @returns Validation function for the configured fields
 */
export function createFormValidator(fields: FormFieldConfig[]) {
	return (formData: FormData): TeamFormValidationResult => {
		const errors: Record<string, string> = {};
		const data: Record<string, string | number> = {};

		fields.forEach(field => {
			if (field.type === "string") {
				const value = extractStringFromFormData(formData, field.key, (field.defaultValue as string) || "");
				if (field.required && !value) {
					errors[field.key] = `${field.key} is required`;
				}
				data[field.key] = value;
			} else if (field.type === "number") {
				const value = extractNumberFromFormData(formData, field.key, (field.defaultValue as number) || 0);
				if (field.required && value === 0) {
					errors[field.key] = `${field.key} is required`;
				}
				if (field.min !== undefined && value < field.min) {
					errors[field.key] = `${field.key} must be at least ${field.min}`;
				}
				if (field.max !== undefined && value > field.max) {
					errors[field.key] = `${field.key} cannot exceed ${field.max}`;
				}
				data[field.key] = value;
			}
		});

		const isValid = Object.keys(errors).length === 0;
		return {
			isValid,
			errors,
			sanitizedData: isValid ? (data as unknown as CreateTeamData) : undefined
		};
	};
}

/**
 * Handle null/undefined form values with appropriate fallbacks
 * @param value - The form value (string | null)
 * @param fieldType - Expected type of the field
 * @param defaultValue - Fallback value
 * @returns Safely converted value
 */
export function handleFormValueFallback(
	value: string | null,
	fieldType: "string" | "number",
	defaultValue: string | number
): string | number {
	if (value === null || value === undefined) {
		return defaultValue;
	}

	if (fieldType === "string") {
		return value.trim() || (defaultValue as string);
	} else {
		const parsed = parseInt(value.trim(), 10);
		return isNaN(parsed) ? (defaultValue as number) : parsed;
	}
}
