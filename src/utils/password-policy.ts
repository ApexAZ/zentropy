export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

export interface PasswordStrength {
	score: number;
	strength: "Very Weak" | "Weak" | "Fair" | "Good" | "Excellent";
	feedback: string[];
}

export interface UserInfo {
	email?: string;
	firstName?: string;
	lastName?: string;
}

export interface PasswordValidationOptions {
	userInfo?: UserInfo;
	previousPasswords?: string[];
}

export interface ComprehensiveValidationResult extends ValidationResult {
	strength: PasswordStrength;
}

export class PasswordPolicy {
	private static readonly MIN_LENGTH = 8;
	private static readonly MAX_LENGTH = 128;

	private static readonly COMMON_PASSWORDS = [
		"password",
		"password123",
		"admin",
		"admin123",
		"qwerty",
		"qwerty123",
		"123456",
		"1234567",
		"12345678",
		"123456789",
		"1234567890",
		"letmein",
		"welcome",
		"monkey",
		"dragon",
		"abc123",
		"iloveyou",
		"trustno1",
		"sunshine",
		"master",
		"hello",
		"freedom",
		"whatever",
		"football",
		"jesus",
		"ninja",
		"mustang",
		"access",
		"shadow",
		"michael",
		"superman",
		"696969",
		"batman",
		"hunter",
		"mustang",
		"tiger",
		"hottie",
		"angels",
		"prince",
		"nascar",
		"peanut"
	];

	private static readonly SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

