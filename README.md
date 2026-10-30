# SmartFinance AI

Dashboard financiero personal multi-usuario para Peru. Permite registrar cuentas, transacciones manuales, transferencias, gastos por lenguaje natural, boletas por foto, presupuestos con alertas, chat financiero con IA y predicciones de gasto.

## Stack

- **Frontend:** React 18, Vite 5, Tailwind CSS 3, Recharts, Zustand, Axios, React Router 6, Lucide, date-fns, React Hot Toast.
- **Backend:** Node.js, Express 4 (ESM), Prisma 5.22, PostgreSQL 16 (Neon), JWT + bcryptjs, Zod, Multer, Helmet, express-rate-limit.
- **IA:** Google Gemini mediante la API Interactions (REST). Modo local `mock` disponible sin API key.
- **Deploy:** un solo proyecto de Vercel. El frontend se sirve como estatico desde `client/dist` y Express corre como funcion en `api/index.js`.
- **PWA:** instalable en laptop y celular (manifest + service worker + iconos).

## Estructura

```text
SmartFinance-AI/
  api/index.js                 # Funcion serverless que exporta Express
  client/                      # React + Vite
    public/
      manifest.webmanifest     # Manifest PWA
      sw.js                    # Service worker
      icons/                   # Iconos PWA 192 y 512
      favicon.svg
    src/
      components/
      pages/
      stores/
      lib/
  server/
    prisma/
      schema.prisma
      migrations/
      seed.js
    src/
      config/
      controllers/
      middlewares/
      routes/
      services/
      utils/
      validators/
  docs/database-schema.sql
  package.json                 # Workspaces: server + client
  vercel.json
```

## Requisitos

- Node.js 20 o 22 (probado con Node 24 en desarrollo).
- PostgreSQL 16 accesible (Neon recomendado) o una instancia local para desarrollo.
- Una API key de Google AI Studio solo si usaras Gemini real.

## Configuracion local

1. Instala dependencias desde la raiz:

   ```bash
   npm install
   ```

2. Copia las variables de entorno en la **raiz** del proyecto:

   ```bash
   cp .env.example .env
   ```

   En Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   El backend carga primero `.env` de la raiz y luego, como respaldo, `server/.env`. Prisma CLI lee `.env` de la raiz.

3. Completa `DATABASE_URL` y `DIRECT_URL` con tu base de datos. Para Neon:

   - `DATABASE_URL`: cadena **pooled** (`-pooler`, `pgbouncer=true`, `connection_limit=1`).
   - `DIRECT_URL`: cadena **directa/unpooled**, necesaria para migraciones.

4. Genera secretos JWT:

   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

   Ejecutalo dos veces: uno para `JWT_ACCESS_SECRET` y otro para `JWT_REFRESH_SECRET`.

5. Elige el proveedor de IA:

   - Desarrollo sin clave: `AI_PROVIDER="mock"`.
   - Gemini real: `AI_PROVIDER="gemini"` y `GEMINI_API_KEY="..."`.
   - Modelo por defecto: `GEMINI_MODEL="gemini-3.8-flash"`. Si el modelo esta saturado, el backend reintenta con `gemini-3.1-flash-lite`.

6. Aplica el esquema y carga los datos demo:

   ```bash
   npm run db:deploy
   npm run db:seed
   ```

   Para desarrollo con cambios de esquema usa `npm run db:migrate`.

7. Inicia backend y frontend juntos:

   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:5173
   - API: http://localhost:3000/api/v1
   - Health: http://localhost:3000/api/health

## Credenciales demo

```text
Email:    carlos@demo.com
Password: Demo1234!
```

El usuario demo incluye 3 cuentas, 6 transacciones y 4 presupuestos mensuales. `npm run db:seed` es idempotente para las categorias del sistema, pero **recrea** al usuario demo y sus datos en cada ejecucion. No lo ejecutes en produccion si ya tienes datos reales.

## Scripts

| Comando | Descripcion |
| --- | --- |
| `npm run dev` | Backend con `--watch` + Vite en paralelo. |
| `npm run dev:server` | Solo backend en `http://localhost:3000`. |
| `npm run dev:client` | Solo frontend en `http://localhost:5173`. |
| `npm run build` | Build de produccion del cliente en `client/dist`. |
| `npm run vercel-build` | `prisma generate` + `prisma migrate deploy` + build del cliente. |
| `npm run db:generate` | Genera Prisma Client. |
| `npm run db:migrate` | Crea/aplica migraciones en desarrollo (`prisma migrate dev`). |
| `npm run db:deploy` | Aplica migraciones pendientes (`prisma migrate deploy`). |
| `npm run db:seed` | Carga categorias del sistema y datos demo. |
| `npm run db:studio` | Abre Prisma Studio. |
| `npm run db:reset` | Borra y recrea la base (solo desarrollo). |
| `npm test` | Tests del workspace `server` (Vitest). |

## API

Base: `/api/v1`. Todas las rutas salvo auth requieren `Authorization: Bearer <accessToken>`.

