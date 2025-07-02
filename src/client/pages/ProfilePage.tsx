import React, { useState, useEffect } from "react";

interface User {
	id: string;
	username: string;
	email: string;
	first_name: string;
	last_name: string;
	role: string;
	created_at: string;
	updated_at: string;
}

interface ProfileUpdateData {
	first_name: string;
	last_name: string;
	email: string;
}

interface PasswordUpdateData {
	current_password: string;
	new_password: string;
	confirm_new_password: string;
}

const ProfilePage: React.FC = () => {
	// State management
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>("");
	const [isEditingProfile, setIsEditingProfile] = useState(false);
	const [isChangingPassword, setIsChangingPassword] = useState(false);
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

	// Form states
	const [profileData, setProfileData] = useState<ProfileUpdateData>({
		first_name: "",
		last_name: "",
		email: ""
	});
	const [passwordData, setPasswordData] = useState<PasswordUpdateData>({
		current_password: "",
		new_password: "",
		confirm_new_password: ""
	});

	const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
	const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
	const [showPasswords, setShowPasswords] = useState({
		current: false,
		new: false,
		confirm: false
	});

	// Load user data on component mount
	useEffect(() => {
		const loadUserData = async () => {
			try {
				setIsLoading(true);
				setError("");

				const response = await fetch("/api/users/me");
				if (!response.ok) {
					throw new Error(`Failed to load profile: ${response.status}`);
				}

				const userData = (await response.json()) as User;
				setUser(userData);
				setProfileData({
					first_name: userData.first_name,
					last_name: userData.last_name,
					email: userData.email
				});
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load profile");
			} finally {
				setIsLoading(false);
			}
		};

		void loadUserData();
	}, []);

	// Hide toast after 5 seconds
	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => setToast(null), 5000);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	// Retry function for error recovery
	const retryLoadProfile = async (): Promise<void> => {
		try {
			setIsLoading(true);
			setError("");

			const response = await fetch("/api/users/me");
			if (!response.ok) {
				throw new Error(`Failed to load profile: ${response.status}`);
			}

			const userData = (await response.json()) as User;
			setUser(userData);
			setProfileData({
				first_name: userData.first_name,
				last_name: userData.last_name,
				email: userData.email
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load profile");
		} finally {
			setIsLoading(false);
		}
	};

	const handleEditProfile = (): void => {
		setIsEditingProfile(true);
		setProfileErrors({});
	};

	const handleCancelProfileEdit = (): void => {
		setIsEditingProfile(false);
		if (user) {
			setProfileData({
				first_name: user.first_name,
				last_name: user.last_name,
				email: user.email
			});
		}
		setProfileErrors({});
	};

	const validateProfileForm = (): boolean => {
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

		setProfileErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleProfileSubmit = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();

		if (!validateProfileForm()) {
			return;
		}

		try {
			const response = await fetch("/api/users/me", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(profileData)
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { message?: string };
				throw new Error(errorData.message ?? "Failed to update profile");
			}

			const updatedUser = (await response.json()) as User;
			setUser(updatedUser);
			setIsEditingProfile(false);
			setToast({
				message: "Profile updated successfully!",
				type: "success"
			});
		} catch (err) {
			// console.error('Error updating profile:', err)
			setToast({
				message: err instanceof Error ? err.message : "Failed to update profile",
				type: "error"
			});
		}
	};

	const handleChangePassword = (): void => {
		setIsChangingPassword(true);
		setPasswordData({
			current_password: "",
			new_password: "",
			confirm_new_password: ""
		});
		setPasswordErrors({});
	};

	const handleCancelPasswordChange = (): void => {
		setIsChangingPassword(false);
		setPasswordData({
			current_password: "",
			new_password: "",
			confirm_new_password: ""
		});
		setPasswordErrors({});
	};

	const validatePasswordForm = (): boolean => {
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

		setPasswordErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handlePasswordSubmit = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();

		if (!validatePasswordForm()) {
			return;
		}

		try {
			const response = await fetch("/api/users/me/password", {
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
				const errorData = (await response.json()) as { message?: string };
				throw new Error(errorData.message ?? "Failed to update password");
			}

			setIsChangingPassword(false);
			setPasswordData({
				current_password: "",
				new_password: "",
				confirm_new_password: ""
			});
			setToast({
				message: "Password updated successfully!",
				type: "success"
			});
		} catch (err) {
			// console.error('Error updating password:', err)
			setToast({
				message: err instanceof Error ? err.message : "Failed to update password",
				type: "error"
			});
		}
	};

	const togglePasswordVisibility = (field: "current" | "new" | "confirm"): void => {
		setShowPasswords(prev => ({
			...prev,
			[field]: !prev[field]
		}));
	};

	const formatDate = (dateString: string): string => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric"
		});
	};

	const getRoleLabel = (role: string): string => {
		const labels = {
			team_member: "Team Member",
			team_lead: "Team Lead",
			admin: "Administrator"
		};
		return labels[role as keyof typeof labels] ?? role;
	};

	const getRoleBadgeColor = (role: string): string => {
		const colors = {
			team_member: "bg-blue-100 text-blue-800",
			team_lead: "bg-green-100 text-green-800",
			admin: "bg-purple-100 text-purple-800"
		};
		return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800";
	};

	if (isLoading) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="m-0 text-3xl font-semibold text-gray-800">My Profile</h2>
						<p className="mt-2 text-gray-600">Manage your account information and security settings</p>
					</div>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
					<p className="mb-4 text-gray-600">Loading profile...</p>
				</div>
			</main>
		);
	}

	if (error) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="m-0 text-3xl font-semibold text-gray-800">My Profile</h2>
						<p className="mt-2 text-gray-600">Manage your account information and security settings</p>
					</div>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div>
						<h3 className="mb-3 text-xl font-semibold text-red-600">Unable to Load Profile</h3>
						<p className="mb-6 text-gray-600">{error}</p>
						<button
							onClick={() => void retryLoadProfile()}
							className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-base font-medium text-gray-700 no-underline transition-all duration-200 hover:border-gray-400 hover:bg-gray-50"
						>
							Retry
						</button>
					</div>
				</div>
			</main>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<main className="w-full py-8">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h2 className="m-0 text-3xl font-semibold text-gray-800">My Profile</h2>
					<p className="mt-2 text-gray-600">Manage your account information and security settings</p>
				</div>
			</div>

			<div className="space-y-8">
				{/* Profile Information Section */}
				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<div className="mb-6 flex items-center justify-between">
						<h3 className="text-xl font-semibold text-gray-800">Profile Information</h3>
						{!isEditingProfile && (
							<button
								onClick={handleEditProfile}
								className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 no-underline transition-all duration-200 hover:border-gray-400 hover:bg-gray-50"
							>
								<span>✏️</span>
								Edit Profile
							</button>
						)}
					</div>

					{isEditingProfile ? (
						<form onSubmit={e => void handleProfileSubmit(e)} className="space-y-6">
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
								<div>
									<label
										htmlFor="profile-first-name"
										className="mb-2 block font-medium text-gray-700"
									>
										First Name
									</label>
									<input
										id="profile-first-name"
										type="text"
										value={profileData.first_name}
										onChange={e => setProfileData({ ...profileData, first_name: e.target.value })}
										className="w-full rounded-md border border-gray-300 p-3 text-base leading-6 transition-all duration-200 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										required
									/>
									{profileErrors.first_name && (
										<span className="mt-1 block text-sm text-red-600">
											{profileErrors.first_name}
										</span>
									)}
								</div>

								<div>
									<label htmlFor="profile-last-name" className="mb-2 block font-medium text-gray-700">
										Last Name
									</label>
									<input
										id="profile-last-name"
										type="text"
										value={profileData.last_name}
										onChange={e => setProfileData({ ...profileData, last_name: e.target.value })}
										className="w-full rounded-md border border-gray-300 p-3 text-base leading-6 transition-all duration-200 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										required
									/>
									{profileErrors.last_name && (
										<span className="mt-1 block text-sm text-red-600">
											{profileErrors.last_name}
										</span>
									)}
								</div>
							</div>

							<div>
								<label htmlFor="profile-email" className="mb-2 block font-medium text-gray-700">
									Email Address
								</label>
								<input
									id="profile-email"
									type="email"
									value={profileData.email}
									onChange={e => setProfileData({ ...profileData, email: e.target.value })}
									className="w-full rounded-md border border-gray-300 p-3 text-base leading-6 transition-all duration-200 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
									required
								/>
								{profileErrors.email && (
									<span className="mt-1 block text-sm text-red-600">{profileErrors.email}</span>
								)}
							</div>

							<div className="flex justify-end gap-4 border-t border-gray-200 pt-4">
								<button
									type="button"
									onClick={handleCancelProfileEdit}
									className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-base font-medium text-gray-700 no-underline transition-all duration-200 hover:border-gray-400 hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="inline-flex cursor-pointer items-center gap-2 rounded-md border-none bg-blue-500 px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200 hover:bg-blue-600"
								>
									Save Changes
								</button>
							</div>
						</form>
					) : (
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
							<div>
								<div className="mb-1 block text-sm font-medium text-gray-500">Full Name</div>
								<div className="text-gray-900">
									{user.first_name} {user.last_name}
								</div>
							</div>

							<div>
								<div className="mb-1 block text-sm font-medium text-gray-500">Email Address</div>
								<div className="text-gray-900">{user.email}</div>
							</div>

							<div>
								<div className="mb-1 block text-sm font-medium text-gray-500">Role</div>
								<div className="flex items-center gap-2">
									<span className="text-gray-900">{getRoleLabel(user.role)}</span>
									<span
										className={`rounded-full px-2 py-1 text-xs font-medium ${getRoleBadgeColor(user.role)}`}
									>
										{getRoleLabel(user.role)}
									</span>
								</div>
							</div>

							<div>
								<div className="mb-1 block text-sm font-medium text-gray-500">Member Since</div>
								<div className="text-gray-900">{formatDate(user.created_at)}</div>
							</div>
						</div>
					)}
				</div>

				{/* Password Security Section */}
				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<div className="mb-6 flex items-center justify-between">
						<h3 className="text-xl font-semibold text-gray-800">Password & Security</h3>
						{!isChangingPassword && (
							<button
								onClick={handleChangePassword}
								className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 no-underline transition-all duration-200 hover:border-gray-400 hover:bg-gray-50"
							>
								<span>🔒</span>
								Change Password
							</button>
						)}
					</div>

					{isChangingPassword ? (
						<form onSubmit={e => void handlePasswordSubmit(e)} className="space-y-6">
							<div>
								<label htmlFor="current-password" className="mb-2 block font-medium text-gray-700">
									Current Password
								</label>
								<div className="relative">
									<input
										id="current-password"
										type={showPasswords.current ? "text" : "password"}
										value={passwordData.current_password}
										onChange={e =>
											setPasswordData({ ...passwordData, current_password: e.target.value })
										}
										className="w-full rounded-md border border-gray-300 p-3 pr-12 text-base leading-6 transition-all duration-200 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										required
									/>
									<button
										type="button"
										onClick={() => togglePasswordVisibility("current")}
										className="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-500 hover:text-gray-700"
									>
										{showPasswords.current ? "🙈" : "👁️"}
									</button>
								</div>
								{passwordErrors.current_password && (
									<span className="mt-1 block text-sm text-red-600">
										{passwordErrors.current_password}
									</span>
								)}
							</div>

							<div>
								<label htmlFor="new-password" className="mb-2 block font-medium text-gray-700">
									New Password
								</label>
								<div className="relative">
									<input
										id="new-password"
										type={showPasswords.new ? "text" : "password"}
										value={passwordData.new_password}
										onChange={e =>
											setPasswordData({ ...passwordData, new_password: e.target.value })
										}
										className="w-full rounded-md border border-gray-300 p-3 pr-12 text-base leading-6 transition-all duration-200 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										required
									/>
									<button
										type="button"
										onClick={() => togglePasswordVisibility("new")}
										className="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-500 hover:text-gray-700"
									>
										{showPasswords.new ? "🙈" : "👁️"}
									</button>
								</div>
								{passwordErrors.new_password && (
									<span className="mt-1 block text-sm text-red-600">
										{passwordErrors.new_password}
									</span>
								)}
								<div className="mt-2 text-sm text-gray-600">
									Password must contain at least 8 characters with uppercase, lowercase, number, and
									symbol.
								</div>
							</div>

							<div>
								<label htmlFor="confirm-password" className="mb-2 block font-medium text-gray-700">
									Confirm New Password
								</label>
								<div className="relative">
									<input
										id="confirm-password"
										type={showPasswords.confirm ? "text" : "password"}
										value={passwordData.confirm_new_password}
										onChange={e =>
											setPasswordData({ ...passwordData, confirm_new_password: e.target.value })
										}
										className="w-full rounded-md border border-gray-300 p-3 pr-12 text-base leading-6 transition-all duration-200 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										required
									/>
									<button
										type="button"
										onClick={() => togglePasswordVisibility("confirm")}
										className="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-500 hover:text-gray-700"
									>
										{showPasswords.confirm ? "🙈" : "👁️"}
									</button>
								</div>
								{passwordErrors.confirm_new_password && (
									<span className="mt-1 block text-sm text-red-600">
										{passwordErrors.confirm_new_password}
									</span>
								)}
							</div>

							<div className="flex justify-end gap-4 border-t border-gray-200 pt-4">
								<button
									type="button"
									onClick={handleCancelPasswordChange}
									className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-base font-medium text-gray-700 no-underline transition-all duration-200 hover:border-gray-400 hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="inline-flex cursor-pointer items-center gap-2 rounded-md border-none bg-blue-500 px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200 hover:bg-blue-600"
								>
									Update Password
								</button>
							</div>
						</form>
					) : (
						<div className="space-y-4">
							<div>
								<div className="mb-1 block text-sm font-medium text-gray-500">Password</div>
								<div className="flex items-center gap-4">
									<span className="text-gray-400">••••••••••••</span>
									<span className="text-sm text-gray-600">Last changed: Recent</span>
								</div>
							</div>

							<div>
								<div className="mb-1 block text-sm font-medium text-gray-500">Security Status</div>
								<div className="flex items-center gap-2">
									<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-sm font-medium text-green-800">
										<span>🛡️</span>
										Secure
									</span>
									<span className="text-sm text-gray-600">
										Your account meets all security requirements
									</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Account Information Section */}
				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<h3 className="mb-6 text-xl font-semibold text-gray-800">Account Information</h3>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div>
							<div className="mb-1 block text-sm font-medium text-gray-500">Account Status</div>
							<div className="flex items-center gap-2">
								<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-sm font-medium text-green-800">
									<span>✅</span>
									Active
								</span>
							</div>
						</div>

						<div>
							<div className="mb-1 block text-sm font-medium text-gray-500">User ID</div>
							<div className="font-mono text-sm text-gray-900">{user.id}</div>
						</div>

						<div>
							<div className="mb-1 block text-sm font-medium text-gray-500">Username</div>
							<div className="text-gray-900">{user.username}</div>
						</div>

						<div>
							<div className="mb-1 block text-sm font-medium text-gray-500">Last Updated</div>
							<div className="text-gray-900">{formatDate(user.updated_at)}</div>
						</div>
					</div>
				</div>
			</div>

			{/* Toast */}
			{toast && (
				<div className="fixed top-5 right-5 z-[60] min-w-[300px] animate-[slideIn_0.3s_ease] rounded-md shadow-lg">
					<div
						className={`flex items-center justify-between gap-2 p-4 ${
							toast.type === "success"
								? "border border-green-200 bg-green-50"
								: "border border-red-200 bg-red-50"
						}`}
					>
						<span className={toast.type === "success" ? "text-green-700" : "text-red-700"}>
							{toast.message}
						</span>
						<button
							onClick={() => setToast(null)}
							className="text-xl opacity-80 transition-opacity duration-200 hover:opacity-100"
						>
							&times;
						</button>
					</div>
				</div>
			)}
		</main>
	);
};

export default ProfilePage;
