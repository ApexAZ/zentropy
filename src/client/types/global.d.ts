// Google OAuth Types
export interface GoogleCredentialResponse {
	credential: string;
	client_id?: string;
	select_by?: string;
}

export interface GoogleOAuthInitOptions {
	client_id: string;
	callback: (response: GoogleCredentialResponse) => void;
	auto_select?: boolean;
	cancel_on_tap_outside?: boolean;
}

export interface GoogleOAuthButtonOptions {
	theme?: "outline" | "filled_blue" | "filled_black";
	size?: "small" | "medium" | "large";
	text?: "signin_with" | "signup_with" | "continue_with" | "signin";
	shape?: "rectangular" | "pill" | "circle" | "square";
	logo_alignment?: "left" | "center";
	width?: number;
	locale?: string;
}

export interface GoogleOAuthNotification {
	isNotDisplayed: () => boolean;
	isSkippedMoment: () => boolean;
	isDismissedMoment: () => boolean;
	getSkippedReason: () => string;
	getDismissedReason: () => string;
}

declare global {
	interface Window {
		google?: {
			accounts: {
				id: {
					initialize: (options: GoogleOAuthInitOptions) => void;
					prompt: (momentListener?: (notification: GoogleOAuthNotification) => void) => void;
					renderButton: (element: HTMLElement, options: GoogleOAuthButtonOptions) => void;
				};
			};
		};
	}
}

export {};