import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrateClubsStatus() {
    const dataSource = new DataSource({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    await dataSource.initialize();
    console.log('Connected to database');

    // Update all PENDING clubs to APPROVED
    const result = await dataSource.query(
        `UPDATE clubs SET status = 'APPROVED' WHERE status = 'PENDING'`
    );

    console.log('Updated clubs:', result);

    await dataSource.destroy();
    console.log('Migration complete');
}

migrateClubsStatus().catch(console.error);
