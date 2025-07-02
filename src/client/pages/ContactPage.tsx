import React from "react";

const ContactPage: React.FC = () => {
	return (
		<main className="w-full py-8">
			<div className="mb-8 flex items-center justify-between">
				<h2 className="m-0 text-3xl font-semibold text-gray-800">Contact Us</h2>
			</div>

			<section className="rounded-lg bg-white p-8 shadow-sm">
				<p className="mb-4 text-gray-600">
					We&apos;d love to hear from you! Whether you have questions, feedback, or need support, our team is
					here to help.
				</p>

				<h3 className="mb-3 text-xl font-semibold text-gray-800">Get In Touch</h3>
				<p className="mb-4 text-gray-600">Reach out to us through any of the following channels:</p>

				<div className="mb-6">
					<h4 className="mb-2 text-lg font-semibold text-gray-800">Support</h4>
					<p className="mb-2 text-gray-600">For technical support and help with using Zentropy:</p>
					<p className="mb-2 text-gray-600">
						<strong className="font-semibold">Email:</strong> support@zentropy.app
					</p>
					<p className="mb-4 text-gray-600">
						<strong className="font-semibold">Response Time:</strong> Within 24 hours
					</p>

					<h4 className="mb-2 text-lg font-semibold text-gray-800">General Inquiries</h4>
					<p className="mb-2 text-gray-600">For general questions and business inquiries:</p>
					<p className="mb-4 text-gray-600">
						<strong className="font-semibold">Email:</strong> hello@zentropy.app
					</p>

					<h4 className="mb-2 text-lg font-semibold text-gray-800">Feedback</h4>
					<p className="mb-2 text-gray-600">We value your input and suggestions for improving Zentropy:</p>
					<p className="mb-4 text-gray-600">
						<strong className="font-semibold">Email:</strong> feedback@zentropy.app
					</p>
				</div>

				<h3 className="mb-3 text-xl font-semibold text-gray-800">Office Hours</h3>
				<p className="mb-4 text-gray-600">Our support team is available:</p>
				<ul className="mb-4 list-none text-gray-600">
					<li className="mb-2">• Monday - Friday: 9:00 AM - 6:00 PM (PST)</li>
					<li className="mb-2">• Saturday: 10:00 AM - 2:00 PM (PST)</li>
					<li className="mb-2">• Sunday: Closed</li>
				</ul>

				<p className="mb-4 text-gray-600">
					We strive to respond to all inquiries promptly and look forward to helping you succeed with
					Zentropy.
				</p>
			</section>
		</main>
	);
};

export default ContactPage;
