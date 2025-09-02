import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { IgniterModule } from '../igniter/igniter.module';

@Module({
  imports: [IgniterModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