	static validateLength(password: string): ValidationResult {
		const errors: string[] = [];

		if (password.length < this.MIN_LENGTH) {
			errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
		}

		if (password.length > this.MAX_LENGTH) {
			errors.push(`Password must not exceed ${this.MAX_LENGTH} characters`);
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	static validateComplexity(password: string): ValidationResult {
		const errors: string[] = [];

		if (!/[A-Z]/.test(password)) {
			errors.push("Password must contain at least one uppercase letter");
		}

		if (!/[a-z]/.test(password)) {
			errors.push("Password must contain at least one lowercase letter");
		}

		if (!/\d/.test(password)) {
			errors.push("Password must contain at least one number");
		}

		const specialCharRegex = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/;
		if (!specialCharRegex.test(password)) {
			errors.push(`Password must contain at least one special character (${this.SPECIAL_CHARS})`);
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	static validateForbiddenPatterns(password: string, userInfo?: UserInfo): ValidationResult {
		const errors: string[] = [];
		const lowerPassword = password.toLowerCase();

		if (this.COMMON_PASSWORDS.some(common => lowerPassword.includes(common.toLowerCase()))) {
			errors.push("Password is too common and easily guessable");
		}

		if (this.hasSequentialCharacters(password)) {
			errors.push("Password contains sequential characters");
		}

		if (this.hasRepeatedCharacters(password)) {
			errors.push("Password contains too many repeated characters");
		}

		if (userInfo && this.containsUserInfo(password, userInfo)) {
			errors.push("Password should not contain personal information");
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	static calculatePasswordStrength(password: string): PasswordStrength {
		let score = 0;
		const feedback: string[] = [];

		if (password.length >= 8) {
			score += 5;
		}
		if (password.length >= 12) {
			score += 5;
		}
		if (password.length >= 16) {
			score += 8;
		}

		if (/[a-z]/.test(password)) {
			score += 5;
		} else {
			feedback.push("Add lowercase letters");
		}

		if (/[A-Z]/.test(password)) {
			score += 5;
		} else {
			feedback.push("Add uppercase letters");
		}

		if (/\d/.test(password)) {
			score += 8;
		} else {
			feedback.push("Add numbers");
		}

		const specialCharRegex = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/;
		if (specialCharRegex.test(password)) {
			score += 8;
		} else {
			feedback.push("Add special characters");
		}

		const uniqueChars = new Set(password.toLowerCase()).size;
		if (uniqueChars >= 6) {
			score += 5;
		}
		if (uniqueChars >= 10) {
			score += 8;
		}

		if (password.length >= 16 && uniqueChars >= 10) {
			score += 12;
		}

		if (!this.COMMON_PASSWORDS.some(common => password.toLowerCase().includes(common))) {
			score += 5;
		} else {
			feedback.push("Avoid common words");
			score -= 2; // Penalty for common words
		}

		if (!this.hasSequentialCharacters(password)) {
			score += 3;
		} else {
			feedback.push("Avoid sequential characters");
		}

		if (!this.hasRepeatedCharacters(password)) {
			score += 3;
		} else {
			feedback.push("Avoid repeated characters");
		}

		let strength: PasswordStrength["strength"];
		if (score < 20) {
			strength = "Very Weak";
		} else if (score < 40) {
			strength = "Weak";
		} else if (score < 60) {
			strength = "Fair";
		} else if (score < 80) {
			strength = "Good";
		} else {
			strength = "Excellent";
		}

		return { score, strength, feedback };
	}

	static validatePasswordReuse(password: string, previousPasswords: string[] = []): ValidationResult {
		const errors: string[] = [];

		if (previousPasswords.includes(password)) {
			errors.push("Password has been used recently and cannot be reused");
		}

		const similarity = previousPasswords.some(prev => this.calculateSimilarity(password, prev) > 0.7);

		if (similarity) {
			errors.push("Password is too similar to a recently used password");
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	static validatePassword(password: string, options: PasswordValidationOptions = {}): ComprehensiveValidationResult {
		const allErrors: string[] = [];

		const lengthResult = this.validateLength(password);
		allErrors.push(...lengthResult.errors);

		const complexityResult = this.validateComplexity(password);
		allErrors.push(...complexityResult.errors);

		const forbiddenResult = this.validateForbiddenPatterns(password, options.userInfo);
		allErrors.push(...forbiddenResult.errors);

		const reuseResult = this.validatePasswordReuse(password, options.previousPasswords);
		allErrors.push(...reuseResult.errors);

		const strength = this.calculatePasswordStrength(password);

		return {
			isValid: allErrors.length === 0,
			errors: allErrors,
			strength
		};
	}

	private static hasSequentialCharacters(password: string): boolean {
		const sequences = [
			"0123456789",
			"abcdefghijklmnopqrstuvwxyz",
			"ABCDEFGHIJKLMNOPQRSTUVWXYZ",
			"qwertyuiopasdfghjklzxcvbnm",
			"QWERTYUIOPASDFGHJKLZXCVBNM"
		];

		for (const sequence of sequences) {
			for (let i = 0; i <= sequence.length - 4; i++) {
				const subseq = sequence.substring(i, i + 4);
				if (password.includes(subseq)) {
					return true;
				}
			}
		}

		return false;
	}

	private static hasRepeatedCharacters(password: string): boolean {
		for (let i = 0; i <= password.length - 3; i++) {
			const char = password[i];
			if (password[i + 1] === char && password[i + 2] === char) {
				return true;
			}
		}
		return false;
	}

	private static containsUserInfo(password: string, userInfo: UserInfo): boolean {
		const lowerPassword = password.toLowerCase();

		if (userInfo.firstName && lowerPassword.includes(userInfo.firstName.toLowerCase())) {
			return true;
		}

		if (userInfo.lastName && lowerPassword.includes(userInfo.lastName.toLowerCase())) {
			return true;
		}

		if (userInfo.email) {
			const emailParts = userInfo.email.toLowerCase().split("@");
			const username = emailParts[0];
			const domainPart = emailParts[1];

			if (username && lowerPassword.includes(username)) {
				return true;
			}

			if (domainPart) {
				const domain = domainPart.split(".")[0];
				if (domain && domain.length > 3 && lowerPassword.includes(domain)) {
					return true;
				}
			}
		}

		return false;
	}

	private static calculateSimilarity(str1: string, str2: string): number {
		const longer = str1.length > str2.length ? str1 : str2;
		const shorter = str1.length > str2.length ? str2 : str1;

		if (longer.length === 0) {
			return 1.0;
		}

		const editDistance = this.levenshteinDistance(longer, shorter);
		return (longer.length - editDistance) / longer.length;
	}

	private static levenshteinDistance(str1: string, str2: string): number {
		const m = str1.length;
		const n = str2.length;

		// Create and initialize matrix explicitly to satisfy TypeScript
		const matrix: number[][] = [];
		for (let i = 0; i <= n; i++) {
			matrix[i] = [];
			const currentRow = matrix[i];
			if (!currentRow) {
				throw new Error("Failed to initialize matrix row");
			}

			for (let j = 0; j <= m; j++) {
				if (i === 0) {
					currentRow[j] = j;
				} else if (j === 0) {
					currentRow[j] = i;
				} else {
					currentRow[j] = 0;
				}
			}
		}

		// Fill the matrix with explicit null checks
		for (let i = 1; i <= n; i++) {
			for (let j = 1; j <= m; j++) {
				const currentRow = matrix[i];
				const previousRow = matrix[i - 1];

				if (!currentRow || !previousRow) {
					throw new Error("Matrix initialization error");
				}

				if (str2[i - 1] === str1[j - 1]) {
					const prevValue = previousRow[j - 1];
					if (prevValue === undefined) {
						throw new Error("Matrix access error");
					}
					currentRow[j] = prevValue;
				} else {
					const subst = previousRow[j - 1];
					const insert = currentRow[j - 1];
					const del = previousRow[j];

					if (subst === undefined || insert === undefined || del === undefined) {
						throw new Error("Matrix access error");
					}

					currentRow[j] = Math.min(subst + 1, insert + 1, del + 1);
				}
			}
		}

		const finalRow = matrix[n];
		if (!finalRow) {
			throw new Error("Matrix access error");
		}

		const result = finalRow[m];
		if (result === undefined) {
			throw new Error("Matrix access error");
		}

		return result;
	}
}
