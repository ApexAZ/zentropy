-- Migration: Drop deprecated organization string field from users table
-- Date: 2025-07-08
-- Description: Remove the deprecated organization string column and rely solely on organization_id foreign key

-- First, let's check if the column exists and has any non-empty values
DO $$
DECLARE
    column_exists boolean;
    non_empty_count integer;
BEGIN
    -- Check if the column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'organization'
    ) INTO column_exists;
    
    IF column_exists THEN
        -- Count non-empty organization values
        EXECUTE 'SELECT COUNT(*) FROM users WHERE organization IS NOT NULL AND organization != $1' 
        INTO non_empty_count 
        USING '';
        
        RAISE NOTICE 'Found % users with non-empty organization values', non_empty_count;
        
        -- If there are non-empty values, warn but proceed
        IF non_empty_count > 0 THEN
            RAISE WARNING 'There are % users with non-empty organization string values. These will be lost when dropping the column.', non_empty_count;
        END IF;
        
        -- Drop the deprecated organization column
        ALTER TABLE users DROP COLUMN IF EXISTS organization;
        
        RAISE NOTICE 'Successfully dropped deprecated organization column from users table';
    ELSE
        RAISE NOTICE 'Column organization does not exist in users table - migration already applied or not needed';
    END IF;
END $$;

-- Verify the column was dropped
DO $$
DECLARE
    column_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'organization'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'Migration successful: organization column no longer exists in users table';
    ELSE
        RAISE EXCEPTION 'Migration failed: organization column still exists in users table';
    END IF;
END $$;