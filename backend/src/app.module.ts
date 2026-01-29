import { Module, OnModuleInit } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ClubsModule } from './clubs/clubs.module';
import { UploadModule } from './upload/upload.module';
import { ManagerModule } from './manager/manager.module';
import { MailModule } from './mail/mail.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false ,
        logging: false,
        ssl: {
          rejectUnauthorized: false,
        },
      }),
      inject: [ConfigService],

    }),
    AuthModule,
    UsersModule,
    EventsModule,
    SubscriptionsModule,
    ManagerModule,
    ClubsModule,
    UploadModule,
    MailModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private dataSource: DataSource) { }

  async onModuleInit() {
    try {
      if (this.dataSource.isInitialized) {
        console.log('✅ TypeORM connection is already initialized and ready.');
      } else {
        await this.dataSource.initialize();
        console.log('✅ TypeORM connection initialized successfully.');
      }


      const result = await this.dataSource.query('SELECT current_database()');
      console.log(`Connected to database: ${result[0].current_database}`);

    } catch (error) {
      console.error('❌ Database connection failed during startup:', error.message);

    }
  }
}
