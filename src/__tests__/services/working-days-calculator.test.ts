import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	WorkingDaysCalculator,
	TeamWorkingDaysConfig,
	DateRange,
	CalendarEntry
} from "../../services/working-days-calculator";
import { TestDataFactory as BaseTestDataFactory } from "../helpers/test-data-factory";

/**
 * Test constants for consistent date testing
 */
const TEST_DATES = {
	// July 2024 - Monday July 1st week
	MONDAY_JULY_1: new Date("2024-07-01"),
	TUESDAY_JULY_2: new Date("2024-07-02"),
	WEDNESDAY_JULY_3: new Date("2024-07-03"),
	THURSDAY_JULY_4: new Date("2024-07-04"),
	FRIDAY_JULY_5: new Date("2024-07-05"),
	SATURDAY_JULY_6: new Date("2024-07-06"),
	SUNDAY_JULY_7: new Date("2024-07-07"),
	// Extended ranges
	MONDAY_JULY_8: new Date("2024-07-08"),
	TUESDAY_JULY_9: new Date("2024-07-09"),
	WEDNESDAY_JULY_10: new Date("2024-07-10"),
	FRIDAY_JULY_12: new Date("2024-07-12"),
	SUNDAY_JULY_14: new Date("2024-07-14"),
	// Edge case dates
	TIMEZONE_TEST_DATE: new Date("2024-07-01T08:00:00Z"),
	INVALID_DATE: new Date("invalid")
} as const;

/**
 * Test configuration factories
 */
class TestConfigFactory {
	static createStandardConfig(): TeamWorkingDaysConfig {
		return {
			workingDaysPerWeek: 5,
			workingDays: [1, 2, 3, 4, 5], // Monday-Friday
			holidays: [],
			timeZone: "UTC"
		};
	}

	static createConfigWithHolidays(holidays: Date[]): TeamWorkingDaysConfig {
		return {
			...TestConfigFactory.createStandardConfig(),
			holidays
		};
	}

	static createFourDayWorkWeekConfig(): TeamWorkingDaysConfig {
		return {
			workingDaysPerWeek: 4,
			workingDays: [1, 2, 3, 4], // Monday-Thursday
			holidays: [],
			timeZone: "UTC"
		};
	}

	static createTimezoneConfig(timeZone: string): TeamWorkingDaysConfig {
		return {
			...TestConfigFactory.createStandardConfig(),
			timeZone
		};
	}
}

/**
 * Working days calculator specific test data factories
 */
class WorkingDaysTestDataFactory extends BaseTestDataFactory {
	static createSimpleWeekRange(): { startDate: Date; endDate: Date } {
		return {
			startDate: TEST_DATES.MONDAY_JULY_1,
			endDate: TEST_DATES.FRIDAY_JULY_5
		};
	}

	static createWeekWithWeekendsRange(): { startDate: Date; endDate: Date } {
		return {
			startDate: TEST_DATES.MONDAY_JULY_1,
			endDate: TEST_DATES.SUNDAY_JULY_7
		};
	}

	static createTwoWeekRange(): { startDate: Date; endDate: Date } {
		return {
			startDate: TEST_DATES.MONDAY_JULY_1,
			endDate: TEST_DATES.SUNDAY_JULY_14
		};
	}

	static createPtoEntry(userId: string, startDate: Date, endDate: Date, allDay = true): CalendarEntry {
		return {
			userId,
			startDate,
			endDate,
			allDay
		};
	}

	static createSprintRange(startDate: Date, endDate: Date): DateRange {
		return { startDate, endDate };
	}
}

/**
 * Test assertion helpers
 */
class TestAssertions {
	static expectWorkingDayCount(
		calculator: WorkingDaysCalculator,
		startDate: Date,
		endDate: Date,
		config: TeamWorkingDaysConfig,
		expectedCount: number,
		description?: string
	): void {
		const result = calculator.calculateWorkingDays(startDate, endDate, config);
		expect(result).toBe(expectedCount);
	}

