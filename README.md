# 📝 KanPad Pro — Plugin para Kanlane

> **El bloc de notas avanzado para Kanlane**: combina un procesador de documentos enriquecidos (tipo **Google Docs / Word**) con tablas y formato visual, más un potente editor de código (tipo **Notepad++**) con detección de lenguaje, números de línea y formateo inteligente (*prettify*).

---

## ✨ Características Principales

### 1. 📄 Modo Documento (Docs / Word Pro)
- **Formato Enriquecido**: Títulos (H1, H2, H3), Negrita, Cursiva, Subrayado, Tachado, Citas destacadas y Listas.
- **📊 Tablas Interactivas**: Asistente visual para insertar tablas de cualquier tamaño (filas × columnas) con encabezados y celdas estilizadas.
- **💡 Cajas de Aviso / Callouts**: Inserta notas informativas, avisos de advertencia (`warning`) o confirmaciones (`success`).
- **💻 Bloques de Código Integrados**: Incrusta snippets de código con selector de lenguaje y botón de copia con un clic.
- **Hoja de Trabajo Flotante**: Diseño visual de hoja de papel centrada y limpia adaptada a pantallas grandes y móviles.

### 2. ⚡ Modo Notepad++ (Editor de Código)
- **Gutter con Números de Línea**: Numeración en tiempo real sincronizada con el scroll y escritura.
- **Formateo Inteligente (Prettify)**: Botón **"⚡ Formatear Código"** que detecta automáticamente o según el selector la sintaxis y limpia la indentación (JSON, JavaScript, HTML, CSS, SQL, Python).
- **Soporte para Tab**: Presionar `Tab` añade 2 espacios sin perder el foco en el editor.
- **Copiar Todo**: Copia todo el contenido del código directamente al portapapeles.
- **Barra de Estado**: Contador de líneas, palabras, caracteres y estado de guardado.

### 3. 🎯 Integración Nativa con Kanlane
- **SDK Oficial (`workhub-plugin.js`)**: Comunicación segura mediante `iframe` aislado de Kanlane.
- **Autosave y Almacenamiento Persistente**: Guarda automáticamente todas las notas en el almacenamiento de Kanlane (`wh.storage`).
- **📌 Vinculación de Tareas**: Puedes abrir un modal con tus tareas actuales de Kanlane (`wh.tasks.list()`) e insertarlas como tarjetas vinculadas en tus notas.
- **Adaptación al Tema**: Sigue automáticamente los colores y temas claro/oscuro de Kanlane gracias a sus variables CSS oficiales.
- **🛡️ Modo Independiente (Local / Standalone)**: Si abres el archivo directamente en tu navegador fuera de Kanlane, funciona de inmediato usando `localStorage` para que puedas probarlo y editar sin restricciones.

---

## 📁 Estructura del Proyecto

```
kanpad-pro/
├── index.html              # Interfaz principal (UI, barra de herramientas y modales)
├── manifest.json           # Configuración y permisos del plugin para Kanlane
├── css/
│   └── styles.css          # Estilos modernos con variables de diseño de Kanlane
├── js/
│   ├── app.js              # Lógica principal, estado de notas y SDK Kanlane
│   └── code-highlighter.js # Formateador y detector de sintaxis multilinguaje
└── README.md               # Esta documentación
```

---

## 🚀 Cómo Probarlo en Local

Puedes probar el plugin en tu equipo de varias formas:

### Opción A: Abrir directamente en el navegador
Simplemente haz doble clic en `index.html` o ábrelo con Chrome/Edge. El plugin detectará automáticamente que está en modo local y usará `localStorage` para guardar tus notas.

### Opción B: Usar un servidor local ligero
Si tienes Node.js o Python instalado:

```powershell
# Con Python:
python -m http.server 8080

# O con npx:
npx serve .
```
Luego visita `http://localhost:8080` en tu navegador.

---

## 🌐 Cómo Instalarlo en Kanlane

Los plugins de Kanlane se ejecutan mediante URLs seguras con HTTPS (por ejemplo alojados en **GitHub Pages**):

1. **Sube este proyecto a tu repositorio de GitHub**:
   - Crea un repositorio (ej: `kanpad-pro`).
   - Sube los archivos de esta carpeta.
   - En GitHub: Ve a **Settings** → **Pages** → y activa GitHub Pages en la rama `main`.
   - Obtendrás una URL como: `https://tu-usuario.github.io/kanpad-pro/`

2. **Añádelo a Kanlane**:
   - En tu aplicación de Kanlane, ve a la sección **Plugins**.
   - Pega la URL de tu plugin (ej: `https://tu-usuario.github.io/kanpad-pro/index.html`).
   - Haz clic en **Añadir**, revisa los permisos solicitados (`storage`, `tasks:read`, `tasks:write`, `ui:extend`) y pulsa **Instalar**.
   - ¡Listo! Tendrás tu bloc de notas pro disponible como panel integrado en Kanlane.

---

## 🔒 Permisos Solicitados
- `storage`: Permite guardar tus documentos y código de forma segura en Kanlane.
- `tasks:read`: Permite listar tus tareas para vincularlas en las notas.
- `tasks:write`: Permite crear o actualizar tareas desde tus notas.
- `ui:extend`: Permite abrir vistas y formularios dentro de Kanlane.
