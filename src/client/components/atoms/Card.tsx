import React from "react";

interface CardAction {
	/** Accessible label for the action button */
	label: string;
	/** Function called when action button is clicked */
	onClick: () => void;
	/** Icon character or emoji to display in the action button */
	icon: string;
}

interface CardDataItem {
	/** Display label for the data field */
	label: string;
	/** Value to display - can be text or React components */
	value: string | React.ReactNode;
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Optional card header title */
	title?: string | undefined;
	/** Optional subtitle text displayed below title */
	description?: string | undefined;
	/** Optional array of action buttons displayed in header */
	actions?: CardAction[];
	/** Optional array of key-value pairs to display as structured data */
	data?: CardDataItem[];
	/** Optional footer content displayed at bottom of card */
	footer?: React.ReactNode;
	/** Main card content */
	children?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
	title,
	description,
	actions,
	data,
	footer,
	className = "",
	children,
	...props
}) => {
	const baseClasses =
		"border-layout-background bg-content-background rounded-lg border p-6 shadow-sm transition-shadow hover:shadow-md";
	const cardClasses = [baseClasses, className].filter(Boolean).join(" ");

	const hasHeader = title || description || actions;

	return (
		<div className={cardClasses} {...props}>
			{hasHeader && (
				<div className="mb-4 flex items-start justify-between">
					<div>
						{title && <h3 className="text-text-contrast mb-2 text-lg font-semibold">{title}</h3>}
						{description && <p className="text-text-primary mb-3 text-sm">{description}</p>}
					</div>
					{actions && actions.length > 0 && (
						<div className="flex gap-2">
							{actions.map((action, index) => (
								<button
									key={index}
									onClick={action.onClick}
									className="text-text-primary hover:text-text-contrast p-2 transition-colors"
									title={action.label}
									aria-label={action.label}
								>
									{action.icon}
								</button>
							))}
						</div>
					)}
				</div>
			)}

			{children}

			{data && data.length > 0 && (
				<div className="space-y-2 text-sm">
					{data.map((item, index) => (
						<div key={index} className="flex justify-between">
							<span className="text-text-primary">{item.label}:</span>
							<span className="font-medium">{item.value}</span>
						</div>
					))}
				</div>
			)}

			{footer && <div className="mt-4">{footer}</div>}
		</div>
	);
};

export default Card;
