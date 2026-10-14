const { PrismaClient } = require('@prisma/client');

// Load environment variables from .env if present
try {
  require('dotenv').config();
} catch (_) {}

const prisma = new PrismaClient({
  log: ['error'],
});

async function main() {
  console.log('=== Abhinnati Database Read-Only Connectivity Check ===\n');

  // Check if DATABASE_URL is set
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is not set in environment or backend/.env');
    process.exit(1);
  }

  // Safe host display without credentials
  if (dbUrl.includes('PASTE_YOUR_SUPABASE_DATABASE_URL_HERE') || !dbUrl.startsWith('postgres')) {
    console.error('❌ DATABASE_URL is currently set to placeholder or does not start with postgresql://.');
    console.error('👉 Please edit backend/.env locally and set your Supabase PostgreSQL connection string.\n');
    console.log('Format: postgresql://postgres:[PASSWORD]@db.ocsokyjpiclytbxyuiaq.supabase.co:5432/postgres?sslmode=require');
    process.exit(1);
  }

  try {
    const urlObj = new URL(dbUrl);
    console.log(`Target Database Host: ${urlObj.hostname}:${urlObj.port || '5432'}`);
    console.log(`Database Name: ${urlObj.pathname.replace(/^\//, '')}`);
    console.log(`SSL Mode: ${urlObj.searchParams.get('sslmode') || 'default'}\n`);
  } catch (err) {
    console.log('Target Database: (URL protocol parsed)\n');
  }

  // 1. Safe connectivity test
  console.log('1. Testing raw PostgreSQL connection...');
  try {
    const pingResult = await prisma.$queryRaw`SELECT 1 as connected, current_database() as db_name, version() as pg_version`;
    console.log('✔ PostgreSQL connection SUCCESSFUL!');
    if (pingResult && pingResult[0]) {
      console.log(`  Database: ${pingResult[0].db_name}`);
      console.log(`  Version: ${pingResult[0].pg_version.split(',')[0]}\n`);
    }
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  // 2. Inspect existing public tables
  console.log('2. Inspecting existing database tables in public schema...');
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const tableNames = tables.map(t => t.table_name);
    console.log(`✔ Found ${tableNames.length} tables in public schema.`);
    if (tableNames.length > 0) {
      console.log('  Tables:', tableNames.join(', '));
    } else {
      console.log('  (Database is currently empty - no tables created yet)');
    }
    console.log('');

    // 3. Inspect Prisma migration history table if present
    if (tableNames.includes('_prisma_migrations')) {
      console.log('3. Inspecting _prisma_migrations history...');
      const migrations = await prisma.$queryRaw`
        SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
        FROM _prisma_migrations
        ORDER BY finished_at ASC;
      `;
      console.log(`✔ Found ${migrations.length} recorded migrations in database:`);
      migrations.forEach((m, idx) => {
        console.log(`  [${idx + 1}] ${m.migration_name} (Applied at: ${m.finished_at})`);
      });
      console.log('');
    } else {
      console.log('3. Migration history table (_prisma_migrations) does NOT exist yet in this database.\n');
    }

    // 4. Inspect User table record count if present
    if (tableNames.includes('User')) {
      const userCount = await prisma.user.count();
      console.log(`4. User table exists: ${userCount} existing records found.\n`);
    } else {
      console.log('4. Application table "User" does not exist yet.\n');
    }

    console.log('=== Check Finished Successfully ===');
  } catch (err) {
    console.error('❌ Error inspecting schema:', err.message);
  }
}

main()
  .catch(err => {
    console.error('Fatal error during check:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
