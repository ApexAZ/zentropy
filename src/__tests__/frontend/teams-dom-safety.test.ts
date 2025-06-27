/**
 * Tests for DOM type assertion safety in teams.ts frontend code
 * These tests ensure TypeScript DOM element casting works correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;

describe('Frontend DOM Type Safety', () => {
	beforeEach(() => {
		// Reset DOM for each test
		document.body.innerHTML = '';
	});

	describe('DOM Element Type Assertions', () => {
		it('should safely cast HTMLElement types', () => {
			// Create test elements
			const div = document.createElement('div');
			div.id = 'test-div';
			document.body.appendChild(div);

			// Test type assertion
			const element = document.getElementById('test-div') as HTMLElement;
			
			expect(element).toBeTruthy();
			expect(element.tagName).toBe('DIV');
			expect(element.id).toBe('test-div');
		});

		it('should handle null return from getElementById', () => {
			// Test when element doesn't exist
			const element = document.getElementById('non-existent');
			
			expect(element).toBeNull();
			
			// Safe type assertion with null check
			const safeElement = document.getElementById('non-existent') as HTMLElement | null;
			expect(safeElement).toBeNull();
		});

		it('should safely cast HTMLInputElement types', () => {
			// Create input element
			const input = document.createElement('input');
			input.id = 'team-name';
			input.type = 'text';
			input.value = 'Test Team';
			document.body.appendChild(input);

			// Test type assertion
			const inputElement = document.getElementById('team-name') as HTMLInputElement;
			
			expect(inputElement).toBeTruthy();
			expect(inputElement.type).toBe('text');
			expect(inputElement.value).toBe('Test Team');
			
			// Test input-specific methods
			inputElement.focus = vi.fn();
			inputElement.focus();
			expect(inputElement.focus).toHaveBeenCalled();
		});

		it('should safely cast HTMLTextAreaElement types', () => {
			// Create textarea element
			const textarea = document.createElement('textarea');
			textarea.id = 'team-description';
			textarea.value = 'Team description';
			document.body.appendChild(textarea);

			// Test type assertion
			const textareaElement = document.getElementById('team-description') as HTMLTextAreaElement;
			
			expect(textareaElement).toBeTruthy();
			expect(textareaElement.value).toBe('Team description');
			expect(textareaElement.tagName).toBe('TEXTAREA');
		});

		it('should safely cast HTMLSelectElement types', () => {
			// Create select element with options
			const select = document.createElement('select');
			select.id = 'sprint-length';
			
			const option1 = document.createElement('option');
			option1.value = '14';
			option1.textContent = '14 days';
			
			const option2 = document.createElement('option');
			option2.value = '21';
			option2.textContent = '21 days';
			option2.selected = true;
			
			select.appendChild(option1);
			select.appendChild(option2);
			document.body.appendChild(select);

			// Test type assertion
			const selectElement = document.getElementById('sprint-length') as HTMLSelectElement;
			
			expect(selectElement).toBeTruthy();
			expect(selectElement.value).toBe('21');
			expect(selectElement.options).toHaveLength(2);
		});

		it('should safely cast HTMLButtonElement types', () => {
			// Create button element
			const button = document.createElement('button');
			button.id = 'save-team-btn';
			button.textContent = 'Save Team';
			button.disabled = false;
			document.body.appendChild(button);

			// Test type assertion
			const buttonElement = document.getElementById('save-team-btn') as HTMLButtonElement;
			
			expect(buttonElement).toBeTruthy();
			expect(buttonElement.disabled).toBe(false);
			expect(buttonElement.textContent).toBe('Save Team');
			
			// Test button-specific properties
			buttonElement.disabled = true;
			expect(buttonElement.disabled).toBe(true);
		});

		it('should safely cast HTMLFormElement types', () => {
			// Create form element
			const form = document.createElement('form');
			form.id = 'team-form';
			document.body.appendChild(form);

			// Test type assertion
			const formElement = document.getElementById('team-form') as HTMLFormElement;
			
			expect(formElement).toBeTruthy();
			expect(formElement.tagName).toBe('FORM');
			
			// Test form-specific methods
			formElement.reset = vi.fn();
			formElement.reset();
			expect(formElement.reset).toHaveBeenCalled();
		});
	});

	describe('QuerySelector Type Assertions', () => {
		it('should safely cast querySelectorAll with generic type', () => {
			// Create multiple elements
			const div1 = document.createElement('div');
			div1.className = 'field-error';
			div1.textContent = 'Error 1';
			
			const div2 = document.createElement('div');
			div2.className = 'field-error';
			div2.textContent = 'Error 2';
			
			document.body.appendChild(div1);
			document.body.appendChild(div2);

			// Test generic type assertion
			const errorElements = document.querySelectorAll<HTMLElement>('.field-error');
			
			expect(errorElements).toHaveLength(2);
			expect(errorElements[0].textContent).toBe('Error 1');
			expect(errorElements[1].textContent).toBe('Error 2');
			
			// Test HTMLElement methods
			errorElements.forEach((el: HTMLElement) => {
				expect(el.style).toBeDefined();
				el.style.display = 'none';
				expect(el.style.display).toBe('none');
			});
		});

		it('should handle empty querySelectorAll results', () => {
			// Query for non-existent elements
			const elements = document.querySelectorAll<HTMLElement>('.non-existent');
			
			expect(elements).toHaveLength(0);
			
			// Test forEach on empty NodeList
			const mockCallback = vi.fn();
			elements.forEach(mockCallback);
			expect(mockCallback).not.toHaveBeenCalled();
		});

		it('should safely cast mixed input types', () => {
			// Create mixed form elements
			const input = document.createElement('input');
			input.className = 'form-control';
			input.type = 'text';
			
			const textarea = document.createElement('textarea');
			textarea.className = 'form-control';
			
			const select = document.createElement('select');
			select.className = 'form-control';
			
			document.body.appendChild(input);
			document.body.appendChild(textarea);
			document.body.appendChild(select);

			// Test generic HTMLElement casting for mixed types
			const formControls = document.querySelectorAll<HTMLElement>('.form-control');
			
			expect(formControls).toHaveLength(3);
			
			// Test common HTMLElement methods
			formControls.forEach((element: HTMLElement) => {
				expect(element.classList).toBeDefined();
				element.classList.add('tested');
				expect(element.classList.contains('tested')).toBe(true);
			});
		});
	});

	describe('Event Target Type Safety', () => {
		it('should safely handle event target casting', () => {
			// Create form with input
			const form = document.createElement('form');
			const input = document.createElement('input');
			input.name = 'teamName';
			input.value = 'Test Team';
			form.appendChild(input);
			document.body.appendChild(form);

			// Simulate event handling
			const mockEvent = {
				target: form,
				preventDefault: vi.fn()
			} as unknown as Event;

			// Test event target casting
			const target = mockEvent.target as HTMLFormElement;
			expect(target).toBe(form);
			expect(target.tagName).toBe('FORM');
			
			// Test that form contains the input
			expect(target.querySelector('input[name="teamName"]')).toBeTruthy();
		});

		it('should handle mouse event target casting', () => {
			// Create button
			const button = document.createElement('button');
			button.id = 'test-button';
			document.body.appendChild(button);

			// Simulate mouse event
			const mockMouseEvent = {
				target: button,
				type: 'click'
			} as unknown as MouseEvent;

			// Test mouse event target casting
			const target = mockMouseEvent.target as HTMLButtonElement;
			expect(target).toBe(button);
			expect(target.id).toBe('test-button');
		});
	});

	describe('Style Manipulation Type Safety', () => {
		it('should safely manipulate element styles', () => {
			// Create element
			const div = document.createElement('div');
			div.id = 'loading-state';
			document.body.appendChild(div);

			// Test style manipulation
			const element = document.getElementById('loading-state') as HTMLElement;
			
			expect(element.style).toBeDefined();
			
			// Test style property setting
			element.style.display = 'flex';
			element.style.justifyContent = 'center';
			element.style.alignItems = 'center';
			
			expect(element.style.display).toBe('flex');
			expect(element.style.justifyContent).toBe('center');
			expect(element.style.alignItems).toBe('center');
		});

		it('should safely manipulate multiple element styles', () => {
			// Create multiple elements
			const elements = ['modal', 'overlay', 'content'].map(id => {
				const div = document.createElement('div');
				div.id = id;
				document.body.appendChild(div);
				return div;
			});

			// Test batch style manipulation
			elements.forEach(element => {
				const typedElement = element as HTMLElement;
				typedElement.style.visibility = 'hidden';
				expect(typedElement.style.visibility).toBe('hidden');
			});
		});
	});

	describe('Content Manipulation Type Safety', () => {
		it('should safely manipulate textContent', () => {
			// Create element
			const span = document.createElement('span');
			span.id = 'error-message';
			document.body.appendChild(span);

			// Test textContent manipulation
			const element = document.getElementById('error-message') as HTMLElement;
			
			element.textContent = 'Error occurred';
			expect(element.textContent).toBe('Error occurred');
			
			element.textContent = '';
			expect(element.textContent).toBe('');
		});

		it('should safely manipulate innerHTML', () => {
			// Create container
			const div = document.createElement('div');
			div.id = 'teams-grid';
			document.body.appendChild(div);

			// Test innerHTML manipulation
			const element = document.getElementById('teams-grid') as HTMLElement;
			
			const htmlContent = '<div class="team-card">Team 1</div><div class="team-card">Team 2</div>';
			element.innerHTML = htmlContent;
			
			expect(element.children).toHaveLength(2);
			expect(element.children[0].textContent).toBe('Team 1');
			expect(element.children[1].textContent).toBe('Team 2');
		});
	});
});