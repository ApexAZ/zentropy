import React, { useState, useEffect } from "react";

interface Team {
	id: string;
	name: string;
	description?: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
	created_at: string;
	updated_at: string;
}

interface DashboardStats {
	total_teams: number;
	total_members: number;
	active_sprints: number;
	upcoming_pto: number;
}

const DashboardPage: React.FC = () => {
	const [teams, setTeams] = useState<Team[]>([]);
	const [stats, setStats] = useState<DashboardStats>({
		total_teams: 0,
		total_members: 0,
		active_sprints: 0,
		upcoming_pto: 0
	});
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>("");

	useEffect(() => {
		void loadDashboardData();
	}, []);

	const loadDashboardData = async (): Promise<void> => {
		try {
			setIsLoading(true);
			setError("");

			// Load teams and calculate stats
			const teamsResponse = await fetch("/api/teams");
			if (!teamsResponse.ok) {
				throw new Error("Failed to load dashboard data");
			}

			const teamsData = (await teamsResponse.json()) as Team[];
			setTeams(teamsData);

			// Calculate basic stats
			setStats({
				total_teams: teamsData.length,
				total_members: 0, // Would need to fetch from API
				active_sprints: 0, // Would need to implement sprint tracking
				upcoming_pto: 0 // Would need to fetch from calendar API
			});
		} catch (err) {
			// console.error('Error loading dashboard data:', err)
			setError(err instanceof Error ? err.message : "Failed to load dashboard");
		} finally {
			setIsLoading(false);
		}
	};

	const formatDate = (dateString: string): string => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	};

	const getVelocityStatus = (velocity: number): { label: string; color: string } => {
		if (velocity === 0) {
			return { label: "Not Set", color: "text-gray-500" };
		}
		if (velocity < 20) {
			return { label: "Low", color: "text-orange-600" };
		}
		if (velocity < 40) {
			return { label: "Medium", color: "text-blue-600" };
		}
		return { label: "High", color: "text-green-600" };
	};

	if (isLoading) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="m-0 text-3xl font-semibold text-gray-800">Dashboard</h2>
						<p className="mt-2 text-gray-600">Overview of your teams and capacity planning</p>
					</div>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
					<p className="mb-4 text-gray-600">Loading dashboard...</p>
				</div>
			</main>
		);
	}

	if (error) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="m-0 text-3xl font-semibold text-gray-800">Dashboard</h2>
						<p className="mt-2 text-gray-600">Overview of your teams and capacity planning</p>
					</div>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div>
						<h3 className="mb-3 text-xl font-semibold text-red-600">Unable to Load Dashboard</h3>
						<p className="mb-6 text-gray-600">{error}</p>
						<button
							onClick={() => void loadDashboardData()}
							className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-base font-medium text-gray-700 no-underline transition-all duration-200 hover:border-gray-400 hover:bg-gray-50"
						>
							Retry
						</button>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="w-full py-8">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h2 className="m-0 text-3xl font-semibold text-gray-800">Dashboard</h2>
					<p className="mt-2 text-gray-600">Overview of your teams and capacity planning</p>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Total Teams</p>
							<p className="text-2xl font-bold text-gray-900">{stats.total_teams}</p>
						</div>
						<div className="rounded-full bg-blue-100 p-3">
							<svg
								className="h-6 w-6 text-blue-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
						</div>
					</div>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Team Members</p>
							<p className="text-2xl font-bold text-gray-900">{stats.total_members}</p>
						</div>
						<div className="rounded-full bg-green-100 p-3">
							<svg
								className="h-6 w-6 text-green-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
						</div>
					</div>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Active Sprints</p>
							<p className="text-2xl font-bold text-gray-900">{stats.active_sprints}</p>
						</div>
						<div className="rounded-full bg-purple-100 p-3">
							<svg
								className="h-6 w-6 text-purple-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
						</div>
					</div>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Upcoming PTO</p>
							<p className="text-2xl font-bold text-gray-900">{stats.upcoming_pto}</p>
						</div>
						<div className="rounded-full bg-orange-100 p-3">
							<svg
								className="h-6 w-6 text-orange-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>

			{/* Teams Overview */}
			<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<h3 className="mb-6 text-xl font-semibold text-gray-800">Teams Overview</h3>

				{teams.length === 0 ? (
					<div className="p-8 text-center text-gray-500">
						<p className="mb-4">No teams found. Create your first team to get started.</p>
						<button className="inline-flex cursor-pointer items-center gap-2 rounded-md border-none bg-blue-500 px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200 hover:bg-blue-600">
							Create Team
						</button>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
										Team Name
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
										Velocity
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
										Sprint Length
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
										Working Days
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
										Created
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 bg-white">
								{teams.map(team => {
									const velocityStatus = getVelocityStatus(team.velocity_baseline);
									return (
										<tr key={team.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap">
												<div>
													<div className="text-sm font-medium text-gray-900">{team.name}</div>
													{team.description && (
														<div className="text-sm text-gray-500">{team.description}</div>
													)}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="flex items-center">
													<span className="text-sm text-gray-900">
														{team.velocity_baseline > 0
															? team.velocity_baseline
															: "Not set"}
													</span>
													<span className={`ml-2 text-xs ${velocityStatus.color}`}>
														({velocityStatus.label})
													</span>
												</div>
											</td>
											<td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
												{team.sprint_length_days} days
											</td>
											<td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
												{team.working_days_per_week} days/week
											</td>
											<td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
												{formatDate(team.created_at)}
											</td>
											<td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
												<button className="mr-4 text-blue-600 hover:text-blue-900">
													View Details
												</button>
												<button className="text-gray-600 hover:text-gray-900">Configure</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Quick Actions */}
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<h4 className="mb-4 text-lg font-semibold text-gray-800">Quick Actions</h4>
					<div className="space-y-3">
						<button className="w-full rounded-md px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50">
							+ Create New Team
						</button>
						<button className="w-full rounded-md px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50">
							📅 Add Calendar Entry
						</button>
						<button className="w-full rounded-md px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50">
							⚡ Start Sprint Planning
						</button>
					</div>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<h4 className="mb-4 text-lg font-semibold text-gray-800">Recent Activity</h4>
					<div className="space-y-3 text-sm text-gray-600">
						<p>No recent activity to display.</p>
					</div>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<h4 className="mb-4 text-lg font-semibold text-gray-800">System Status</h4>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-sm text-gray-600">Database</span>
							<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
								<span className="h-2 w-2 rounded-full bg-green-500"></span>
								Connected
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-gray-600">API</span>
							<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
								<span className="h-2 w-2 rounded-full bg-green-500"></span>
								Operational
							</span>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
};

export default DashboardPage;
