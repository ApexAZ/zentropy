import React from "react";

const HomePage: React.FC = () => {
	return (
		<main className="w-full py-8">
			<section id="home" className="mb-8 rounded-lg bg-content-background p-8 shadow-sm">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="m-0 text-3xl font-semibold text-primary">Welcome to Zentropy</h2>
				</div>
				<p className="mb-4 text-primary">
					Your comprehensive Product Management platform with project workflows, team collaboration, and
					capacity planning.
				</p>
			</section>

			<section id="projects" className="mb-8 rounded-lg bg-content-background p-8 shadow-sm">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="m-0 text-3xl font-semibold text-primary">Projects</h2>
				</div>
				<p className="mb-4 text-primary">Manage your projects with advanced workflows and tracking.</p>
			</section>

			<section id="teams" className="mb-8 rounded-lg bg-content-background p-8 shadow-sm">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="m-0 text-3xl font-semibold text-primary">Teams</h2>
				</div>
				<p className="mb-4 text-primary">Collaborate effectively with your team members.</p>
			</section>

			<section id="capacity" className="mb-8 rounded-lg bg-content-background p-8 shadow-sm">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="m-0 text-3xl font-semibold text-primary">Capacity Planning</h2>
				</div>
				<p className="mb-4 text-primary">Plan and optimize your team&apos;s capacity and resources.</p>
			</section>
		</main>
	);
};

export default HomePage;
