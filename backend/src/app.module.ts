import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
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
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        ssl: {
          rejectUnauthorized: false,
        },
      }),
      inject: [ConfigService],

    }),
    UsersModule,
    EventsModule,
    SubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
   constructor(private dataSource: DataSource) {}

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
