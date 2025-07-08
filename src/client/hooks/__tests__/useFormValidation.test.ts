import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useFormValidation } from "../useFormValidation";

interface TestFormData {
	name: string;
	email: string;
	age: number;
	description: string;
}

describe("useFormValidation", () => {
	const initialValues: TestFormData = {
		name: "",
		email: "",
		age: 0,
		description: ""
	};

	// Mock validation function
	const mockValidate = vi.fn((data: TestFormData) => {
		const errors: Record<string, string> = {};
		
		if (!data.name || data.name.trim() === "") {
			errors.name = "Name is required";
		}
		
		if (!data.email || data.email.trim() === "") {
			errors.email = "Email is required";
		} else if (data.email && !data.email.includes("@")) {
			errors.email = "Email must be valid";
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	});

	describe("Form State Management", () => {
		it("should initialize with correct initial state", () => {
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues,
					validate: mockValidate
				})
			);

			expect(result.current.values).toEqual(initialValues);
			expect(result.current.errors).toEqual({});
			expect(result.current.touched).toEqual({});
			expect(result.current.isValid).toBe(true);
			expect(result.current.isSubmitting).toBe(false);
		});

		it("should handle field value changes", () => {
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues,
					validate: mockValidate
				})
			);

			act(() => {
				result.current.handleChange("name", "John Doe");
			});

			expect(result.current.values.name).toBe("John Doe");
		});

		it("should clear errors when field value changes", () => {
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues,
					validate: mockValidate
				})
			);

			// First, create an error
			act(() => {
				result.current.setFieldError("name", "Name is required");
			});

			expect(result.current.errors.name).toBe("Name is required");

			// Then change the field value - should clear the error
			act(() => {
				result.current.handleChange("name", "John");
			});

			expect(result.current.errors.name).toBe("");
		});

		it("should mark fields as touched on blur", () => {
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues,
					validate: mockValidate
				})
			);

			act(() => {
				result.current.handleBlur("name");
			});

			expect(result.current.touched.name).toBe(true);
		});
	});

	describe("Form Validation", () => {
		it("should validate form and set errors", () => {
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues,
					validate: mockValidate
				})
			);

			// Trigger validation
			act(() => {
				const isValid = result.current.validateForm();
				expect(isValid).toBe(false);
			});

			expect(result.current.errors).toEqual({
				name: "Name is required",
				email: "Email is required"
			});
			expect(result.current.isValid).toBe(false);
		});

		it("should validate individual fields", () => {
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues,
					validate: mockValidate
				})
			);

			// Set a valid name
			act(() => {
				result.current.setFieldValue("name", "John");
			});

			// Validate the name field separately
			act(() => {
				result.current.validateField("name");
			});

			// Name should not have an error after setting valid value
			expect(result.current.errors.name).toBeFalsy();

			// Validate empty email field
			act(() => {
				result.current.validateField("email");
			});

			expect(result.current.errors.email).toBe("Email is required");
		});

		it("should handle email format validation", () => {
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues: {
						name: "John", // Set valid name so email validation gets priority
						email: "",
						age: 0,
						description: ""
					},
					validate: mockValidate
				})
			);

			// Set invalid email first
			act(() => {
				result.current.setFieldValue("email", "invalid-email");
			});

			// Then validate email field
			act(() => {
				result.current.validateField("email");
			});

			expect(result.current.errors.email).toBe("Email must be valid");

			// Set valid email
			act(() => {
				result.current.setFieldValue("email", "john@example.com");
			});

			// Validate again
			act(() => {
				result.current.validateField("email");
			});

			expect(result.current.errors.email).toBeFalsy();
		});
	});

	describe("Form Submission", () => {
		it("should handle successful form submission", async () => {
			const mockOnSubmit = vi.fn();
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues: {
						name: "John",
						email: "john@example.com",
						age: 25,
						description: ""
					},
					validate: mockValidate,
					onSubmit: mockOnSubmit
				})
			);

			await act(async () => {
				await result.current.handleSubmit();
			});

			expect(mockOnSubmit).toHaveBeenCalledWith({
				name: "John",
				email: "john@example.com",
				age: 25,
				description: ""
			});
		});

		it("should prevent submission when form is invalid", async () => {
			const mockOnSubmit = vi.fn();
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues, // Empty initial values
					validate: mockValidate,
					onSubmit: mockOnSubmit
				})
			);

			await act(async () => {
				await result.current.handleSubmit();
			});

			expect(mockOnSubmit).not.toHaveBeenCalled();
			expect(result.current.errors).toEqual({
				name: "Name is required",
				email: "Email is required"
			});
		});

		it("should mark all fields as touched on submission", async () => {
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues,
					validate: mockValidate
				})
			);

			await act(async () => {
				await result.current.handleSubmit();
			});

			expect(result.current.touched).toEqual({
				name: true,
				email: true,
				age: true,
				description: true
			});
		});

		it("should manage submitting state", async () => {
			const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues: {
						name: "John",
						email: "john@example.com",
						age: 25,
						description: ""
					},
					validate: mockValidate,
					onSubmit: mockOnSubmit
				})
			);

			expect(result.current.isSubmitting).toBe(false);

			const submitPromise = act(async () => {
				await result.current.handleSubmit();
			});

			await submitPromise;

			expect(result.current.isSubmitting).toBe(false);
		});
	});

	describe("Form Reset", () => {
		it("should reset form to initial state", () => {
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues,
					validate: mockValidate
				})
			);

			// Make changes to the form
			act(() => {
				result.current.setFieldValue("name", "John");
				result.current.setFieldError("email", "Some error");
				result.current.setFieldTouched("name", true);
			});

			// Reset form
			act(() => {
				result.current.resetForm();
			});

			expect(result.current.values).toEqual(initialValues);
			expect(result.current.errors).toEqual({});
			expect(result.current.touched).toEqual({});
			expect(result.current.isSubmitting).toBe(false);
		});
	});

	describe("Field Management", () => {
		it("should set individual field values", () => {
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues,
					validate: mockValidate
				})
			);

			act(() => {
				result.current.setFieldValue("name", "Jane");
			});

			expect(result.current.values.name).toBe("Jane");
		});

		it("should set individual field errors", () => {
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues,
					validate: mockValidate
				})
			);

			act(() => {
				result.current.setFieldError("name", "Custom error");
			});

			expect(result.current.errors.name).toBe("Custom error");
		});

		it("should set individual field touched state", () => {
			const { result } = renderHook(() => 
				useFormValidation({
					initialValues,
					validate: mockValidate
				})
			);

			act(() => {
				result.current.setFieldTouched("name", true);
			});

			expect(result.current.touched.name).toBe(true);

			act(() => {
				result.current.setFieldTouched("email", false);
			});

			expect(result.current.touched.email).toBe(false);
		});
	});
});
