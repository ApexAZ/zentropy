import React from "react";

const AboutPage: React.FC = () => {
	return (
		<main className="w-full py-8">
			<div className="mb-8 flex items-center justify-between">
				<h2 className="m-0 text-3xl font-semibold text-primary">About Zentropy</h2>
			</div>

			<section className="rounded-lg bg-content-background p-8 shadow-sm">
				<p className="mb-4 text-primary">
					Zentropy is a comprehensive Product Management platform designed to streamline project workflows,
					enhance team collaboration, and optimize capacity planning for modern development teams.
				</p>

				<p className="mb-4 text-primary">
					Our mission is to bring clarity and efficiency to product management processes, helping teams focus
					on what matters most: building great products and delivering value to customers.
				</p>

				<h3 className="mb-3 text-xl font-semibold text-primary">Our Vision</h3>
				<p className="mb-4 text-primary">
					We envision a world where product teams can seamlessly collaborate, accurately plan their capacity,
					and deliver exceptional results without the overhead of complex processes and scattered tools.
				</p>

				<h3 className="mb-3 text-xl font-semibold text-primary">Key Features</h3>
				<ul className="mb-4 list-none text-primary">
					<li className="mb-2">• Intuitive team management and collaboration tools</li>
					<li className="mb-2">• Advanced capacity planning and sprint optimization</li>
					<li className="mb-2">• Real-time calendar management for accurate resource allocation</li>
					<li className="mb-2">• Comprehensive dashboard for team configuration and insights</li>
				</ul>

				<p className="mb-4 text-primary">
					Built with modern web technologies and a focus on user experience, Zentropy empowers teams to work
					smarter, not harder.
				</p>
			</section>
		</main>
	);
};

export default AboutPage;
