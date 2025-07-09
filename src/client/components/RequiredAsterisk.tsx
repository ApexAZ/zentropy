import React from "react";

interface RequiredAsteriskProps {
	/**
	 * Whether the field is currently empty
	 */
	isEmpty: boolean;

	/**
	 * Whether the field is required
	 */
	isRequired: boolean;
}

/**
 * Reusable component that displays a red asterisk (*) next to form field labels
 * when the field is required and empty. Automatically hides when the field
 * is populated or not required.
 *
 * @param isEmpty - Whether the associated form field is empty
 * @param isRequired - Whether the associated form field is required
 */
const RequiredAsterisk: React.FC<RequiredAsteriskProps> = ({ isEmpty, isRequired }) => {
	// Only show asterisk if field is both required and empty
	if (!isRequired || !isEmpty) {
		return null;
	}

	return <span className="text-error ml-1">*</span>;
};

export default RequiredAsterisk;
