import { config } from "../config/environment";

/**
 * Mailpit Integration Helpers for E2E Tests
 * 
 * Provides utilities for:
 * - Automated email verification
 * - Email content parsing
 * - Link extraction from emails
 * - Email state management
 */
export class MailpitHelpers {
	private baseUrl: string;
	private apiUrl: string;
	
	constructor() {
		this.baseUrl = config.mailpit.baseUrl;
		this.apiUrl = config.mailpit.apiUrl;
	}
	
	/**
	 * Clear all emails in Mailpit
	 */
	async clear() {
		try {
			await fetch(`${this.apiUrl}/messages`, {
				method: "DELETE",
			});
		} catch (error) {
			console.warn("Could not clear Mailpit emails:", error);
		}
	}
	
	/**
	 * Get all emails from Mailpit
	 */
	async getEmails() {
		const response = await fetch(`${this.apiUrl}/messages`);
		if (!response.ok) {
			throw new Error(`Failed to get emails: ${response.statusText}`);
		}
		return response.json();
	}
	
	/**
	 * Get emails for a specific recipient
	 */
	async getEmailsFor(email: string) {
		const allEmails = await this.getEmails();
		return allEmails.messages?.filter((message: any) => 
			message.To?.some((to: any) => to.Address === email)
		) || [];
	}
	
	/**
	 * Wait for an email to arrive for a specific recipient
	 */
	async waitForEmail(email: string, timeout: number = config.timeouts.emailVerification): Promise<any> {
		const startTime = Date.now();
		
		while (Date.now() - startTime < timeout) {
			const emails = await this.getEmailsFor(email);
			if (emails.length > 0) {
				return emails[0]; // Return the latest email
			}
			
			// Wait 1 second before checking again
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
		
		throw new Error(`No email received for ${email} within ${timeout}ms`);
	}
	
	/**
	 * Wait for a verification email and return the verification link
	 */
	async waitForVerificationEmail(email: string): Promise<string> {
		const emailMessage = await this.waitForEmail(email);
		
		// Get the full email content
		const emailContent = await this.getEmailContent(emailMessage.ID);
		
		// Extract verification link from email content
		const verificationLink = this.extractVerificationLink(emailContent);
		
		if (!verificationLink) {
			throw new Error(`No verification link found in email for ${email}`);
		}
		
		return verificationLink;
	}
	
	/**
	 * Get the full content of an email
	 */
	async getEmailContent(emailId: string) {
		const response = await fetch(`${this.apiUrl}/message/${emailId}`);
		if (!response.ok) {
			throw new Error(`Failed to get email content: ${response.statusText}`);
		}
		return response.json();
	}
	
	/**
	 * Extract verification link from email content
	 */
	private extractVerificationLink(emailContent: any): string | null {
		// Check HTML content first
		if (emailContent.HTML) {
			const htmlMatch = emailContent.HTML.match(/href="([^"]*verify[^"]*)"/i);
			if (htmlMatch) {
				return htmlMatch[1];
			}
		}
		
		// Fallback to text content
		if (emailContent.Text) {
			const textMatch = emailContent.Text.match(/(https?:\/\/[^\s]*verify[^\s]*)/i);
			if (textMatch) {
				return textMatch[1];
			}
		}
		
		// Check raw content as fallback
		if (emailContent.Raw) {
			const rawMatch = emailContent.Raw.match(/(https?:\/\/[^\s]*verify[^\s]*)/i);
			if (rawMatch) {
				return rawMatch[1];
			}
		}
		
		return null;
	}
	
	/**
	 * Verify an email by extracting and visiting the verification link
	 */
	async verifyEmail(email: string): Promise<string> {
		const verificationLink = await this.waitForVerificationEmail(email);
		
		// Extract the verification token/link
		return verificationLink;
	}
	
	/**
	 * Check if a verification email was sent
	 */
	async hasVerificationEmail(email: string): Promise<boolean> {
		try {
			const emails = await this.getEmailsFor(email);
			return emails.some((email: any) => 
				email.Subject?.toLowerCase().includes("verify") ||
				email.Subject?.toLowerCase().includes("confirmation")
			);
		} catch (error) {
			return false;
		}
	}
	
	/**
	 * Wait for a specific type of email (verification, password reset, etc.)
	 */
	async waitForEmailType(email: string, type: "verification" | "password-reset" | "welcome", timeout: number = config.timeouts.emailVerification): Promise<any> {
		const startTime = Date.now();
		
		while (Date.now() - startTime < timeout) {
			const emails = await this.getEmailsFor(email);
			
			const targetEmail = emails.find((emailMsg: any) => {
				const subject = emailMsg.Subject?.toLowerCase() || "";
				
				switch (type) {
					case "verification":
						return subject.includes("verify") || subject.includes("confirmation");
					case "password-reset":
						return subject.includes("password") || subject.includes("reset");
					case "welcome":
						return subject.includes("welcome") || subject.includes("getting started");
					default:
						return false;
				}
			});
			
			if (targetEmail) {
				return targetEmail;
			}
			
			// Wait 1 second before checking again
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
		
		throw new Error(`No ${type} email received for ${email} within ${timeout}ms`);
	}
	
	/**
	 * Get the count of emails for a specific recipient
	 */
	async getEmailCount(email: string): Promise<number> {
		const emails = await this.getEmailsFor(email);
		return emails.length;
	}
	
	/**
	 * Delete a specific email
	 */
	async deleteEmail(emailId: string) {
		try {
			await fetch(`${this.apiUrl}/message/${emailId}`, {
				method: "DELETE",
			});
		} catch (error) {
			console.warn(`Could not delete email ${emailId}:`, error);
		}
	}
	
	/**
	 * Get Mailpit server stats
	 */
	async getStats() {
		try {
			const response = await fetch(`${this.apiUrl}/info`);
			if (response.ok) {
				return response.json();
			}
		} catch (error) {
			console.warn("Could not get Mailpit stats:", error);
		}
		return null;
	}
}