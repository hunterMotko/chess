#!/bin/bash

# Database Migration Script
# Run SQL migration files against the database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

print_info() {
    echo -e "${YELLOW}INFO: $1${NC}"
}

print_header() {
    echo ""
    echo -e "${GREEN}=== $1 ===${NC}"
    echo ""
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set"
    print_info "Example: export DATABASE_URL=postgresql://user:password@localhost:5432/chess_game?sslmode=disable"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    print_error "psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

print_header "Running Database Migrations"

MIGRATIONS_DIR="migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    print_error "Migrations directory not found: $MIGRATIONS_DIR"
    exit 1
fi

# Create migrations table if it doesn't exist
print_info "Creating migrations tracking table..."
psql "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);
" || {
    print_error "Failed to create migrations table"
    exit 1
}

# Get list of already applied migrations
applied_migrations=$(psql "$DATABASE_URL" -t -c "SELECT migration_name FROM schema_migrations ORDER BY migration_name;" | tr -d ' ')

# Run migrations in order
migration_count=0
for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    if [ ! -f "$migration_file" ]; then
        continue
    fi
    
    migration_name=$(basename "$migration_file")
    
    # Check if migration was already applied
    if echo "$applied_migrations" | grep -q "^$migration_name$"; then
        print_info "Skipping already applied migration: $migration_name"
        continue
    fi
    
    print_info "Applying migration: $migration_name"
    
    # Run the migration
    if psql "$DATABASE_URL" -f "$migration_file"; then
        # Record the migration as applied
        psql "$DATABASE_URL" -c "INSERT INTO schema_migrations (migration_name) VALUES ('$migration_name');" || {
            print_error "Failed to record migration: $migration_name"
            exit 1
        }
        print_success "Applied migration: $migration_name"
        ((migration_count++))
    else
        print_error "Failed to apply migration: $migration_name"
        exit 1
    fi
done

if [ $migration_count -eq 0 ]; then
    print_info "No new migrations to apply"
else
    print_success "Applied $migration_count migration(s)"
fi

print_header "Migration Complete"