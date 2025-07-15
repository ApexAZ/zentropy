import React from "react";

interface SkeletonProps {
	/** Height of the skeleton element */
	height?: string;
	/** Width of the skeleton element */
	width?: string;
	/** Whether to display as a circle (for avatars, icons) */
	circle?: boolean;
	/** Number of skeleton lines to display */
	lines?: number;
	/** Spacing between skeleton lines */
	lineSpacing?: string;
	/** Custom className for styling */
	className?: string;
}

/**
 * Skeleton Loading Component
 *
 * Provides skeleton loading states following the established design system.
 * Uses semantic colors from the design system for consistent appearance.
 */
const Skeleton: React.FC<SkeletonProps> = ({
	height = "h-4",
	width = "w-full",
	circle = false,
	lines = 1,
	lineSpacing = "space-y-2",
	className = ""
}) => {
	const baseClasses = "bg-neutral-background animate-pulse rounded-md";
	const shapeClasses = circle ? "rounded-full" : "rounded-md";
	const allClasses = [baseClasses, shapeClasses, height, width, className].filter(Boolean).join(" ");

	if (lines === 1) {
		return <div className={allClasses} role="status" aria-label="Loading content" />;
	}

	return (
		<div className={lineSpacing} role="status" aria-label="Loading content">
			{Array.from({ length: lines }, (_, index) => (
				<div key={index} className={allClasses} />
			))}
		</div>
	);
};

export default Skeleton;
