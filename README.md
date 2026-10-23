# 📝 KanPad Pro 2.0 — Plugin para Kanlane

> **La suite completa de productividad y notas para Kanlane**: combina una **Home centralizada** para explorar y organizar tus documentos guardados con **3 potentes secciones de trabajo**:
> 1. **Docs** (tipo **Google Docs / Word**): Documentos enriquecidos con tablas, listas, citas y notas destacadas.
> 2. **Notepad** (tipo **Notepad++**): Editor de código con números de línea, detección automática y formateo inteligente (*Prettify*).
> 3. **Grid** (tipo **Google Sheets / Excel**): Hojas de cálculo interactivas con fórmulas (`SUM`, `AVERAGE`, `COUNT`, `MIN`, `MAX`), formatos y exportación/importación CSV.

---

## 🎨 Apariencia 100% Integrada con Kanlane

Diseñado siguiendo minuciosamente las guías oficiales y tokens de **`plugins/apariencia`** y **`workhub-plugin.css`** de Kanlane:
- **Tipografía Nativa**: Geist, Inter y Geist Mono para código.
- **Controles Segmentados (`.seg`)**: Selector de pestañas y modos idéntico al panel de Ajustes y Apariencia de Kanlane.
- **Botones y Paneles Oficiales (`.wh-btn`, `.panel`, `.row`)**: Bordes suaves, radios curvados (`var(--r-md)`, `var(--r-xl)`) y elevaciones sutiles.
- **Temas Dinámicos**: Soporte automático para temas Claro y Oscuro (`data-theme="dark"` / `light`) sincronizados con la app madre de Kanlane.
- **Modo Embebido Sin Fondo Propio (`html.wh-embedded`)**: Se mimetiza con la aplicación cuando corre dentro del marco seguro de Kanlane.

---

## 🚀 Características Principales

### 🏠 1. Nueva Vista Home (Explorador Centralizado)
- **Tarjetas de Creación Rápida**: Acceso con 1 clic para crear un nuevo Documento, Hoja Grid o Nota de Código.
- **Galería de Documentos Guardados**: Visualiza todos tus archivos con insignias de tipo coloreadas (`Docs` en azul, `Grid` en verde, `Notepad` en violeta).
- **Buscador Instantáneo**: Filtra en tiempo real por título o contenido.
- **Filtros por Tipo**: Pestañas segmentadas para ver `Todos`, solo `Docs`, solo `Grid` o solo `Notepad`.
- **Acciones Rápidas por Documento**: Abrir, Duplicar, Exportar y Eliminar.

### 📄 2. Modo Docs (Google Docs / Word Pro)
- **Formato Enriquecido**: Títulos (H1, H2, H3), Negrita, Cursiva, Subrayado, Tachado, Citas y Enlaces.
- **Tablas Interactivas**: Asistente visual para insertar tablas de cualquier número de filas y columnas.
- **Cajas de Aviso / Callouts**: Inserta notas informativas (`info`), avisos de advertencia (`warning`) o confirmaciones de éxito (`success`).
- **Bloques de Código Incrustados**: Snippets de código formateado con selector de lenguaje y botón de copia con un clic.
- **Hoja Flotante Centrada**: Diseño limpio de papel adaptado a pantallas grandes y móviles.

### 📊 3. Modo Grid (Google Sheets / Excel Pro)
- **Cuadrícula de Celdas Interactiva**: Columnas alfabéticas (A, B, C...) y filas numeradas (1, 2, 3...) con cabeceras fijas (*sticky*).
- **Barra de Fórmulas Dinámica**: Muestra la coordenada de la celda activa (ej: `B4`) y permite escribir fórmulas o valores directamente.
- **Motor de Fórmulas Matemáticas**:
  - `SUM` / `SUMA`: `=SUM(A1:A5)`
  - `AVERAGE` / `PROMEDIO`: `=AVERAGE(B1:B10)`
  - `COUNT` / `CONTAR`: `=COUNT(C1:C20)`
  - `MIN` y `MAX`: `=MIN(A1:A10)`, `=MAX(A1:A10)`
  - Operaciones aritméticas y porcentajes: `=B2*C2`, `=A1*1.21`, `=(B2-B1)/B1`
- **Formateo de Celdas**:
  - Negrita, Cursiva y Alineación (Izquierda, Centro, Derecha).
  - Tipos de datos: Normal, Moneda (`1.234,50 €` o `$ 1,234.50`), Porcentaje (`15.0%`), Decimales (`12.34`) o Enteros.
- **Gestión de Filas y Columnas**: Botones para añadir y eliminar filas y columnas.
- **Importación y Exportación CSV**: Descarga tu hoja en formato CSV compatible con Microsoft Excel o Google Sheets, o importa cualquier archivo `.csv` local.

### ⚡ 4. Modo Notepad++ (Editor de Código)
- **Gutter con Números de Línea**: Numeración sincronizada con el scroll y escritura en tiempo real.
- **Formateo Inteligente (Prettify)**: Botón **"⚡ Formatear Código"** que ordena y limpia la sangría de JSON, JavaScript, HTML, CSS, SQL y Python.
- **Soporte para Tecla Tab**: Inserta 2 espacios de sangría sin perder el foco del editor.
- **Copiar Todo con 1 Clic**: Envía todo el código al portapapeles.
- **Contador de Líneas y Caracteres**: Monitorización precisa del tamaño del script.

### 🔗 5. Integración con Tareas de Kanlane
- Conexión mediante el SDK oficial (`workhub-plugin.js`).
- Permite listar las tareas activas de tu proyecto de Kanlane e incrustarlas directamente en un documento o en la hoja de cálculo.
- Autosave continuo mediante `wh.storage` con respaldo automático en `localStorage`.

---

## 🛠️ Estructura del Proyecto

```text
kanpad-pro/
├── index.html              # Estructura principal (Home, Docs, Notepad, Grid, Modales)
├── manifest.json           # Declaración y permisos del plugin para Kanlane
├── css/
│   └── styles.css          # Tokens, componentes y estilos oficiales de apariencia
├── js/
│   ├── app.js              # Controlador principal, gestión de estado y persistencia
│   ├── grid.js             # Motor de cálculo y renderizado de hojas de cálculo (Grid)
│   └── code-highlighter.js # Formateador y detector de sintaxis multilinguaje
└── README.md               # Documentación completa
```

---

## 💻 Cómo Probarlo en Local

1. **Directamente en tu navegador**:
   Haz doble clic sobre `index.html` para abrirlo en Chrome, Edge o Firefox. El plugin detectará que está en modo local y usará `localStorage`.

2. **Con un servidor local**:
   ```powershell
   python -m http.server 8080
   # o bien:
   npx serve .
   ```
   Abre `http://localhost:8080` en tu navegador.

---

## 📦 Cómo Instalarlo en Kanlane

1. Sube este repositorio a **GitHub**.
2. En GitHub: ve a **Settings** → **Pages** y activa GitHub Pages en la rama `main`.
3. En **Kanlane**: ve a **Plugins** → **Añadir**, pega la URL pública (ej: `https://tu-usuario.github.io/kanpad-pro/index.html`) y pulsa **Instalar**.
