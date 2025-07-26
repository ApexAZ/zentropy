import React from "react";
import LoadingSpinner from "./LoadingSpinner";

type ButtonVariant = "primary" | "secondary" | "danger" | "icon";
type ButtonSize = "small" | "medium" | "large";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	/** Visual style variant of the button */
	variant?: ButtonVariant;
	/** Size of the button */
	size?: ButtonSize;
	/** When true, shows loading text and disables interaction */
	isLoading?: boolean;
	/** Text to display when button is in loading state */
	loadingText?: string;
	/** When true, button expands to fill container width */
	fullWidth?: boolean;
	/** Button content - text, icons, or other React elements */
	children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
	variant = "primary",
	size = "medium",
	isLoading = false,
	loadingText = "Loading...",
	fullWidth = false,
	className = "",
	disabled,
	children,
	...props
}) => {
	const baseClasses =
		"inline-flex cursor-pointer items-center gap-2 rounded-md text-center font-medium no-underline transition-all duration-200";

	const sizeClasses = {
		small: "px-3 py-1 text-xs gap-1",
		medium: "px-4 py-2 text-sm gap-2",
		large: "px-6 py-3 text-base gap-2"
	};

	const variantAndSizeClasses = {
		primary: {
			small: "bg-interactive hover:bg-interactive-hover border-none text-white hover:text-text-primary hover:-translate-y-px hover:shadow-md active:translate-y-0",
			medium: "bg-interactive hover:bg-interactive-hover border-none text-white hover:text-text-primary hover:-translate-y-px hover:shadow-md active:translate-y-0",
			large: "bg-interactive hover:bg-interactive-hover border-none text-white hover:text-text-primary hover:-translate-y-px hover:shadow-md active:translate-y-0"
		},
		secondary: {
			small: "border border-neutral-border bg-neutral-background text-text-primary hover:border-interactive hover:bg-interactive-hover hover:text-white",
			medium: "border border-neutral-border bg-neutral-background text-text-primary hover:border-interactive hover:bg-interactive-hover hover:text-white",
			large: "border border-neutral-border bg-neutral-background text-text-primary hover:border-interactive hover:bg-interactive-hover hover:text-white"
		},
		danger: {
			small: "border-none bg-error text-white hover:bg-error hover:opacity-90",
			medium: "border-none bg-error text-white hover:bg-error hover:opacity-90",
			large: "border-none bg-error text-white hover:bg-error hover:opacity-90"
		},
		icon: {
			small: "text-text-primary hover:text-text-contrast p-1 transition-colors",
			medium: "text-text-primary hover:text-text-contrast p-2 transition-colors",
			large: "text-text-primary hover:text-text-contrast p-3 transition-colors"
		}
	};

	const widthClasses = fullWidth ? "w-full" : "";
	const disabledClasses = disabled || isLoading ? "opacity-50" : "";

	const allClasses = [
		baseClasses,
		sizeClasses[size],
		variantAndSizeClasses[variant][size],
		widthClasses,
		disabledClasses,
		className
	]
		.filter(Boolean)
		.join(" ");

	return (
		<button className={allClasses} disabled={disabled || isLoading} {...props}>
			{isLoading ? <LoadingSpinner size="small" text={loadingText} /> : children}
		</button>
	);
};

export default Button;
