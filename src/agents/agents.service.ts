import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AgentsService {
  private prisma = new PrismaClient();

  async createAgent(name: string, style: string, companyId: string) {
    return this.prisma.agent.create({
      data: { name, style, companyId },
    });
  }

  async getAllAgents() {
    return this.prisma.agent.findMany();
  }

  async getAgentById(id: string) {
    return this.prisma.agent.findUnique({ where: { id } });
  }
}
