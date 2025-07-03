declare global {
	interface Window {
		google?: {
			accounts: {
				id: {
					initialize: (options: any) => void;
					prompt: () => void;
					renderButton: (element: HTMLElement, options: any) => void;
				};
			};
		};
	}
}

export {};