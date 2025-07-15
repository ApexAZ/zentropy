import Skeleton from "./atoms/Skeleton";

/**
 * Security Status Skeleton Component
 *
 * Provides skeleton loading state that mirrors the actual security status display layout.
 * Used while loading account security information to provide immediate visual feedback.
 */
export function SecurityStatusSkeleton() {
	return (
		<div className="space-y-6">
			{/* Authentication Status Display Skeleton */}
			<div className="space-y-4">
				{/* Email Authentication Row */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Skeleton circle width="w-3" height="h-3" />
						<Skeleton width="w-32" height="h-4" />
					</div>
					<Skeleton width="w-16" height="h-6" />
				</div>

				{/* Google Authentication Row */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Skeleton circle width="w-3" height="h-3" />
						<Skeleton width="w-36" height="h-4" />
					</div>
					<Skeleton width="w-20" height="h-6" />
				</div>

				{/* Security Status Indicator */}
				<div className="mt-6 flex items-center justify-between">
					<Skeleton width="w-24" height="h-4" />
					<Skeleton width="w-28" height="h-6" />
				</div>

				{/* Security Tip */}
				<div className="mt-4">
					<Skeleton width="w-full" height="h-4" />
					<Skeleton width="w-3/4" height="h-4" className="mt-2" />
				</div>
			</div>

			{/* Security Actions Skeleton */}
			<div className="border-layout-background border-t pt-4">
				<Skeleton width="w-40" height="h-10" />
				<div className="mt-2">
					<Skeleton width="w-full" height="h-4" />
					<Skeleton width="w-2/3" height="h-4" className="mt-1" />
				</div>
			</div>
		</div>
	);
}
