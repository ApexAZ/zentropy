import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useFormValidation } from "../useFormValidation";

interface TestFormData {
	name: string;
	email: string;
	age: number;
	description: string;
}

describe("useFormValidation", () => {
	const initialData: TestFormData = {
		name: "",
		email: "",
		age: 0,
		description: ""
	};

	const requiredFields: (keyof TestFormData)[] = ["name", "email"];

	describe("Field Empty Checking", () => {
		it("should identify empty string fields as empty", () => {
			const { result } = renderHook(() => useFormValidation(initialData, requiredFields));

			expect(result.current.isFieldEmpty("name")).toBe(true);
			expect(result.current.isFieldEmpty("email")).toBe(true);
		});

		it("should identify zero numeric fields as empty", () => {
			const { result } = renderHook(() => useFormValidation(initialData, requiredFields));

			expect(result.current.isFieldEmpty("age")).toBe(true);
		});

		it("should identify fields with only whitespace as empty", () => {
			const dataWithWhitespace = { ...initialData, name: "   ", email: "\t\n" };
			const { result } = renderHook(() => useFormValidation(dataWithWhitespace, requiredFields));

			expect(result.current.isFieldEmpty("name")).toBe(true);
			expect(result.current.isFieldEmpty("email")).toBe(true);
		});

		it("should identify populated fields as not empty", () => {
			const populatedData = { ...initialData, name: "John", email: "john@example.com", age: 25 };
			const { result } = renderHook(() => useFormValidation(populatedData, requiredFields));

			expect(result.current.isFieldEmpty("name")).toBe(false);
			expect(result.current.isFieldEmpty("email")).toBe(false);
			expect(result.current.isFieldEmpty("age")).toBe(false);
		});
	});

	describe("Border Class Generation", () => {
		it("should return red border for empty required fields", () => {
			const { result } = renderHook(() => useFormValidation(initialData, requiredFields));

			expect(result.current.getFieldBorderClass("name")).toBe("border-red-300");
			expect(result.current.getFieldBorderClass("email")).toBe("border-red-300");
		});

		it("should return normal border for populated required fields", () => {
			const populatedData = { ...initialData, name: "John", email: "john@example.com" };
			const { result } = renderHook(() => useFormValidation(populatedData, requiredFields));

			expect(result.current.getFieldBorderClass("name")).toBe("border-layout-background");
			expect(result.current.getFieldBorderClass("email")).toBe("border-layout-background");
		});

		it("should return normal border for optional fields regardless of content", () => {
			const { result } = renderHook(() => useFormValidation(initialData, requiredFields));

			// Optional field (not in requiredFields)
			expect(result.current.getFieldBorderClass("description")).toBe("border-layout-background");
			expect(result.current.getFieldBorderClass("age")).toBe("border-layout-background");
		});

		it("should allow manual override of required status", () => {
			const { result } = renderHook(() => useFormValidation(initialData, requiredFields));

			// Force required field to be treated as optional
			expect(result.current.getFieldBorderClass("name", false)).toBe("border-layout-background");

			// Force optional field to be treated as required
			expect(result.current.getFieldBorderClass("description", true)).toBe("border-red-300");
		});
	});

	describe("Required Field Status", () => {
		it("should correctly identify which fields are required", () => {
			const { result } = renderHook(() => useFormValidation(initialData, requiredFields));

			expect(result.current.isFieldRequired("name")).toBe(true);
			expect(result.current.isFieldRequired("email")).toBe(true);
			expect(result.current.isFieldRequired("description")).toBe(false);
			expect(result.current.isFieldRequired("age")).toBe(false);
		});
	});

	describe("Form Data Updates", () => {
		it("should handle form data changes and update validation accordingly", () => {
			let formData = initialData;
			const { result, rerender } = renderHook(() => useFormValidation(formData, requiredFields));

			// Initially empty
			expect(result.current.isFieldEmpty("name")).toBe(true);
			expect(result.current.getFieldBorderClass("name")).toBe("border-red-300");

			// Update form data
			act(() => {
				formData = { ...formData, name: "John Doe" };
				rerender();
			});

			// Should now be populated
			expect(result.current.isFieldEmpty("name")).toBe(false);
			expect(result.current.getFieldBorderClass("name")).toBe("border-layout-background");
		});
	});

	describe("Type Safety", () => {
		it("should only accept valid field names from the form data type", () => {
			const { result } = renderHook(() => useFormValidation(initialData, requiredFields));

			// These should work (valid field names)
			expect(() => result.current.isFieldEmpty("name")).not.toThrow();
			expect(() => result.current.isFieldEmpty("email")).not.toThrow();
			expect(() => result.current.isFieldEmpty("age")).not.toThrow();
			expect(() => result.current.isFieldEmpty("description")).not.toThrow();

			// TypeScript should prevent invalid field names at compile time
			// This test validates the hook accepts the correct types
			expect(typeof result.current.isFieldEmpty).toBe("function");
			expect(typeof result.current.getFieldBorderClass).toBe("function");
			expect(typeof result.current.isFieldRequired).toBe("function");
		});
	});
});
