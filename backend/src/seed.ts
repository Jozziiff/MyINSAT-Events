import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

async function seed() {
    const dataSource = new DataSource({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        entities: ['src/entities/*.entity.ts'],
    });

    try {
        await dataSource.initialize();
        console.log('✅ Connected to database\n');

        const passwordHash = await bcrypt.hash('password123', 10);

        console.log('📝 Creating manager user...');
        await dataSource.query(`
      INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
      RETURNING id;
    `, ['hamza@insat.tn', passwordHash, 'Hamza Manager', 'MANAGER', true, true]);

        console.log('📝 Creating test club...');
        await dataSource.query(`
      INSERT INTO clubs (name, description, payment_info)
      VALUES ($1, $2, $3)
      ON CONFLICT (name) DO NOTHING
      RETURNING id;
    `, [
            'IEEE Computer Society',
            'INSAT\'s premier tech club organizing workshops, hackathons, and tech talks.',
            'Payment Instructions:\n1. Transfer to CCP: 12345678\n2. Send receipt to ieee@insat.tn\n3. Wait for confirmation',
        ]);

        console.log('📝 Linking manager to club...');
        await dataSource.query(`
      INSERT INTO club_managers (user_id, club_id)
      SELECT u.id, c.id
      FROM users u, clubs c
      WHERE u.email = 'hamza@insat.tn' AND c.name = 'IEEE Computer Society'
      ON CONFLICT DO NOTHING;
    `);

        console.log('📝 Creating student users...');
        const students = [
            ['ahmed@insat.tn', 'Ahmed Ben Ali'],
            ['salma@insat.tn', 'Salma Trabelsi'],
            ['mohamed@insat.tn', 'Mohamed Mejri'],
            ['leila@insat.tn', 'Leila Hammami'],
        ];

        for (const [email, fullName] of students) {
            await dataSource.query(`
        INSERT INTO users (email, password_hash, full_name, role, email_verified)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING;
      `, [email, passwordHash, fullName, 'USER', true]);
        }

        console.log('📝 Creating test events...');
        const events = [
            {
                title: 'AI & Machine Learning Workshop',
                description: 'Hands-on workshop covering ML fundamentals, neural networks, and practical applications using Python.',
                location: 'Amphi 2',
                startTime: '2026-02-15 14:00:00',
                endTime: '2026-02-15 17:00:00',
                capacity: 50,
                price: 15.00,
                status: 'PUBLISHED',
            },
            {
                title: 'Web Development Bootcamp',
                description: 'Full-stack web development crash course: React, Node.js, and MongoDB.',
                location: 'Lab Informatique 1',
                startTime: '2026-02-20 09:00:00',
                endTime: '2026-02-20 16:00:00',
                capacity: 30,
                price: 20.00,
                status: 'PUBLISHED',
            },
            {
                title: 'Cybersecurity Fundamentals',
                description: 'Introduction to network security, encryption, and ethical hacking.',
                location: 'Amphi 3',
                startTime: '2026-03-01 14:00:00',
                endTime: '2026-03-01 17:00:00',
                capacity: 40,
                price: 10.00,
                status: 'DRAFT',
            },
        ];

        for (const event of events) {
            await dataSource.query(`
        INSERT INTO events (club_id, title, description, location, start_time, end_time, capacity, price, status)
        SELECT c.id, $1, $2, $3, $4, $5, $6, $7, $8
        FROM clubs c
        WHERE c.name = 'IEEE Computer Society';
      `, [
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

        // 6. Create Registrations
        console.log('📝 Creating test registrations...');
        await dataSource.query(`
      INSERT INTO registrations (user_id, event_id, status)
      SELECT u.id, e.id, 'PENDING_PAYMENT'
      FROM users u, events e
      WHERE u.email = 'ahmed@insat.tn' AND e.title = 'AI & Machine Learning Workshop';
    `);

        await dataSource.query(`
      INSERT INTO registrations (user_id, event_id, status)
      SELECT u.id, e.id, 'PENDING_PAYMENT'
      FROM users u, events e
      WHERE u.email = 'salma@insat.tn' AND e.title = 'AI & Machine Learning Workshop';
    `);

        await dataSource.query(`
      INSERT INTO registrations (user_id, event_id, status)
      SELECT u.id, e.id, 'CONFIRMED'
      FROM users u, events e
      WHERE u.email = 'mohamed@insat.tn' AND e.title = 'AI & Machine Learning Workshop';
    `);

        await dataSource.query(`
      INSERT INTO registrations (user_id, event_id, status)
      SELECT u.id, e.id, 'INTERESTED'
      FROM users u, events e
      WHERE u.email = 'leila@insat.tn' AND e.title = 'Web Development Bootcamp';
    `);

        console.log('\n✅ Seed data created successfully!\n');
        console.log('📊 Summary:');
        console.log('  - 1 Manager: hamza@insat.tn (password: password123)');
        console.log('  - 4 Students: ahmed, salma, mohamed, leila @insat.tn');
        console.log('  - 1 Club: IEEE Computer Society');
        console.log('  - 3 Events: 2 Published, 1 Draft');
        console.log('  - 4 Registrations: 2 Pending, 1 Confirmed, 1 Interested\n');

        await dataSource.destroy();
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
}

seed();
