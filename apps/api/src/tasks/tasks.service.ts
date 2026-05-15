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

function taskDescription(summary: string, prompt: string) {
  return `${summary}\n\nChatGPT prompt:\n${prompt}`;
}

const SHADCN_RULE = 'Use existing shadcn/ui primitives and Tailwind utility classes. Do not add global CSS shims, !important overrides, or custom layout hacks. If a new component is needed, compose it from shadcn components such as Card, Button, Badge, Input, Select, Tabs, Table, Dialog, DropdownMenu, Sheet, Separator, Alert, Skeleton, and Tooltip.';

const LAUNCH_CHECKLIST_TASKS: LaunchChecklistTask[] = [
  {
    title: 'Fix task creation and task update API flow',
    priority: TaskPriority.urgent,
    category: 'Tasks',
    dueOffsetDays: 0,
    description: taskDescription(
      'Tasks must create, update, load, complete, and delete reliably from the UI. Fix any backend validation mismatch, missing task migration, wrong payload field, wrong auth handling, or frontend API issue that prevents task creation.',
      `You are a senior full-stack developer. Audit NexStock task CRUD end-to-end in apps/web and apps/api. Confirm POST /api/tasks, PATCH /api/tasks/:id, DELETE /api/tasks/:id, and GET /api/tasks match the frontend payload exactly. Fix task creation bugs, validation mismatches, migration issues, auth/organization scoping, and user-facing errors. ${SHADCN_RULE} Update README with what changed and include test steps.`
    ),
  },
  {
    title: 'Create full app UI/UX audit plan for every route',
    priority: TaskPriority.urgent,
    category: 'UI/UX',
    dueOffsetDays: 0,
    description: taskDescription(
      'Review every web route and produce a page-by-page improvement checklist covering layout consistency, spacing, responsiveness, empty states, loading states, actions, forms, tables, detail pages, sidebar behavior, and mobile usability.',
      `Act as a senior SaaS product designer and frontend engineer. Audit every route in apps/web/app for NexStock. For each page, list UI/UX issues, bugs, overuse of cards, missing loading/empty/error states, broken responsive behavior, and unclear actions. Recommend exact fixes using shadcn/ui patterns only. Do not create custom CSS hacks. Output a prioritized launch-readiness checklist and then implement the highest-impact fixes.`
    ),
  },
  {
    title: 'Remove overuse of cards across detail pages',
    priority: TaskPriority.high,
    category: 'UI/UX',
    dueOffsetDays: 1,
    description: taskDescription(
      'Many pages wrap every section in heavy cards. Detail pages should use clean page structure: title/content area, action bar, sections, separators, and lightweight metadata sidebars. Use cards only when grouping is needed.',
      `Review all detail pages in NexStock: products/[id], suppliers/[id], purchase-orders/[id], imports/[id], tasks/[id], API key/webhook details if present. Redesign pages to avoid wrapping everything in cards. Use page headers, section headings, Separator, Badge, Button, and lightweight bordered sidebars. Keep cards only for true grouped modules. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Standardize app shell and page header UX',
    priority: TaskPriority.high,
    category: 'UI/UX',
    dueOffsetDays: 1,
    description: taskDescription(
      'Every dashboard page must share a consistent header pattern with breadcrumb/context text, title, description, and primary actions. Avoid random spacing and page-specific shell differences.',
      `Audit all dashboard pages for consistent app shell usage with AppSidebar, SiteHeader, SidebarInset, and page headers. Standardize title, subtitle, back button, primary action, and responsive action layout. ${SHADCN_RULE} Avoid custom CSS and update route components consistently.`
    ),
  },
  {
    title: 'Standardize form UX across products, suppliers, tasks, imports, billing, and settings',
    priority: TaskPriority.high,
    category: 'Forms',
    dueOffsetDays: 2,
    description: taskDescription(
      'All forms must use consistent field labels, validation messages, disabled states, required indicators, action bars, cancel behavior, success/error toasts, and responsive grids.',
      `Audit all forms in apps/web. Standardize form layout using shadcn Label, Input, Textarea, Select, Switch, Button, ButtonGroup, Alert, and Card only where it adds structure. Ensure required fields are clear, validation is friendly, cancel goes to the right route, save buttons show loading, and mobile layout works. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Fix product create/edit UX and supplier cost section',
    priority: TaskPriority.urgent,
    category: 'Products',
    dueOffsetDays: 1,
    description: taskDescription(
      'Product create/edit must be clean, responsive, and not clipped by the summary panel. Supplier cost source should follow the same visual rhythm as selling price/stock, with no CSS shims.',
      `Review apps/web/components/products/product-layout-form.tsx. Fix product create/edit UX using shadcn patterns. Ensure supplier section, selling price, layout fields, images, summary sidebar, and action bar are responsive. No global CSS or !important. Ensure supplier row actions do not overlap fields. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Fix product detail page layout and actions',
    priority: TaskPriority.high,
    category: 'Products',
    dueOffsetDays: 2,
    description: taskDescription(
      'Product detail should show product identity, stock, pricing, supplier cost, images, custom fields, inventory logs, and actions in a clean detail-page layout without too many cards.',
      `Audit and redesign the product detail page. Use a clean title/content layout, metadata sidebar, action bar, and focused sections. Avoid card-overuse. Ensure custom layout fields display correctly for text, numbers, currency, files, images, booleans, select, date, and lookup. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Fix products list table and toolbar UX',
    priority: TaskPriority.high,
    category: 'Products',
    dueOffsetDays: 2,
    description: taskDescription(
      'Products list needs a clear toolbar, filters, search, import/export actions, bulk actions, responsive table/cards, empty state, and loading skeletons.',
      `Audit the Products list page. Improve toolbar, dropdown actions, search, filters, table density, mobile behavior, empty state, loading state, bulk actions, and row actions. Ensure Add Product and Import Products flows are obvious. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Fix imports dashboard, setup, mapping, and detail UX',
    priority: TaskPriority.high,
    category: 'Imports',
    dueOffsetDays: 2,
    description: taskDescription(
      'Import pages should feel like a real product workflow: previous imports dashboard, setup, mapping, validation/preview, import detail/logs, and retry/fix actions.',
      `Audit /imports, /imports/new, /imports/new/mapping, and /imports/[id]. Fix layout, spacing, empty states, mapping UX, backend errors, log display, and mobile behavior. Add import preview/validation if missing. Ensure templates are backend-compatible. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Add import preview and validation before final upload',
    priority: TaskPriority.high,
    category: 'Imports',
    dueOffsetDays: 3,
    description: taskDescription(
      'Users should preview parsed rows and validation issues before committing an import. The page should show required-field errors, select-option mismatches, invalid numbers, date errors, and duplicate SKU warnings.',
      `Design and implement an import preview step. Add backend or frontend validation as needed. Show row count, mapped columns, sample rows, required errors, warnings, and final Start Import action. Use shadcn Table, Alert, Badge, Button, Tabs, and Dialog where appropriate. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Fix tasks dashboard UX and task detail page',
    priority: TaskPriority.high,
    category: 'Tasks',
    dueOffsetDays: 1,
    description: taskDescription(
      'Tasks pages must be useful and not over-carded. The list should be scannable; detail should look like a detail page; forms should create reliably.',
      `Audit /tasks, /tasks/new, /tasks/[id], and /tasks/[id]/edit. Fix task creation bugs, improve list scanning, reduce overuse of cards on details, add friendly empty/loading/error states, and ensure actions work. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Fix suppliers pages and supplier-product relationships',
    priority: TaskPriority.high,
    category: 'Suppliers',
    dueOffsetDays: 3,
    description: taskDescription(
      'Supplier list/detail/create/edit should support real supplier operations and connect cleanly with product supplier cost workflow and purchase orders.',
      `Audit supplier routes and components. Improve supplier list, detail, create/edit forms, product links, preferred supplier behavior, supplier SKU, cost/currency, MOQ, lead time, and empty/loading/error states. Ensure product-supplier relationship APIs match frontend payloads. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Verify and complete purchase order UI',
    priority: TaskPriority.high,
    category: 'Purchase Orders',
    dueOffsetDays: 4,
    description: taskDescription(
      'Purchase orders must work from create to receive stock. Verify supplier selection, line items, totals, status changes, receive flow, and inventory logs.',
      `Audit purchase order web and API flows. Fix create/edit/detail/list/receive UI. Ensure receiving cannot over-receive, cannot receive cancelled orders, updates stock correctly, and logs inventory accurately. Improve UX with shadcn Table, Dialog, Alert, Badge, Button, and form components. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Fix dashboard metrics, loading, and navigation clarity',
    priority: TaskPriority.medium,
    category: 'Dashboard',
    dueOffsetDays: 4,
    description: taskDescription(
      'Dashboard should show reliable product, stock, retail value, cost value, low stock, imports, tasks, and key next actions with clear loading and empty states.',
      `Audit the dashboard page and API. Verify metric correctness and loading states. Add useful next actions and avoid decorative cards that do not help users. Use shadcn cards sparingly for metrics only. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Fix API keys management UI and API contract',
    priority: TaskPriority.high,
    category: 'API Keys',
    dueOffsetDays: 5,
    description: taskDescription(
      'API key page must allow create, view once, copy secret, revoke, scope selection, and clear developer guidance.',
      `Audit /api-keys and backend API key endpoints. Implement missing CRUD UI. Add scope selection, copy-to-clipboard, one-time secret display, revoke confirmation, empty/loading/error states, and developer docs link. Use shadcn Dialog, Alert, Table, Badge, Button, Checkbox or Select. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Fix webhook management UI and delivery testing',
    priority: TaskPriority.high,
    category: 'Webhooks',
    dueOffsetDays: 5,
    description: taskDescription(
      'Webhooks page must support endpoint creation, event selection, secret/signature explanation, test delivery, delivery status, and deletion.',
      `Audit /webhooks and backend webhook endpoints. Implement complete webhook CRUD and test UI. Show signing info, event list, last delivery/test result, empty state, and delete confirmation. Use shadcn components only. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Audit billing and plan limits UX',
    priority: TaskPriority.high,
    category: 'Billing',
    dueOffsetDays: 5,
    description: taskDescription(
      'Billing must clearly show current plan, usage limits, upgrade path, payment flow, and friendly blocked-limit messages.',
      `Audit billing web and API. Verify plan display, subscription status, usage limit counters, upgrade buttons, Paystack/Paddle flow depending on current implementation, verify callbacks, and error states. Make blocked-limit messages friendly and actionable. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Audit organization and profile settings UX',
    priority: TaskPriority.medium,
    category: 'Settings',
    dueOffsetDays: 6,
    description: taskDescription(
      'Organization/profile/settings pages must feel consistent and support base currency, company info, members, preferences, and account details where available.',
      `Audit /organization, /profile, and /settings. Fix forms, section layout, validation, loading states, save/cancel actions, and empty states. Avoid too many cards; use sections and separators where cleaner. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Audit integrations and data tools UX',
    priority: TaskPriority.medium,
    category: 'Integrations',
    dueOffsetDays: 6,
    description: taskDescription(
      'Integrations and data tools should clearly explain what is connected, what is coming soon, and what actions are available now. Remove dead/unclear UI.',
      `Audit /integrations and /data-tools. Fix unclear cards, placeholder content, broken buttons, upload flows, conversion/sanitation UX, and empty states. Ensure anything not implemented is labeled clearly or hidden. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Add consistent loading skeletons and empty states',
    priority: TaskPriority.medium,
    category: 'UI/UX',
    dueOffsetDays: 6,
    description: taskDescription(
      'All async pages need skeletons or calm loading states, and all empty lists need useful empty states with next actions.',
      `Search apps/web for pages that load data. Add consistent shadcn Skeleton or simple loading rows, and useful empty states with Button actions. Cover products, suppliers, purchase orders, imports, tasks, API keys, webhooks, dashboard, billing, profile, and settings. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Add consistent destructive confirmations',
    priority: TaskPriority.medium,
    category: 'UX Safety',
    dueOffsetDays: 7,
    description: taskDescription(
      'Delete/revoke/cancel actions should use consistent confirmation dialogs, not raw browser confirms.',
      `Replace window.confirm usage with shadcn AlertDialog for destructive actions across the app: delete task, delete product, delete supplier, delete import/log if present, revoke API key, delete webhook, cancel purchase order, remove product image/file, remove supplier row where appropriate. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Audit mobile and responsive behavior across all pages',
    priority: TaskPriority.high,
    category: 'Responsive QA',
    dueOffsetDays: 7,
    description: taskDescription(
      'The app must be usable on laptop and mobile widths. Fix clipping, overlapping, horizontal scroll, sticky sidebars, tables, dialogs, and action bars.',
      `Run a responsive audit of every dashboard route. Fix overlap/clipping using proper Tailwind grids, min-w-0, responsive columns, Sheet/Dialog sizing, table overflow wrappers only where appropriate, and mobile-friendly cards. No global CSS hacks. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Audit backend API error handling and frontend error messages',
    priority: TaskPriority.high,
    category: 'API',
    dueOffsetDays: 7,
    description: taskDescription(
      'Backend errors should be specific and frontend messages should be friendly. No raw database or internal stack messages should show to users.',
      `Audit apps/api controllers/services and apps/web API calls. Standardize validation errors, migration/service unavailable errors, tenant scoping failures, and not-found responses. Update frontend toast/error UI to show clear next actions. Include product, import, supplier, purchase order, tasks, billing, API keys, and webhooks. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Audit tenant scoping and authorization on every API endpoint',
    priority: TaskPriority.urgent,
    category: 'Security',
    dueOffsetDays: 8,
    description: taskDescription(
      'Every tenant-owned API route must enforce organizationId and user permissions/API scopes. No cross-tenant reads/writes.',
      `Review all apps/api modules for organizationId scoping and auth guards. Check products, product types, suppliers, purchase orders, tasks, imports, inventory logs, API keys, webhooks, billing, organization, and public API routes. Fix any endpoint that reads/writes without tenant scoping. Add notes to README. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Audit database migrations and Prisma schema completeness',
    priority: TaskPriority.urgent,
    category: 'Database',
    dueOffsetDays: 8,
    description: taskDescription(
      'All current features must have matching Prisma schema and migrations. Production deploy must not fail because of missing Task/ProductType/ProductImportLog tables.',
      `Audit apps/api/prisma/schema.prisma and migrations. Verify all referenced models and fields exist: Task, ProductType, ProductTypeField, ProductImportLog, ProductSupplier, PurchaseOrder, InventoryLog, API keys, Webhooks. Ensure npm run prisma:generate and migrate deploy work. Fix missing migrations. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Audit public API v1 product endpoints and docs',
    priority: TaskPriority.medium,
    category: 'Developer API',
    dueOffsetDays: 9,
    description: taskDescription(
      'Public API should be stable for developers: list/create/update/adjust products with scopes, examples, and friendly errors.',
      `Audit /api/v1/products public API endpoints. Verify API key guard, scopes, tenant scoping, create/update DTOs, stock adjust endpoint, response shape, and errors. Add developer examples in README or UI. ${SHADCN_RULE}`
    ),
  },
  {
    title: 'Add launch QA checklist and smoke test flow',
    priority: TaskPriority.urgent,
    category: 'QA',
    dueOffsetDays: 9,
    description: taskDescription(
      'Create and run a complete smoke test covering signup, verification, organization setup, products, suppliers, imports, tasks, API keys, webhooks, billing, and dashboard.',
      `Write a launch QA smoke test checklist for NexStock. Then execute/fix what can be checked in code. Cover auth, navigation, layout, products, suppliers, purchase orders, imports, tasks, API keys, webhooks, billing, profile, settings, responsive behavior, and API health. Update README with final status and known issues.`
    ),
  },
  {
    title: 'Clean README and developer setup instructions',
    priority: TaskPriority.high,
    category: 'Documentation',
    dueOffsetDays: 10,
    description: taskDescription(
      'README must accurately describe app setup, environment variables, migrations, routes, known issues, and launch checklist. Remove stale instructions.',
      `Audit README.md and all setup docs. Update install, env vars, migrations, build, deploy, API routes, feature status, known issues, and testing steps. Make it accurate for main-v2. Do not over-document stale features. Include every change made.`
    ),
  },
  {
    title: 'Prepare demo data and beta user journey',
    priority: TaskPriority.medium,
    category: 'Launch',
    dueOffsetDays: 11,
    description: taskDescription(
      'Prepare a realistic demo organization and sample files so the product is easy to demo and beta-test.',
      `Create a beta/demo plan for NexStock. Define sample products, suppliers, purchase orders, import files, messy data examples, custom layouts, API keys, webhooks, and tasks. Add seed/demo instructions where appropriate and document how to reset demo data safely.`
    ),
  },
  {
    title: 'Final launch readiness review',
    priority: TaskPriority.urgent,
    category: 'Launch',
    dueOffsetDays: 12,
    description: taskDescription(
      'Before launch, verify there are no blocker bugs, no broken routes, no major UI clipping, no missing migrations, and no unfinished critical workflows.',
      `Act as a senior launch reviewer. Check NexStock main-v2 for release blockers. Verify web build, API build, migrations, env docs, route coverage, CRUD flows, UI responsiveness, task creation, product import, supplier cost, purchase orders, billing, API keys, webhooks, and README. Produce a final go/no-go report and fix blockers.`
    ),
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
    return `${base.replace(/\/$/, '')}/tasks`;
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
