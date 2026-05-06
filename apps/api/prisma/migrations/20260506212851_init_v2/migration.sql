/*
  Warnings:

  - You are about to drop the column `activityId` on the `Slot` table. All the data in the column will be lost.
  - Added the required column `activityId` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'POR_DEMANDA',
    "status" TEXT NOT NULL DEFAULT 'RESERVADO',
    "reprogramacionesUsadas" INTEGER NOT NULL DEFAULT 0,
    "precio" REAL NOT NULL,
    "descuentoPct" REAL NOT NULL DEFAULT 0,
    "monthlyBookingId" TEXT,
    "attendanceMarkedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_monthlyBookingId_fkey" FOREIGN KEY ("monthlyBookingId") REFERENCES "MonthlyBooking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("attendanceMarkedAt", "createdAt", "descuentoPct", "id", "monthlyBookingId", "pacienteId", "precio", "reprogramacionesUsadas", "slotId", "status", "type", "updatedAt") SELECT "attendanceMarkedAt", "createdAt", "descuentoPct", "id", "monthlyBookingId", "pacienteId", "precio", "reprogramacionesUsadas", "slotId", "status", "type", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE INDEX "Appointment_pacienteId_status_idx" ON "Appointment"("pacienteId", "status");
CREATE INDEX "Appointment_slotId_status_idx" ON "Appointment"("slotId", "status");
CREATE TABLE "new_Slot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startsAt" DATETIME NOT NULL,
    "cupo" INTEGER NOT NULL,
    "cancelado" BOOLEAN NOT NULL DEFAULT false,
    "motivoCancel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Slot" ("cancelado", "createdAt", "cupo", "id", "motivoCancel", "startsAt", "updatedAt") SELECT "cancelado", "createdAt", "cupo", "id", "motivoCancel", "startsAt", "updatedAt" FROM "Slot";
DROP TABLE "Slot";
ALTER TABLE "new_Slot" RENAME TO "Slot";
CREATE UNIQUE INDEX "Slot_startsAt_key" ON "Slot"("startsAt");
CREATE INDEX "Slot_startsAt_idx" ON "Slot"("startsAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
