import React from "react";
import RequiredAsterisk from "../RequiredAsterisk";

interface Option {
	/** The value to submit when this option is selected */
	value: string | number;
	/** Display text for this option */
	label: string;
}

interface BaseInputProps {
	/** Field label displayed above the input */
	label: string;
	/** Error message to display below input when validation fails */
	error?: string | undefined;
	/** Helper text displayed below input to guide user input */
	helper?: string | undefined;
	/** When true, displays required asterisk and adds validation */
	required?: boolean;
	/** When true, renders as textarea instead of single-line input */
	multiline?: boolean;
	/** Array of options for select dropdown - when provided, renders select element */
	options?: Option[];
	/** Additional CSS classes to apply to the input element */
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
		"border-layout-background bg-content-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-interactive focus:outline-none";
	const disabledClasses = props.disabled ? "opacity-50" : "";
	const errorClasses = error ? "border-error" : "";

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

			{error && <span className="text-error mt-1 block text-sm">{error}</span>}
		</div>
	);
};

export default Input;
