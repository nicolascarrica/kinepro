-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVO',
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "fechaNacimiento" DATETIME,
    "passwordHash" TEXT NOT NULL,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "passwordMustChange" BOOLEAN NOT NULL DEFAULT false,
    "resetToken" TEXT,
    "resetTokenExpiresAt" DATETIME,
    "unlockToken" TEXT,
    "planMensual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Slot" (
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

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
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
    CONSTRAINT "Appointment_monthlyBookingId_fkey" FOREIGN KEY ("monthlyBookingId") REFERENCES "MonthlyBooking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "desde" DATETIME NOT NULL,
    "hasta" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slotId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "posicion" INTEGER NOT NULL,
    "ofrecidoAt" DATETIME,
    "respondeAntes" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaitlistEntry_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WaitlistEntry_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "monto" REAL NOT NULL,
    "metodo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "externalRef" TEXT,
    "comprobanteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "kind" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "precioPorSesion" REAL NOT NULL DEFAULT 5000,
    "descuentoMensual" REAL NOT NULL DEFAULT 20,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_dni_key" ON "User"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_telefono_key" ON "User"("telefono");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_unlockToken_key" ON "User"("unlockToken");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_nombre_key" ON "Activity"("nombre");

-- CreateIndex
CREATE INDEX "Slot_startsAt_idx" ON "Slot"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_activityId_startsAt_key" ON "Slot"("activityId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_pacienteId_status_idx" ON "Appointment"("pacienteId", "status");

-- CreateIndex
CREATE INDEX "Appointment_slotId_status_idx" ON "Appointment"("slotId", "status");

-- CreateIndex
CREATE INDEX "WaitlistEntry_slotId_tier_posicion_idx" ON "WaitlistEntry"("slotId", "tier", "posicion");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_slotId_pacienteId_key" ON "WaitlistEntry"("slotId", "pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_appointmentId_key" ON "Payment"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_comprobanteId_key" ON "Payment"("comprobanteId");

-- CreateIndex
CREATE INDEX "Notification_userId_leida_idx" ON "Notification"("userId", "leida");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
