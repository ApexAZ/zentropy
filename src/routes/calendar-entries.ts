import { Router, Request, Response } from 'express';
import { CalendarEntryModel } from '../models/CalendarEntry';

const router = Router();

/**
 * GET /api/calendar-entries
 * Get all calendar entries, optionally filtered by team
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
	try {
		const teamId = _req.query.team_id as string | undefined;
		
		if (teamId) {
			const entries = await CalendarEntryModel.findByTeam(teamId);
			res.json(entries);
		} else {
			// For now, return empty array when no team specified
			// In production, you might want to get all entries across teams
			res.json([]);
		}
	} catch (error) {
		console.error('Error fetching calendar entries:', error);
		res.status(500).json({ message: 'Failed to fetch calendar entries' });
	}
});

/**
 * GET /api/calendar-entries/:id
 * Get a specific calendar entry
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: 'Entry ID is required' });
			return;
		}
		
		const entry = await CalendarEntryModel.findById(id);
		
		if (!entry) {
			res.status(404).json({ message: 'Calendar entry not found' });
			return;
		}
		
		res.json(entry);
	} catch (error) {
		console.error('Error fetching calendar entry:', error);
		res.status(500).json({ message: 'Failed to fetch calendar entry' });
	}
});

/**
 * POST /api/calendar-entries
 * Create a new calendar entry
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
	try {
		const { team_id, user_id, entry_type, title, start_date, end_date, description, all_day } = req.body;
		
		// Basic validation
		if (!team_id || !user_id || !entry_type || !title || !start_date || !end_date) {
			res.status(400).json({ message: 'Missing required fields' });
			return;
		}
		
		// Validate dates
		const startDate = new Date(start_date);
		const endDate = new Date(end_date);
		
		if (startDate > endDate) {
			res.status(400).json({ message: 'End date must be after start date' });
			return;
		}
		
		// TODO: Add conflict checking in production
		
		const entry = await CalendarEntryModel.create({
			team_id,
			user_id,
			entry_type,
			title,
			start_date: startDate,
			end_date: endDate,
			description,
			all_day: all_day ?? true
		});
		
		res.status(201).json(entry);
	} catch (error) {
		console.error('Error creating calendar entry:', error);
		res.status(500).json({ message: 'Failed to create calendar entry' });
	}
});

/**
 * PUT /api/calendar-entries/:id
 * Update a calendar entry
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: 'Entry ID is required' });
			return;
		}
		
		const { team_id, user_id, entry_type, title, start_date, end_date, description, all_day } = req.body;
		
		// Check if entry exists
		const existingEntry = await CalendarEntryModel.findById(id);
		if (!existingEntry) {
			res.status(404).json({ message: 'Calendar entry not found' });
			return;
		}
		
		// Basic validation
		if (!team_id || !user_id || !entry_type || !title || !start_date || !end_date) {
			res.status(400).json({ message: 'Missing required fields' });
			return;
		}
		
		// Validate dates
		const startDate = new Date(start_date);
		const endDate = new Date(end_date);
		
		if (startDate > endDate) {
			res.status(400).json({ message: 'End date must be after start date' });
			return;
		}
		
		// TODO: Add conflict checking in production
		
		const updated = await CalendarEntryModel.update(id, {
			team_id,
			user_id,
			entry_type,
			title,
			start_date: startDate,
			end_date: endDate,
			description,
			all_day: all_day ?? true
		});
		
		if (!updated) {
			res.status(404).json({ message: 'Calendar entry not found' });
			return;
		}
		
		res.json(updated);
	} catch (error) {
		console.error('Error updating calendar entry:', error);
		res.status(500).json({ message: 'Failed to update calendar entry' });
	}
});

/**
 * DELETE /api/calendar-entries/:id
 * Delete a calendar entry
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: 'Entry ID is required' });
			return;
		}
		
		const deleted = await CalendarEntryModel.delete(id);
		
		if (!deleted) {
			res.status(404).json({ message: 'Calendar entry not found' });
			return;
		}
		
		res.status(204).send();
	} catch (error) {
		console.error('Error deleting calendar entry:', error);
		res.status(500).json({ message: 'Failed to delete calendar entry' });
	}
});

export default router;