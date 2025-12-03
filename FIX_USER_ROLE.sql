-- Run this SQL command in your PostgreSQL database to fix the user role enum

-- Add 'user' to the enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'user' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'enum_users_role'
        )
    ) THEN
        ALTER TYPE enum_users_role ADD VALUE 'user';
    END IF;
END$$;

-- Update the default value if needed
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';

-- Show current enum values
SELECT e.enumlabel as role_values
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'enum_users_role'
ORDER BY e.enumsortorder;

