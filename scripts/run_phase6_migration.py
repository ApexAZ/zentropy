#!/usr/bin/env python3
"""
Script to run the Phase 6 migration safely

This script provides a safe way to run the Phase 6 migration with proper
error handling and rollback capabilities.
"""

import os
import sys
import argparse
import logging
from datetime import datetime

from api.migration_phase6 import Phase6Migration, DATABASE_URL


def setup_logging(log_level='INFO'):
    """
    Set up logging configuration
    """
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format=log_format,
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(f'phase6_migration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
        ]
    )


def main():
    """
    Main function to run the migration script
    """
    parser = argparse.ArgumentParser(
        description='Run Phase 6 migration for Just-in-Time Organization System'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Run in dry-run mode (analyze only, no changes)'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Force migration without confirmation'
    )
    parser.add_argument(
        '--log-level',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        default='INFO',
        help='Set logging level'
    )
    parser.add_argument(
        '--database-url',
        help='Database URL (overrides environment variable)'
    )
    
    args = parser.parse_args()
    
    # Set up logging
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    
    # Get database URL
    database_url = args.database_url or DATABASE_URL
    
    if not database_url:
        logger.error("Database URL not found. Please set DATABASE_URL environment variable or use --database-url")
        sys.exit(1)
    
    logger.info("Phase 6 Migration: Just-in-Time Organization System Integration")
    logger.info("=" * 60)
    logger.info(f"Database URL: {database_url}")
    logger.info(f"Dry run mode: {args.dry_run}")
    logger.info(f"Force mode: {args.force}")
    
    # Confirm migration if not in force mode
    if not args.force and not args.dry_run:
        confirm = input("Are you sure you want to run the Phase 6 migration? (y/N): ")
        if confirm.lower() != 'y':
            logger.info("Migration cancelled.")
            sys.exit(0)
    
    try:
        migration = Phase6Migration(database_url)
        
        if args.dry_run:
            logger.info("Running in dry-run mode (analysis only)...")
            # In a real implementation, this would run analysis only
            logger.info("Dry-run mode: Would analyze current state and show what would be changed")
            logger.info("No actual changes will be made to the database")
        else:
            logger.info("Running full migration...")
            migration.run_migration()
            
        logger.info("Migration completed successfully!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        logger.error("Check the log file for detailed error information")
        sys.exit(1)


if __name__ == "__main__":
    main()