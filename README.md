# CultureQuest AI

Plataforma cultural interactiva para explorar museos, galerías, centros culturales y sitios históricos del Paraguay.

## Funcionalidades principales

- **Catálogo curatorial**: Exploración de espacios culturales con nombre, descripción, dirección, contacto, horarios, precio de entrada en Guaraníes (PYG) y categoría.
- **Mapa interactivo**: Visualización geográfica con marcadores culturales, selección directa y vista detallada del lugar.
- **Información histórica en vivo (Wikipedia)**: Consulta real a la API de Wikipedia en español al seleccionar cada sitio, con resumen histórico, fotografía oficial si está disponible y enlace a la fuente.
- **Conversor de monedas en tiempo real**: Conversión del precio de entrada de Guaraníes (PYG) a USD, EUR, BRL, ARS y GBP con tasas reales de mercado.
- **Asistente cultural con Gemini**: Chat conectado al servidor Express usando `@google/genai` con acceso en tiempo real al catálogo persistido.
- **Panel de administración protegido**: Alta, edición, eliminación, búsqueda y filtros por categoría y precio, protegido por sesión de administrador verificada en el servidor.
- **Persistencia con Supabase**: Compatible con PostgreSQL en Supabase (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) y almacenamiento persistente local automático en desarrollo cuando no se configuran credenciales externas.

## Variables de entorno (`.env`)

Configurá las siguientes variables en tu entorno o panel de secretos:

- `GEMINI_API_KEY`: Clave de API de Google Gemini (solo servidor).
- `SUPABASE_URL`: URL de tu proyecto Supabase (opcional en desarrollo local).
- `SUPABASE_SERVICE_ROLE_KEY`: Clave `service_role` de Supabase (solo servidor).
- `ADMIN_PASSCODE`: Contraseña de administrador para habilitar escritura en el catálogo.
- `SESSION_SECRET`: Secreto de firma de sesiones (generado automáticamente en Render vía `render.yaml`).

## Despliegue en GitHub y Render

1. Subí este repositorio a GitHub.
2. En Supabase, ejecutá `supabase/schema.sql` dentro del **SQL Editor**.
3. En Render, creá un nuevo **Blueprint** (detecta `render.yaml` automáticamente) o un **Web Service** con:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Cargá `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `ADMIN_PASSCODE` en **Environment Variables** en Render.
