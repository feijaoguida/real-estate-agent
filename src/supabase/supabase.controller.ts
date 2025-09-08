import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('supabase')
@Controller('supabase')
export class SupabaseController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async findAll() {
    return this.supabase.getUsers();
  }

  @Get(':userId')
  async findOne(@Param('userId') userId: string) {
    return this.supabase.getAgentsByUserId(userId);
  }

  @Get('instance/:instanceName')
  async findinstance(@Param('instanceName') instanceName: string) {
    return this.supabase.getUserByInstanceName(instanceName);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.supabase.insertUser(dto);
  }
}
