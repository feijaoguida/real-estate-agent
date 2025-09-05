/*
  Warnings:

  - You are about to drop the `EvolutionMessage` table. If the table is not empty, all the data it contains will be lost.
  - The primary key for the `Agent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EvolutionInstance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `companyId` to the `Agent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `EvolutionInstance` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EvolutionMessage";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instanceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    CONSTRAINT "Chat_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "EvolutionInstance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Chat_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "fromMe" BOOLEAN NOT NULL,
    "text" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Agent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Agent" ("createdAt", "id", "name", "style") SELECT "createdAt", "id", "name", "style" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
CREATE TABLE "new_EvolutionInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "token" TEXT,
    "qrCode" TEXT,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EvolutionInstance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EvolutionInstance" ("connected", "createdAt", "id", "name", "qrCode", "sessionId", "token", "updatedAt") SELECT "connected", "createdAt", "id", "name", "qrCode", "sessionId", "token", "updatedAt" FROM "EvolutionInstance";
DROP TABLE "EvolutionInstance";
ALTER TABLE "new_EvolutionInstance" RENAME TO "EvolutionInstance";
CREATE UNIQUE INDEX "EvolutionInstance_sessionId_key" ON "EvolutionInstance"("sessionId");
CREATE UNIQUE INDEX "EvolutionInstance_token_key" ON "EvolutionInstance"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
