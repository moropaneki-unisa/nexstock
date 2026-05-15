import { TaskPriority, TaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

function emptyToUndefined(value: unknown) {
  return value === null || value === '' ? undefined : value;
}

export class CreateTaskDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsOptional()
  @IsIn(['todo', 'in_progress', 'blocked', 'done'])
  status?: TaskStatus;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: TaskPriority;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsDateString()
  reminderAt?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsOptional()
  @IsIn(['todo', 'in_progress', 'blocked', 'done'])
  status?: TaskStatus;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: TaskPriority;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsDateString()
  reminderAt?: string;
}
