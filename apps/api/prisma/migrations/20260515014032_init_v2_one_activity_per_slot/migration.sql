/*
  Warnings:

  - Added the required column `activityId` to the `Slot` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL DEFAULT 8,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Activity" ("capacidad", "createdAt", "descripcion", "id", "nombre", "updatedAt") SELECT "capacidad", "createdAt", "descripcion", "id", "nombre", "updatedAt" FROM "Activity";
DROP TABLE "Activity";
ALTER TABLE "new_Activity" RENAME TO "Activity";
CREATE UNIQUE INDEX "Activity_nombre_key" ON "Activity"("nombre");
CREATE TABLE "new_Slot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "cupo" INTEGER NOT NULL,
    "cancelado" BOOLEAN NOT NULL DEFAULT false,
    "motivoCancel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Slot_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Slot" ("cancelado", "createdAt", "cupo", "id", "motivoCancel", "startsAt", "updatedAt") SELECT "cancelado", "createdAt", "cupo", "id", "motivoCancel", "startsAt", "updatedAt" FROM "Slot";
DROP TABLE "Slot";
ALTER TABLE "new_Slot" RENAME TO "Slot";
CREATE INDEX "Slot_startsAt_idx" ON "Slot"("startsAt");
CREATE UNIQUE INDEX "Slot_activityId_startsAt_key" ON "Slot"("activityId", "startsAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
