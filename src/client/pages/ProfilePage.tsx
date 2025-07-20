import React, { useState, useEffect, useCallback } from "react";
import type { User, ProfileUpdateData, PasswordUpdateData } from "../types";
import { formatDate, getRoleLabel, getRoleBadgeColor } from "../utils/formatters";
import { UserService } from "../services/UserService";
import { TabList, Tab, TabPanel } from "../components/atoms/Tab";
import { AccountSecuritySection } from "../components/AccountSecuritySection";
import PasswordRequirements from "../components/PasswordRequirements";
import { useToast } from "../contexts/ToastContext";

const ProfilePage: React.FC = () => {
	// State management
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>("");
	const [isEditingProfile, setIsEditingProfile] = useState(false);
	const [isChangingPassword, setIsChangingPassword] = useState(false);

	// Toast notifications
	const { showSuccess, showError } = useToast();

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

	// Tab state management
	const [activeTab, setActiveTab] = useState("profile");

	// Load user data on component mount
	useEffect(() => {
		let isMounted = true;

		const loadUserData = async () => {
			try {
				setIsLoading(true);
				setError("");

				const userData = await UserService.getCurrentUser();

				// Only update state if component is still mounted
				if (isMounted) {
					setUser(userData);
					setProfileData({
						first_name: userData.first_name,
						last_name: userData.last_name,
						email: userData.email
					});
				}
			} catch (err) {
				if (isMounted) {
					setError(err instanceof Error ? err.message : "Failed to load profile");
				}
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		};

		void loadUserData();

		// Cleanup function
		return () => {
			isMounted = false;
		};
	}, []);

	// Retry function for error recovery
	const retryLoadProfile = async (): Promise<void> => {
		try {
			setIsLoading(true);
			setError("");

			const userData = await UserService.getCurrentUser();
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
		const validation = UserService.validateProfile(profileData);
		setProfileErrors(validation.errors);
		return validation.isValid;
	};

	const handleProfileSubmit = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();

		if (!validateProfileForm()) {
			// Allow React to flush state updates before returning
			await new Promise(resolve => setTimeout(resolve, 0));
			return;
		}

		try {
			const updatedUser = await UserService.updateProfile(profileData);
			setUser(updatedUser);
			setIsEditingProfile(false);
			showSuccess("Profile updated successfully!");
		} catch (err) {
			showError(err instanceof Error ? err.message : "Failed to update profile");
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
		const validation = UserService.validatePasswordUpdate(passwordData);
		setPasswordErrors(validation.errors);
		return validation.isValid;
	};

	const handlePasswordSubmit = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();

		if (!validatePasswordForm()) {
			return;
		}

		try {
			await UserService.updatePassword(passwordData);
			setIsChangingPassword(false);
			setPasswordData({
				current_password: "",
				new_password: "",
				confirm_new_password: ""
			});
			showSuccess("Password updated successfully!");
		} catch (err) {
			showError(err instanceof Error ? err.message : "Failed to update password");
		}
	};

	const togglePasswordVisibility = (field: "current" | "new" | "confirm"): void => {
		setShowPasswords(prev => ({
			...prev,
			[field]: !prev[field]
		}));
	};

	// Security section handlers
	const handleSecurityUpdate = useCallback((): void => {
		// Refresh user data when security status changes
		void retryLoadProfile();
	}, []);

	const handleSecurityError = useCallback(
		(error: string): void => {
			showError(error);
		},
		[showError]
	);

	if (isLoading) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="text-text-contrast m-0 text-3xl font-semibold">My Profile</h2>
						<p className="text-text-primary mt-2">Manage your account information and security settings</p>
					</div>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div className="border-layout-background border-t-interactive mb-4 h-10 w-10 animate-spin rounded-full border-4"></div>
					<p className="text-text-primary mb-4">Loading profile...</p>
				</div>
			</main>
		);
	}

	if (error) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="text-text-contrast m-0 text-3xl font-semibold">My Profile</h2>
						<p className="text-text-primary mt-2">Manage your account information and security settings</p>
					</div>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div>
						<h3 className="mb-3 text-xl font-semibold text-red-600">Unable to Load Profile</h3>
						<p className="text-text-primary mb-6">{error}</p>
						<button
							onClick={() => void retryLoadProfile()}
							className="border-layout-background bg-content-background text-text-primary hover:border-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-base font-medium no-underline transition-all duration-200"
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
					<h2 className="text-text-contrast m-0 text-3xl font-semibold">My Profile</h2>
					<p className="text-text-primary mt-2">Manage your account information and security settings</p>
				</div>
			</div>

			{/* Tab Navigation */}
			<TabList activeTab={activeTab} onTabChange={setActiveTab} className="mb-8">
				<Tab id="profile" label="Profile" isActive={activeTab === "profile"} onClick={setActiveTab} />
				<Tab id="security" label="Security" isActive={activeTab === "security"} onClick={setActiveTab} />
			</TabList>

			{/* Profile Tab */}
			<TabPanel tabId="profile" activeTab={activeTab}>
				<div className="space-y-8">
					{/* Profile Information Section */}
					<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
						<div className="mb-6 flex items-center justify-between">
							<h3 className="text-text-contrast text-xl font-semibold">Profile Information</h3>
							{!isEditingProfile && (
								<button
									onClick={handleEditProfile}
									className="border-layout-background bg-content-background text-text-primary hover:border-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-sm font-medium no-underline transition-all duration-200"
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
											className="text-text-primary mb-2 block font-medium"
										>
											First Name
										</label>
										<input
											id="profile-first-name"
											type="text"
											value={profileData.first_name}
											onChange={e =>
												setProfileData({ ...profileData, first_name: e.target.value })
											}
											className="border-layout-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										/>
										{profileErrors.first_name && (
											<span className="mt-1 block text-sm text-red-600">
												{profileErrors.first_name}
											</span>
										)}
									</div>

									<div>
										<label
											htmlFor="profile-last-name"
											className="text-text-primary mb-2 block font-medium"
										>
											Last Name
										</label>
										<input
											id="profile-last-name"
											type="text"
											value={profileData.last_name}
											onChange={e =>
												setProfileData({ ...profileData, last_name: e.target.value })
											}
											className="border-layout-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										/>
										{profileErrors.last_name && (
											<span className="mt-1 block text-sm text-red-600">
												{profileErrors.last_name}
											</span>
										)}
									</div>
								</div>

								<div>
									<label htmlFor="profile-email" className="text-text-primary mb-2 block font-medium">
										Email Address
									</label>
									<input
										id="profile-email"
										type="email"
										value={profileData.email}
										onChange={e => setProfileData({ ...profileData, email: e.target.value })}
										className="border-layout-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
									/>
									{profileErrors.email && (
										<span className="mt-1 block text-sm text-red-600">{profileErrors.email}</span>
									)}
								</div>

								<div className="border-layout-background flex justify-end gap-4 border-t pt-4">
									<button
										type="button"
										onClick={handleCancelProfileEdit}
										className="border-layout-background bg-content-background text-text-primary hover:border-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-base font-medium no-underline transition-all duration-200"
									>
										Cancel
									</button>
									<button
										type="submit"
										className="bg-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border-none px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200"
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
									<div className="text-gray-900">
										{user.created_at ? formatDate(user.created_at, "long") : "N/A"}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Account Information Section */}
					<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
						<h3 className="text-text-contrast mb-6 text-xl font-semibold">Account Information</h3>

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
								<div className="text-gray-900">
									{user.updated_at ? formatDate(user.updated_at, "long") : "N/A"}
								</div>
							</div>
						</div>
					</div>
				</div>
			</TabPanel>

			{/* Security Tab */}
			<TabPanel tabId="security" activeTab={activeTab}>
				<div className="space-y-8">
					{/* Account Security Section - OAuth Linking */}
					<AccountSecuritySection onSecurityUpdate={handleSecurityUpdate} onError={handleSecurityError} />

					{/* Password Security Section */}
					<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
						<div className="mb-6 flex items-center justify-between">
							<h3 className="text-text-contrast text-xl font-semibold">Password & Security</h3>
							{!isChangingPassword && (
								<button
									onClick={handleChangePassword}
									className="border-layout-background bg-content-background text-text-primary hover:border-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-sm font-medium no-underline transition-all duration-200"
								>
									<span>🔒</span>
									Change Password
								</button>
							)}
						</div>

						{isChangingPassword ? (
							<form onSubmit={e => void handlePasswordSubmit(e)} className="space-y-6">
								<div>
									<label
										htmlFor="current-password"
										className="text-text-primary mb-2 block font-medium"
									>
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
											className="border-layout-background focus:border-interactive w-full rounded-md border p-3 pr-12 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										/>
										<button
											type="button"
											onClick={() => togglePasswordVisibility("current")}
											className="hover:text-text-primary absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-500"
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
									<label htmlFor="new-password" className="text-text-primary mb-2 block font-medium">
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
											className="border-layout-background focus:border-interactive w-full rounded-md border p-3 pr-12 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										/>
										<button
											type="button"
											onClick={() => togglePasswordVisibility("new")}
											className="hover:text-text-primary absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-500"
										>
											{showPasswords.new ? "🙈" : "👁️"}
										</button>
									</div>
									{passwordErrors.new_password && (
										<span className="mt-1 block text-sm text-red-600">
											{passwordErrors.new_password}
										</span>
									)}
									<PasswordRequirements
										password={passwordData.new_password}
										confirmPassword={passwordData.confirm_new_password}
										showMatchRequirement={true}
									/>
								</div>

								<div>
									<label
										htmlFor="confirm-password"
										className="text-text-primary mb-2 block font-medium"
									>
										Confirm New Password
									</label>
									<div className="relative">
										<input
											id="confirm-password"
											type={showPasswords.confirm ? "text" : "password"}
											value={passwordData.confirm_new_password}
											onChange={e =>
												setPasswordData({
													...passwordData,
													confirm_new_password: e.target.value
												})
											}
											className="border-layout-background focus:border-interactive w-full rounded-md border p-3 pr-12 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										/>
										<button
											type="button"
											onClick={() => togglePasswordVisibility("confirm")}
											className="hover:text-text-primary absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-500"
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

								<div className="border-layout-background flex justify-end gap-4 border-t pt-4">
									<button
										type="button"
										onClick={handleCancelPasswordChange}
										className="border-layout-background bg-content-background text-text-primary hover:border-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-base font-medium no-underline transition-all duration-200"
									>
										Cancel
									</button>
									<button
										type="submit"
										className="bg-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border-none px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200"
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
										<span className="text-text-primary text-sm">Last changed: Recent</span>
									</div>
								</div>

								<div>
									<div className="mb-1 block text-sm font-medium text-gray-500">Security Status</div>
									<div className="flex items-center gap-2">
										<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-sm font-medium text-green-800">
											<span>🛡️</span>
											Secure
										</span>
										<span className="text-text-primary text-sm">
											Your account meets all security requirements
										</span>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</TabPanel>
		</main>
	);
};

export default ProfilePage;
