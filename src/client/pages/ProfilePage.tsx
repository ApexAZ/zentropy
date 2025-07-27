import React, { useState, useEffect, useCallback } from "react";
import type { User, ProfileUpdateData } from "../types";
import { formatDate, getRoleLabel, getRoleBadgeColor } from "../utils/formatters";
import { UserService } from "../services/UserService";
import { TabList, Tab, TabPanel } from "../components/atoms/Tab";
import { SignInMethods } from "../components/SignInMethods";
import { useToast } from "../contexts/ToastContext";
import { useAccountSecurity } from "../hooks/useAccountSecurity";

const ProfilePage: React.FC = () => {
	// State management
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>("");
	const [isEditingProfile, setIsEditingProfile] = useState(false);

	// Toast notifications
	const { showSuccess, showError } = useToast();

	// Form states
	const [profileData, setProfileData] = useState<ProfileUpdateData>({
		first_name: "",
		last_name: "",
		email: "",
		phone_number: ""
	});

	const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

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
						email: userData.email,
						phone_number: userData.phone_number || ""
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
	const retryLoadProfile = useCallback(async (): Promise<void> => {
		try {
			setIsLoading(true);
			setError("");

			const userData = await UserService.getCurrentUser();
			setUser(userData);
			setProfileData({
				first_name: userData.first_name,
				last_name: userData.last_name,
				email: userData.email,
				phone_number: userData.phone_number || ""
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load profile");
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Security data hook (after retryLoadProfile is defined)
	const {
		securityStatus,
		loading: securityLoading,
		loadSecurityStatus
	} = useAccountSecurity({
		onSecurityUpdate: retryLoadProfile,
		onError: showError
	});

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
				email: user.email,
				phone_number: user.phone_number || ""
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

	if (isLoading) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between px-8">
					<div>
						<h2 className="text-text-contrast font-heading-large m-0">My Profile</h2>
						<p className="text-text-primary font-body mt-2">
							Manage your account information and security settings
						</p>
					</div>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center px-8 text-center">
					<div className="border-layout-background border-t-interactive mb-4 h-10 w-10 animate-spin rounded-full border-4"></div>
					<p className="text-text-primary mb-4">Loading profile...</p>
				</div>
			</main>
		);
	}

	if (error) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between px-8">
					<div>
						<h2 className="text-text-contrast font-heading-large m-0">My Profile</h2>
						<p className="text-text-primary font-body mt-2">
							Manage your account information and security settings
						</p>
					</div>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center px-8 text-center">
					<div>
						<h3 className="text-error font-heading-medium mb-3">Unable to Load Profile</h3>
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
			<div className="mb-8 flex items-center justify-between px-8">
				<div>
					<h2 className="text-text-contrast font-heading-large m-0">My Profile</h2>
					<p className="text-text-primary font-body mt-2">
						Manage your account information and security settings
					</p>
				</div>
			</div>

			{/* Tab Navigation */}
			<div className="px-8">
				<TabList activeTab={activeTab} onTabChange={setActiveTab} className="mb-8">
					<Tab id="profile" label="Profile" isActive={activeTab === "profile"} onClick={setActiveTab} />
					<Tab id="security" label="Security" isActive={activeTab === "security"} onClick={setActiveTab} />
				</TabList>
			</div>

			{/* Profile Tab */}
			<TabPanel tabId="profile" activeTab={activeTab}>
				<div className="space-y-8 px-8">
					{/* Profile Information Section */}
					<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
						<div className="mb-6 flex max-w-2xl flex-col items-start gap-4 sm:flex-row sm:items-center">
							<h3 className="text-text-contrast font-heading-medium">Profile Information</h3>
							{!isEditingProfile && (
								<button
									onClick={handleEditProfile}
									className="border-layout-background bg-content-background text-text-primary hover:border-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-sm font-medium no-underline transition-all duration-200 sm:ml-[116px]"
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
											className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
										/>
										{profileErrors.first_name && (
											<span className="text-error mt-1 block text-sm">
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
											className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
										/>
										{profileErrors.last_name && (
											<span className="text-error mt-1 block text-sm">
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
										className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
									/>
									{profileErrors.email && (
										<span className="text-error mt-1 block text-sm">{profileErrors.email}</span>
									)}
								</div>

								<div>
									<label htmlFor="profile-phone" className="text-text-primary mb-2 block font-medium">
										Phone Number <span className="text-neutral">(optional)</span>
									</label>
									<input
										id="profile-phone"
										type="tel"
										value={profileData.phone_number || ""}
										onChange={e => setProfileData({ ...profileData, phone_number: e.target.value })}
										placeholder="e.g., +1 (555) 123-4567"
										className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
									/>
									{profileErrors.phone_number && (
										<span className="text-error mt-1 block text-sm">
											{profileErrors.phone_number}
										</span>
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
							<div className="grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
								<div>
									<div className="text-text-primary font-interface mb-1 block">Full Name</div>
									<div className="text-text-contrast">
										{user.first_name} {user.last_name}
									</div>
								</div>

								<div>
									<div className="text-text-primary font-interface mb-1 block">Email Address</div>
									<div className="text-text-contrast">{user.email}</div>
								</div>

								<div>
									<div className="text-text-primary font-interface mb-1 block">Phone Number</div>
									<div className="text-text-contrast">{user.phone_number || "Not provided"}</div>
								</div>

								<div>
									<div className="text-text-primary font-interface mb-1 block">Organization</div>
									<div className="text-text-contrast">
										{user.organization_id ? "Organization Member" : "Individual Account"}
									</div>
								</div>

								<div>
									<div className="text-text-primary font-interface mb-1 block">Role</div>
									<div className="flex items-center gap-2">
										<span className="text-text-contrast">{getRoleLabel(user.role)}</span>
										<span
											className={`rounded-full px-2 py-1 text-xs font-medium ${getRoleBadgeColor(user.role)}`}
										>
											{getRoleLabel(user.role)}
										</span>
									</div>
								</div>

								<div>
									<div className="text-text-primary font-interface mb-1 block">Member Since</div>
									<div className="text-text-contrast">
										{user.created_at ? formatDate(user.created_at, "long") : "N/A"}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</TabPanel>

			{/* Security Tab */}
			<TabPanel tabId="security" activeTab={activeTab}>
				<div className="space-y-8 px-8">
					{securityLoading ? (
						<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
							<div className="border-layout-background border-t-interactive mb-4 h-10 w-10 animate-spin rounded-full border-4"></div>
							<p className="text-text-primary mb-4">Loading security information...</p>
						</div>
					) : securityStatus ? (
						<SignInMethods
							securityStatus={securityStatus}
							onSecurityUpdate={loadSecurityStatus}
							onError={showError}
						/>
					) : (
						<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
							<div>
								<h3 className="text-error mb-3 text-xl font-semibold">
									Unable to Load Security Information
								</h3>
								<p className="text-text-primary mb-6">Failed to load account security details</p>
								<button
									onClick={() => void retryLoadProfile()}
									className="border-layout-background bg-content-background text-text-primary hover:border-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-base font-medium no-underline transition-all duration-200"
								>
									Retry
								</button>
							</div>
						</div>
					)}
				</div>
			</TabPanel>
		</main>
	);
};

export default ProfilePage;
