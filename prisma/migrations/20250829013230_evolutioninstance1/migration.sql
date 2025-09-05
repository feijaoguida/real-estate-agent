/*
  Warnings:

  - A unique constraint covering the columns `[sessionId]` on the table `EvolutionInstance` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EvolutionInstance_sessionId_key" ON "EvolutionInstance"("sessionId");
