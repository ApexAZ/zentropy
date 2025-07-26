import React from "react";

const HomePage: React.FC = () => {
	return (
		<main className="w-full py-8">
			<div className="space-y-8 px-8">
				<section
					id="home"
					className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm"
				>
					<div className="mb-6 flex items-center justify-between">
						<h2 className="text-text-contrast font-heading-large m-0">Welcome to Zentropy</h2>
					</div>
					<p className="text-text-primary font-body mb-4">
						Your comprehensive Product Management platform with project workflows, team collaboration, and
						capacity planning.
					</p>
				</section>

				<section
					id="projects"
					className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm"
				>
					<div className="mb-6 flex items-center justify-between">
						<h2 className="text-text-contrast font-heading-large m-0">Projects</h2>
					</div>
					<p className="text-text-primary font-body mb-4">
						Manage your projects with advanced workflows and tracking.
					</p>
				</section>

				<section
					id="teams"
					className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm"
				>
					<div className="mb-6 flex items-center justify-between">
						<h2 className="text-text-contrast font-heading-large m-0">Teams</h2>
					</div>
					<p className="text-text-primary font-body mb-4">Collaborate effectively with your team members.</p>
				</section>

				<section
					id="capacity"
					className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm"
				>
					<div className="mb-6 flex items-center justify-between">
						<h2 className="text-text-contrast font-heading-large m-0">Capacity Planning</h2>
					</div>
					<p className="text-text-primary font-body mb-4">
						Plan and optimize your team&apos;s capacity and resources.
					</p>
				</section>
			</div>
		</main>
	);
};

export default HomePage;
