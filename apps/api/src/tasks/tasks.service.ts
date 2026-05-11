import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly email: EmailService,
  ) {}

  private emptySummary() {
    return { total: 0, todo: 0, inProgress: 0, blocked: 0, done: 0, dueToday: 0, overdue: 0 };
  }

  async list(user: CurrentUserPayload) {
    try {
      const tasks = await this.db.task.findMany({
        where: {
          organizationId: user.organizationId,
          userId: user.id,
        },
        orderBy: [
          { status: 'asc' },
          { dueAt: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return {
        tasks,
        summary: {
          total: tasks.length,
          todo: tasks.filter((task) => task.status === TaskStatus.todo).length,
          inProgress: tasks.filter((task) => task.status === TaskStatus.in_progress).length,
          blocked: tasks.filter((task) => task.status === TaskStatus.blocked).length,
          done: tasks.filter((task) => task.status === TaskStatus.done).length,
          dueToday: tasks.filter((task) => this.isDueToday(task.dueAt)).length,
          overdue: tasks.filter((task) => this.isOverdue(task.dueAt, task.status)).length,
        },
      };
    } catch (error) {
      if (this.isTaskMigrationError(error)) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Tasks table is not ready. Run prisma migrate deploy. Original error: ${message}`);
        return { tasks: [], summary: this.emptySummary() };
      }
      throw error;
    }
  }

  async create(user: CurrentUserPayload, dto: CreateTaskDto) {
    const title = dto.title?.trim();
    if (!title) throw new BadRequestException('Task title is required');

    const dueAt = this.optionalDate(dto.dueAt);
    const reminderAt = this.normalizeReminderAt(dto.reminderEnabled, dto.reminderAt, dueAt);

    try {
      return await this.db.task.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          title,
          description: this.optionalText(dto.description),
          status: dto.status ?? TaskStatus.todo,
          priority: dto.priority ?? TaskPriority.medium,
          category: this.optionalText(dto.category),
          dueAt,
          reminderEnabled: Boolean(dto.reminderEnabled),
          reminderAt,
          completedAt: dto.status === TaskStatus.done ? new Date() : null,
        },
      });
    } catch (error) {
      this.handleTaskMutationError(error);
    }
  }

  async update(user: CurrentUserPayload, taskId: string, dto: UpdateTaskDto) {
    const existing = await this.getOwnedTask(user, taskId);
    const nextStatus = dto.status ?? existing.status;
    const dueAt = dto.dueAt === undefined ? existing.dueAt : this.optionalDate(dto.dueAt);
    const reminderEnabled = dto.reminderEnabled ?? existing.reminderEnabled;
    const reminderAt = dto.reminderAt === undefined
      ? existing.reminderAt
      : this.normalizeReminderAt(reminderEnabled, dto.reminderAt, dueAt);

    try {
      return await this.db.task.update({
        where: { id: taskId },
        data: {
          title: dto.title === undefined ? undefined : this.requiredTitle(dto.title),
          description: dto.description === undefined ? undefined : this.optionalText(dto.description),
          status: dto.status,
          priority: dto.priority,
          category: dto.category === undefined ? undefined : this.optionalText(dto.category),
          dueAt,
          reminderEnabled,
          reminderAt: reminderEnabled ? reminderAt : null,
          reminderSentAt: reminderEnabled ? existing.reminderSentAt : null,
          completedAt: nextStatus === TaskStatus.done ? existing.completedAt ?? new Date() : null,
        },
      });
    } catch (error) {
      this.handleTaskMutationError(error);
    }
  }

  async remove(user: CurrentUserPayload, taskId: string) {
    await this.getOwnedTask(user, taskId);
    try {
      await this.db.task.delete({ where: { id: taskId } });
      return { ok: true };
    } catch (error) {
      this.handleTaskMutationError(error);
    }
  }

  async sendDueReminders() {
    const now = new Date();
    const dueTasks = await this.db.task.findMany({
      where: {
        reminderEnabled: true,
        reminderAt: { lte: now },
        reminderSentAt: null,
        status: { not: TaskStatus.done },
      },
      include: {
        user: { select: { email: true, name: true } },
        organization: { select: { name: true } },
      },
      take: 100,
      orderBy: { reminderAt: 'asc' },
    });

    for (const task of dueTasks) {
      await this.email.sendTaskReminderEmail({
        email: task.user.email,
        name: task.user.name,
        organizationName: task.organization.name,
        title: task.title,
        description: task.description,
        dueAt: task.dueAt,
        priority: task.priority,
        taskUrl: this.taskUrl(),
      });

      await this.db.task.update({
        where: { id: task.id },
        data: { reminderSentAt: new Date() },
      });
    }

    return { sent: dueTasks.length };
  }

  private async getOwnedTask(user: CurrentUserPayload, taskId: string) {
    const task = await this.db.task.findFirst({
      where: {
        id: taskId,
        organizationId: user.organizationId,
        userId: user.id,
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private requiredTitle(value: string) {
    const title = value.trim();
    if (!title) throw new BadRequestException('Task title is required');
    return title;
  }

  private optionalText(value: string | null | undefined) {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed || null;
  }

  private optionalDate(value: string | null | undefined) {
    if (value === undefined || value === null || value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');
    return date;
  }

  private normalizeReminderAt(enabled: boolean | undefined, value: string | null | undefined, dueAt: Date | null) {
    if (!enabled) return null;
    const reminderAt = this.optionalDate(value) ?? dueAt;
    if (!reminderAt) throw new BadRequestException('Reminder date is required when reminders are enabled');
    return reminderAt;
  }

  private isDueToday(value: Date | null) {
    if (!value) return false;
    const now = new Date();
    return value.toDateString() === now.toDateString();
  }

  private isOverdue(value: Date | null, status: TaskStatus) {
    if (!value || status === TaskStatus.done) return false;
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return value < endOfToday && !this.isDueToday(value);
  }

  private taskUrl() {
    const base = process.env.FRONTEND_URL || 'https://nexstock.co.za';
    return `${base.replace(/\/$/, '')}/my-tasks`;
  }

  private isTaskMigrationError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as any)?.code;
    return code === 'P2021' || code === 'P2022' || message.includes('Task') || message.includes('task') || message.includes('relation') || message.includes('does not exist');
  }

  private handleTaskMutationError(error: unknown): never {
    if (this.isTaskMigrationError(error)) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Task mutation failed because database migration is missing. Original error: ${message}`);
      throw new ServiceUnavailableException('Tasks are not ready yet. Run the latest database migration on the server, then restart the API.');
    }
    throw error;
  }
}
