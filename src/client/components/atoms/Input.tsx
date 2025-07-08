import React from "react";
import RequiredAsterisk from "../RequiredAsterisk";

interface Option {
	value: string | number;
	label: string;
}

interface BaseInputProps {
	label: string;
	error?: string | undefined;
	helper?: string | undefined;
	required?: boolean;
	multiline?: boolean;
	options?: Option[];
	className?: string;
}

interface TextInputProps extends BaseInputProps, React.InputHTMLAttributes<HTMLInputElement> {
	multiline?: false;
	options?: never;
}

interface TextareaProps extends BaseInputProps, React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	multiline: true;
	options?: never;
}

interface SelectProps extends BaseInputProps, React.SelectHTMLAttributes<HTMLSelectElement> {
	multiline?: false;
	options: Option[];
}

type InputProps = TextInputProps | TextareaProps | SelectProps;

const Input: React.FC<InputProps> = ({
	label,
	error,
	helper,
	required = false,
	multiline = false,
	options,
	className = "",
	id,
	...props
}) => {
	// Auto-generate ID from label if not provided
	const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

	const baseClasses =
		"border-layout-background bg-content-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(106,139,167,0.2)] focus:outline-none";
	const disabledClasses = props.disabled ? "opacity-50" : "";
	const errorClasses = error ? "border-red-500" : "";

	const inputClasses = [baseClasses, disabledClasses, errorClasses, className].filter(Boolean).join(" ");

	const renderInput = () => {
		if (options) {
			// Select input
			return (
				<select
					id={inputId}
					className={inputClasses}
					{...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
				>
					{options.map(option => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			);
		} else if (multiline) {
			// Textarea input
			return (
				<textarea
					id={inputId}
					className={`${inputClasses} resize-vertical min-h-[80px]`}
					{...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
				/>
			);
		} else {
			// Text/number/email/password input
			return (
				<input
					id={inputId}
					type="text"
					className={inputClasses}
					{...(props as React.InputHTMLAttributes<HTMLInputElement>)}
				/>
			);
		}
	};

	return (
		<div className="mb-6">
			<label htmlFor={inputId} className="text-text-primary mb-2 block font-medium">
				{label}
				<RequiredAsterisk isEmpty={!props.value || String(props.value).trim() === ""} isRequired={required} />
			</label>

			{renderInput()}

			{helper && <small className="text-text-primary mt-1 block text-sm">{helper}</small>}

			{error && <span className="mt-1 block text-sm text-red-500">{error}</span>}
		</div>
	);
};

export default Input;
