import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrateFoundedYear() {
    const dataSource = new DataSource({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    await dataSource.initialize();
    console.log('Connected to database');

    // Check if column exists
    const columnCheck = await dataSource.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'clubs' AND column_name = 'founded_year'
    `);

    if (columnCheck.length === 0) {
        // Add founded_year column to clubs table
        await dataSource.query(`
            ALTER TABLE clubs 
            ADD COLUMN founded_year INTEGER
        `);
        console.log('Added founded_year column to clubs table');

        // Optionally: Set founded_year from created_at for existing clubs
        await dataSource.query(`
            UPDATE clubs 
            SET founded_year = EXTRACT(YEAR FROM created_at)
            WHERE founded_year IS NULL
        `);
        console.log('Set default founded_year from created_at for existing clubs');
    } else {
        console.log('Column founded_year already exists');
    }

    await dataSource.destroy();
    console.log('Migration complete');
}

migrateFoundedYear().catch(console.error);
