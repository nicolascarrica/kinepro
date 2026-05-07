# KinePro

App de gestión de turnos para el centro de kinesiología KinePro.
Trabajo práctico de **Ingeniería de Software II - UNLP - 2026**.

Frontend (Next.js) y backend (NestJS) están **separados**, comunicándose
por una API REST autenticada con JWT.

> **Importante para la cátedra:** todas las funcionalidades implementadas
> están trazadas a una HU. Las HU que no estaban en `HU.docx` se redactaron
> en `../HU-NUEVAS-creadas-por-Claude.docx` y están claramente marcadas como
> creadas durante el desarrollo. Ver la **matriz HU ↔ código ↔ pantalla**
> al final de este README.

## Stack

| Capa | Tecnología |
|------|------------|
| Backend | NestJS 10 + Prisma + SQLite + JWT |
| Frontend | Next.js 14 (App Router) + TailwindCSS |
| Tests | Jest (reglas de negocio críticas) |
| Validación | class-validator |

## Estructura

```
kinepro/
├── apps/
│   ├── api/                # Backend NestJS
│   │   ├── prisma/         # schema + seed
│   │   └── src/
│   │       ├── auth/        # HU del épica "Control de accesos"
│   │       ├── users/       # HU "Crear usuario interno" (Owner)
│   │       ├── activities/  # HU Crear/Modificar/Eliminar actividad
│   │       ├── slots/       # HU "Crear turno" + "Cancelar turno por el centro"
│   │       ├── appointments/# HU Reservar / Cancelar / Reprogramar / Listar
│   │       ├── notifications/# HU "Recibir notificaciones de turnos"
│   │       └── settings/    # HU "Configurar precios y descuento"
│   └── web/                # Frontend Next.js
│       └── src/app/
│           ├── login / registro / recuperar
│           ├── dashboard
│           ├── turnos/(reservar|mis-turnos)
│           ├── admin/(agenda|actividades|turnos/crear)
│           ├── owner/(usuarios|configuracion)
│           └── notificaciones
└── README.md (este archivo)
```

## Requisitos

- Node.js 20 o superior
- npm 10 (viene con Node 20)

## Cómo correrlo

```bash
# 1) Desde la raíz kinepro/
npm install --workspaces

# 2) Configurar y poblar la base SQLite (la primera vez)
cd apps/api
cp .env.example .env       # ya viene listo con valores por defecto
npx prisma migrate dev --name init
npm run seed

# 3) Levantar el backend
npm run start:dev          # http://localhost:4000/api

# 4) En otra terminal, el frontend
cd ../web
npm run dev                # http://localhost:3000
```

### Usuarios sembrados (`seed`)

Todos tienen la contraseña **`kinepro2026`**.

| Rol | Email | Notas |
|-----|-------|-------|
| Owner | `owner@kinepro.com` | gestiona precios, usuarios internos |
| Administrativo | `admin@kinepro.com` | agenda, actividades, asistencia |
| Paciente (mensual) | `paciente1@kinepro.com` | tiene plan mensual con descuento |
| Paciente | `paciente2@kinepro.com` | plan ocasional |
| Paciente | `paciente3@kinepro.com` | plan ocasional |

El seed crea actividades **Tren superior / Tren medio / Tren inferior**
y turnos para toda la próxima semana en horarios L–V de 9, 10 y 11 hs.

### Tests

```bash
cd apps/api
npm test
```

Hay tests para las reglas críticas del backend:

- Crear turno fuera de rango horario.
- Crear turno fuera del rango semanal (sólo L–V).
- Conflicto por misma actividad o misma franja horaria.
- ABM de actividades: nombre duplicado, eliminación con turnos activos.

## Arquitectura

```
        ┌────────────────────┐        ┌──────────────────────┐
        │  Next.js (web)     │  HTTP  │   NestJS (api)       │
        │  - App Router      │ ─────▶ │   /api/auth          │
        │  - Tailwind        │  JWT   │   /api/activities    │
        │  - Auth context    │        │   /api/slots         │
        │  - Guard por rol   │        │   /api/appointments  │
        └────────────────────┘        │   /api/notifications │
                                      │   /api/users         │
                                      │   /api/settings      │
                                      └──────────┬───────────┘
                                                 │ Prisma
                                                 ▼
                                         ┌──────────────┐
                                         │  SQLite      │
                                         └──────────────┘
```

