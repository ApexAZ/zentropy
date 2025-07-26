import React from "react";

const AboutPage: React.FC = () => {
	return (
		<main className="w-full py-8">
			<div className="mb-8 flex items-center justify-between px-8">
				<h2 className="text-text-contrast font-heading-large m-0">About Zentropy</h2>
			</div>

			<div className="px-8">
				<section className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<p className="text-text-primary font-body mb-4">
						Zentropy is a comprehensive Product Management platform designed to streamline project
						workflows, enhance team collaboration, and optimize capacity planning for modern development
						teams.
					</p>

					<p className="text-text-primary font-body mb-4">
						Our mission is to bring clarity and efficiency to product management processes, helping teams
						focus on what matters most: building great products and delivering value to customers.
					</p>

					<h3 className="text-text-contrast font-heading-medium mb-3">Our Vision</h3>
					<p className="text-text-primary font-body mb-4">
						We envision a world where product teams can seamlessly collaborate, accurately plan their
						capacity, and deliver exceptional results without the overhead of complex processes and
						scattered tools.
					</p>

					<h3 className="text-text-contrast font-heading-medium mb-3">Key Features</h3>
					<ul className="text-text-primary font-body mb-4 list-none">
						<li className="mb-2">• Intuitive team management and collaboration tools</li>
						<li className="mb-2">• Advanced capacity planning and sprint optimization</li>
						<li className="mb-2">• Real-time calendar management for accurate resource allocation</li>
						<li className="mb-2">• Comprehensive dashboard for team configuration and insights</li>
					</ul>

					<p className="text-text-primary font-body mb-4">
						Built with modern web technologies and a focus on user experience, Zentropy empowers teams to
						work smarter, not harder.
					</p>
				</section>
			</div>
		</main>
	);
};

export default AboutPage;
