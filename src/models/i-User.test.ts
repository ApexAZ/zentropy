import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { UserModel, USER_ROLES, type CreateUserData, type UpdatePasswordData } from "./User";
import { pool } from "../database/connection";

describe("UserModel with PasswordService Integration", () => {
	// Test data
	const testUserData: CreateUserData = {
		email: "john.doe@example.com",
		password: "SecureP@ssw0rd2024!",
		first_name: "John",
		last_name: "Doe",
		role: USER_ROLES.TEAM_MEMBER
	};

	const weakPasswordData: CreateUserData = {
		...testUserData,
		password: "weak"
	};

	const personalInfoPasswordData: CreateUserData = {
		...testUserData,
		password: "JohnDoePassword123!"
	};

	beforeEach(async () => {
		// Clean up test data
		await pool.query(
			"DELETE FROM password_history WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1 OR email LIKE $2)",
			["%test%", "%example.com"]
		);
		await pool.query("DELETE FROM users WHERE email LIKE $1 OR email LIKE $2", ["%test%", "%example.com"]);
	});

	afterEach(async () => {
		// Clean up test data
		await pool.query(
			"DELETE FROM password_history WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1 OR email LIKE $2)",
			["%test%", "%example.com"]
		);
		await pool.query("DELETE FROM users WHERE email LIKE $1 OR email LIKE $2", ["%test%", "%example.com"]);
	});

	describe("create", () => {
		test("should create user with secure password hashing", async () => {
			const user = await UserModel.create(testUserData);

			expect(user).toBeDefined();
			expect(user.email).toBe(testUserData.email);
			expect(user.first_name).toBe(testUserData.first_name);
			expect(user.last_name).toBe(testUserData.last_name);
			expect(user.role).toBe(testUserData.role);
			expect(user.is_active).toBe(true);
			expect(user.password_hash).toMatch(/^\$2[aby]\$\d{1,2}\$.{53}$/);
			expect(user.password_hash).not.toBe(testUserData.password);
		});

		test("should add password to history when creating user", async () => {
			const user = await UserModel.create(testUserData);
			const passwordHistory = await UserModel.getPasswordHistory(user.id);

			expect(passwordHistory).toHaveLength(1);
			expect(passwordHistory[0]).toBe(user.password_hash);
		});

		test("should reject weak passwords", async () => {
			await expect(UserModel.create(weakPasswordData)).rejects.toThrow(/Password validation failed/);
		});

		test("should reject passwords containing personal information", async () => {
			await expect(UserModel.create(personalInfoPasswordData)).rejects.toThrow(/Password validation failed/);
		});

		test("should prevent duplicate email addresses", async () => {
			await UserModel.create(testUserData);

			const duplicateData = {
				...testUserData,
				email: testUserData.email.toUpperCase() // Test case insensitivity
			};

			await expect(UserModel.create(duplicateData)).rejects.toThrow("Email already exists");
		});

		test("should validate required fields", async () => {
			const invalidData = { ...testUserData, email: "" };
			await expect(UserModel.create(invalidData)).rejects.toThrow("Email is required");

			const invalidData2 = { ...testUserData, first_name: "" };
			await expect(UserModel.create(invalidData2)).rejects.toThrow("First name is required");

			const invalidData3 = { ...testUserData, password: "" };
			await expect(UserModel.create(invalidData3)).rejects.toThrow("Password is required");
		});

		test("should normalize email to lowercase", async () => {
			const upperCaseEmailData = {
				...testUserData,
				email: "TEST@EXAMPLE.COM"
			};

			const user = await UserModel.create(upperCaseEmailData);
			expect(user.email).toBe("test@example.com");
		});

		test("should accept additional validation options", async () => {
			const validationOptions = {
				previousPasswords: ["OldPassword123!"]
			};

			const user = await UserModel.create(testUserData, validationOptions);
			expect(user).toBeDefined();
			expect(user.email).toBe(testUserData.email);
		});
	});

	describe("verifyCredentials", () => {
		test("should verify correct credentials", async () => {
			const createdUser = await UserModel.create(testUserData);
			const verifiedUser = await UserModel.verifyCredentials(testUserData.email, testUserData.password);

			expect(verifiedUser).toBeDefined();
			expect(verifiedUser?.id).toBe(createdUser.id);
			expect(verifiedUser?.email).toBe(testUserData.email);
		});

		test("should reject incorrect password", async () => {
			await UserModel.create(testUserData);
			const verifiedUser = await UserModel.verifyCredentials(testUserData.email, "WrongPassword123!");

			expect(verifiedUser).toBeNull();
		});

		test("should reject non-existent email", async () => {
			const verifiedUser = await UserModel.verifyCredentials("nonexistent@example.com", testUserData.password);

			expect(verifiedUser).toBeNull();
		});

		test("should handle email case insensitivity", async () => {
			await UserModel.create(testUserData);
			const verifiedUser = await UserModel.verifyCredentials(
				testUserData.email.toUpperCase(),
				testUserData.password
			);

			expect(verifiedUser).toBeDefined();
			expect(verifiedUser?.email).toBe(testUserData.email.toLowerCase());
		});
	});

	describe("updatePassword", () => {
		test("should update password with proper validation", async () => {
			const user = await UserModel.create(testUserData);
			const originalHash = user.password_hash;

			const passwordUpdateData: UpdatePasswordData = {
				currentPassword: testUserData.password,
				newPassword: "NewSecureP@ssw0rd2024!"
			};

			const success = await UserModel.updatePassword(user.id, passwordUpdateData);
			expect(success).toBe(true);

			// Verify password was changed
			const updatedUser = await UserModel.findById(user.id);
			expect(updatedUser?.password_hash).not.toBe(originalHash);

			// Verify new password works
			const verifiedUser = await UserModel.verifyCredentials(testUserData.email, passwordUpdateData.newPassword);
			expect(verifiedUser).toBeDefined();
		});

		test("should add new password to history", async () => {
			const user = await UserModel.create(testUserData);

			const passwordUpdateData: UpdatePasswordData = {
				currentPassword: testUserData.password,
				newPassword: "NewSecureP@ssw0rd2024!"
			};

			await UserModel.updatePassword(user.id, passwordUpdateData);

			const passwordHistory = await UserModel.getPasswordHistory(user.id);
			expect(passwordHistory).toHaveLength(2); // Original + new password
		});

		test("should reject incorrect current password", async () => {
			const user = await UserModel.create(testUserData);

			const passwordUpdateData: UpdatePasswordData = {
				currentPassword: "WrongCurrentPassword123!",
				newPassword: "NewSecureP@ssw0rd2024!"
			};

			await expect(UserModel.updatePassword(user.id, passwordUpdateData)).rejects.toThrow(
				"Current password is incorrect"
			);
		});

		test("should reject weak new passwords", async () => {
			const user = await UserModel.create(testUserData);

			const passwordUpdateData: UpdatePasswordData = {
				currentPassword: testUserData.password,
				newPassword: "weak"
			};

			await expect(UserModel.updatePassword(user.id, passwordUpdateData)).rejects.toThrow(
				/Password validation failed/
			);
		});

		test("should reject password reuse", async () => {
			const user = await UserModel.create(testUserData);

			const passwordUpdateData: UpdatePasswordData = {
				currentPassword: testUserData.password,
				newPassword: testUserData.password // Same password
			};

			await expect(UserModel.updatePassword(user.id, passwordUpdateData)).rejects.toThrow(
				/Password validation failed/
			);
		});

		test("should reject non-existent user", async () => {
			const passwordUpdateData: UpdatePasswordData = {
				currentPassword: testUserData.password,
				newPassword: "NewSecureP@ssw0rd2024!"
			};

			// Use a valid UUID format
			await expect(
				UserModel.updatePassword("00000000-0000-0000-0000-000000000000", passwordUpdateData)
			).rejects.toThrow("User not found");
		});
	});

	describe("getPasswordHistory", () => {
		test("should return password history in chronological order", async () => {
			const user = await UserModel.create(testUserData);
			const originalHash = user.password_hash;

			// Update password multiple times
			await UserModel.updatePassword(user.id, {
				currentPassword: testUserData.password,
				newPassword: "SecondP@ssw0rd2024!"
			});

			const updatedUser = await UserModel.findById(user.id);
			await UserModel.updatePassword(user.id, {
				currentPassword: "SecondP@ssw0rd2024!",
				newPassword: "ThirdP@ssw0rd2024!"
			});

			const passwordHistory = await UserModel.getPasswordHistory(user.id);

			expect(passwordHistory).toHaveLength(3);
			expect(passwordHistory[2]).toBe(originalHash); // Oldest
			expect(passwordHistory[1]).toBe(updatedUser?.password_hash); // Middle
			expect(passwordHistory[0]).not.toBe(originalHash); // Most recent
		});

		test("should limit password history results", async () => {
			const user = await UserModel.create(testUserData);

			// Add 2 more passwords to history (for total of 3)
			await UserModel.updatePassword(user.id, {
				currentPassword: testUserData.password,
				newPassword: "UniqueP@ssw0rd1!"
			});

			await UserModel.updatePassword(user.id, {
				currentPassword: "UniqueP@ssw0rd1!",
				newPassword: "UniqueP@ssw0rd2!"
			});

			const limitedHistory = await UserModel.getPasswordHistory(user.id, 2);
			expect(limitedHistory).toHaveLength(2);

			const fullHistory = await UserModel.getPasswordHistory(user.id, 10);
			expect(fullHistory).toHaveLength(3); // Should have 3 total (original + 2 updates)
		}, 10000); // Increase timeout for this test

		test("should return empty array for user with no password history", async () => {
			const history = await UserModel.getPasswordHistory("00000000-0000-0000-0000-000000000000");
			expect(history).toEqual([]);
		});
	});

	describe("updateLastLogin", () => {
		test("should update last login timestamp", async () => {
			const user = await UserModel.create(testUserData);
			expect(user.last_login_at).toBeNull();

			await UserModel.updateLastLogin(user.id);

			const updatedUser = await UserModel.findById(user.id);
			expect(updatedUser?.last_login_at).toBeDefined();
			expect(updatedUser?.last_login_at).toBeInstanceOf(Date);
		});

		test("should handle non-existent user gracefully", async () => {
			// Should not throw error
			await expect(UserModel.updateLastLogin("00000000-0000-0000-0000-000000000000")).resolves.not.toThrow();
		});
	});

	describe("backward compatibility", () => {
		test("should maintain existing CRUD operations", async () => {
			// Create user
			const user = await UserModel.create(testUserData);

			// Find by email
			const foundByEmail = await UserModel.findByEmail(testUserData.email);
			expect(foundByEmail?.id).toBe(user.id);

			// Find by ID
			const foundById = await UserModel.findById(user.id);
			expect(foundById?.id).toBe(user.id);

			// Update user (non-password fields)
			const updateData = { first_name: "Updated" };
			const updatedUser = await UserModel.update(user.id, updateData);
			expect(updatedUser?.first_name).toBe("Updated");

			// Check email exists
			const emailExists = await UserModel.emailExists(testUserData.email);
			expect(emailExists).toBe(true);

			// Delete user
			const deleted = await UserModel.delete(user.id);
			expect(deleted).toBe(true);

			// Verify deletion
			const deletedUser = await UserModel.findById(user.id);
			expect(deletedUser).toBeNull();
		});

		test("should support createWithHash for migration scenarios", async () => {
			const hashData = {
				email: "hash@example.com",
				password_hash: "$2b$12$dummyHashForTestingPurposes.WithValidFormat",
				first_name: "Hash",
				last_name: "User",
				role: USER_ROLES.TEAM_MEMBER
			};

			const user = await UserModel.createWithHash(hashData);
			expect(user.email).toBe(hashData.email);
			expect(user.password_hash).toBe(hashData.password_hash);
		});
	});

	describe("password policy integration", () => {
		test("should enforce all password policy rules during user creation", async () => {
			const testCases = [
				{ password: "1234567", error: "Password must be at least 8 characters long" },
				{ password: "Password123", error: "Password must contain at least one special character" },
				{ password: "password123!", error: "Password must contain at least one uppercase letter" },
				{ password: "PASSWORD123!", error: "Password must contain at least one lowercase letter" },
				{ password: "Password!", error: "Password must contain at least one number" }
			];

			for (const testCase of testCases) {
				const invalidData = { ...testUserData, password: testCase.password };
				await expect(UserModel.create(invalidData)).rejects.toThrow(/Password validation failed/);
			}
		});

		test("should enforce password policy during password updates", async () => {
			const user = await UserModel.create(testUserData);

			const invalidUpdateData: UpdatePasswordData = {
				currentPassword: testUserData.password,
				newPassword: "weak"
			};

			await expect(UserModel.updatePassword(user.id, invalidUpdateData)).rejects.toThrow(
				/Password validation failed/
			);
		});
	});
});
