import { Body, Controller, Delete, Get, Headers, NotFoundException, Param, Patch, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.tasks.list(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const result = await this.tasks.list(user);
    const task = result.tasks.find((item) => item.id === id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user, dto);
  }

  @Post('launch-checklist')
  @UseGuards(JwtAuthGuard)
  createLaunchChecklist(@CurrentUser() user: CurrentUserPayload) {
    return this.tasks.createLaunchChecklist(user);
  }

  @Post('reminders/run')
  runDueReminders(@Headers('x-task-reminder-secret') secret: string | undefined) {
    const expected = process.env.TASK_REMINDER_SECRET;
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid task reminder secret');
    return this.tasks.sendDueReminders();
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(user, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tasks.remove(user, id);
  }
}
