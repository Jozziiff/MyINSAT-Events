import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

async function migrate() {
    const dataSource = new DataSource({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        entities: ['src/entities/*.entity.ts'],
    });

    try {
        await dataSource.initialize();
        console.log('✅ Connected to database\n');

        // 1. Create event_ratings table
        console.log('📝 Creating event_ratings table...');
        await dataSource.query(`
            CREATE TABLE IF NOT EXISTS event_ratings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, event_id)
            );
        `);
        console.log('✅ event_ratings table created\n');

        // 2. Create more users for mock data
        console.log('📝 Creating additional users for mock data...');
        const passwordHash = await bcrypt.hash('password123', 10);
        
        const additionalUsers = [
            ['yasmine@insat.tn', 'Yasmine Bouazizi'],
            ['omar@insat.tn', 'Omar Chaabane'],
            ['nour@insat.tn', 'Nour Gharbi'],
            ['anis@insat.tn', 'Anis Meddeb'],
            ['rania@insat.tn', 'Rania Saidi'],
            ['karim@insat.tn', 'Karim Ayari'],
            ['mariem@insat.tn', 'Mariem Jebali'],
            ['sami@insat.tn', 'Sami Kchouk'],
        ];

        for (const [email, fullName] of additionalUsers) {
            await dataSource.query(`
                INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (email) DO NOTHING;
            `, [email, passwordHash, fullName, 'USER', true, true]);
        }
        console.log('✅ Additional users created\n');

        // 3. Create a past event that users have attended (for ratings)
        console.log('📝 Creating past events...');
        
        // Get the first club id (any club will do)
        const clubResult = await dataSource.query(`
            SELECT id, name FROM clubs LIMIT 1;
        `);
        
        if (clubResult.length === 0) {
            console.log('⚠️ No clubs found, creating one...');
            await dataSource.query(`
                INSERT INTO clubs (name, short_description)
                VALUES ($1, $2)
                ON CONFLICT (name) DO NOTHING;
            `, [
                'IEEE Computer Society',
                'INSAT\'s premier tech club organizing workshops, hackathons, and tech talks.',
            ]);
        }
        
        const clubId = clubResult.length > 0 ? clubResult[0].id : 1;
        const clubName = clubResult.length > 0 ? clubResult[0].name : 'IEEE Computer Society';
        console.log(`  Using club: ${clubName} (ID: ${clubId})`);

        const pastEvents = [
            {
                title: 'Introduction to Python',
                description: 'Beginner-friendly Python workshop covering basics, data structures, and simple projects.',
                location: 'Lab Informatique 2',
                startTime: '2025-12-10 14:00:00',
                endTime: '2025-12-10 17:00:00',
                capacity: 40,
                price: 0,
                status: 'PUBLISHED',
            },
            {
                title: 'Git & GitHub Essentials',
                description: 'Learn version control with Git and collaboration using GitHub.',
                location: 'Amphi 1',
                startTime: '2025-11-20 09:00:00',
                endTime: '2025-11-20 12:00:00',
                capacity: 60,
                price: 5.00,
                status: 'PUBLISHED',
            },
            {
                title: 'Data Science Hackathon 2025',
                description: 'A 24-hour hackathon focused on solving real-world data problems.',
                location: 'INSAT Main Hall',
                startTime: '2025-10-15 08:00:00',
                endTime: '2025-10-16 08:00:00',
                capacity: 100,
                price: 25.00,
                status: 'PUBLISHED',
            },
        ];

        for (const event of pastEvents) {
            await dataSource.query(`
                INSERT INTO events (club_id, title, description, location, start_time, end_time, capacity, price, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT DO NOTHING;
            `, [
                clubId,
                event.title,
                event.description,
                event.location,
                event.startTime,
                event.endTime,
                event.capacity,
                event.price,
                event.status,
            ]);
        }
        console.log('✅ Past events created\n');

        // 4. Add ATTENDED registrations for past events
        console.log('📝 Creating ATTENDED registrations for past events...');
        
        // Get user IDs
        const users = await dataSource.query(`
            SELECT id, email FROM users WHERE role = 'USER' LIMIT 12;
        `);

        // Get past event IDs
        const pastEventResults = await dataSource.query(`
            SELECT id, title FROM events WHERE start_time < NOW() AND status = 'PUBLISHED';
        `);

        for (const event of pastEventResults) {
            // Each past event gets 5-8 attended users
            const attendeeCount = Math.floor(Math.random() * 4) + 5;
            const shuffledUsers = users.sort(() => Math.random() - 0.5).slice(0, attendeeCount);
            
            for (const user of shuffledUsers) {
                // Check if registration exists first
                const existing = await dataSource.query(`
                    SELECT id FROM registrations WHERE user_id = $1 AND event_id = $2;
                `, [user.id, event.id]);
                
                if (existing.length > 0) {
                    await dataSource.query(`
                        UPDATE registrations SET status = 'ATTENDED' WHERE user_id = $1 AND event_id = $2;
                    `, [user.id, event.id]);
                } else {
                    await dataSource.query(`
                        INSERT INTO registrations (user_id, event_id, status)
                        VALUES ($1, $2, 'ATTENDED');
                    `, [user.id, event.id]);
                }
            }
            console.log(`  ✓ Added ${attendeeCount} attendees to "${event.title}"`);
        }
        console.log('✅ ATTENDED registrations created\n');

        // 5. Add ratings for past events from attended users
        console.log('📝 Creating ratings for past events...');
        
        const attendedRegistrations = await dataSource.query(`
            SELECT r.user_id, r.event_id, e.title 
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            WHERE r.status = 'ATTENDED';
        `);

        const comments = [
            'Great workshop! Learned a lot.',
            'Very informative and well organized.',
            'The instructor was excellent!',
            'Could use more hands-on exercises.',
            'Amazing experience, highly recommend!',
            'Good content, but a bit rushed.',
            'Perfect for beginners.',
            'Would definitely attend again.',
            null, // Some ratings without comments
            null,
            null,
        ];

        for (const reg of attendedRegistrations) {
            // 70% chance of rating
            if (Math.random() < 0.7) {
                const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars mostly
                const comment = comments[Math.floor(Math.random() * comments.length)];
                
                const existing = await dataSource.query(`
                    SELECT id FROM event_ratings WHERE user_id = $1 AND event_id = $2;
                `, [reg.user_id, reg.event_id]);
                
                if (existing.length > 0) {
                    await dataSource.query(`
                        UPDATE event_ratings SET rating = $3, comment = $4 WHERE user_id = $1 AND event_id = $2;
                    `, [reg.user_id, reg.event_id, rating, comment]);
                } else {
                    await dataSource.query(`
                        INSERT INTO event_ratings (user_id, event_id, rating, comment)
                        VALUES ($1, $2, $3, $4);
                    `, [reg.user_id, reg.event_id, rating, comment]);
                }
            }
        }
        console.log('✅ Ratings created\n');

        // 6. Add INTERESTED registrations for upcoming events
        console.log('📝 Creating INTERESTED registrations for upcoming events...');
        
        const upcomingEvents = await dataSource.query(`
            SELECT id, title FROM events WHERE start_time > NOW() AND status = 'PUBLISHED';
        `);

        for (const event of upcomingEvents) {
            // Each upcoming event gets 3-10 interested users
            const interestedCount = Math.floor(Math.random() * 8) + 3;
            const shuffledUsers = users.sort(() => Math.random() - 0.5).slice(0, interestedCount);
            
            for (const user of shuffledUsers) {
                const existing = await dataSource.query(`
                    SELECT id FROM registrations WHERE user_id = $1 AND event_id = $2;
                `, [user.id, event.id]);
                
                if (existing.length === 0) {
                    await dataSource.query(`
                        INSERT INTO registrations (user_id, event_id, status)
                        VALUES ($1, $2, 'INTERESTED');
                    `, [user.id, event.id]);
                }
            }
            console.log(`  ✓ Added ${interestedCount} interested users to "${event.title}"`);
        }
        console.log('✅ INTERESTED registrations created\n');

        // 7. Add some CONFIRMED registrations for upcoming events
        console.log('📝 Creating CONFIRMED registrations for upcoming events...');
        
        for (const event of upcomingEvents) {
            // Each upcoming event gets 2-5 confirmed users
            const confirmedCount = Math.floor(Math.random() * 4) + 2;
            const shuffledUsers = users.sort(() => Math.random() - 0.5).slice(0, confirmedCount);
            
            for (const user of shuffledUsers) {
                const existing = await dataSource.query(`
                    SELECT id FROM registrations WHERE user_id = $1 AND event_id = $2;
                `, [user.id, event.id]);
                
                if (existing.length > 0) {
                    await dataSource.query(`
                        UPDATE registrations SET status = 'CONFIRMED' WHERE user_id = $1 AND event_id = $2;
                    `, [user.id, event.id]);
                } else {
                    await dataSource.query(`
                        INSERT INTO registrations (user_id, event_id, status)
                        VALUES ($1, $2, 'CONFIRMED');
                    `, [user.id, event.id]);
                }
            }
            console.log(`  ✓ Added ${confirmedCount} confirmed users to "${event.title}"`);
        }
        console.log('✅ CONFIRMED registrations created\n');

        // Summary
        const ratingCount = await dataSource.query(`SELECT COUNT(*) FROM event_ratings;`);
        const regCount = await dataSource.query(`SELECT status, COUNT(*) FROM registrations GROUP BY status;`);
        
        console.log('\n✅ Migration and seeding completed successfully!\n');
        console.log('📊 Summary:');
        console.log(`  - event_ratings table: ${ratingCount[0].count} ratings`);
        console.log('  - Registrations by status:');
        for (const r of regCount) {
            console.log(`    • ${r.status}: ${r.count}`);
        }
        console.log('\n');

        await dataSource.destroy();
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

migrate();
