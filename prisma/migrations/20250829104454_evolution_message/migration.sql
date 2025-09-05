-- CreateTable
CREATE TABLE "EvolutionMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "remoteJid" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromMe" BOOLEAN NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
