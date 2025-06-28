import bcrypt from "bcrypt";
import { PasswordPolicy, type PasswordValidationOptions } from "../utils/password-policy";

export class PasswordService {
	private static readonly SALT_ROUNDS = 12;
	private static readonly BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{1,2}\$.{53}$/;

	async hashPassword(password: string): Promise<string> {
		this.validatePasswordInput(password);

		const validationResult = PasswordPolicy.validatePassword(password);
		if (!validationResult.isValid) {
			throw new Error(`Password validation failed: ${validationResult.errors.join(", ")}`);
		}

		try {
			const hash = await bcrypt.hash(password, PasswordService.SALT_ROUNDS);
			return hash;
		} catch (error) {
			throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}

	async verifyPassword(password: string, hash: string): Promise<boolean> {
		this.validatePasswordInput(password);
		this.validateHashInput(hash);

		if (!this.isValidHash(hash)) {
			throw new Error("Invalid hash format");
		}

		try {
			return await bcrypt.compare(password, hash);
		} catch (error) {
			throw new Error(
				`Password verification failed: ${error instanceof Error ? error.message : "Unknown error"}`
			);
		}
	}

	isValidHash(hash: string | null | undefined): boolean {
		if (!hash || typeof hash !== "string") {
			return false;
		}

		return PasswordService.BCRYPT_HASH_REGEX.test(hash);
	}

	getSaltRounds(hash: string): number {
		if (!this.isValidHash(hash)) {
			throw new Error("Invalid hash format");
		}

		const parts = hash.split("$");
		const saltRoundsStr = parts[2];
		if (!saltRoundsStr) {
			throw new Error("Invalid hash format - missing salt rounds");
		}
		return parseInt(saltRoundsStr, 10);
	}

	async hashPasswordWithValidation(
		password: string,
		options: PasswordValidationOptions = {}
	): Promise<{ hash: string; validationResult: ReturnType<typeof PasswordPolicy.validatePassword> }> {
		this.validatePasswordInput(password);

		const validationResult = PasswordPolicy.validatePassword(password, options);
		if (!validationResult.isValid) {
			throw new Error(`Password validation failed: ${validationResult.errors.join(", ")}`);
		}

		const hash = await this.hashPassword(password);
		return { hash, validationResult };
	}

	private validatePasswordInput(password: string | null | undefined): void {
		if (password === null || password === undefined) {
			throw new Error("Password must be a string");
		}

		if (typeof password !== "string") {
			throw new Error("Password must be a string");
		}

		if (password.length === 0) {
			throw new Error("Password cannot be empty");
		}
	}

	private validateHashInput(hash: string | null | undefined): void {
		if (hash === null || hash === undefined) {
			throw new Error("Hash must be a string");
		}

		if (typeof hash !== "string") {
			throw new Error("Hash must be a string");
		}
	}

	static create(): PasswordService {
		return new PasswordService();
	}
}
