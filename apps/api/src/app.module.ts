import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ActivitiesModule } from './activities/activities.module';
import { SlotsModule } from './slots/slots.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ActivitiesModule,
    SlotsModule,
    AppointmentsModule,
    NotificationsModule,
    SettingsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
