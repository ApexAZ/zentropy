import React from "react";

const HomePage: React.FC = () => {
	return (
		<main className="w-full py-8">
			<section id="home" className="mb-8 rounded-lg bg-white p-8 shadow-sm">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="m-0 text-3xl font-semibold text-gray-800">Welcome to Zentropy</h2>
				</div>
				<p className="mb-4 text-gray-600">
					Your comprehensive Product Management platform with project workflows, team collaboration, and
					capacity planning.
				</p>
			</section>

			<section id="projects" className="mb-8 rounded-lg bg-white p-8 shadow-sm">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="m-0 text-3xl font-semibold text-gray-800">Projects</h2>
				</div>
				<p className="mb-4 text-gray-600">Manage your projects with advanced workflows and tracking.</p>
			</section>

			<section id="teams" className="mb-8 rounded-lg bg-white p-8 shadow-sm">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="m-0 text-3xl font-semibold text-gray-800">Teams</h2>
				</div>
				<p className="mb-4 text-gray-600">Collaborate effectively with your team members.</p>
			</section>

			<section id="capacity" className="mb-8 rounded-lg bg-white p-8 shadow-sm">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="m-0 text-3xl font-semibold text-gray-800">Capacity Planning</h2>
				</div>
				<p className="mb-4 text-gray-600">Plan and optimize your team&apos;s capacity and resources.</p>
			</section>
		</main>
	);
};

export default HomePage;
