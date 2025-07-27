import React, { useState, useCallback } from "react";
import Button from "./atoms/Button";
import Input from "./atoms/Input";
import Form from "./atoms/Form";

interface PasswordConfirmationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (password: string) => void;
	loading: boolean;
	error: string | null;
}

/**
 * Password Confirmation Modal Component
 *
 * Reusable modal for password confirmation on destructive security actions.
 * Follows atomic design patterns with proper form validation and accessibility.
 */
export function PasswordConfirmationModal({
	isOpen,
	onClose,
	onConfirm,
	loading,
	error
}: PasswordConfirmationModalProps) {
	const [password, setPassword] = useState("");
	const [validationError, setValidationError] = useState("");

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();

			if (!password.trim()) {
				setValidationError("Password is required");
				return;
			}

			setValidationError("");
			onConfirm(password);
		},
		[password, onConfirm]
	);

	const handleClose = useCallback(() => {
		setPassword("");
		setValidationError("");
		onClose();
	}, [onClose]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div
				role="dialog"
				aria-labelledby="password-confirmation-title"
				className="bg-content-background mx-4 w-full max-w-md rounded-lg p-6"
			>
				<h3 id="password-confirmation-title" className="text-text-contrast font-heading-small mb-4">
					Confirm Password
				</h3>
				<p className="text-text-primary font-body mb-4">
					Please enter your password to unlink your Google account.
				</p>

				<Form onSubmit={handleSubmit} isSubmitting={loading} error={validationError || error || null}>
					<Input
						label="Password"
						type="password"
						value={password}
						onChange={e => setPassword(e.target.value)}
						required
						autoFocus
					/>

					<div className="flex justify-end gap-2">
						<Button variant="secondary" onClick={handleClose} disabled={loading}>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="danger"
							isLoading={loading}
							loadingText="Unlinking..."
							disabled={loading}
						>
							Unlink Account
						</Button>
					</div>
				</Form>
			</div>
		</div>
	);
}
