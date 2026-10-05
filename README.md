# Tablero

App de tareas para Martín, Felipe y Ramiro: proyectos, quién hace qué y para cuándo, e historial de lo hecho. Está pensada para el celu y se instala como app desde el navegador.

## Cómo funciona

- **Frontend:** React + Vite (`src/`). Se publica sola en GitHub Pages con cada push a `main` (`.github/workflows/deploy.yml`).
- **Datos:** Supabase, proyecto `tablero`. El esquema está en [`supabase/schema.sql`](supabase/schema.sql).
  Las tablas no se pueden leer directo: la app solo llama funciones (`login`, `load_data`, `add_task`, …) que piden una sesión válida.
- **Login:** nombre + PIN de 4 números. El PIN inicial es `1234` y la app obliga a cambiarlo en el primer ingreso. Después de 5 intentos fallidos se bloquea 10 minutos.

## Desarrollo

```bash
npm install
npm run dev
```

Sin el archivo `.env` la app arranca en **modo prueba**: guarda todo en el navegador y el PIN de todos es `1234`.

## Tareas comunes

- **Agregar un proyecto:** en Supabase, tabla `projects`, una fila nueva con `name`, `hue` (`violet`, `blue`, `teal`, `red`, `green`, `amber`, `coral`) y `position`.
- **Archivar un proyecto:** poner `archived = true`.
- **Resetear el PIN de alguien:** en el editor SQL de Supabase:
  ```sql
  update members set pin_hash = extensions.crypt('1234', extensions.gen_salt('bf')),
    pin_is_default = true, failed_attempts = 0, locked_until = null
  where name = 'Felipe';
  ```
