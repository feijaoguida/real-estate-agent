/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `EvolutionInstance` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "EvolutionInstance" ADD COLUMN "token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EvolutionInstance_token_key" ON "EvolutionInstance"("token");