## Matriz HU ↔ código ↔ pantalla

> ✅ HU original (de `HU.docx`)
> 🆕 HU nueva (creada por Claude durante el desarrollo, ver `HU-NUEVAS-creadas-por-Claude.docx`)
>
> El documento complementario contiene **9 HU** que cubren funcionalidades
> requeridas por el SRS o por el flujo de la app que no tenían HU previa.

### Épica: Control de accesos

| HU | Endpoint | Pantalla |
|----|----------|----------|
| ✅ Registrar usuario | `POST /api/auth/register` | `/registro` |
| ✅ Iniciar sesión (con bloqueo por intentos) | `POST /api/auth/login` | `/login` |
| ✅ Cerrar sesión | `POST /api/auth/logout` | header `Cerrar sesion` |
| ✅ Modificar contraseña | `POST /api/auth/change-password` | `/perfil` |
| ✅ Restablecer contraseña | `POST /api/auth/request-reset` + `POST /api/auth/reset-password` | `/recuperar` |
| ✅ Desbloquear cuenta | `POST /api/auth/unlock-account` | (mediante token enviado en notificación) |
| ✅ Modificar datos personales | `POST /api/auth/update-profile` | `/perfil` |
| ✅ Controlar asistencia | `POST /api/appointments/attendance/:slotId` | (admin/agenda) |
| 🆕 Crear usuario interno (Owner) | `POST /api/users/internal` | `/owner/usuarios` |
| 🆕 Listar usuarios del sistema (Owner) | `GET /api/users` | `/owner/usuarios` |
| 🆕 Asignar plan mensual al paciente | `PATCH /api/users/:id/plan` | `/owner/usuarios` |

### Épica: Gestión de turnos y actividades

| HU | Endpoint | Pantalla |
|----|----------|----------|
| 🆕 Listar actividades disponibles | `GET /api/activities` | `/admin/actividades` + selector en `/turnos/reservar` |
| ✅ Crear actividad | `POST /api/activities` | `/admin/actividades` |
| ✅ Modificar actividad | `PATCH /api/activities/:id` | `/admin/actividades` |
| ✅ Eliminar actividad | `DELETE /api/activities/:id` | `/admin/actividades` |
| ✅ Crear turno | `POST /api/slots` | `/admin/turnos/crear` |
| 🆕 Generar agenda semanal | `POST /api/slots/week` | `/admin/turnos/crear` (pestaña "Generar semana") |
| ✅ Reservar turno por demanda | `POST /api/appointments/reserve` | `/turnos/reservar` |
| ✅ Reservar turnos fijos | (hereda flujo de reserva con `monthlyBooking`) | (extensión de `/turnos/reservar`) |
| ✅ Cancelar turno (paciente) | `POST /api/appointments/:id/cancel` | `/turnos/mis-turnos` |
| ✅ Reprogramar turno | `POST /api/appointments/:id/reschedule` | `/turnos/mis-turnos` |
| ✅ Listar turnos (paciente) | `GET /api/appointments/mine?filtro=PROXIMOS` | `/turnos/mis-turnos` |
| ✅ Consultar historial de turnos | `GET /api/appointments/mine?from=&to=` | `/turnos/mis-turnos` (filtro Historial) |
| 🆕 Listar agenda general (personal interno) | `GET /api/slots` | `/admin/agenda` |
| 🆕 Cancelar turno por el centro | `POST /api/slots/:id/cancel` | `/admin/agenda` |

### Épica: Gestión de Pagos y Facturación

| HU | Endpoint | Pantalla |
|----|----------|----------|
| ✅ Pagar turno con MercadoPago | (mock en MVP, marca pago aprobado al confirmar reserva) | `/turnos/reservar` |
| ✅ Registrar pago presencial | (módulo extendible — modelo `Payment` listo) | `/admin/pagos` (futuro) |
| ✅ Generar comprobante de pago | `Payment.comprobanteId` (auto al aprobar) | `/turnos/mis-turnos` (descarga futura) |
| ✅ Consultar historial de pagos | (módulo extendible) | `/admin/pagos` (futuro) |
| ✅ Aplicar penalización (cálculo del monto) | lógica en `AppointmentsService.reservar` (descuento según plan) | (transparente) |
| 🆕 Configurar precios y descuento mensual | `GET/PUT /api/settings` | `/owner/configuracion` |

