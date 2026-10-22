# Impulso Cero Academy

Landing page estática en español, creada con HTML, CSS y JavaScript. No requiere base de datos, servidor de aplicación ni dependencias de compilación. El diseño usa una portada azul noche con órbitas, navegación centrada que cambia a blanco al desplazarse, secciones con animaciones de entrada, una ruta fija que avanza con el scroll 3-2-1-despegue, retrato de especialista y formulario visual de reserva.

## Ver localmente

Abre `index.html` en un navegador o ejecuta un servidor estático desde esta carpeta, por ejemplo:

```bash
npx serve .
```

## Publicar en Vercel

1. Sube esta carpeta a un repositorio de GitHub.
2. En Vercel, importa el repositorio.
3. Deja el framework en **Other** y deja en blanco los comandos de build y output.
4. Despliega. Vercel servirá `index.html` junto con `styles.css`, `script.js` y `assets/`.

La selección de punto de partida, el progreso de la ruta, las preguntas frecuentes y el formulario de reserva se ejecutan en el navegador. No almacenan ni envían datos. Para recibir reservas, conecta un canal de contacto o servicio de formularios.

## Panel privado para editar la landing

El panel propio se publica en `/admin/` y se abre con el enlace discreto **Iniciar sesión** del pie de página. Cada editor inicia sesión con su correo y contraseña; solo los correos autorizados pueden guardar cambios. El panel edita `content/site.json` y permite cambiar fotos, que se guardan en `assets/uploads/`.

### Configuración para Vercel

El proyecto debe tener como raíz la carpeta `IMPULSO CERO` del repositorio. Configura estas variables en Vercel (Production y Preview):

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto Supabase usado para Auth |
| `SUPABASE_ANON_KEY` | Clave pública/publishable de Supabase Auth |
| `CMS_ALLOWED_EMAILS` | Correos autorizados separados por comas |
| `GITHUB_OWNER` | `jhoelquispealiaga352` |
| `GITHUB_REPO` | Nombre exacto del repo GitHub |
| `GITHUB_BRANCH` | `main` |
| `GITHUB_TOKEN` | Token fine-grained con acceso Contents read/write solo a este repo |
| `CMS_REPO_PATH` | `IMPULSO CERO` |

Crea las cuentas editoras desde Supabase Auth y agrega sus correos a `CMS_ALLOWED_EMAILS`. Desactiva el registro público. Supabase Auth gestiona las cuentas; el contenido de la landing permanece en GitHub. El token de GitHub solo se usa en `api/cms.js` y se guarda como variable secreta de Vercel, nunca en el navegador.

Cuando un editor guarda, la función de Vercel valida su sesión y correo permitido, crea un commit en la rama `main` y Vercel inicia un nuevo despliegue. Para probar el panel localmente también se necesita un entorno que ejecute las funciones de Vercel, además de las variables anteriores.

## Identidad visual

Colores principales: azul `#2c3159` y naranja `#d78133`. Colores de apoyo: gris azulado `#b9c1cc`, gris niebla `#e9ebef`, durazno `#f6c29f` y marfil `#f7f4ee`. La tipografía de interfaz usa Plus Jakarta Sans.
