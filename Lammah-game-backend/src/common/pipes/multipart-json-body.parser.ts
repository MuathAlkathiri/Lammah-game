import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

export function parseMultipartJsonBody<T extends object>(
  body: Record<string, unknown>,
  field: string,
  DtoClass: new () => T,
): T {
  const raw = body[field];
  let payload: unknown = body;
  if (raw !== undefined) {
    if (typeof raw !== 'string')
      throw new BadRequestException(`${field} must be a JSON string`);
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new BadRequestException(`${field} must be valid JSON`);
    }
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    throw new BadRequestException(`${field} payload must be an object`);
  const dto = plainToInstance(DtoClass, payload);
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length) throw new BadRequestException(errors);
  return dto;
}
