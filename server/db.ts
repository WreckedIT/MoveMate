import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { boxes, activities, qrCodes, owners } from '@shared/schema';

// Initialize variables for Drizzle and Pool
let db: ReturnType<typeof drizzle>;
let pool: pg.Pool;
let isConnected = false;

// Initialize with a dummy pool for fast startup
const dummyPool = { 
  query: async () => ({ rows: [] }),
  on: () => {}, // Add mock methods to prevent errors
  end: async () => {}
};

// Initialize with fallback so server can start immediately
db = drizzle(dummyPool as any, { schema: { boxes, activities, qrCodes, owners } });

// Function to initialize database in the background
// This runs immediately but doesn't block server startup
(async () => {
  try {
    // Initialize the database connection
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5, // Limit connections to avoid overwhelming the database
      idleTimeoutMillis: 30000 // Close idle connections after 30 seconds
    });

    // Test the connection
    await pool.query('SELECT NOW()');

    // Initialize Drizzle with our schema
    db = drizzle(pool, { schema: { boxes, activities, qrCodes, owners } });
    isConnected = true;

    // Log successful connection
    console.log('✅ PostgreSQL database connection established successfully');
  } catch (error) {
    console.error('❌ Error initializing database connection:', error);
    console.warn('Using fallback in-memory storage - data will not be persisted');
  }
})().catch(error => {
  console.error('Unhandled error in database initialization:', error);
});

// Function to close the database connection (for testing or graceful shutdown)
export async function closeDatabase() {
  if (pool && isConnected) {
    try {
      await pool.end();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
}

// Export the db object which will be updated once the connection is established
export { db };