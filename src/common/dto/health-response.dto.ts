import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    description: 'Status da aplicação',
    example: 'ok',
  })
  status: string;

  @ApiProperty({
    description: 'Timestamp da verificação',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;
}