	static expectWorkingDayResult(
		calculator: WorkingDaysCalculator,
		date: Date,
		config: TeamWorkingDaysConfig,
		expected: boolean,
		description?: string
	): void {
		const result = calculator.isWorkingDay(date, config);
		expect(result).toBe(expected);
	}

	static expectArrayLength(actual: unknown[], expectedLength: number): void {
		expect(actual).toHaveLength(expectedLength);
	}

	static expectErrorToBeThrown(fn: () => void, expectedMessage: string, description?: string): void {
		expect(fn).toThrow(expectedMessage);
	}
}

describe("WorkingDaysCalculator", () => {
	let calculator: WorkingDaysCalculator;
	let standardConfig: TeamWorkingDaysConfig;

	beforeEach(() => {
		calculator = new WorkingDaysCalculator();
		standardConfig = TestConfigFactory.createStandardConfig();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("calculateWorkingDays", () => {
		describe("basic functionality", () => {
			it("should calculate working days for a standard work week", () => {
				const { startDate, endDate } = WorkingDaysTestDataFactory.createSimpleWeekRange();

				TestAssertions.expectWorkingDayCount(
					calculator,
					startDate,
					endDate,
					standardConfig,
					5,
					"Monday through Friday should be 5 working days"
				);
			});

			it("should exclude weekends from working day calculations", () => {
				const { startDate, endDate } = WorkingDaysTestDataFactory.createWeekWithWeekendsRange();

				TestAssertions.expectWorkingDayCount(
					calculator,
					startDate,
					endDate,
					standardConfig,
					5,
					"Week including weekend should still count only weekdays"
				);
			});

			it("should handle single day ranges correctly", () => {
				TestAssertions.expectWorkingDayCount(
					calculator,
					TEST_DATES.MONDAY_JULY_1,
					TEST_DATES.MONDAY_JULY_1,
					standardConfig,
					1,
					"Single working day should count as 1"
				);

				TestAssertions.expectWorkingDayCount(
					calculator,
					TEST_DATES.SATURDAY_JULY_6,
					TEST_DATES.SATURDAY_JULY_6,
					standardConfig,
					0,
					"Single weekend day should count as 0"
				);
			});

			it("should handle date ranges spanning multiple weeks", () => {
				const { startDate, endDate } = WorkingDaysTestDataFactory.createTwoWeekRange();

				TestAssertions.expectWorkingDayCount(
					calculator,
					startDate,
					endDate,
					standardConfig,
					10,
					"Two weeks should contain 10 working days"
				);
			});
		});

		describe("holiday handling", () => {
			it("should exclude holidays from working day calculations", () => {
				const configWithHoliday = TestConfigFactory.createConfigWithHolidays([TEST_DATES.THURSDAY_JULY_4]);
				const { startDate, endDate } = WorkingDaysTestDataFactory.createSimpleWeekRange();

				TestAssertions.expectWorkingDayCount(
					calculator,
					startDate,
					endDate,
					configWithHoliday,
					4,
					"Week with one holiday should have 4 working days"
				);
			});
		});

		describe("custom work schedules", () => {
			it("should respect custom working days configuration", () => {
				const fourDayConfig = TestConfigFactory.createFourDayWorkWeekConfig();
				const { startDate, endDate } = WorkingDaysTestDataFactory.createSimpleWeekRange();

				TestAssertions.expectWorkingDayCount(
					calculator,
					startDate,
					endDate,
					fourDayConfig,
					4,
					"Four-day work week should count only Monday-Thursday"
				);
			});
		});

		describe("edge cases and validation", () => {
			it("should handle same start and end date", () => {
				TestAssertions.expectWorkingDayCount(
					calculator,
					TEST_DATES.MONDAY_JULY_1,
					TEST_DATES.MONDAY_JULY_1,
					standardConfig,
					1,
					"Same start and end date should work correctly"
				);
			});

			it("should throw error for invalid date ranges", () => {
				TestAssertions.expectErrorToBeThrown(
					() =>
						calculator.calculateWorkingDays(
							TEST_DATES.FRIDAY_JULY_5,
							TEST_DATES.MONDAY_JULY_1,
							standardConfig
						),
					"End date must be greater than or equal to start date",
					"End date before start date should throw error"
				);
			});
		});
	});

	describe("isWorkingDay", () => {
		describe("standard working days", () => {
			it("should return true for configured working days", () => {
				const workingDays = [TEST_DATES.MONDAY_JULY_1, TEST_DATES.TUESDAY_JULY_2, TEST_DATES.FRIDAY_JULY_5];

				workingDays.forEach(date => {
					TestAssertions.expectWorkingDayResult(
						calculator,
						date,
						standardConfig,
						true,
						`${date.toDateString()} should be a working day`
					);
				});
			});

			it("should return false for weekends", () => {
				const weekendDays = [TEST_DATES.SATURDAY_JULY_6, TEST_DATES.SUNDAY_JULY_7];

				weekendDays.forEach(date => {
					TestAssertions.expectWorkingDayResult(
						calculator,
						date,
						standardConfig,
						false,
						`${date.toDateString()} should not be a working day`
					);
				});
			});
		});

		describe("holiday handling", () => {
			it("should return false for holidays", () => {
				const configWithHoliday = TestConfigFactory.createConfigWithHolidays([TEST_DATES.THURSDAY_JULY_4]);

				TestAssertions.expectWorkingDayResult(
					calculator,
					TEST_DATES.THURSDAY_JULY_4,
					configWithHoliday,
					false,
					"Holiday should not be considered a working day"
				);
			});
		});

		describe("custom work schedules", () => {
			it("should respect custom working days configuration", () => {
				const customConfig = TestConfigFactory.createFourDayWorkWeekConfig();

				TestAssertions.expectWorkingDayResult(
					calculator,
					TEST_DATES.THURSDAY_JULY_4,
					customConfig,
					true,
					"Thursday should be working day in 4-day week"
				);

				TestAssertions.expectWorkingDayResult(
					calculator,
					TEST_DATES.FRIDAY_JULY_5,
					customConfig,
					false,
					"Friday should not be working day in 4-day week"
				);
			});
		});
	});

	describe("getWorkingDaysInRange", () => {
		describe("basic functionality", () => {
			it("should return array of working days in range", () => {
				const { startDate, endDate } = WorkingDaysTestDataFactory.createSimpleWeekRange();
				const result = calculator.getWorkingDaysInRange(startDate, endDate, standardConfig);

				TestAssertions.expectArrayLength(result, 5);
				expect(result[0]).toEqual(TEST_DATES.MONDAY_JULY_1);
				expect(result[4]).toEqual(TEST_DATES.FRIDAY_JULY_5);
			});

			it("should exclude weekends from returned array", () => {
				const { startDate, endDate } = WorkingDaysTestDataFactory.createWeekWithWeekendsRange();
				const result = calculator.getWorkingDaysInRange(startDate, endDate, standardConfig);

				TestAssertions.expectArrayLength(result, 5);
				expect(result.every(date => date.getUTCDay() !== 0 && date.getUTCDay() !== 6)).toBe(true);
			});
		});

		describe("holiday handling", () => {
			it("should exclude holidays from returned array", () => {
				const configWithHoliday = TestConfigFactory.createConfigWithHolidays([TEST_DATES.THURSDAY_JULY_4]);
				const { startDate, endDate } = WorkingDaysTestDataFactory.createSimpleWeekRange();
				const result = calculator.getWorkingDaysInRange(startDate, endDate, configWithHoliday);

				TestAssertions.expectArrayLength(result, 4);
				expect(result.find(date => date.getTime() === TEST_DATES.THURSDAY_JULY_4.getTime())).toBeUndefined();
			});
		});
	});

	describe("calculateCapacityImpact", () => {
		describe("basic capacity calculations", () => {
			it("should calculate capacity impact from calendar entries", () => {
				const sprintRange = WorkingDaysTestDataFactory.createSprintRange(
					TEST_DATES.MONDAY_JULY_1,
					TEST_DATES.SUNDAY_JULY_14
				);

				const ptoEntries = [
					WorkingDaysTestDataFactory.createPtoEntry(
						"user1",
						TEST_DATES.WEDNESDAY_JULY_3,
						TEST_DATES.FRIDAY_JULY_5
					),
					WorkingDaysTestDataFactory.createPtoEntry(
						"user2",
						TEST_DATES.MONDAY_JULY_8,
						TEST_DATES.WEDNESDAY_JULY_10
					)
				];

				const result = calculator.calculateCapacityImpact(sprintRange, ptoEntries, standardConfig);

				expect(result.totalWorkingDays).toBe(10); // 2 weeks of working days
				expect(result.impactedDays).toBe(6); // 3 days user1 + 3 days user2
				expect(result.availableCapacityPercentage).toBe(40); // (10-6)/10 = 40%
			});
		});

		describe("overlapping entries", () => {
			it("should handle overlapping PTO entries correctly", () => {
				const sprintRange = WorkingDaysTestDataFactory.createSprintRange(
					TEST_DATES.MONDAY_JULY_1,
					TEST_DATES.FRIDAY_JULY_5
				);

				const overlappingPto = [
					WorkingDaysTestDataFactory.createPtoEntry(
						"user1",
						TEST_DATES.MONDAY_JULY_1,
						TEST_DATES.WEDNESDAY_JULY_3
					),
					WorkingDaysTestDataFactory.createPtoEntry(
						"user1",
						TEST_DATES.WEDNESDAY_JULY_3,
						TEST_DATES.FRIDAY_JULY_5
					)
				];

				const result = calculator.calculateCapacityImpact(sprintRange, overlappingPto, standardConfig);

				expect(result.impactedDays).toBe(5); // Should not double-count overlapping days
			});
		});

		describe("partial day entries", () => {
			it("should handle partial day entries", () => {
				const sprintRange = WorkingDaysTestDataFactory.createSprintRange(
					TEST_DATES.MONDAY_JULY_1,
					TEST_DATES.FRIDAY_JULY_5
				);

				const partialDayPto = [
					WorkingDaysTestDataFactory.createPtoEntry(
						"user1",
						TEST_DATES.MONDAY_JULY_1,
						TEST_DATES.MONDAY_JULY_1,
						false
					)
				];

				const result = calculator.calculateCapacityImpact(sprintRange, partialDayPto, standardConfig);

				expect(result.impactedDays).toBe(0.5); // Half day impact
			});
		});
	});

	describe("error handling and edge cases", () => {
		describe("invalid input handling", () => {
			it("should handle invalid dates gracefully", () => {
				TestAssertions.expectErrorToBeThrown(
					() => calculator.isWorkingDay(TEST_DATES.INVALID_DATE, standardConfig),
					"Invalid date provided",
					"Invalid date should throw descriptive error"
				);
			});

			it("should handle empty holidays array", () => {
				const configWithEmptyHolidays = TestConfigFactory.createConfigWithHolidays([]);

				TestAssertions.expectWorkingDayResult(
					calculator,
					TEST_DATES.MONDAY_JULY_1,
					configWithEmptyHolidays,
					true,
					"Empty holidays array should not affect working day calculation"
				);
			});
		});

		describe("timezone handling", () => {
			it("should handle timezone differences correctly", () => {
				const utcConfig = TestConfigFactory.createTimezoneConfig("UTC");
				const pstConfig = TestConfigFactory.createTimezoneConfig("America/Los_Angeles");

				// Both should handle the date correctly regardless of timezone
				TestAssertions.expectWorkingDayResult(
					calculator,
					TEST_DATES.TIMEZONE_TEST_DATE,
					utcConfig,
					true,
					"UTC timezone should work correctly"
				);

				TestAssertions.expectWorkingDayResult(
					calculator,
					TEST_DATES.TIMEZONE_TEST_DATE,
					pstConfig,
					true,
					"PST timezone should work correctly"
				);
			});
		});
	});
});
