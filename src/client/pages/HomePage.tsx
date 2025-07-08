import React from "react";

const HomePage: React.FC = () => {
	return (
		<main className="w-full py-8">
			<section id="home" className="bg-content-background mb-8 rounded-lg p-8 shadow-sm">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="text-primary m-0 text-3xl font-semibold">Welcome to Zentropy</h2>
				</div>
				<p className="text-primary mb-4">
					Your comprehensive Product Management platform with project workflows, team collaboration, and
					capacity planning.
				</p>
			</section>

			<section id="projects" className="bg-content-background mb-8 rounded-lg p-8 shadow-sm">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="text-primary m-0 text-3xl font-semibold">Projects</h2>
				</div>
				<p className="text-primary mb-4">Manage your projects with advanced workflows and tracking.</p>
			</section>

			<section id="teams" className="bg-content-background mb-8 rounded-lg p-8 shadow-sm">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="text-primary m-0 text-3xl font-semibold">Teams</h2>
				</div>
				<p className="text-primary mb-4">Collaborate effectively with your team members.</p>
			</section>

			<section id="capacity" className="bg-content-background mb-8 rounded-lg p-8 shadow-sm">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="text-primary m-0 text-3xl font-semibold">Capacity Planning</h2>
				</div>
				<p className="text-primary mb-4">Plan and optimize your team&apos;s capacity and resources.</p>
			</section>
		</main>
	);
};

export default HomePage;
