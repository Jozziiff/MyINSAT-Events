import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrateUserFields() {
  try {
    await AppDataSource.initialize();
    console.log('Connected to database');

    const queryRunner = AppDataSource.createQueryRunner();

    // Add new columns to users table if they don't exist
    const columnsToAdd = [
      { name: 'bio', type: 'TEXT', nullable: true },
      { name: 'student_year', type: 'VARCHAR(50)', nullable: true },
      { name: 'phone_number', type: 'VARCHAR(20)', nullable: true },
    ];

    for (const col of columnsToAdd) {
      try {
        // Check if column exists
        const result = await queryRunner.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = $1
        `, [col.name]);

        if (result.length === 0) {
          console.log(`Adding column ${col.name}...`);
          await queryRunner.query(`
            ALTER TABLE users 
            ADD COLUMN ${col.name} ${col.type}${col.nullable ? '' : ' NOT NULL'}
          `);
          console.log(`Column ${col.name} added successfully`);
        } else {
          console.log(`Column ${col.name} already exists, skipping...`);
        }
      } catch (err) {
        console.error(`Error adding column ${col.name}:`, err);
      }
    }

    // Create club_followers table if it doesn't exist
    try {
      const tableExists = await queryRunner.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'club_followers'
      `);

      if (tableExists.length === 0) {
        console.log('Creating club_followers table...');
        await queryRunner.query(`
          CREATE TABLE club_followers (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, club_id)
          )
        `);
        console.log('club_followers table created successfully');
      } else {
        console.log('club_followers table already exists, skipping...');
      }
    } catch (err) {
      console.error('Error creating club_followers table:', err);
    }

    // Add some sample club follows for existing users
    try {
      // Get all users and clubs
      const users = await queryRunner.query(`SELECT id FROM users LIMIT 10`);
      const clubs = await queryRunner.query(`SELECT id FROM clubs`);

      if (users.length > 0 && clubs.length > 0) {
        console.log(`Adding sample follows for ${users.length} users across ${clubs.length} clubs...`);

        for (const user of users) {
          // Each user follows 1-3 random clubs
          const numClubs = Math.floor(Math.random() * 3) + 1;
          const shuffledClubs = clubs.sort(() => 0.5 - Math.random()).slice(0, numClubs);

          for (const club of shuffledClubs) {
            try {
              await queryRunner.query(`
                INSERT INTO club_followers (user_id, club_id)
                VALUES ($1, $2)
                ON CONFLICT (user_id, club_id) DO NOTHING
              `, [user.id, club.id]);
            } catch (e) {
              // Ignore duplicates
            }
          }
        }

        const totalFollows = await queryRunner.query(`SELECT COUNT(*) as count FROM club_followers`);
        console.log(`Total club follows: ${totalFollows[0].count}`);
      }
    } catch (err) {
      console.error('Error adding sample follows:', err);
    }

    console.log('\nMigration completed successfully!');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateUserFields();