| Recurso | Endpoints principales |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET/PATCH /auth/me` |
| Cuentas | `GET/POST /accounts`, `GET /accounts/summary`, `GET/PATCH/DELETE /accounts/:id` |
| Categorias | `GET/POST /categories`, `GET /categories/tree`, `GET /categories/hidden-count`, `POST /categories/restore-hidden`, `GET/PATCH/DELETE /categories/:id` |
| Transacciones | `GET/POST /transactions`, `POST /transactions/transfer`, `GET/PATCH/DELETE /transactions/:id` |
| Presupuestos | `GET/POST /budgets`, `GET /budgets/status`, `PATCH/DELETE /budgets/:id` |
| Dashboard | `GET /dashboard/summary`, `/expenses-by-category`, `/trends`, `/recent`, `/diagnosis` |
| IA | `GET /ai/status`, `POST /ai/categorize`, `POST /ai/scan-receipt`, `GET /ai/predictions`, `GET/POST/DELETE /ai/chat/*` |

Respuestas exitosas:

```json
{ "status": "success", "data": {} }
```

Respuestas paginadas agregan `meta` con `total`, `page`, `limit` y `totalPages`. Respuestas de error:

```json
{ "status": "error", "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

## Reglas de negocio importantes

- **Aislamiento multi-usuario:** toda consulta filtra por el `userId` del JWT. Un recurso de otro usuario responde `404`.
- **Dinero:** `Decimal(15,2)` en base de datos; el frontend formatea en `PEN` con locale `es-PE`.
- **Fechas:** zona horaria fija `America/Lima` (UTC-5) y columnas `DATE` a medianoche UTC.
- **Categorias:** cada usuario puede crear y editar sus propias categorias. Las categorias del sistema y las que ya tienen movimientos, presupuestos o subcategorias se ocultan por usuario en lugar de borrarse, para conservar el historial. Se pueden restaurar desde `POST /categories/restore-hidden`.
- **Transferencias:** se crean dos transacciones atomicas con `transferPairId`; no se editan, se eliminan y recrean.
- **Boletas:** maximo 4 MB por imagen (`JPG`, `PNG`, `WEBP`) por el limite de body de Vercel.
- **IA:** la prediccion se calcula en el backend; Gemini solo redacta la recomendacion. Si la IA falla, se usa la respuesta local.

## PWA e instalacion en celular

La app es una PWA instalable. En produccion (HTTPS en Vercel):

- **Android (Chrome/Edge):** menu -> "Instalar aplicacion" o "Agregar a pantalla principal".
- **iPhone (Safari):** boton Compartir -> "Agregar a inicio".
- **Laptop (Chrome/Edge):** icono de instalacion en la barra de direcciones.

El service worker cachea el shell de la app para carga rapida. Las llamadas a la API siempre van a la red.

## Despliegue en Vercel + Neon

1. Crea la base en Neon y copia las cadenas pooled y directa.
2. Importa el repositorio en Vercel. El proyecto usa la raiz del repo.
3. En **Project Settings > Environment Variables** configura:

   ```text
   DATABASE_URL
   DIRECT_URL
   JWT_ACCESS_SECRET
   JWT_REFRESH_SECRET
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   GEMINI_API_KEY
   GEMINI_MODEL=gemini-3.8-flash
   AI_PROVIDER=gemini
   NODE_ENV=production
   CLIENT_URL=https://tu-dominio.vercel.app
   ```

   `VERCEL=1` lo define la plataforma automaticamente; no lo configures.

4. El build ejecuta `npm run vercel-build`, que aplica las migraciones con `DIRECT_URL`. Asegurate de tener esa variable configurada para Production y Preview.
5. Tras el primer deploy, carga las categorias del sistema y, si quieres, los datos demo:

   ```bash
   npm run db:seed
   ```

   Hazlo desde tu maquina apuntando a la base de produccion con las variables de entorno correspondientes. No hay seed automatico en Vercel.

### Notas de Vercel

- El plan Hobby es solo para uso personal/no comercial.
- El limite de payload de una funcion es 4.5 MB; por eso las boletas se limitan a 4 MB.
- El rate limiting es en memoria por instancia; no es un limite global.
- Gemini en free tier puede usar los datos enviados para mejorar sus modelos. Para datos sensibles, revisa los terminos de Google o usa un proveedor de pago.

## Subida a GitHub

1. Inicializa Git (si no existe):

   ```bash
   git init
   git branch -M main
   ```

2. Verifica que `.env` este ignorado:

   ```bash
   git status
   ```

   No debe aparecer `.env`, `node_modules`, `dist` ni `.vercel`.

3. Crea el repositorio en GitHub (web) y copia la URL remota.

4. Agrega el remoto y sube:

   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```

## Solucion de problemas

- **`P1012 Environment variable not found: DIRECT_URL`:** falta `DIRECT_URL` en `.env` de la raiz o en las variables de Vercel. Prisma CLI no lee `server/.env`.
- **`prisma migrate deploy` falla:** verifica que `DIRECT_URL` sea la cadena sin `-pooler` y que la base este accesible.
- **El seed no conecta:** confirma que `.env` este en la raiz. El script `server/prisma/seed.js` carga ese archivo explicitamente.
- **La IA responde en modo local:** `AI_PROVIDER=mock`, falta `GEMINI_API_KEY` o Gemini no responde tras agotar el modelo de respaldo.
- **Cookies de refresh no persisten:** en produccion el backend debe correr en HTTPS (`NODE_ENV=production`) y el frontend debe consumir el mismo dominio que la API.
- **Migracion con caracteres corruptos:** no generes SQL con pipes de PowerShell; usa `prisma migrate diff --output <archivo>` para preservar UTF-8.
- **La PWA no se instala:** verifica HTTPS, manifest valido, iconos 192/512 y service worker registrado en DevTools > Application.

## Seguridad

- No subas `.env` ni secretos al repositorio.
- Usa secretos JWT distintos para access y refresh.
- El refresh token se guarda como cookie `httpOnly`, `secure` en produccion, `sameSite=lax`, con rotacion y hash SHA-256 en base de datos.
- Las contrasenas se almacenan con bcrypt (12 rondas).
- El acceso a cada recurso valida pertenencia al usuario autenticado.
- No expongas `GEMINI_API_KEY` en el frontend ni en el README.
