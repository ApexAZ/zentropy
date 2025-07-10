import React, { useState, useEffect, useCallback, useRef } from "react";
import { useOrganization } from "../hooks/useOrganization";
import { useFormValidation } from "../hooks/useFormValidation";
import type { Organization, CreateOrganizationData, DomainCheckResult } from "../types";
import RequiredAsterisk from "./RequiredAsterisk";

interface OrganizationSelectorProps {
	isOpen: boolean;
	onClose: () => void;
	onSelect: (organization: Organization | null) => void;
	userEmail: string;
	allowCreate?: boolean;
	allowPersonal?: boolean;
	mode?: "select" | "join";
}

interface CreateOrgFormData {
	name: string;
	description: string;
	max_users: number;
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
	isOpen,
	onClose,
	onSelect,
	userEmail,
	allowCreate = true,
	allowPersonal = true
}) => {
	const {
		organizations,
		isLoading,
		error,
		toast,
		setToast,
		checkDomain,
		loadOrganizations,
		createOrganization,
		joinOrganization
	} = useOrganization();

	const [showCreateForm, setShowCreateForm] = useState(false);
	const [domainCheckResult, setDomainCheckResult] = useState<DomainCheckResult | null>(null);
	const [domainCheckLoading, setDomainCheckLoading] = useState(false);
	const [domainCheckError, setDomainCheckError] = useState<string>("");
	const [searchTerm, setSearchTerm] = useState("");
	const dialogRef = useRef<HTMLDivElement>(null);

	// Extract domain from email
	const extractDomain = (email: string): string => {
		const parts = email.split("@");
		return parts.length > 1 ? parts[1] || "" : "";
	};

	const domain = extractDomain(userEmail) || "";

	// Create organization form
	const createOrgForm = useFormValidation<CreateOrgFormData>({
		initialValues: {
			name: "",
			description: "",
			max_users: 50
		},
		validate: data => {
			const errors: Record<string, string> = {};

			if (!data.name.trim()) {
				errors.name = "Organization name is required";
			} else if (data.name.length > 100) {
				errors.name = "Organization name must be less than 100 characters";
			}

			if (data.description && data.description.length > 500) {
				errors.description = "Description must be less than 500 characters";
			}

			if (data.max_users < 1) {
				errors.max_users = "Maximum users must be at least 1";
			} else if (data.max_users > 1000) {
				errors.max_users = "Maximum users cannot exceed 1000";
			}

			return {
				isValid: Object.keys(errors).length === 0,
				errors
			};
		},
		onSubmit: async values => {
			const orgData: CreateOrganizationData = {
				name: values.name.trim(),
				description: values.description.trim(),
				domain,
				scope: "shared",
				max_users: values.max_users
			};

			await createOrganization(orgData);

			// Reset form and close create mode
			setShowCreateForm(false);
			createOrgForm.resetForm();

			// Reload organizations to show the new one
			await loadOrganizations();
		}
	});

	const performDomainCheck = useCallback(async () => {
		try {
			setDomainCheckLoading(true);
			setDomainCheckError("");

			const result = await checkDomain(userEmail);
			setDomainCheckResult(result);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Domain check failed";
			setDomainCheckError(errorMessage);
		} finally {
			setDomainCheckLoading(false);
		}
	}, [checkDomain, userEmail]);

	// Domain check on mount
	useEffect(() => {
		if (isOpen && userEmail) {
			performDomainCheck();
		}
	}, [isOpen, userEmail, performDomainCheck]);

	// Load organizations on mount
	useEffect(() => {
		if (isOpen) {
			loadOrganizations();
		}
	}, [isOpen, loadOrganizations]);

	// Focus dialog when opened
	useEffect(() => {
		if (isOpen && dialogRef.current) {
			dialogRef.current.focus();
		}
	}, [isOpen]);

	// Handle keyboard navigation
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		},
		[onClose]
	);

	// Handle backdrop click
	const handleBackdropClick = useCallback(
		(event: React.MouseEvent) => {
			if (event.target === event.currentTarget) {
				onClose();
			}
		},
		[onClose]
	);

	// Filter organizations based on search
	const filteredOrganizations = organizations.filter(
		org =>
			org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(org.description && org.description.toLowerCase().includes(searchTerm.toLowerCase()))
	);

	// Handle organization selection
	const handleOrganizationSelect = useCallback(
		(organization: Organization) => {
			onSelect(organization);
			onClose();
		},
		[onSelect, onClose]
	);

	// Handle personal project selection
	const handlePersonalSelect = useCallback(() => {
		onSelect(null);
		onClose();
	}, [onSelect, onClose]);

	// Handle organization joining
	const handleJoinOrganization = useCallback(
		async (organizationId: string) => {
			try {
				await joinOrganization(organizationId);
				// Reload organizations to reflect membership
				await loadOrganizations();
			} catch {
				// Error is handled by the hook's toast system
			}
		},
		[joinOrganization, loadOrganizations]
	);

	// Handle organization creation
	const handleCreateOrganization = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			await createOrgForm.handleSubmit(e);
		} catch {
			// Error is handled by the hook's toast system
		}
	};

	const handleRetry = useCallback(() => {
		performDomainCheck();
		loadOrganizations();
	}, [performDomainCheck, loadOrganizations]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onClick={handleBackdropClick}
			data-testid="modal-backdrop"
		>
			<div
				ref={dialogRef}
				className="bg-content-background max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg shadow-xl"
				role="dialog"
				aria-labelledby="org-selector-title"
				aria-describedby="org-selector-description"
				onKeyDown={handleKeyDown}
				tabIndex={-1}
			>
				<div className="p-6">
					{/* Header */}
					<div className="mb-6 flex items-center justify-between">
						<div>
							<h2 id="org-selector-title" className="text-text-primary text-2xl font-bold">
								Select Organization
							</h2>
							<p id="org-selector-description" className="text-text-primary/70 mt-1">
								Choose an organization for your project
							</p>
						</div>
						<button
							onClick={onClose}
							className="text-text-primary/50 hover:text-text-primary"
							aria-label="Close"
						>
							✕
						</button>
					</div>

					{/* Toast notification */}
					{toast && (
						<div
							className={`mb-4 flex items-center justify-between rounded-lg p-3 ${
								toast.type === "success"
									? "bg-success-background text-success"
									: "bg-error-background text-error"
							}`}
						>
							<span>{toast.message}</span>
							<button
								onClick={() => setToast(null)}
								className="ml-4 text-sm underline"
								aria-label="Dismiss"
							>
								Dismiss
							</button>
						</div>
					)}

					{/* Error Display */}
					{error && (
						<div className="bg-error-background text-error mb-4 rounded-lg p-3">
							<p>{error}</p>
							<button onClick={handleRetry} className="mt-2 text-sm underline" aria-label="Retry">
								Retry
							</button>
						</div>
					)}

					{/* Domain Check Results */}
					{domainCheckLoading && (
						<div className="mb-4 rounded-lg bg-blue-100 p-3 text-blue-800">Checking domain...</div>
					)}

					{domainCheckError && (
						<div className="bg-error-background text-error mb-4 rounded-lg p-3">
							<p>{domainCheckError}</p>
							<button onClick={handleRetry} className="mt-2 text-sm underline" aria-label="Retry">
								Retry
							</button>
						</div>
					)}

					{domainCheckResult?.domain_found && domainCheckResult.organization && (
						<div className="bg-neutral-background mb-6 rounded-lg p-4">
							<h3 className="text-text-contrast font-semibold">
								Organization Found for {domainCheckResult.domain}
							</h3>
							<div className="mt-2">
								<p className="text-blue-800">{domainCheckResult.organization.name}</p>
								<p className="text-text-primary text-sm">{domainCheckResult.suggestions.message}</p>
							</div>
							{domainCheckResult.suggestions.can_join && (
								<button
									onClick={() => handleJoinOrganization(domainCheckResult.organization!.id)}
									disabled={isLoading}
									className="bg-interactive hover:bg-interactive-hover mt-3 rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
									aria-label={`Join ${domainCheckResult.organization.name}`}
								>
									Join {domainCheckResult.organization.name}
								</button>
							)}
						</div>
					)}

					{/* Create Organization Form */}
					{showCreateForm ? (
						<div className="mb-6">
							<h3 className="text-text-primary mb-4 text-lg font-semibold">Create Organization</h3>
							<form onSubmit={handleCreateOrganization} className="space-y-4">
								<div>
									<label className="text-text-primary mb-1 block text-sm font-medium">
										Organization Name{" "}
										<RequiredAsterisk
											isEmpty={!createOrgForm.values.name.trim()}
											isRequired={true}
										/>
									</label>
									<input
										type="text"
										value={createOrgForm.values.name}
										onChange={e => createOrgForm.handleChange("name", e.target.value)}
										onBlur={() => createOrgForm.handleBlur("name")}
										className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
										disabled={isLoading}
										aria-label="Organization Name"
									/>
									{createOrgForm.touched.name && createOrgForm.errors.name && (
										<p className="text-error mt-1 text-sm" role="alert">
											{createOrgForm.errors.name}
										</p>
									)}
								</div>

								<div>
									<label className="text-text-primary mb-1 block text-sm font-medium">
										Description (Optional)
									</label>
									<textarea
										value={createOrgForm.values.description}
										onChange={e => createOrgForm.handleChange("description", e.target.value)}
										onBlur={() => createOrgForm.handleBlur("description")}
										className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
										rows={3}
										disabled={isLoading}
										aria-label="Description"
									/>
									{createOrgForm.touched.description && createOrgForm.errors.description && (
										<p className="text-error mt-1 text-sm" role="alert">
											{createOrgForm.errors.description}
										</p>
									)}
								</div>

								<div>
									<label className="text-text-primary mb-1 block text-sm font-medium">
										Maximum Users
									</label>
									<input
										type="number"
										value={createOrgForm.values.max_users}
										onChange={e =>
											createOrgForm.handleChange("max_users", parseInt(e.target.value) || 0)
										}
										onBlur={() => createOrgForm.handleBlur("max_users")}
										className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
										min="1"
										max="1000"
										disabled={isLoading}
									/>
									{createOrgForm.touched.max_users && createOrgForm.errors.max_users && (
										<p className="text-error mt-1 text-sm" role="alert">
											{createOrgForm.errors.max_users}
										</p>
									)}
								</div>

								<div className="flex gap-3">
									<button
										type="submit"
										disabled={isLoading || createOrgForm.isSubmitting}
										className="bg-interactive hover:bg-interactive-hover flex-1 rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
									>
										{isLoading || createOrgForm.isSubmitting
											? "Creating..."
											: "Create Organization"}
									</button>
									<button
										type="button"
										onClick={() => setShowCreateForm(false)}
										className="border-layout-background hover:bg-layout-background flex-1 rounded-lg border px-4 py-2 transition-colors"
									>
										Cancel
									</button>
								</div>
							</form>
						</div>
					) : (
						<>
							{/* Search */}
							<div className="mb-4">
								<input
									type="text"
									placeholder="Search organizations..."
									value={searchTerm}
									onChange={e => setSearchTerm(e.target.value)}
									className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
								/>
							</div>

							{/* Loading State */}
							{isLoading && (
								<div className="mb-4 rounded-lg bg-blue-100 p-3 text-center text-blue-800">
									Loading...
								</div>
							)}

							{/* Organizations List */}
							{!isLoading && (
								<div className="space-y-3">
									{/* Personal Option */}
									{allowPersonal && (
										<div className="border-layout-background rounded-lg border p-4">
											<div className="flex items-center justify-between">
												<div>
													<h3 className="text-text-primary font-semibold">Personal</h3>
													<p className="text-text-primary/70 text-sm">
														Create a personal project
													</p>
												</div>
												<button
													onClick={handlePersonalSelect}
													disabled={isLoading}
													className="bg-interactive hover:bg-interactive-hover rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
													aria-label="Create Personal Project"
												>
													Create Personal Project
												</button>
											</div>
										</div>
									)}

									{/* Available Organizations */}
									{filteredOrganizations.length > 0 ? (
										filteredOrganizations.map(org => (
											<div
												key={org.id}
												className="border-layout-background rounded-lg border p-4"
											>
												<div className="flex items-center justify-between">
													<div className="flex-1">
														<h3 className="text-text-primary font-semibold">{org.name}</h3>
														{org.description && (
															<p className="text-text-primary/70 text-sm">
																{org.description}
															</p>
														)}
														<div className="text-text-primary/60 mt-1 text-xs">
															{org.domain && <span>Domain: {org.domain}</span>}
															{org.max_users && (
																<span className="ml-3">Max: {org.max_users} users</span>
															)}
														</div>
													</div>
													<button
														onClick={() => handleOrganizationSelect(org)}
														disabled={isLoading}
														className="bg-interactive hover:bg-interactive-hover rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
														aria-label={`Select ${org.name}`}
													>
														Select {org.name}
													</button>
												</div>
											</div>
										))
									) : (
										<div className="text-text-primary/70 py-8 text-center">
											No organizations found
										</div>
									)}

									{/* Create Organization Option */}
									{allowCreate && (
										<div className="border-layout-background rounded-lg border p-4">
											<div className="flex items-center justify-between">
												<div>
													<h3 className="text-text-primary font-semibold">
														Create New Organization
													</h3>
													<p className="text-text-primary/70 text-sm">
														Start a new organization for your team
													</p>
												</div>
												<button
													onClick={() => setShowCreateForm(true)}
													disabled={isLoading}
													className="border-interactive text-interactive hover:bg-interactive rounded-lg border px-4 py-2 transition-colors hover:text-white disabled:opacity-50"
													aria-label="Create New Organization"
												>
													Create New Organization
												</button>
											</div>
										</div>
									)}
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default OrganizationSelector;
