import { useState } from "react";

interface SecurityHelpFAQProps {
	/** Whether to enable search functionality */
	searchable?: boolean;
}

interface FAQItem {
	id: string;
	question: string;
	answer: string;
	keywords: string[];
}

/**
 * Security Help FAQ Component
 *
 * Provides frequently asked questions about account security with expandable answers,
 * search functionality, and contact support integration.
 */
export function SecurityHelpFAQ({ searchable = false }: SecurityHelpFAQProps) {
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
	const [searchQuery, setSearchQuery] = useState("");

	const faqItems: FAQItem[] = [
		{
			id: "mfa-definition",
			question: "What is multi-factor authentication?",
			answer: "Multi-factor authentication (MFA) adds an extra layer of security to your account. Even if someone steals your password, they still can't access your account without the second factor (like your phone or Google account). It's one of the most effective ways to protect your account from unauthorized access.",
			keywords: ["mfa", "multi-factor", "authentication", "security", "password", "protection"]
		},
		{
			id: "google-linking-benefits",
			question: "Why should I link my Google account?",
			answer: "Linking your Google account provides several benefits: convenient one-click sign-in without typing passwords, backup authentication method if you forget your password, enhanced security through Google's advanced security features, and industry-standard OAuth protection for your credentials.",
			keywords: ["google", "link", "oauth", "benefits", "convenience", "backup", "security"]
		},
		{
			id: "remove-google-auth",
			question: "Can I remove Google authentication later?",
			answer: "Yes, you can unlink your Google account at any time from your Security Settings. However, you'll need to confirm your password to ensure the action is authorized. After unlinking, you'll only be able to sign in with your email and password.",
			keywords: ["remove", "unlink", "google", "disable", "password", "confirmation"]
		},
		{
			id: "google-account-recovery",
			question: "What happens if I lose access to my Google account?",
			answer: "If you lose access to your Google account, you can still sign in using your email and password. Your Zentropy account remains secure and accessible through your primary email authentication. If you need help recovering your account or have security concerns, contact our support team for assistance.",
			keywords: ["lose", "access", "google", "recovery", "password", "support", "help"]
		}
	];

	const filteredFAQs =
		searchable && searchQuery
			? faqItems.filter(
					item =>
						item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
						item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
						item.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
				)
			: faqItems;

	const toggleExpanded = (itemId: string) => {
		const newExpanded = new Set(expandedItems);
		if (newExpanded.has(itemId)) {
			newExpanded.delete(itemId);
		} else {
			newExpanded.add(itemId);
		}
		setExpandedItems(newExpanded);
	};

	return (
		<div className="space-y-6">
			{/* FAQ Header */}
			<div>
				<h3 className="text-primary mb-2 text-xl font-semibold">Frequently Asked Questions</h3>
				<p className="text-secondary text-sm">Find answers to common questions about account security.</p>
			</div>

			{/* Search Input */}
			{searchable && (
				<div className="mb-4">
					<label htmlFor="faq-search" className="text-primary mb-2 block text-sm font-medium">
						Search FAQs
					</label>
					<input
						id="faq-search"
						type="text"
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						placeholder="Search frequently asked questions..."
						className="border-layout-background bg-content-background focus:border-interactive focus:ring-opacity-20 w-full rounded-md border p-3 text-sm focus:ring-2 focus:outline-none"
					/>
				</div>
			)}

			{/* FAQ Items */}
			<div className="space-y-3">
				{filteredFAQs.length > 0 ? (
					filteredFAQs.map(item => {
						const isExpanded = expandedItems.has(item.id);
						const answerId = `answer-${item.id}`;

						return (
							<div
								key={item.id}
								className="border-layout-background bg-content-background rounded-lg border"
							>
								<button
									type="button"
									onClick={() => toggleExpanded(item.id)}
									className="text-primary hover:bg-layout-background focus:ring-interactive w-full p-4 text-left focus:ring-2 focus:outline-none focus:ring-inset"
									aria-expanded={isExpanded}
									aria-controls={answerId}
								>
									<div className="flex items-center justify-between">
										<h4 className="font-medium">{item.question}</h4>
										<span className="text-interactive ml-2 flex-shrink-0 text-lg">
											{isExpanded ? "−" : "+"}
										</span>
									</div>
								</button>

								{isExpanded && (
									<div
										id={answerId}
										className="border-layout-background bg-layout-background border-t p-4"
									>
										<p className="text-secondary text-sm leading-relaxed">{item.answer}</p>
									</div>
								)}
							</div>
						);
					})
				) : (
					<div className="bg-content-background rounded-lg border p-4 text-center">
						<p className="text-secondary">No matching questions found. Try a different search term.</p>
					</div>
				)}
			</div>

			{/* Contact Support Section */}
			<div className="border-interactive-light bg-interactive-light rounded-lg border p-4">
				<h4 className="text-interactive-dark mb-2 font-semibold">Need More Help?</h4>
				<p className="text-interactive-dark mb-3 text-sm">
					Can't find the answer you're looking for? Our support team is here to help.
				</p>
				<div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
					<a
						href="/contact"
						className="text-interactive hover:text-interactive-hover focus:ring-interactive inline-flex items-center text-sm font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none"
					>
						Contact our support team
					</a>
					<a
						href="/docs/security"
						target="_blank"
						rel="noopener noreferrer"
						className="text-interactive hover:text-interactive-hover focus:ring-interactive inline-flex items-center text-sm font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none"
					>
						Comprehensive Security Guide
					</a>
				</div>
			</div>

			{/* Emergency Contact */}
			<div className="border-error-light bg-error-light rounded-lg border p-4">
				<h4 className="text-error-dark mb-2 font-semibold">Account Security Emergency?</h4>
				<p className="text-error-dark text-sm">
					If you believe your account has been compromised, contact us immediately at{" "}
					<strong>support@zentropy.app</strong> for priority assistance with 24-hour response time.
				</p>
			</div>
		</div>
	);
}
