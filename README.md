# Termar Servicios — Demo

Esta es una demostración de la aplicación **Termar Servicios**: una app offline-first para que un técnico complete hojas de trabajo en una tablet Android.

## Estructura del repositorio

| Carpeta | Qué contiene |
|---|---|
| `design/` | Mockup estático (HTML/CSS/JS) y documentación de diseño. |
| `frontend/` | Aplicación Next.js 16 (App Router), PWA, sincronización offline y pruebas. |
| `backend-03-termar/` | Servidor Node.js sin dependencias que expone la API del día y los trabajos. |

## Variables de entorno

Crear archivo `frontend/.env.local` y copiar las variables necesarias desde `frontend/.env.local.example`.

## Arranque rápido

```bash
# 1. Backend (un terminal)
cd backend-03-termar
npm run start

# 2. Frontend (un terminal)
cd ../frontend
npm install
npm run dev
```

El frontend corre en `http://localhost:3000` y el backend en `http://localhost:4000`.

## Pruebas

Desde `frontend/`:

```bash
npm test
npm run test:watch
```
