import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../../__tests__/utils/testRenderUtils";
// eslint-disable-next-line no-restricted-imports -- Tab component tests require userEvent for comprehensive keyboard navigation and accessibility testing
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { TabList, Tab, TabPanel } from "../Tab";

describe("Tab Components", () => {
	const mockOnTabChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Tab", () => {
		/* eslint-disable no-restricted-syntax */
		// Tab interaction tests require userEvent for comprehensive keyboard navigation and accessibility testing
		const defaultProps = {
			id: "profile",
			label: "Profile",
			isActive: false,
			onClick: mockOnTabChange
		};

		it("should render tab with correct label", () => {
			renderWithFullEnvironment(<Tab {...defaultProps} />);

			expect(screen.getByRole("tab")).toBeInTheDocument();
			expect(screen.getByText("Profile")).toBeInTheDocument();
		});

		it("should have correct accessibility attributes", () => {
			renderWithFullEnvironment(<Tab {...defaultProps} />);

			const tab = screen.getByRole("tab");
			expect(tab).toHaveAttribute("aria-selected", "false");
			expect(tab).toHaveAttribute("aria-controls", "tabpanel-profile");
			expect(tab).toHaveAttribute("data-tab-id", "profile");
			expect(tab).toHaveAttribute("tabIndex", "-1");
		});

		it("should have correct accessibility attributes when active", () => {
			renderWithFullEnvironment(<Tab {...defaultProps} isActive={true} />);

			const tab = screen.getByRole("tab");
			expect(tab).toHaveAttribute("aria-selected", "true");
			expect(tab).toHaveAttribute("tabIndex", "0");
		});

		it("should call onClick when clicked", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<Tab {...defaultProps} />);

			const tab = screen.getByRole("tab");
			await user.click(tab);

			expect(mockOnTabChange).toHaveBeenCalledWith("profile");
		});

		it("should call onClick when Enter key is pressed", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<Tab {...defaultProps} isActive={true} />);

			const tab = screen.getByRole("tab");
			tab.focus();
			await user.keyboard("{Enter}");

			expect(mockOnTabChange).toHaveBeenCalledWith("profile");
		});

		it("should call onClick when Space key is pressed", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<Tab {...defaultProps} isActive={true} />);

			const tab = screen.getByRole("tab");
			tab.focus();
			await user.keyboard(" ");

			expect(mockOnTabChange).toHaveBeenCalledWith("profile");
		});

		it("should have active styling when isActive is true", () => {
			renderWithFullEnvironment(<Tab {...defaultProps} isActive={true} />);

			const tab = screen.getByRole("tab");
			expect(tab).toHaveClass("text-contrast", "border-interactive");
		});

		it("should have inactive styling when isActive is false", () => {
			renderWithFullEnvironment(<Tab {...defaultProps} isActive={false} />);

			const tab = screen.getByRole("tab");
			expect(tab).toHaveClass("border-transparent");
			expect(tab).not.toHaveClass("text-contrast", "border-interactive");
		});

		it("should apply custom className", () => {
			renderWithFullEnvironment(<Tab {...defaultProps} className="custom-class" />);

			const tab = screen.getByRole("tab");
			expect(tab).toHaveClass("custom-class");
		});
		/* eslint-enable no-restricted-syntax */
	});

	describe("TabList", () => {
		const TabListWithTabs = ({ activeTab = "profile" }: { activeTab?: string }) => (
			<TabList activeTab={activeTab} onTabChange={mockOnTabChange}>
				<Tab id="profile" label="Profile" isActive={activeTab === "profile"} onClick={mockOnTabChange} />
				<Tab id="security" label="Security" isActive={activeTab === "security"} onClick={mockOnTabChange} />
				<Tab id="billing" label="Billing" isActive={activeTab === "billing"} onClick={mockOnTabChange} />
			</TabList>
		);

		it("should render tablist with correct role", () => {
			renderWithFullEnvironment(<TabListWithTabs />);

			expect(screen.getByRole("tablist")).toBeInTheDocument();
		});

		it("should render all child tabs", () => {
			renderWithFullEnvironment(<TabListWithTabs />);

			expect(screen.getByText("Profile")).toBeInTheDocument();
			expect(screen.getByText("Security")).toBeInTheDocument();
			expect(screen.getByText("Billing")).toBeInTheDocument();
		});

		it("should handle keyboard navigation with ArrowRight", () => {
			renderWithFullEnvironment(<TabListWithTabs activeTab="profile" />);

			const tablist = screen.getByRole("tablist");
			fireEvent.keyDown(tablist, { key: "ArrowRight" });

			expect(mockOnTabChange).toHaveBeenCalledWith("security");
		});

		it("should handle keyboard navigation with ArrowLeft", () => {
			renderWithFullEnvironment(<TabListWithTabs activeTab="security" />);

			const tablist = screen.getByRole("tablist");
			fireEvent.keyDown(tablist, { key: "ArrowLeft" });

			expect(mockOnTabChange).toHaveBeenCalledWith("profile");
		});

		it("should wrap around when using ArrowRight on last tab", () => {
			renderWithFullEnvironment(<TabListWithTabs activeTab="billing" />);

			const tablist = screen.getByRole("tablist");
			fireEvent.keyDown(tablist, { key: "ArrowRight" });

			expect(mockOnTabChange).toHaveBeenCalledWith("profile");
		});

		it("should wrap around when using ArrowLeft on first tab", () => {
			renderWithFullEnvironment(<TabListWithTabs activeTab="profile" />);

			const tablist = screen.getByRole("tablist");
			fireEvent.keyDown(tablist, { key: "ArrowLeft" });

			expect(mockOnTabChange).toHaveBeenCalledWith("billing");
		});

		it("should handle Home key to select first tab", () => {
			renderWithFullEnvironment(<TabListWithTabs activeTab="billing" />);

			const tablist = screen.getByRole("tablist");
			fireEvent.keyDown(tablist, { key: "Home" });

			expect(mockOnTabChange).toHaveBeenCalledWith("profile");
		});

		it("should handle End key to select last tab", () => {
			renderWithFullEnvironment(<TabListWithTabs activeTab="profile" />);

			const tablist = screen.getByRole("tablist");
			fireEvent.keyDown(tablist, { key: "End" });

			expect(mockOnTabChange).toHaveBeenCalledWith("billing");
		});

		it("should not handle other keys", () => {
			renderWithFullEnvironment(<TabListWithTabs activeTab="profile" />);

			const tablist = screen.getByRole("tablist");
			fireEvent.keyDown(tablist, { key: "Escape" });

			expect(mockOnTabChange).not.toHaveBeenCalled();
		});

		it("should apply custom className", () => {
			renderWithFullEnvironment(
				<TabList activeTab="profile" onTabChange={mockOnTabChange} className="custom-class">
					<Tab id="profile" label="Profile" isActive={true} onClick={mockOnTabChange} />
				</TabList>
			);

			const tablist = screen.getByRole("tablist");
			expect(tablist).toHaveClass("custom-class");
		});
	});

	describe("TabPanel", () => {
		const defaultProps = {
			tabId: "profile",
			activeTab: "profile",
			children: <div>Profile content</div>
		};

		it("should render panel content when active", () => {
			renderWithFullEnvironment(<TabPanel {...defaultProps} />);

			expect(screen.getByRole("tabpanel")).toBeInTheDocument();
			expect(screen.getByText("Profile content")).toBeInTheDocument();
		});

		it("should not render panel content when inactive", () => {
			renderWithFullEnvironment(<TabPanel {...defaultProps} activeTab="security" />);

			expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();
			expect(screen.queryByText("Profile content")).not.toBeInTheDocument();
		});

		it("should have correct accessibility attributes", () => {
			renderWithFullEnvironment(<TabPanel {...defaultProps} />);

			const panel = screen.getByRole("tabpanel");
			expect(panel).toHaveAttribute("id", "tabpanel-profile");
			expect(panel).toHaveAttribute("aria-labelledby", "tab-profile");
			expect(panel).toHaveAttribute("tabIndex", "0");
		});

		it("should apply custom className", () => {
			renderWithFullEnvironment(<TabPanel {...defaultProps} className="custom-class" />);

			const panel = screen.getByRole("tabpanel");
			expect(panel).toHaveClass("custom-class");
		});
	});

	describe("Tab Integration", () => {
		/* eslint-disable no-restricted-syntax */
		// Tab integration tests require userEvent for comprehensive keyboard navigation and accessibility testing
		const TabbedInterface = () => {
			const [activeTab, setActiveTab] = React.useState("profile");

			return (
				<div>
					<TabList activeTab={activeTab} onTabChange={setActiveTab}>
						<Tab id="profile" label="Profile" isActive={activeTab === "profile"} onClick={setActiveTab} />
						<Tab
							id="security"
							label="Security"
							isActive={activeTab === "security"}
							onClick={setActiveTab}
						/>
					</TabList>

					<TabPanel tabId="profile" activeTab={activeTab}>
						<div>Profile Panel Content</div>
					</TabPanel>

					<TabPanel tabId="security" activeTab={activeTab}>
						<div>Security Panel Content</div>
					</TabPanel>
				</div>
			);
		};

		it("should show correct panel when tab is clicked", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<TabbedInterface />);

			// Initially shows profile panel
			expect(screen.getByText("Profile Panel Content")).toBeInTheDocument();
			expect(screen.queryByText("Security Panel Content")).not.toBeInTheDocument();

			// Click security tab
			const securityTab = screen.getByText("Security");
			await user.click(securityTab);

			// Should show security panel
			expect(screen.queryByText("Profile Panel Content")).not.toBeInTheDocument();
			expect(screen.getByText("Security Panel Content")).toBeInTheDocument();
		});

		it("should update tab states when different tab is selected", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<TabbedInterface />);

			const profileTab = screen.getByRole("tab", { name: "Profile" });
			const securityTab = screen.getByRole("tab", { name: "Security" });

			// Initially profile is active
			expect(profileTab).toHaveAttribute("aria-selected", "true");
			expect(securityTab).toHaveAttribute("aria-selected", "false");

			// Click security tab
			await user.click(securityTab);

			// Security should now be active
			expect(profileTab).toHaveAttribute("aria-selected", "false");
			expect(securityTab).toHaveAttribute("aria-selected", "true");
		});

		it("should handle keyboard navigation between tabs", () => {
			renderWithFullEnvironment(<TabbedInterface />);

			const tablist = screen.getByRole("tablist");
			const profileTab = screen.getByRole("tab", { name: "Profile" });
			const securityTab = screen.getByRole("tab", { name: "Security" });

			// Initially profile is active
			expect(profileTab).toHaveAttribute("aria-selected", "true");
			expect(screen.getByText("Profile Panel Content")).toBeInTheDocument();

			// Navigate to security tab with arrow key
			fireEvent.keyDown(tablist, { key: "ArrowRight" });

			// Security should now be active
			expect(securityTab).toHaveAttribute("aria-selected", "true");
			expect(screen.getByText("Security Panel Content")).toBeInTheDocument();
		});
		/* eslint-enable no-restricted-syntax */
	});
});
