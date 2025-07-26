import { useState, useCallback, useEffect } from "react";
import Button from "./atoms/Button";
import Input from "./atoms/Input";

interface EmergencyContact {
	email: string;
	description: string;
}

interface EnhancedConfirmationModalProps {
	/** Whether the modal is open */
	isOpen: boolean;
	/** Callback when modal is closed */
	onClose: () => void;
	/** Callback when action is confirmed */
	onConfirm: (password?: string) => void;
	/** Whether the confirmation is in progress */
	loading: boolean;
	/** Modal title */
	title: string;
	/** Main confirmation message */
	message: string;
	/** Type of action being confirmed */
	actionType?: "normal" | "destructive" | "critical";
	/** Text for the confirm button */
	confirmText: string;
	/** Text for the cancel button */
	cancelText?: string;
	/** Loading text to show during confirmation */
	loadingText?: string;
	/** Whether password confirmation is required */
	requiresPasswordConfirmation?: boolean;
	/** Password verification error */
	passwordError?: string;
	/** Description of the impact/consequences */
	impactDescription?: string;
	/** List of consequences */
	consequences?: string[];
	/** Recovery guidance for the user */
	recoveryGuidance?: string;
	/** Emergency contact information */
	emergencyContact?: EmergencyContact;
}

/**
 * Enhanced Confirmation Modal Component
 *
 * Provides detailed confirmation dialogs for security-sensitive actions with
 * impact descriptions, recovery guidance, and optional password verification.
 */
export function EnhancedConfirmationModal({
	isOpen,
	onClose,
	onConfirm,
	loading,
	title,
	message,
	actionType = "normal",
	confirmText,
	cancelText = "Cancel",
	loadingText,
	requiresPasswordConfirmation = false,
	passwordError,
	impactDescription,
	consequences,
	recoveryGuidance,
	emergencyContact
}: EnhancedConfirmationModalProps) {
	const [password, setPassword] = useState("");
	const [validationError, setValidationError] = useState("");

	// Clear form state when modal closes/opens
	useEffect(() => {
		if (isOpen) {
			setPassword("");
			setValidationError("");
		}
	}, [isOpen]);

	// Clear validation error when user types
	useEffect(() => {
		if (password.trim() && validationError) {
			setValidationError("");
		}
	}, [password, validationError]);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();

			if (requiresPasswordConfirmation) {
				if (!password.trim()) {
					setValidationError("Password is required to confirm this action");
					return;
				}
				onConfirm(password);
			} else {
				onConfirm();
			}
		},
		[password, onConfirm, requiresPasswordConfirmation]
	);

	const handleClose = useCallback(() => {
		setPassword("");
		setValidationError("");
		onClose();
	}, [onClose]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Escape") {
				handleClose();
			}
		},
		[handleClose]
	);

	if (!isOpen) return null;

	// Determine modal styling based on action type
	const modalStyles = {
		normal: "border-interactive",
		destructive: "border-warning",
		critical: "border-error"
	};

	const confirmButtonVariant = {
		normal: "primary" as const,
		destructive: "danger" as const,
		critical: "danger" as const
	};

	const titleId = "enhanced-confirmation-title";
	const descriptionId = "enhanced-confirmation-description";

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div
				role="dialog"
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
				className={`bg-content-background mx-4 w-full max-w-lg rounded-lg border-2 p-6 ${modalStyles[actionType]}`}
				onKeyDown={handleKeyDown}
			>
				{/* Header */}
				<div className="mb-4">
					<h3 id={titleId} className="text-text-contrast font-heading-small mb-2">
						{title}
					</h3>
					<p id={descriptionId} className="text-text-primary font-body">
						{message}
					</p>
				</div>

				{/* Impact Description and Consequences */}
				{(impactDescription || consequences) && (
					<div className="bg-warning-light border-warning mb-4 rounded-md border p-4">
						{impactDescription && <p className="text-warning-dark mb-2 font-medium">{impactDescription}</p>}
						{consequences && consequences.length > 0 && (
							<ul className="text-warning-dark space-y-1 text-sm">
								{consequences.map((consequence, index) => (
									<li key={index} className="flex items-start space-x-2">
										<span className="text-warning mt-0.5">•</span>
										<span>{consequence}</span>
									</li>
								))}
							</ul>
						)}
					</div>
				)}

				{/* Recovery Guidance */}
				{recoveryGuidance && (
					<div className="bg-interactive-light border-interactive mb-4 rounded-md border p-4">
						<h4 className="text-interactive-dark mb-2 font-medium">Recovery Information</h4>
						<p className="text-interactive-dark text-sm">{recoveryGuidance}</p>
					</div>
				)}

				{/* Emergency Contact */}
				{emergencyContact && (
					<div className="bg-error-light border-error mb-4 rounded-md border p-4">
						<h4 className="text-error-dark mb-2 font-medium">Emergency Contact</h4>
						<p className="text-error-dark text-sm">
							<strong>{emergencyContact.email}</strong>
						</p>
						<p className="text-error-dark text-xs">{emergencyContact.description}</p>
					</div>
				)}

				{/* Password Confirmation Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					{requiresPasswordConfirmation && (
						<div>
							<p className="text-secondary mb-2 text-sm">Enter your password to confirm this action</p>
							<Input
								label="Password"
								type="password"
								value={password}
								onChange={e => setPassword(e.target.value)}
								error={validationError || passwordError || undefined}
								required
								autoFocus
							/>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex justify-end gap-3 pt-2">
						<Button variant="secondary" onClick={handleClose} disabled={loading}>
							{cancelText}
						</Button>
						<Button
							type="submit"
							variant={confirmButtonVariant[actionType]}
							isLoading={loading}
							{...(loadingText && { loadingText })}
							disabled={loading}
							autoFocus={!requiresPasswordConfirmation}
						>
							{confirmText}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
