# Ritmo Diario

App web de tareas diarias con calendario semanal, XP, niveles y premios.

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
