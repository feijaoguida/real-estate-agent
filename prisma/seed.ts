import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando seed completo...');

  // 1️⃣ Empresas
  const companyA = await prisma.company.upsert({
    where: { id: 'company-a' },
    update: {},
    create: { id: 'company-a', name: 'Empresa A' },
  });
  console.log(`✅ Empresa criada: ${companyA.name}`);

  const companyB = await prisma.company.upsert({
    where: { id: 'company-b' },
    update: {},
    create: { id: 'company-b', name: 'Empresa B' },
  });
  console.log(`✅ Empresa criada: ${companyB.name}`);

  // 2️⃣ Instâncias Evolution
  const instanceA1 = await prisma.evolutionInstance.create({
    data: {
      id: randomUUID(),
      name: 'Instancia A1',
      sessionId: `sess-${Date.now()}-1`,
      token: `token-${Date.now()}-1`,
      qrCode: '',
      connected: false,
      companyId: companyA.id,
    },
  });
  console.log(`✅ Instância criada: ${instanceA1.name} para ${companyA.name}`);

  const instanceB1 = await prisma.evolutionInstance.create({
    data: {
      id: randomUUID(),
      name: 'Instancia B1',
      sessionId: `sess-${Date.now()}-2`,
      token: `token-${Date.now()}-2`,
      qrCode: '',
      connected: false,
      companyId: companyB.id,
    },
  });
  console.log(`✅ Instância criada: ${instanceB1.name} para ${companyB.name}`);

  // 3️⃣ Clientes
  const customerA1 = await prisma.customer.create({
    data: { id: randomUUID(), phone: '5511999991111', companyId: companyA.id },
  });
  console.log(`✅ Cliente criado: ${customerA1.phone} para ${companyA.name}`);

  const customerA2 = await prisma.customer.create({
    data: { id: randomUUID(), phone: '5511999992222', companyId: companyA.id },
  });
  console.log(`✅ Cliente criado: ${customerA2.phone} para ${companyA.name}`);

  const customerB1 = await prisma.customer.create({
    data: { id: randomUUID(), phone: '5511999993333', companyId: companyB.id },
  });
  console.log(`✅ Cliente criado: ${customerB1.phone} para ${companyB.name}`);

  // 4️⃣ Agentes
  const agentA = await prisma.agent.create({
    data: {
      id: randomUUID(),
      name: 'João',
      style: 'Persuasivo, Educado, Rápido',
      companyId: companyA.id,
    },
  });
  console.log(`✅ Agente criado: ${agentA.name} para ${companyA.name}`);

  const agentB = await prisma.agent.create({
    data: {
      id: randomUUID(),
      name: 'Maria',
      style: 'Empática, Paciente',
      companyId: companyB.id,
    },
  });
  console.log(`✅ Agente criado: ${agentB.name} para ${companyB.name}`);

  // 5️⃣ Chats e mensagens iniciais
  const chatA1 = await prisma.chat.create({
    data: {
      id: randomUUID(),
      instanceId: instanceA1.id,
      customerId: customerA1.id,
    },
  });
  console.log(
    `✅ Chat criado para cliente ${customerA1.phone} na instância ${instanceA1.name}`,
  );

  await prisma.message.createMany({
    data: [
      {
        id: randomUUID(),
        chatId: chatA1.id,
        fromMe: false,
        text: 'Olá, gostaria de informações sobre o produto X?',
      },
      {
        id: randomUUID(),
        chatId: chatA1.id,
        fromMe: true,
        text: 'Olá! Claro, posso te ajudar com isso.',
      },
    ],
  });
  console.log(
    `💬 Mensagens iniciais adicionadas ao chat de ${customerA1.phone}`,
  );

  const chatA2 = await prisma.chat.create({
    data: {
      id: randomUUID(),
      instanceId: instanceA1.id,
      customerId: customerA2.id,
    },
  });
  console.log(
    `✅ Chat criado para cliente ${customerA2.phone} na instância ${instanceA1.name}`,
  );

  await prisma.message.createMany({
    data: [
      {
        id: randomUUID(),
        chatId: chatA2.id,
        fromMe: false,
        text: 'Oi, quero saber sobre o preço do serviço Y.',
      },
      {
        id: randomUUID(),
        chatId: chatA2.id,
        fromMe: true,
        text: 'Olá! O serviço Y custa R$199,99. Deseja que eu explique os detalhes?',
      },
    ],
  });
  console.log(
    `💬 Mensagens iniciais adicionadas ao chat de ${customerA2.phone}`,
  );

  const chatB1 = await prisma.chat.create({
    data: {
      id: randomUUID(),
      instanceId: instanceB1.id,
      customerId: customerB1.id,
    },
  });
  console.log(
    `✅ Chat criado para cliente ${customerB1.phone} na instância ${instanceB1.name}`,
  );

  await prisma.message.createMany({
    data: [
      {
        id: randomUUID(),
        chatId: chatB1.id,
        fromMe: false,
        text: 'Preciso de suporte técnico, meu aparelho não liga.',
      },
      {
        id: randomUUID(),
        chatId: chatB1.id,
        fromMe: true,
        text: 'Olá! Vou te ajudar a resolver isso. Pode me informar o modelo?',
      },
    ],
  });
  console.log(
    `💬 Mensagens iniciais adicionadas ao chat de ${customerB1.phone}`,
  );

  console.log('🎉 Seed completo finalizado!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