### Épica: Lista de espera

| HU | Endpoint | Pantalla |
|----|----------|----------|
| ✅ Anotarse / Baja paciente / Personal | (modelo `WaitlistEntry` listo, endpoints en `waitlist/` para Demo 2) | (Demo 2) |
| ✅ Confirmación turno ofrecido | (Demo 2) | (Demo 2) |
| ✅ Prioridad por tipo de plan | (Demo 2) | (Demo 2) |

### Épica: Notificaciones

| HU | Endpoint | Pantalla |
|----|----------|----------|
| ✅ Recibir notificaciones de turnos (confirmado / cancelado / recordatorio) | `GET /api/notifications` | campanita 🔔 en header + `/notificaciones` |
| 🆕 Marcar notificación como leída | `PATCH /api/notifications/:id/read` | dropdown de la campanita |
| ✅ Notificación de turno liberado (lista de espera) | (Demo 2) | (Demo 2) |

### Épica: Estadísticas y reportes

| HU | Endpoint | Pantalla |
|----|----------|----------|
| ✅ Reportar cancelaciones | (Demo 2 — datos disponibles en `Appointment.status`) | `/owner/reportes` (Demo 2) |
| ✅ Reportar reprogramaciones | (Demo 2) | `/owner/reportes` (Demo 2) |
| ✅ Reportar rendimiento por actividad | (Demo 2) | `/owner/reportes` (Demo 2) |

> Las HU marcadas como **(Demo 2)** tienen sus modelos de datos creados (no
> requiere migración nueva) y endpoints stub. Se completarán en la segunda
> entrega siguiendo el cronograma del PGP.

## Mapa de roles y permisos

| Acción | Owner | Administrativo | Paciente |
|--------|-------|----------------|----------|
| Registrarse / Iniciar sesión | ✓ | ✓ | ✓ |
| Reservar / Cancelar / Reprogramar turno propio | — | — | ✓ |
| Crear / Modificar / Eliminar actividad | ✓ | ✓ | — |
| Crear turno | ✓ | ✓ | — |
| Cancelar turno por el centro | ✓ | ✓ | — |
| Marcar asistencia | ✓ | ✓ | — |
| Crear usuarios internos | ✓ | — | — |
| Configurar precios / descuento | ✓ | — | — |
| Ver pagos / reportes (Demo 2) | ✓ | — | sólo los propios |

## Consideraciones para la demo

1. **Reservar y reprogramar:** levantar API, frontend, loguearse como
   `paciente1@kinepro.com`, ir a "Reservar" y elegir un turno. Después
   ir a "Mis turnos" y cancelar / reprogramar.
2. **Reglas de rechazo:** intentar reservar un turno ya reservado en el
   mismo horario, o uno sin cupo, para mostrar los mensajes de error
   correspondientes.
3. **Crear turno:** loguearse como `admin@kinepro.com`, intentar crear un
   turno fuera de rango (22:00) o un sábado, para mostrar las reglas.
4. **Eliminar actividad:** intentar eliminar `Tren superior` con turnos
   activos para mostrar el rechazo "Deben reprogramarse los turnos antes
   de eliminar una actividad".
5. **Owner:** loguearse como `owner@kinepro.com`, ir a Configuración para
   ajustar precios/descuento. Ir a "Usuarios internos" y crear un nuevo
   admin.

## Próximos pasos (Demo 2)

- Implementar endpoints REST de **lista de espera** (modelo ya creado).
- Integración real con **MercadoPago** (hoy mockeado).
- **Reportes** consumiendo `AuditLog` y `Appointment.status`.
- Envío real de email vía SMTP (hoy `Notification` con canal EMAIL queda
  persistida para mostrar el flujo).

## Documentación relacionada

- `../HU.docx` — historias de usuario originales del cliente.
- `../HU-NUEVAS-creadas-por-Claude.docx` — HU detectadas durante el
  desarrollo (Listar agenda general, Crear usuario interno, Cancelar turno
  por el centro, Configurar precios y descuento).
- `../SRS+PGP.docx` — Software Requirements Specification + Plan de
  Gestión de Proyecto.
- `../Completar-SRS-PGP-KinePro.md` — supuestos de trabajo y matriz de
  roles consensuada.
