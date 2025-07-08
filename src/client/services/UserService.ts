import type { User, ProfileUpdateData, PasswordUpdateData } from "../types";

export class UserService {
	private static async handleResponse<T>(response: Response): Promise<T> {
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
			throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Get current user profile
	 */
	static async getCurrentUser(): Promise<User> {
		const response = await fetch("/api/v1/users/me");
		return this.handleResponse<User>(response);
	}

	/**
	 * Update user profile information
	 */
	static async updateProfile(profileData: ProfileUpdateData): Promise<User> {
		const response = await fetch("/api/v1/users/me", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(profileData)
		});
		return this.handleResponse<User>(response);
	}

	/**
	 * Update user password
	 */
	static async updatePassword(passwordData: PasswordUpdateData): Promise<{ message: string }> {
		const response = await fetch("/api/v1/users/me/password", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				current_password: passwordData.current_password,
				new_password: passwordData.new_password
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
			throw new Error(errorData.message || "Failed to update password");
		}

		const data = await response.json();
		return { message: data.message || "Password updated successfully!" };
	}

	/**
	 * Get all users (for dropdown selections)
	 */
	static async getAllUsers(): Promise<User[]> {
		const response = await fetch("/api/v1/users");
		return this.handleResponse<User[]>(response);
	}

	/**
	 * Validate profile data
	 */
	static validateProfile(profileData: ProfileUpdateData): { isValid: boolean; errors: Record<string, string> } {
		const errors: Record<string, string> = {};

		if (!profileData.first_name.trim()) {
			errors.first_name = "First name is required";
		} else if (profileData.first_name.length > 100) {
			errors.first_name = "First name must be less than 100 characters";
		}

		if (!profileData.last_name.trim()) {
			errors.last_name = "Last name is required";
		} else if (profileData.last_name.length > 100) {
			errors.last_name = "Last name must be less than 100 characters";
		}

		if (!profileData.email.trim()) {
			errors.email = "Email is required";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
			errors.email = "Please enter a valid email address";
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Validate password data
	 */
	static validatePasswordUpdate(passwordData: PasswordUpdateData): {
		isValid: boolean;
		errors: Record<string, string>;
	} {
		const errors: Record<string, string> = {};

		if (!passwordData.current_password) {
			errors.current_password = "Current password is required";
		}

		if (!passwordData.new_password) {
			errors.new_password = "New password is required";
		} else if (passwordData.new_password.length < 8) {
			errors.new_password = "Password must be at least 8 characters";
		} else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(passwordData.new_password)) {
			errors.new_password = "Password must contain uppercase, lowercase, number, and symbol";
		}

		if (!passwordData.confirm_new_password) {
			errors.confirm_new_password = "Please confirm your new password";
		} else if (passwordData.new_password !== passwordData.confirm_new_password) {
			errors.confirm_new_password = "Passwords do not match";
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}
}
