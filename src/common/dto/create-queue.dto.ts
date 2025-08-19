import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QueueType } from '@prisma/client';

export class CreateQueueDto {
  @ApiProperty({ description: 'Nome da fila' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Descrição da fila' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Tipo da fila',
    enum: QueueType,
    default: QueueType.GENERAL,
  })
  @IsOptional()
  @IsEnum(QueueType)
  queueType?: QueueType;

  @ApiPropertyOptional({
    description: 'Capacidade máxima da fila',
    default: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({
    description: 'Tempo médio de atendimento em segundos',
    default: 300,
  })
  @IsOptional()
  @IsInt()
  @Min(30)
  avgServiceTime?: number;
}
