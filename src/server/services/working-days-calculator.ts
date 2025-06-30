export interface TeamWorkingDaysConfig {
	workingDaysPerWeek: number;
	workingDays: number[]; // 0=Sunday, 1=Monday, etc.
	holidays: Date[];
	timeZone: string;
}

export interface DateRange {
	startDate: Date;
	endDate: Date;
}

export interface WorkingDayResult {
	totalWorkingDays: number;
	impactedDays: number;
	availableCapacityPercentage: number;
}

export interface CalendarEntry {
	userId: string;
	startDate: Date;
	endDate: Date;
	allDay: boolean;
}

export class WorkingDaysCalculator {
	/**
	 * Calculate the number of working days between two dates
	 * @param startDate Start date (inclusive)
	 * @param endDate End date (inclusive)
	 * @param config Team working days configuration
	 * @returns Number of working days
	 */
	calculateWorkingDays(startDate: Date, endDate: Date, config: TeamWorkingDaysConfig): number {
		try {
			this.validateDateRange(startDate, endDate);
			return this.getWorkingDaysInRange(startDate, endDate, config).length;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error calculating working days:", error);
			throw error;
		}
	}

	/**
	 * Check if a specific date is a working day
	 * @param date Date to check
	 * @param config Team working days configuration
	 * @returns True if it's a working day
	 */
	isWorkingDay(date: Date, config: TeamWorkingDaysConfig): boolean {
		try {
			if (!this.isValidDate(date)) {
				throw new Error("Invalid date provided");
			}

			const normalizedDate = this.normalizeDate(new Date(date));

			// Check if it's a configured working day
			if (!this.isConfiguredWorkingDay(normalizedDate, config)) {
				return false;
			}

			// Check if it's a holiday
			return !this.isHoliday(normalizedDate, config);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error checking working day:", error);
			throw error;
		}
	}

	/**
	 * Get an array of all working days within a date range
	 * @param startDate Start date (inclusive)
	 * @param endDate End date (inclusive)
	 * @param config Team working days configuration
	 * @returns Array of working days
	 */
	getWorkingDaysInRange(startDate: Date, endDate: Date, config: TeamWorkingDaysConfig): Date[] {
		try {
			this.validateDateRange(startDate, endDate);

			const workingDays: Date[] = [];
			const currentDate = this.normalizeDate(new Date(startDate));
			const finalDate = this.normalizeDate(new Date(endDate));

			while (currentDate <= finalDate) {
				if (this.isWorkingDay(currentDate, config)) {
					workingDays.push(new Date(currentDate));
				}
				this.addDays(currentDate, 1);
			}

			return workingDays;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error getting working days in range:", error);
			throw error;
		}
	}

	/**
	 * Calculate capacity impact from calendar entries
	 * @param sprintRange Date range of the sprint
	 * @param calendarEntries Array of calendar entries (PTO, holidays, etc.)
	 * @param config Team working days configuration
	 * @returns Capacity impact analysis
	 */
	calculateCapacityImpact(
		sprintRange: DateRange,
		calendarEntries: CalendarEntry[],
		config: TeamWorkingDaysConfig
	): WorkingDayResult {
		try {
			const totalWorkingDays = this.calculateWorkingDays(sprintRange.startDate, sprintRange.endDate, config);

			// Calculate impacted days from calendar entries
			let impactedDays = 0;
			const impactedDatesSet = new Set<string>();

			for (const entry of calendarEntries) {
				// Find overlap between sprint range and calendar entry
				const overlapStart = new Date(Math.max(sprintRange.startDate.getTime(), entry.startDate.getTime()));
				const overlapEnd = new Date(Math.min(sprintRange.endDate.getTime(), entry.endDate.getTime()));

				if (overlapStart <= overlapEnd) {
					const entryWorkingDays = this.getWorkingDaysInRange(overlapStart, overlapEnd, config);

					for (const workingDay of entryWorkingDays) {
						const dateKey = `${entry.userId}_${workingDay.toISOString().split("T")[0]}`;
						if (!impactedDatesSet.has(dateKey)) {
							impactedDatesSet.add(dateKey);
							impactedDays += entry.allDay ? 1 : 0.5;
						}
					}
				}
			}

			const availableCapacityPercentage =
				totalWorkingDays > 0 ? Math.round(((totalWorkingDays - impactedDays) / totalWorkingDays) * 100) : 100;

			return {
				totalWorkingDays,
				impactedDays,
				availableCapacityPercentage
			};
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error calculating capacity impact:", error);
			throw error;
		}
	}

	/**
	 * Validate date range inputs
	 * @param startDate Start date
	 * @param endDate End date
	 * @throws Error if dates are invalid or range is invalid
	 */
	private validateDateRange(startDate: Date, endDate: Date): void {
		if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
			throw new Error("Invalid date provided");
		}

		if (endDate < startDate) {
			throw new Error("End date must be greater than or equal to start date");
		}
	}

	/**
	 * Normalize date to UTC midnight to avoid timezone issues
	 * @param date Date to normalize
	 * @returns Normalized date
	 */
	private normalizeDate(date: Date): Date {
		const normalized = new Date(date);
		normalized.setUTCHours(0, 0, 0, 0);
		return normalized;
	}

	/**
	 * Add days to a date (modifies the original date)
	 * @param date Date to modify
	 * @param days Number of days to add
	 */
	private addDays(date: Date, days: number): void {
		date.setUTCDate(date.getUTCDate() + days);
	}

	/**
	 * Check if date falls on a configured working day
	 * @param date Normalized date
	 * @param config Team configuration
	 * @returns True if it's a configured working day
	 */
	private isConfiguredWorkingDay(date: Date, config: TeamWorkingDaysConfig): boolean {
		const dayOfWeek = date.getUTCDay();
		return config.workingDays.includes(dayOfWeek);
	}

	/**
	 * Check if date is a holiday
	 * @param date Normalized date
	 * @param config Team configuration
	 * @returns True if it's a holiday
	 */
	private isHoliday(date: Date, config: TeamWorkingDaysConfig): boolean {
		return config.holidays.some(holiday => {
			const normalizedHoliday = this.normalizeDate(new Date(holiday));
			return normalizedHoliday.getTime() === date.getTime();
		});
	}

	/**
	 * Validate if a date is valid
	 * @param date Date to validate
	 * @returns True if date is valid
	 */
	private isValidDate(date: Date): boolean {
		return date instanceof Date && !isNaN(date.getTime());
	}
}
