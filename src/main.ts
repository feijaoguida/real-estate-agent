import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Real Estate Agent API')
    .setDescription('API para agentes de IA da imobiliária')
    .setVersion('1.0')
    .addBearerAuth() // adiciona suporte ao Authorization no Swagger
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log('API rodando em http://localhost:3000');
  console.log('Swagger disponível em http://localhost:3000/api');
}
bootstrap();
