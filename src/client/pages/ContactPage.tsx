import React from "react";

const ContactPage: React.FC = () => {
	return (
		<main className="w-full py-8">
			<div className="mb-8 flex items-center justify-between">
				<h2 className="text-primary m-0 text-3xl font-semibold">Contact Us</h2>
			</div>

			<section className="bg-content-background rounded-lg p-8 shadow-sm">
				<p className="text-primary mb-4">
					We&apos;d love to hear from you! Whether you have questions, feedback, or need support, our team is
					here to help.
				</p>

				<h3 className="text-primary mb-3 text-xl font-semibold">Get In Touch</h3>
				<p className="text-primary mb-4">Reach out to us through any of the following channels:</p>

				<div className="mb-6">
					<h4 className="text-primary mb-2 text-lg font-semibold">Support</h4>
					<p className="text-primary mb-2">For technical support and help with using Zentropy:</p>
					<p className="text-primary mb-2">
						<strong className="font-semibold">Email:</strong> support@zentropy.app
					</p>
					<p className="text-primary mb-4">
						<strong className="font-semibold">Response Time:</strong> Within 24 hours
					</p>

					<h4 className="text-primary mb-2 text-lg font-semibold">General Inquiries</h4>
					<p className="text-primary mb-2">For general questions and business inquiries:</p>
					<p className="text-primary mb-4">
						<strong className="font-semibold">Email:</strong> hello@zentropy.app
					</p>

					<h4 className="text-primary mb-2 text-lg font-semibold">Feedback</h4>
					<p className="text-primary mb-2">We value your input and suggestions for improving Zentropy:</p>
					<p className="text-primary mb-4">
						<strong className="font-semibold">Email:</strong> feedback@zentropy.app
					</p>
				</div>

				<h3 className="text-primary mb-3 text-xl font-semibold">Office Hours</h3>
				<p className="text-primary mb-4">Our support team is available:</p>
				<ul className="text-primary mb-4 list-none">
					<li className="mb-2">• Monday - Friday: 9:00 AM - 6:00 PM (PST)</li>
					<li className="mb-2">• Saturday: 10:00 AM - 2:00 PM (PST)</li>
					<li className="mb-2">• Sunday: Closed</li>
				</ul>

				<p className="text-primary mb-4">
					We strive to respond to all inquiries promptly and look forward to helping you succeed with
					Zentropy.
				</p>
			</section>
		</main>
	);
};

export default ContactPage;
