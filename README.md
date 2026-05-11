# Ritmo Diario

App web de tareas diarias con calendario semanal, XP, niveles y premios.

## Notificaciones

La app puede pedir permiso al navegador para recordar tareas pendientes. Los avisos se revisan con una frecuencia prudente configurable y solo se muestran si quedan tareas pendientes del dia.

Nota: esta version usa notificaciones del navegador mientras la app esta abierta o el navegador mantiene la pagina activa. Para avisos garantizados con la app cerrada haria falta convertirla en PWA con push notifications.

## Sincronizar entre dispositivos

La app puede funcionar solo en el navegador o sincronizarse con Supabase.

### 1. Crear proyecto en Supabase

1. Entra a https://supabase.com
2. Crea un proyecto nuevo.
3. Ve a **SQL Editor**.
4. Copia y ejecuta el contenido de `supabase-schema.sql`.

### 2. Agregar las claves publicas

En Supabase, ve a **Project Settings** -> **API** y copia:

- Project URL
- anon public key

Luego edita `supabase-config.js`:

```js
window.RITMO_SUPABASE = {
  url: "https://TU-PROYECTO.supabase.co",
  anonKey: "TU-ANON-KEY",
};
```

Despues sube ese cambio a GitHub y Vercel publicara la nueva version.

## Publicar en Vercel

1. Crea un repositorio en GitHub y sube estos archivos.
2. Entra a Vercel y elige **Add New Project**.
3. Importa el repositorio.
4. En la configuracion del proyecto:
   - Framework Preset: **Other**
   - Build Command: `npm run build`
   - Output Directory: dejar vacio
5. Publica el proyecto.

La app guarda los datos en el navegador de cada usuario con `localStorage`.
