import React from "react";
import { AuthService } from "../services/AuthService";

interface PasswordRequirementsProps {
	password: string;
	confirmPassword?: string;
	showMatchRequirement?: boolean;
}

const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
	password,
	confirmPassword,
	showMatchRequirement = false
}) => {
	if (!password) return null;

	const validation = AuthService.validatePassword(password, confirmPassword);

	return (
		<div className="mt-2 space-y-1 text-xs">
			<div className={validation.requirements.length ? "text-success" : "text-error"}>
				✓ At least 8 characters
			</div>
			<div className={validation.requirements.uppercase ? "text-success" : "text-error"}>
				✓ One uppercase letter
			</div>
			<div className={validation.requirements.lowercase ? "text-success" : "text-error"}>
				✓ One lowercase letter
			</div>
			<div className={validation.requirements.number ? "text-success" : "text-error"}>✓ One number</div>
			<div className={validation.requirements.symbol ? "text-success" : "text-error"}>
				✓ One special character
			</div>
			{showMatchRequirement && confirmPassword !== undefined && (
				<div className={validation.requirements.match ? "text-success" : "text-error"}>✓ Passwords match</div>
			)}
		</div>
	);
};

export default PasswordRequirements;
