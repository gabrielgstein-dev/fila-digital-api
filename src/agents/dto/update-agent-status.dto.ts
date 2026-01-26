import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn } from 'class-validator';

export enum AgentStatusEnum {
  OFFLINE = 'OFFLINE',
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  ON_BREAK = 'ON_BREAK',
  AWAY = 'AWAY',
}

export class UpdateAgentStatusDto {
  @ApiProperty({
    description: 'Status do agente',
    enum: AgentStatusEnum,
    example: 'AVAILABLE',
  })
  @IsIn(['OFFLINE', 'AVAILABLE', 'BUSY', 'ON_BREAK', 'AWAY'])
  status: string;
}
