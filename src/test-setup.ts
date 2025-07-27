import "@testing-library/jest-dom";

// JSDOM polyfills for missing browser APIs - Force override JSDOM's implementation
if (typeof HTMLFormElement !== 'undefined') {
	// Always override requestSubmit, even if it exists, to ensure consistent behavior
	Object.defineProperty(HTMLFormElement.prototype, 'requestSubmit', {
		value: function(submitter: HTMLElement | null = null) {
			if (submitter && (submitter as any).form !== this) {
				throw new DOMException("The specified element is not a form control.");
			}
			
			// Create and dispatch a submit event with proper event properties
			const event = new Event('submit', { 
				bubbles: true, 
				cancelable: true 
			});
			
			// Add submitter property to match browser behavior
			if (submitter) {
				Object.defineProperty(event, 'submitter', { 
					value: submitter, 
					enumerable: true,
					configurable: true
				});
			}
			
			// Dispatch the event and respect preventDefault
			const defaultPrevented = !this.dispatchEvent(event);
			if (!defaultPrevented && this.submit) {
				// Only call submit if it exists and event wasn't prevented
				this.submit();
			}
		},
		writable: true,
		configurable: true
	});
}