#!/bin/bash
# ClawdNet Database Setup Script
# Run this to push migrations to your Supabase database

set -e

echo "🗄️  ClawdNet Database Setup"
echo "============================"

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set"
    echo ""
    echo "Set it in your .env.local or export it:"
    echo "  export DATABASE_URL=\"postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres\""
    echo ""
    echo "Replace [PASSWORD] with your Supabase database password"
    echo "Replace [PROJECT_REF] with your project reference (e.g., xuxlhmsvbsgichrvvapv)"
    exit 1
fi

echo "✅ DATABASE_URL found"
echo ""

# Run Drizzle migrations
echo "📦 Pushing Drizzle migrations..."
cd "$(dirname "$0")/.."
pnpm drizzle-kit push

echo ""
echo "🔒 Enabling Row Level Security..."

# Apply RLS policies from Supabase migration
# Note: These are applied via psql or Supabase dashboard
cat << 'EOF'

RLS policies need to be applied via Supabase Dashboard or psql:

1. Go to: https://supabase.com/dashboard/project/[YOUR_PROJECT_REF]/sql
2. Run the contents of: supabase/migrations/20260201020010_enable_rls.sql

Or via psql:
  psql $DATABASE_URL -f ../../supabase/migrations/20260201020010_enable_rls.sql

EOF

echo "✨ Database setup complete!"
echo ""
echo "Tables created:"
echo "  - users"
echo "  - agents"
echo "  - agent_stats"
echo "  - skills"
echo "  - follows"
echo "  - reviews"
echo "  - feed_events"
echo "  - badges"
echo "  - api_keys"
echo "  - pairings"
echo "  - payments"
echo "  - agent_connections"
