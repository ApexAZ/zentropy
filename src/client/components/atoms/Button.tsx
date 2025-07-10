import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	/** Visual style variant of the button */
	variant?: ButtonVariant;
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
	isLoading = false,
	loadingText = "Loading...",
	fullWidth = false,
	className = "",
	disabled,
	children,
	...props
}) => {
	const baseClasses =
		"inline-flex cursor-pointer items-center gap-2 rounded-md text-center text-base font-medium no-underline transition-all duration-200";

	const variantClasses = {
		primary:
			"bg-interactive hover:bg-interactive-hover border-none px-6 py-3 text-white hover:text-text-primary hover:-translate-y-px hover:shadow-md active:translate-y-0",
		secondary:
			"border-layout-background bg-content-background text-text-primary border px-4 py-2 hover:border-gray-400 hover:bg-gray-50",
		danger: "border-none bg-red-600 px-6 py-3 text-white hover:bg-red-700",
		icon: "text-text-primary hover:text-text-contrast p-2 transition-colors"
	};

	const widthClasses = fullWidth ? "w-full" : "";
	const disabledClasses = disabled || isLoading ? "opacity-50" : "";

	const allClasses = [baseClasses, variantClasses[variant], widthClasses, disabledClasses, className]
		.filter(Boolean)
		.join(" ");

	return (
		<button className={allClasses} disabled={disabled || isLoading} {...props}>
			{isLoading ? loadingText : children}
		</button>
	);
};

export default Button;
