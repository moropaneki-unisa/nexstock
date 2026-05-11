import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';

type LaunchChecklistTask = {
  title: string;
  description: string;
  priority: TaskPriority;
  category: string;
  dueOffsetDays: number;
};

const LAUNCH_CHECKLIST_TASKS: LaunchChecklistTask[] = [
  {
    title: 'Fix and verify My Tasks production deployment',
    priority: TaskPriority.urgent,
    category: 'Launch',
    dueOffsetDays: 0,
    description: 'Confirm tasks can be created, edited, completed, deleted, and loaded on deployed nexstock.co.za without API errors.',
  },
  {
    title: 'Complete data sanitation and converter workflow',
    priority: TaskPriority.urgent,
    category: 'Data',
    dueOffsetDays: 1,
    description: 'Finish the data tools page for JSON, CSV, and XLSX sanitation. Confirm users can upload ugly data, clean it, preview it, and export to JSON, CSV, or XLSX.',
  },
  {
    title: 'Test full product import after sanitation',
    priority: TaskPriority.high,
    category: 'Import',
    dueOffsetDays: 3,
    description: 'Test importing sanitized CSV, JSON, and XLSX product data into NexStock. Confirm products, prices, stock, categories, custom fields, and images import correctly.',
  },
  {
    title: 'Finish Paddle payment testing',
    priority: TaskPriority.urgent,
    category: 'Payment',
    dueOffsetDays: 3,
    description: 'Test Starter and Growth payment from plan selection to inline checkout, payment success, plan update, organization setup redirect, and dashboard access.',
  },
  {
    title: 'Verify subscription limits',
    priority: TaskPriority.high,
    category: 'Billing',
    dueOffsetDays: 4,
    description: 'Test product, attribute, API key, webhook, currency, member, and import row limits for Free, Starter, and Growth plans.',
  },
  {
    title: 'Prepare demo test company',
    priority: TaskPriority.high,
    category: 'Demo',
    dueOffsetDays: 5,
    description: 'Create a clean demo organization with realistic products, images, attributes, currencies, API keys, and dashboard data.',
  },
  {
    title: 'Create sample messy import files',
    priority: TaskPriority.high,
    category: 'Demo',
    dueOffsetDays: 5,
    description: 'Prepare one messy CSV, one messy JSON, and one messy XLSX file to demonstrate the data sanitation feature.',
  },
  {
    title: 'Run complete user journey test',
    priority: TaskPriority.urgent,
    category: 'QA',
    dueOffsetDays: 6,
    description: 'Test landing page to signup to email verification to plan selection to payment to organization setup to dashboard to products to import to product details.',
  },
  {
    title: 'Mobile QA for main pages',
    priority: TaskPriority.high,
    category: 'QA',
    dueOffsetDays: 6,
    description: 'Test dashboard, products, product details, imports, data tools, organization, billing, profile, and my tasks on mobile.',
  },
  {
    title: 'Clean user-facing error messages',
    priority: TaskPriority.medium,
    category: 'UX',
    dueOffsetDays: 7,
    description: 'Replace raw internal server errors with friendly messages and clear next actions across billing, imports, profile, tasks, and products.',
  },
  {
    title: 'Confirm production environment variables',
    priority: TaskPriority.urgent,
    category: 'Deployment',
    dueOffsetDays: 2,
    description: 'Verify API and web environment variables for Paddle, Resend, database, frontend URL, API URL, JWT secrets, Cloudinary, and CORS.',
  },
  {
    title: 'Confirm production migrations are automatic',
    priority: TaskPriority.high,
    category: 'Deployment',
    dueOffsetDays: 2,
    description: 'Confirm npm run deploy runs install, Prisma generate, Prisma migrate deploy, and API build successfully on DigitalOcean.',
  },
  {
    title: 'Set up task reminder scheduler',
    priority: TaskPriority.medium,
    category: 'Automation',
    dueOffsetDays: 8,
    description: 'Add a cron or scheduled endpoint to call the task reminder service and send reminders when task reminder dates are due.',
  },
  {
    title: 'Test email delivery',
    priority: TaskPriority.high,
    category: 'Email',
    dueOffsetDays: 4,
    description: 'Test verification OTP, password reset, organization invite, and task reminder emails using production Resend settings.',
  },
  {
    title: 'Review landing page pricing and copy',
    priority: TaskPriority.medium,
    category: 'Marketing',
    dueOffsetDays: 9,
    description: 'Make sure the landing page clearly explains Free, Starter, Growth, and Business-later plans with realistic benefits.',
  },
  {
    title: 'Add demo script',
    priority: TaskPriority.medium,
    category: 'Demo',
    dueOffsetDays: 10,
    description: 'Write a 5-minute demo flow showing the problem, NexStock solution, product import, data sanitation, product details, currency, and subscription flow.',
  },
  {
    title: 'Create first beta user checklist',
    priority: TaskPriority.medium,
    category: 'Launch',
    dueOffsetDays: 10,
    description: 'Prepare a checklist for first beta testers: signup, create organization, import products, add attributes, test images, review dashboard, give feedback.',
  },
  {
    title: 'Review legal pages',
    priority: TaskPriority.medium,
    category: 'Legal',
    dueOffsetDays: 12,
    description: 'Confirm Terms, Privacy Policy, Refund Policy, and pricing links are visible and acceptable for Paddle verification and user trust.',
  },
];

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

  async createLaunchChecklist(user: CurrentUserPayload) {
    try {
      const existing = await this.db.task.findMany({
        where: {
          organizationId: user.organizationId,
          userId: user.id,
          title: { in: LAUNCH_CHECKLIST_TASKS.map((task) => task.title) },
        },
        select: { title: true },
      });
      const existingTitles = new Set(existing.map((task) => task.title));
      const now = new Date();
      const tasksToCreate = LAUNCH_CHECKLIST_TASKS.filter((task) => !existingTitles.has(task.title));

      if (tasksToCreate.length > 0) {
        await this.db.task.createMany({
          data: tasksToCreate.map((task) => {
            const dueAt = this.dateWithOffset(now, task.dueOffsetDays);
            return {
              organizationId: user.organizationId,
              userId: user.id,
              title: task.title,
              description: task.description,
              status: TaskStatus.todo,
              priority: task.priority,
              category: task.category,
              dueAt,
              reminderEnabled: true,
              reminderAt: dueAt,
            };
          }),
        });
      }

      return {
        created: tasksToCreate.length,
        skipped: existing.length,
        total: LAUNCH_CHECKLIST_TASKS.length,
      };
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

  private dateWithOffset(base: Date, offsetDays: number) {
    const next = new Date(base);
    next.setDate(base.getDate() + offsetDays);
    next.setHours(9, 0, 0, 0);
    return next;
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
