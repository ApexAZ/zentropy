import React, { useState, useEffect } from "react";
import type { Team, DashboardStats } from "../types";
import { formatDate, getVelocityStatus } from "../utils/formatters";

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
			const teamsResponse = await fetch("/api/v1/teams");
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

	if (isLoading) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="text-text-contrast m-0 text-3xl font-semibold">Dashboard</h2>
						<p className="text-text-primary mt-2">Overview of your teams and capacity planning</p>
					</div>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div className="border-layout-background border-t-interactive mb-4 h-10 w-10 animate-spin rounded-full border-4"></div>
					<p className="text-text-primary mb-4">Loading dashboard...</p>
				</div>
			</main>
		);
	}

	if (error) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="text-text-contrast m-0 text-3xl font-semibold">Dashboard</h2>
						<p className="text-text-primary mt-2">Overview of your teams and capacity planning</p>
					</div>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div>
						<h3 className="mb-3 text-xl font-semibold text-red-600">Unable to Load Dashboard</h3>
						<p className="text-text-primary mb-6">{error}</p>
						<button
							onClick={() => void loadDashboardData()}
							className="border-layout-background bg-content-background text-text-primary hover:border-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-base font-medium no-underline transition-all duration-200"
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
					<h2 className="text-text-contrast m-0 text-3xl font-semibold">Dashboard</h2>
					<p className="text-text-primary mt-2">Overview of your teams and capacity planning</p>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-text-primary text-sm font-medium">Total Teams</p>
							<p className="text-text-contrast text-2xl font-bold">{stats.total_teams}</p>
						</div>
						<div className="bg-interactive-hover rounded-full p-3">
							<svg
								className="text-interactive h-6 w-6"
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

				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-text-primary text-sm font-medium">Team Members</p>
							<p className="text-text-contrast text-2xl font-bold">{stats.total_members}</p>
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

				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-text-primary text-sm font-medium">Active Sprints</p>
							<p className="text-text-contrast text-2xl font-bold">{stats.active_sprints}</p>
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

				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-text-primary text-sm font-medium">Upcoming PTO</p>
							<p className="text-text-contrast text-2xl font-bold">{stats.upcoming_pto}</p>
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
			<div className="border-layout-background bg-content-background mb-8 rounded-lg border p-6 shadow-sm">
				<h3 className="text-text-contrast mb-6 text-xl font-semibold">Teams Overview</h3>

				{teams.length === 0 ? (
					<div className="text-text-primary p-8 text-center">
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
									<th className="text-text-primary px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
										Team Name
									</th>
									<th className="text-text-primary px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
										Velocity
									</th>
									<th className="text-text-primary px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
										Sprint Length
									</th>
									<th className="text-text-primary px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
										Working Days
									</th>
									<th className="text-text-primary px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
										Created
									</th>
									<th className="text-text-primary px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-content-background divide-y divide-gray-200">
								{teams.map(team => {
									const velocityStatus = getVelocityStatus(team.velocity_baseline);
									return (
										<tr key={team.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap">
												<div>
													<div className="text-text-contrast text-sm font-medium">
														{team.name}
													</div>
													{team.description && (
														<div className="text-text-primary text-sm">
															{team.description}
														</div>
													)}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="flex items-center">
													<span className="text-text-contrast text-sm">
														{team.velocity_baseline > 0
															? team.velocity_baseline
															: "Not set"}
													</span>
													<span className={`ml-2 text-xs ${velocityStatus.color}`}>
														({velocityStatus.label})
													</span>
												</div>
											</td>
											<td className="text-text-contrast px-6 py-4 text-sm whitespace-nowrap">
												{team.sprint_length_days} days
											</td>
											<td className="text-text-contrast px-6 py-4 text-sm whitespace-nowrap">
												{team.working_days_per_week} days/week
											</td>
											<td className="text-text-primary px-6 py-4 text-sm whitespace-nowrap">
												{formatDate(team.created_at)}
											</td>
											<td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
												<button className="text-interactive mr-4 hover:text-blue-900">
													View Details
												</button>
												<button className="text-text-primary hover:text-text-contrast">
													Configure
												</button>
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
				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<h4 className="text-text-contrast mb-4 text-lg font-semibold">Quick Actions</h4>
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

				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<h4 className="text-text-contrast mb-4 text-lg font-semibold">Recent Activity</h4>
					<div className="text-text-primary space-y-3 text-sm">
						<p>No recent activity to display.</p>
					</div>
				</div>

				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<h4 className="text-text-contrast mb-4 text-lg font-semibold">System Status</h4>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-text-primary text-sm">Database</span>
							<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
								<span className="h-2 w-2 rounded-full bg-green-500"></span>
								Connected
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-text-primary text-sm">API</span>
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
