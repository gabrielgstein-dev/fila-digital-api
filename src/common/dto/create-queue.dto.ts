import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QueueType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

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
    description:
      'Capacidade máxima da fila (deixe vazio para capacidade ilimitada)',
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

  @ApiPropertyOptional({
    description: 'Status ativo da fila',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
