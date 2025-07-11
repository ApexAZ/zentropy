import { Page, Locator } from "@playwright/test";
import { config } from "../config/environment";

/**
 * Base Page Object for Zentropy E2E Tests
 * 
 * Provides common functionality for all page objects:
 * - Navigation utilities
 * - Common element interactions
 * - Wait helpers
 * - Error handling
 */
export abstract class BasePage {
	constructor(protected page: Page) {}
	
	/**
	 * Navigate to a specific path
	 */
	async goto(path: string = "") {
		await this.page.goto(`${config.frontend.baseUrl}${path}`);
		await this.waitForPageLoad();
	}
	
	/**
	 * Wait for page to load completely
	 */
	async waitForPageLoad() {
		await this.page.waitForLoadState("networkidle");
	}
	
	/**
	 * Get page title
	 */
	async getTitle(): Promise<string> {
		return await this.page.title();
	}
	
	/**
	 * Check if element is visible
	 */
	async isVisible(selector: string): Promise<boolean> {
		try {
			const element = this.page.locator(selector);
			return await element.isVisible();
		} catch {
			return false;
		}
	}
	
	/**
	 * Wait for element to be visible
	 */
	async waitForVisible(selector: string, timeout?: number) {
		await this.page.waitForSelector(selector, { 
			state: "visible", 
			timeout: timeout || config.timeouts.assertion 
		});
	}
	
	/**
	 * Wait for element to be hidden
	 */
	async waitForHidden(selector: string, timeout?: number) {
		await this.page.waitForSelector(selector, { 
			state: "hidden", 
			timeout: timeout || config.timeouts.assertion 
		});
	}
	
	/**
	 * Click element with retry logic
	 */
	async clickWithRetry(selector: string, retries: number = 3) {
		for (let i = 0; i < retries; i++) {
			try {
				await this.page.click(selector);
				return;
			} catch (error) {
				if (i === retries - 1) throw error;
				await this.page.waitForTimeout(1000);
			}
		}
	}
	
	/**
	 * Fill input with clear first
	 */
	async fillInput(selector: string, value: string) {
		await this.page.fill(selector, ""); // Clear first
		await this.page.fill(selector, value);
	}
	
	/**
	 * Get text content of element
	 */
	async getText(selector: string): Promise<string> {
		const element = this.page.locator(selector);
		return await element.textContent() || "";
	}
	
	/**
	 * Get attribute value
	 */
	async getAttribute(selector: string, attribute: string): Promise<string | null> {
		const element = this.page.locator(selector);
		return await element.getAttribute(attribute);
	}
	
	/**
	 * Check if element is enabled
	 */
	async isEnabled(selector: string): Promise<boolean> {
		const element = this.page.locator(selector);
		return await element.isEnabled();
	}
	
	/**
	 * Check if element is checked (for checkboxes/radio buttons)
	 */
	async isChecked(selector: string): Promise<boolean> {
		const element = this.page.locator(selector);
		return await element.isChecked();
	}
	
	/**
	 * Wait for URL to match pattern
	 */
	async waitForURL(pattern: string | RegExp, timeout?: number) {
		await this.page.waitForURL(pattern, { 
			timeout: timeout || config.timeouts.navigation 
		});
	}
	
	/**
	 * Scroll element into view
	 */
	async scrollIntoView(selector: string) {
		await this.page.locator(selector).scrollIntoViewIfNeeded();
	}
	
	/**
	 * Take screenshot of current page
	 */
	async screenshot(name: string) {
		await this.page.screenshot({ 
			path: `e2e-results/screenshots/${name}.png`,
			fullPage: true 
		});
	}
	
	/**
	 * Wait for network to be idle
	 */
	async waitForNetworkIdle() {
		await this.page.waitForLoadState("networkidle");
	}
	
	/**
	 * Check for error messages on page
	 */
	async getErrorMessage(): Promise<string | null> {
		const errorSelectors = [
			'[data-testid="error-message"]',
			'[data-testid="toast-error"]',
			'.error-message',
			'.alert-error'
		];
		
		for (const selector of errorSelectors) {
			if (await this.isVisible(selector)) {
				return await this.getText(selector);
			}
		}
		
		return null;
	}
	
	/**
	 * Check for success messages on page
	 */
	async getSuccessMessage(): Promise<string | null> {
		const successSelectors = [
			'[data-testid="success-message"]',
			'[data-testid="toast-success"]',
			'.success-message',
			'.alert-success'
		];
		
		for (const selector of successSelectors) {
			if (await this.isVisible(selector)) {
				return await this.getText(selector);
			}
		}
		
		return null;
	}
	
	/**
	 * Wait for any loading indicators to disappear
	 */
	async waitForLoading() {
		const loadingSelectors = [
			'[data-testid="loading"]',
			'[data-testid="spinner"]',
			'.loading',
			'.spinner'
		];
		
		for (const selector of loadingSelectors) {
			await this.page.waitForSelector(selector, { state: "hidden" }).catch(() => {
				// Loading indicator might not exist, which is fine
			});
		}
	}
	
	/**
	 * Hover over element
	 */
	async hover(selector: string) {
		await this.page.locator(selector).hover();
	}
	
	/**
	 * Double click element
	 */
	async doubleClick(selector: string) {
		await this.page.locator(selector).dblclick();
	}
	
	/**
	 * Press key
	 */
	async pressKey(key: string) {
		await this.page.keyboard.press(key);
	}
	
	/**
	 * Get current URL
	 */
	getCurrentURL(): string {
		return this.page.url();
	}
	
	/**
	 * Reload page
	 */
	async reload() {
		await this.page.reload();
		await this.waitForPageLoad();
	}
	
	/**
	 * Go back in browser history
	 */
	async goBack() {
		await this.page.goBack();
		await this.waitForPageLoad();
	}
	
	/**
	 * Go forward in browser history
	 */
	async goForward() {
		await this.page.goForward();
		await this.waitForPageLoad();
	}
}