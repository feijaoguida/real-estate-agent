# Etapa de build
FROM node:20 AS builder
WORKDIR /app

# instalar dependências
COPY package*.json ./
RUN npm install

# copiar o código
COPY . .

# gerar o prisma client


# build do projeto
RUN npm run build

# Etapa de execução
FROM node:20-alpine
WORKDIR /app

# copiar node_modules + dist + prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# expor a porta
EXPOSE 3000

CMD ["node", "dist/main.js"]
