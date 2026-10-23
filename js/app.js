/**
 * KanPad Pro - Aplicación Principal v2.0
 * Integración nativa con Kanlane (apariencia y SDK).
 * 3 Secciones: Docs (Word/Google Docs), Notepad (Notepad++) y Grid (Excel/Google Sheets),
 * más una vista Home centralizada para explorar todos los documentos guardados.
 */

(function () {
  'use strict';

  // Estado global de la aplicación
  const state = {
    wh: null,                // Cliente Kanlane SDK
    isStandalone: false,     // Modo local / navegador directo
    currentView: 'home',     // 'home' | 'editor'
    notes: [],               // Listado de documentos y hojas
    currentNoteId: null,     // ID del documento abierto
    currentMode: 'doc',      // 'doc' | 'code' | 'grid'
    homeFilter: 'all',       // 'all' | 'doc' | 'grid' | 'code'
    homeSearch: '',          // Búsqueda en Home
    sidebarFilter: 'all',    // 'all' | 'doc' | 'grid' | 'code'
    sidebarSearch: '',       // Búsqueda en sidebar
    gridEngine: null,        // Instancia de GridSheet
    autosaveTimer: null,
    isSaving: false,
    theme: 'light'
  };

  // Documentos de muestra iniciales (si el almacenamiento está vacío)
  const defaultInitialNotes = [
    {
      id: 'doc-welcome',
      title: 'Bienvenido a KanPad Pro',
      type: 'doc',
      language: 'markdown',
      updatedAt: new Date().toISOString(),
      content: `
        <h1>🚀 Bienvenido a KanPad Pro para Kanlane</h1>
        <p>Tu nuevo espacio de trabajo integrado en Kanlane que combina <strong>3 potentes herramientas en un solo plugin</strong>:</p>

        <div class="callout callout-info">
          <strong>💡 3 Modos en 1:</strong>
          <ul>
            <li><strong>📄 Docs:</strong> Procesador de textos con tablas interactivas, llamadas destacadas y formato enriquecido (estilo Word / Google Docs).</li>
            <li><strong>📊 Grid:</strong> Hoja de cálculo con fórmulas (<code>SUM</code>, <code>AVERAGE</code>, <code>MIN</code>, <code>MAX</code>, etc.), celdas editables y exportación CSV (estilo Excel / Google Sheets).</li>
            <li><strong>⚡ Notepad:</strong> Editor de código con detección de sintaxis, números de línea y auto-formateo <em>Prettify</em> (estilo Notepad++).</li>
          </ul>
        </div>

        <h2>📊 Tablas interactivas en Docs</h2>
        <p>Inserta tablas directamente con el botón de la barra superior:</p>
        <table>
          <thead>
            <tr>
              <th>Herramienta</th>
              <th>Propósito</th>
              <th>Integración Kanlane</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Docs Pro</td>
              <td>Redacción de informes, especificaciones y notas de reunión</td>
              <td>Guardado en proyecto y vinculación de tareas</td>
            </tr>
            <tr>
              <td>Grid (Hojas)</td>
              <td>Presupuestos, control de horas y costes</td>
              <td>Cálculos automáticos con fórmulas y CSV</td>
            </tr>
            <tr>
              <td>Notepad++</td>
              <td>Scripts de automatización y formateo de JSON/SQL</td>
              <td>Copia directa y números de línea</td>
            </tr>
          </tbody>
        </table>

        <h2>💻 Fragmentos de código incrustados</h2>
        <div class="doc-code-block">
          <div class="doc-code-header">
            <span>JavaScript</span>
            <button class="doc-code-copy-btn" onclick="KanPad.copySnippet(this)">Copiar</button>
          </div>
          <pre><code class="language-javascript">// Conectado automáticamente con Kanlane SDK
WorkhubPlugin.connect({
  id: 'com.yalerooo.kanpad-pro',
  name: 'KanPad Pro'
}).then(wh => {
  wh.ui.toast('¡Bienvenido a KanPad Pro!');
});</code></pre>
        </div>

        <p>Pulsa el botón <strong>🏠 Inicio</strong> en la barra superior para explorar todos tus documentos o crear una nueva hoja de cálculo.</p>
      `
    },
    {
      id: 'grid-budget-demo',
      title: 'Presupuesto_Proyecto.sheet',
      type: 'grid',
      language: 'csv',
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
      gridData: {
        rows: 25,
        cols: 10,
        cells: {
          'A1': { raw: 'Concepto', bold: true, align: 'left', bg: '#f1f3f5' },
          'B1': { raw: 'Precio Unidad', bold: true, align: 'right', bg: '#f1f3f5' },
          'C1': { raw: 'Horas / Cant', bold: true, align: 'right', bg: '#f1f3f5' },
          'D1': { raw: 'Subtotal (€)', bold: true, align: 'right', bg: '#f1f3f5' },
          'A2': { raw: 'Desarrollo Frontend Plugin' },
          'B2': { raw: '45', format: 'currency' },
          'C2': { raw: '12', format: 'integer' },
          'D2': { raw: '=B2*C2', format: 'currency' },
          'A3': { raw: 'Diseño de Interfaz Kanlane' },
          'B3': { raw: '50', format: 'currency' },
          'C3': { raw: '6', format: 'integer' },
          'D3': { raw: '=B3*C3', format: 'currency' },
          'A4': { raw: 'Configuración SDK y Testing' },
          'B4': { raw: '40', format: 'currency' },
          'C4': { raw: '4', format: 'integer' },
          'D4': { raw: '=B4*C4', format: 'currency' },
          'A5': { raw: 'TOTAL PROYECTO', bold: true },
          'D5': { raw: '=SUM(D2:D4)', bold: true, format: 'currency' }
        }
      }
    },
    {
      id: 'code-utils-demo',
      title: 'Kanlane_Tasks_Filter.js',
      type: 'code',
      language: 'javascript',
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
      rawCode: `// Utilidades de código para procesar tareas de Kanlane
// Haz clic en "⚡ Formatear Código" para ordenar la indentación

function filtrarTareasPendientes(tareas, clienteId){
if(!tareas||tareas.length===0){return[];}
return tareas.filter(t=>t.status!=='completada'&&(clienteId?t.client===clienteId:true))
.map(t=>({
id:t.id,
titulo:t.title,
prioridad:t.priority||'media',
fecha:new Date().toLocaleDateString('es-ES')
}));
}

console.log("Módulo KanPad Pro cargado con éxito.");`
    }
  ];

  // Elementos del DOM
  let DOM = {};

  function cacheDOM() {
    DOM = {
      // Navegación superior
      btnNavHome: document.getElementById('btnNavHome'),
      btnToggleSidebar: document.getElementById('btnToggleSidebar'),
      editorTitleGroup: document.getElementById('editorTitleGroup'),
      noteTitleInput: document.getElementById('noteTitleInput'),
      modeSegmented: document.getElementById('modeSegmented'),
      modeBtns: document.querySelectorAll('#modeSegmented button'),
      btnThemeToggle: document.getElementById('btnThemeToggle'),
      btnKanlaneTasks: document.getElementById('btnKanlaneTasks'),
      btnExport: document.getElementById('btnExport'),
      btnSave: document.getElementById('btnSave'),
      envBadge: document.getElementById('envBadge'),

      // Vista Home
      homeView: document.getElementById('homeView'),
      homeSearchInput: document.getElementById('homeSearchInput'),
      homeFilterSeg: document.getElementById('homeFilterSeg'),
      homeFilterBtns: document.querySelectorAll('#homeFilterSeg button'),
      homeDocsGrid: document.getElementById('homeDocsGrid'),

      // Vista Editor
      editorLayout: document.getElementById('editorLayout'),
      sidebar: document.getElementById('sidebar'),
      btnNewNoteSidebar: document.getElementById('btnNewNoteSidebar'),
      sidebarSearchInput: document.getElementById('sidebarSearchInput'),
      sidebarFilterSeg: document.getElementById('sidebarFilterSeg'),
      sidebarFilterBtns: document.querySelectorAll('#sidebarFilterSeg button'),
      notesList: document.getElementById('notesList'),

      // Editor: Docs
      docToolbar: document.getElementById('docToolbar'),
      docViewport: document.getElementById('docViewport'),
      docSheet: document.getElementById('docSheet'),

      // Editor: Notepad++
      codeContainer: document.getElementById('codeContainer'),
      codeLangSelect: document.getElementById('codeLangSelect'),
      btnFormatCode: document.getElementById('btnFormatCode'),
      btnCopyCode: document.getElementById('btnCopyCode'),
      codeLineNumbers: document.getElementById('codeLineNumbers'),
      codeTextarea: document.getElementById('codeTextarea'),

      // Editor: Grid
      gridContainerView: document.getElementById('gridContainerView'),
      gridActiveCell: document.getElementById('gridActiveCell'),
      gridFormulaInput: document.getElementById('gridFormulaInput'),
      gridCanvas: document.getElementById('gridCanvas'),
      gridFormatSelect: document.getElementById('gridFormatSelect'),
      gridCSVFileInput: document.getElementById('gridCSVFileInput'),

      // Modales
      tableModal: document.getElementById('tableModal'),
      tableRowsInput: document.getElementById('tableRowsInput'),
      tableColsInput: document.getElementById('tableColsInput'),
      btnConfirmTable: document.getElementById('btnConfirmTable'),
      taskModal: document.getElementById('taskModal'),
      taskListContainer: document.getElementById('taskListContainer'),

      // Barra de estado
      statusDot: document.getElementById('statusDot'),
      statusSaveMsg: document.getElementById('statusSaveMsg'),
      statusMode: document.getElementById('statusMode'),
      statusWords: document.getElementById('statusWords')
    };
  }

  /* ==========================================================================
     Inicialización
     ========================================================================== */
  async function init() {
    cacheDOM();
    initTheme();
    setupEventListeners();

    // Intentar conectar con Kanlane SDK
    try {
      if (window.WorkhubPlugin && typeof window.WorkhubPlugin.connect === 'function') {
        state.wh = await window.WorkhubPlugin.connect({
          id: 'com.yalerooo.kanpad-pro',
          name: 'KanPad Pro',
          version: '2.0.0',
          icon: 'file-text',
          permissions: ['storage', 'tasks:read', 'tasks:write', 'ui:extend']
        });
        if (DOM.envBadge) {
          DOM.envBadge.textContent = 'KANLANE';
          DOM.envBadge.title = 'Conectado a Kanlane con almacenamiento de proyecto';
        }
      } else {
        throw new Error('SDK no detectado');
      }
    } catch (err) {
      console.info('KanPad Pro corriendo en modo independiente/local:', err.message);
      state.isStandalone = true;
      if (DOM.envBadge) {
        DOM.envBadge.textContent = 'LOCAL';
        DOM.envBadge.title = 'Modo independiente. Guardando datos en el navegador.';
      }
    }

    // Inicializar motor de Grid
    initGridEngine();

    // Cargar documentos desde almacenamiento
    await loadNotes();

    // Abrir la vista Home por defecto para explorar los documentos guardados
    showHomeView();
  }

  // Inicializar GridSheet
  function initGridEngine() {
    state.gridEngine = new window.GridSheet(
      DOM.gridCanvas,
      DOM.gridFormulaInput,
      DOM.gridActiveCell,
      {
        rows: 30,
        cols: 12,
        onChange: () => {
          triggerAutosave();
          updateStats();
        }
      }
    );
  }

  // Control de Tema Claro / Oscuro
  function initTheme() {
    const savedTheme = localStorage.getItem('kanpad_theme');
    if (savedTheme) {
      state.theme = savedTheme;
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      state.theme = 'dark';
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('kanpad_theme', state.theme);
    showToast(`Tema ${state.theme === 'dark' ? 'Oscuro' : 'Claro'} activado`, 'info');
  }

  /* ==========================================================================
     Persistencia: Kanlane wh.storage + localStorage
     ========================================================================== */
  async function loadNotes() {
    try {
      if (state.wh && state.wh.storage) {
        const stored = await state.wh.storage.get('kanpad_notes');
        if (stored && Array.isArray(stored) && stored.length > 0) {
          state.notes = stored;
          return;
        }
      }
    } catch (e) {
      console.warn('Error leyendo desde wh.storage:', e);
    }

    // Fallback a localStorage
    const local = localStorage.getItem('kanpad_notes');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.notes = parsed;
          return;
        }
      } catch (e) {}
    }

    // Cargar datos por defecto
    state.notes = JSON.parse(JSON.stringify(defaultInitialNotes));
    await saveNotes(false);
  }

  async function saveNotes(showStatus = true) {
    if (showStatus) setSavingStatus(true);

    // Actualizar datos del documento actual si estamos en el editor
    if (state.currentView === 'editor' && state.currentNoteId) {
      updateCurrentNoteFromView();
    }

    try {
      if (state.wh && state.wh.storage) {
        await state.wh.storage.set('kanpad_notes', state.notes);
      }
    } catch (e) {
      console.warn('Error guardando en wh.storage:', e);
    }

    try {
      localStorage.setItem('kanpad_notes', JSON.stringify(state.notes));
    } catch (e) {}

    if (showStatus) {
      setTimeout(() => setSavingStatus(false), 300);
    }
  }

  function setSavingStatus(saving) {
    state.isSaving = saving;
    if (DOM.statusDot) {
      if (saving) {
        DOM.statusDot.classList.add('saving');
        DOM.statusSaveMsg.textContent = 'Guardando...';
      } else {
        DOM.statusDot.classList.remove('saving');
        DOM.statusSaveMsg.textContent = state.wh ? 'Guardado en Kanlane' : 'Guardado localmente';
      }
    }
  }

  function triggerAutosave() {
    setSavingStatus(true);
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer = setTimeout(() => {
      saveNotes(true);
    }, 700);
  }

  /* ==========================================================================
     Control de Vistas: Home vs Editor
     ========================================================================== */
  function showHomeView() {
    // Si estábamos editando, guardar cambios
    if (state.currentView === 'editor') {
      updateCurrentNoteFromView();
      saveNotes(false);
    }

    state.currentView = 'home';
    DOM.homeView.style.display = 'block';
    DOM.editorLayout.style.display = 'none';

    DOM.btnNavHome.classList.add('is-active');
    DOM.editorTitleGroup.style.display = 'none';

    DOM.statusMode.textContent = `Modo: Inicio (${state.notes.length} elementos guardados)`;
    renderHomeDocsGrid();
  }

  function showEditorView(noteId = null) {
    state.currentView = 'editor';
    DOM.homeView.style.display = 'none';
    DOM.editorLayout.style.display = 'flex';

    DOM.btnNavHome.classList.remove('is-active');
    DOM.editorTitleGroup.style.display = 'flex';

    if (noteId) {
      selectNote(noteId);
    } else if (state.currentNoteId) {
      selectNote(state.currentNoteId);
    } else if (state.notes.length > 0) {
      selectNote(state.notes[0].id);
    } else {
      createNewDoc('doc');
    }

    renderSidebarNotes();
  }

  /* ==========================================================================
     Gestión de Documentos (Crear, Seleccionar, Duplicar, Eliminar)
     ========================================================================== */
  function createNewDoc(type = 'doc') {
    const titles = {
      doc: 'Nuevo Documento',
      grid: 'Nueva_Hoja.sheet',
      code: 'nuevo_script.js'
    };

    const newNote = {
      id: 'doc_' + Date.now(),
      title: titles[type] || 'Sin título',
      type: type,
      language: type === 'code' ? 'javascript' : (type === 'grid' ? 'csv' : 'markdown'),
      updatedAt: new Date().toISOString(),
      content: type === 'doc' ? '<h1>Nuevo Documento</h1><p>Comienza a escribir aquí...</p>' : '',
      rawCode: type === 'code' ? '// Nuevo archivo de código\n' : '',
      gridData: type === 'grid' ? {
        rows: 30,
        cols: 12,
        cells: {
          'A1': { raw: 'Columna A', bold: true, bg: '#f1f3f5' },
          'B1': { raw: 'Columna B', bold: true, bg: '#f1f3f5' },
          'C1': { raw: 'Total', bold: true, bg: '#f1f3f5' },
          'A2': { raw: '10' },
          'B2': { raw: '20' },
          'C2': { raw: '=A2+B2' }
        }
      } : null
    };

    state.notes.unshift(newNote);
    saveNotes(true);

    showEditorView(newNote.id);

    // Enfocar campo de título
    setTimeout(() => {
      DOM.noteTitleInput.focus();
      DOM.noteTitleInput.select();
    }, 100);
  }

  function selectNote(id) {
    const note = state.notes.find(n => n.id === id);
    if (!note) return;

    // Guardar cambios del documento previo
    if (state.currentNoteId && state.currentNoteId !== id) {
      updateCurrentNoteFromView();
    }

    state.currentNoteId = id;
    DOM.noteTitleInput.value = note.title;

    // Cargar contenido según el tipo
    if (note.type === 'grid') {
      state.gridEngine.loadData(note.gridData || null);
      setMode('grid');
    } else if (note.type === 'code') {
      DOM.codeTextarea.value = note.rawCode || '';
      DOM.codeLangSelect.value = note.language || 'javascript';
      setMode('code');
    } else {
      DOM.docSheet.innerHTML = note.content || '';
      setMode('doc');
    }

    renderSidebarNotes();
    updateStats();
  }

  function duplicateNote(id, event) {
    if (event) event.stopPropagation();
    const source = state.notes.find(n => n.id === id);
    if (!source) return;

    const copy = JSON.parse(JSON.stringify(source));
    copy.id = 'doc_' + Date.now();
    copy.title = `${source.title} (Copia)`;
    copy.updatedAt = new Date().toISOString();

    state.notes.unshift(copy);
    saveNotes(true);
    renderHomeDocsGrid();
    renderSidebarNotes();
    showToast(`Documento duplicado como "${copy.title}"`, 'success');
  }

  function deleteNote(id, event) {
    if (event) event.stopPropagation();

    if (state.notes.length <= 1) {
      showToast('No puedes eliminar el único documento restante', 'error');
      return;
    }

    const note = state.notes.find(n => n.id === id);
    const confirmMsg = `¿Eliminar permanentemente "${note ? note.title : 'este documento'}"?`;
    if (!confirm(confirmMsg)) return;

    state.notes = state.notes.filter(n => n.id !== id);

    if (state.currentNoteId === id) {
      state.currentNoteId = state.notes[0].id;
      if (state.currentView === 'editor') {
        selectNote(state.currentNoteId);
      }
    }

    saveNotes(true);
    renderHomeDocsGrid();
    renderSidebarNotes();
    showToast('Documento eliminado', 'info');
  }

  function updateCurrentNoteFromView() {
    const note = state.notes.find(n => n.id === state.currentNoteId);
    if (!note) return;

    note.title = DOM.noteTitleInput.value.trim() || 'Sin título';
    note.updatedAt = new Date().toISOString();

    if (state.currentMode === 'grid') {
      note.gridData = state.gridEngine ? state.gridEngine.getData() : null;
      note.type = 'grid';
    } else if (state.currentMode === 'code') {
      note.rawCode = DOM.codeTextarea.value;
      note.language = DOM.codeLangSelect.value;
      note.type = 'code';
    } else {
      note.content = DOM.docSheet.innerHTML;
      note.type = 'doc';
    }
  }

  /* ==========================================================================
     Control de Modos: Docs, Notepad y Grid
     ========================================================================== */
  function setMode(mode) {
    state.currentMode = mode;

    // Actualizar botones segmentados en header
    DOM.modeBtns.forEach(btn => {
      btn.classList.toggle('is-on', btn.dataset.mode === mode);
    });

    const note = state.notes.find(n => n.id === state.currentNoteId);
    if (note) note.type = mode;

    if (mode === 'doc') {
      DOM.docToolbar.style.display = 'flex';
      DOM.docViewport.style.display = 'flex';
      DOM.codeContainer.style.display = 'none';
      DOM.gridContainerView.style.display = 'none';
      DOM.statusMode.textContent = 'Modo: Docs (Word/Docs)';
    } else if (mode === 'code') {
      DOM.docToolbar.style.display = 'none';
      DOM.docViewport.style.display = 'none';
      DOM.codeContainer.style.display = 'flex';
      DOM.gridContainerView.style.display = 'none';

      // Si venimos de Docs y textarea está vacío, cargar texto limpio
      if (note && !DOM.codeTextarea.value && DOM.docSheet.innerText) {
        DOM.codeTextarea.value = DOM.docSheet.innerText.trim();
      }

      updateLineNumbers();
      DOM.statusMode.textContent = `Modo: Notepad++ [${DOM.codeLangSelect.value.toUpperCase()}]`;
    } else if (mode === 'grid') {
      DOM.docToolbar.style.display = 'none';
      DOM.docViewport.style.display = 'none';
      DOM.codeContainer.style.display = 'none';
      DOM.gridContainerView.style.display = 'flex';

      if (state.gridEngine) {
        state.gridEngine.recalculateAll();
      }
      DOM.statusMode.textContent = 'Modo: Grid (Google Sheets / Excel)';
    }

    updateStats();
  }

  /* ==========================================================================
     Renderizado de la Vista Home (Cards de Documentos Guardados)
     ========================================================================== */
  function renderHomeDocsGrid() {
    const query = state.homeSearch.toLowerCase();
    const filtered = state.notes.filter(note => {
      const matchType = state.homeFilter === 'all' || note.type === state.homeFilter;
      const matchSearch = !query || note.title.toLowerCase().includes(query) ||
        (note.content && note.content.toLowerCase().includes(query)) ||
        (note.rawCode && note.rawCode.toLowerCase().includes(query));
      return matchType && matchSearch;
    });

    DOM.homeDocsGrid.innerHTML = '';

    if (filtered.length === 0) {
      DOM.homeDocsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 48px 20px; text-align: center; border: 1px dashed var(--line-strong); border-radius: var(--r-xl); background: var(--surface);">
          <div style="font-size: 28px; margin-bottom: 8px;">📂</div>
          <h3 style="font-size: 15px; font-weight: 600; margin: 0 0 4px; color: var(--ink);">No se encontraron documentos</h3>
          <p style="font-size: 12.5px; color: var(--ink-soft); margin: 0 0 16px;">Crea un nuevo documento, hoja de cálculo o nota para empezar.</p>
          <div style="display:inline-flex; gap:8px;">
            <button class="wh-btn is-primary" onclick="KanPad.createNewDoc('doc')">+ Nuevo Doc</button>
            <button class="wh-btn" onclick="KanPad.createNewDoc('grid')">+ Nueva Hoja</button>
          </div>
        </div>
      `;
      return;
    }

    filtered.forEach(note => {
      const card = document.createElement('div');
      card.className = 'doc-card';
      card.onclick = () => showEditorView(note.id);

      // Metadatos por tipo
      let typeLabel = 'DOCS';
      let typeClass = 'is-doc';
      let snippet = 'Documento enriquecido...';

      if (note.type === 'grid') {
        typeLabel = 'GRID';
        typeClass = 'is-grid';
        const cellCount = note.gridData && note.gridData.cells ? Object.keys(note.gridData.cells).length : 0;
        snippet = `Hoja de cálculo interactiva con ${cellCount} celdas activas y soporte de fórmulas.`;
      } else if (note.type === 'code') {
        typeLabel = (note.language || 'código').toUpperCase();
        typeClass = 'is-code';
        const lines = (note.rawCode || '').split('\n').length;
        snippet = (note.rawCode || '').trim().slice(0, 90) || `${lines} líneas de código.`;
      } else {
        const tmp = document.createElement('div');
        tmp.innerHTML = note.content || '';
        snippet = tmp.textContent.trim().slice(0, 110) || 'Documento sin contenido...';
      }

      const dateStr = new Date(note.updatedAt).toLocaleDateString([], {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      card.innerHTML = `
        <div class="doc-card-head">
          <span class="doc-card-type-pill ${typeClass}">${typeLabel}</span>
          <div class="doc-card-actions" onclick="event.stopPropagation()">
            <button class="doc-action-btn" title="Duplicar" onclick="KanPad.duplicateNote('${note.id}', event)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button class="doc-action-btn" title="Exportar archivo" onclick="KanPad.exportNoteById('${note.id}', event)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
            <button class="doc-action-btn is-delete" title="Eliminar" onclick="KanPad.deleteNote('${note.id}', event)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>

        <h3 class="doc-card-title">${escapeHtml(note.title)}</h3>
        <div class="doc-card-snippet">${escapeHtml(snippet)}</div>

        <div class="doc-card-footer">
          <span>Modificado: ${dateStr}</span>
          <span style="font-weight:600; color:var(--ink);">Abrir →</span>
        </div>
      `;

      DOM.homeDocsGrid.appendChild(card);
    });
  }

  /* ==========================================================================
     Renderizado de la Barra Lateral en el Editor
     ========================================================================== */
  function renderSidebarNotes() {
    const query = state.sidebarSearch.toLowerCase();
    const filtered = state.notes.filter(note => {
      const matchType = state.sidebarFilter === 'all' || note.type === state.sidebarFilter;
      const matchSearch = !query || note.title.toLowerCase().includes(query);
      return matchType && matchSearch;
    });

    DOM.notesList.innerHTML = '';

    if (filtered.length === 0) {
      DOM.notesList.innerHTML = `
        <div style="padding: 24px 8px; text-align: center; color: var(--ink-faint); font-size: 11.5px;">
          No hay notas que coincidan
        </div>
      `;
      return;
    }

    filtered.forEach(note => {
      const isSelected = note.id === state.currentNoteId;
      const item = document.createElement('div');
      item.className = `sidebar-note-item ${isSelected ? 'is-active' : ''}`;
      item.onclick = () => selectNote(note.id);

      const typeTag = note.type === 'grid' ? 'grid' : (note.type === 'code' ? (note.language || 'code') : 'doc');
      const tagClass = note.type === 'grid' ? 'is-grid' : (note.type === 'code' ? 'is-code' : 'is-doc');

      const dateStr = new Date(note.updatedAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      });

      item.innerHTML = `
        <div class="sidebar-note-item-top">
          <span class="sidebar-note-item-title">${escapeHtml(note.title)}</span>
          <span class="sidebar-note-item-tag ${tagClass}">${typeTag}</span>
        </div>
        <div class="sidebar-note-item-sub">
          <span>${dateStr}</span>
          <button class="doc-action-btn is-delete" title="Eliminar" onclick="KanPad.deleteNote('${note.id}', event)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      DOM.notesList.appendChild(item);
    });
  }

  /* ==========================================================================
     Herramientas de Modo Docs (WYSIWYG, Tablas, Callouts)
     ========================================================================== */
  function execDocCmd(command, value = null) {
    document.execCommand(command, false, value);
    DOM.docSheet.focus();
    triggerAutosave();
    updateStats();
  }

  function insertTableModal() {
    DOM.tableModal.classList.add('active');
    DOM.tableRowsInput.focus();
  }

  function confirmInsertTable() {
    const rows = parseInt(DOM.tableRowsInput.value, 10) || 3;
    const cols = parseInt(DOM.tableColsInput.value, 10) || 3;

    let html = '<table><thead><tr>';
    for (let c = 1; c <= cols; c++) {
      html += `<th>Columna ${c}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let r = 1; r <= rows; r++) {
      html += '<tr>';
      for (let c = 1; c <= cols; c++) {
        html += `<td>Dato ${r},${c}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';

    document.execCommand('insertHTML', false, html);
    closeModals();
    triggerAutosave();
  }

  function insertCallout(type = 'info') {
    const titles = {
      info: '💡 Nota importante',
      warning: '⚠️ Advertencia',
      success: '✅ Verificado / Listo'
    };
    const classes = {
      info: 'callout callout-info',
      warning: 'callout callout-warning',
      success: 'callout callout-success'
    };

    const html = `
      <div class="${classes[type]}">
        <strong>${titles[type]}</strong><br>
        Escribe aquí los detalles del aviso...
      </div>
      <p><br></p>
    `;

    document.execCommand('insertHTML', false, html);
    triggerAutosave();
  }

  function insertDocCodeBlock() {
    const lang = prompt('Indica el lenguaje del bloque (javascript, python, html, css, sql, json):', 'javascript') || 'javascript';
    const sample = `// Código ${lang}\nconsole.log("KanPad Pro");`;

    const html = `
      <div class="doc-code-block">
        <div class="doc-code-header">
          <span>${lang}</span>
          <button class="doc-code-copy-btn" onclick="KanPad.copySnippet(this)">Copiar</button>
        </div>
        <pre><code class="language-${lang}">${escapeHtml(sample)}</code></pre>
      </div>
      <p><br></p>
    `;

    document.execCommand('insertHTML', false, html);
    triggerAutosave();
  }

  /* ==========================================================================
     Herramientas de Modo Notepad++ (Prettify, Gutter, Copiar)
     ========================================================================== */
  function formatCurrentCode() {
    const code = DOM.codeTextarea.value;
    if (!code.trim()) return;

    const lang = DOM.codeLangSelect.value;
    const formatted = window.CodeTools ? window.CodeTools.beautify(code, lang) : code;

    DOM.codeTextarea.value = formatted;
    updateLineNumbers();
    triggerAutosave();
    showToast('¡Código formateado con sangría limpia!', 'success');
  }

  function updateLineNumbers() {
    const lines = DOM.codeTextarea.value.split('\n').length;
    let gutterHTML = '';
    for (let i = 1; i <= lines; i++) {
      gutterHTML += `<div>${i}</div>`;
    }
    DOM.codeLineNumbers.innerHTML = gutterHTML;
  }

  function copyCurrentCode() {
    const code = DOM.codeTextarea.value;
    navigator.clipboard.writeText(code).then(() => {
      showToast('Código copiado al portapapeles', 'info');
    });
  }

  /* ==========================================================================
     Herramientas de Modo Grid (Excel / Google Sheets)
     ========================================================================== */
  function formatGrid(prop, val) {
    if (state.gridEngine) {
      state.gridEngine.formatSelectedCell(prop, val);
    }
  }

  function gridAddRow() {
    if (state.gridEngine) state.gridEngine.addRow();
  }

  function gridDeleteRow() {
    if (state.gridEngine) state.gridEngine.deleteRow();
  }

  function gridAddCol() {
    if (state.gridEngine) state.gridEngine.addColumn();
  }

  function gridDeleteCol() {
    if (state.gridEngine) state.gridEngine.deleteColumn();
  }

  function insertGridFormula(fn) {
    if (state.gridEngine) {
      state.gridEngine.commitEdit(`=${fn}(A1:A5)`);
    }
  }

  function exportGridCSV() {
    if (!state.gridEngine) return;
    const csvData = state.gridEngine.toCSV();
    const note = state.notes.find(n => n.id === state.currentNoteId);
    const title = (note ? note.title : 'hoja').replace(/\.[^/.]+$/, '');

    downloadFile(`${title}.csv`, csvData, 'text/csv;charset=utf-8;');
  }

  function handleCSVUpload(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      if (state.gridEngine) {
        state.gridEngine.fromCSV(text);
        showToast('Archivo CSV importado correctamente', 'success');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  /* ==========================================================================
     Integración de Tareas de Kanlane
     ========================================================================== */
  async function openKanlaneTasksModal() {
    DOM.taskModal.classList.add('active');
    DOM.taskListContainer.innerHTML = '<div style="padding:16px; text-align:center;">Cargando tareas de Kanlane...</div>';

    let tasks = [];
    if (state.wh && state.wh.tasks) {
      try {
        tasks = await state.wh.tasks.list();
      } catch (e) {
        console.warn('Error listando tareas:', e);
      }
    }

    if (!tasks || tasks.length === 0) {
      tasks = [
        { id: '101', title: 'Diseñar arquitectura de plugins', status: 'en_proceso', client: 'Kanlane' },
        { id: '102', title: 'Optimizar estilos de apariencia', status: 'completada', client: 'Kanlane' },
        { id: '103', title: 'Exportar informes a hojas de cálculo', status: 'pendiente', client: 'Kanlane' }
      ];
    }

    DOM.taskListContainer.innerHTML = '';
    tasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'panel';
      card.style.cssText = 'padding:10px 14px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;';
      card.innerHTML = `
        <div>
          <div style="font-weight:600; font-size:12.5px; color:var(--ink);">${escapeHtml(task.title || 'Sin título')}</div>
          <div style="font-size:11px; color:var(--ink-soft);">${escapeHtml(task.client || 'Kanlane')} · ${escapeHtml(task.status || 'abierta')}</div>
        </div>
        <button class="wh-btn is-primary" style="height:24px; font-size:11px;">Insertar</button>
      `;

      card.onclick = () => {
        insertTaskIntoCurrentDoc(task);
        closeModals();
      };

      DOM.taskListContainer.appendChild(card);
    });
  }

  function insertTaskIntoCurrentDoc(task) {
    if (state.currentMode === 'grid') {
      if (state.gridEngine) {
        state.gridEngine.commitEdit(`Tarea: ${task.title} [#${task.id}]`);
      }
    } else if (state.currentMode === 'code') {
      const comment = `// Tarea Kanlane #${task.id}: ${task.title} [${task.status}]\n`;
      const curPos = DOM.codeTextarea.selectionStart;
      const text = DOM.codeTextarea.value;
      DOM.codeTextarea.value = text.slice(0, curPos) + comment + text.slice(curPos);
      triggerAutosave();
    } else {
      const html = `
        <div class="callout callout-info" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>📌 Tarea Kanlane:</strong> ${escapeHtml(task.title)}
            <span style="font-size:11px; padding:1px 5px; border-radius:4px; background:var(--surface); margin-left:6px;">${escapeHtml(task.status || 'abierta')}</span>
          </div>
          <span style="font-size:11px; color:var(--ink-soft); font-family:var(--mono);">#${task.id}</span>
        </div>
        <p><br></p>
      `;
      document.execCommand('insertHTML', false, html);
      triggerAutosave();
    }
    showToast(`Tarea "${task.title}" vinculada`, 'success');
  }

  /* ==========================================================================
     Exportación de Archivos
     ========================================================================== */
  function exportNoteById(id, event) {
    if (event) event.stopPropagation();
    const note = state.notes.find(n => n.id === id);
    if (!note) return;

    if (note.type === 'grid') {
      const tempSheet = new window.GridSheet(document.createElement('div'), null, null, {
        rows: note.gridData ? note.gridData.rows : 20,
        cols: note.gridData ? note.gridData.cols : 10,
        data: note.gridData ? note.gridData.cells : {}
      });
      const csv = tempSheet.toCSV();
      downloadFile(`${note.title.replace(/\.[^/.]+$/, '')}.csv`, csv, 'text/csv;charset=utf-8;');
    } else if (note.type === 'code') {
      const ext = note.language === 'python' ? 'py' : (note.language === 'html' ? 'html' : (note.language === 'css' ? 'css' : (note.language === 'sql' ? 'sql' : 'js')));
      const fn = note.title.includes('.') ? note.title : `${note.title}.${ext}`;
      downloadFile(fn, note.rawCode || '', 'text/plain;charset=utf-8;');
    } else {
      const fn = note.title.endsWith('.html') ? note.title : `${note.title}.html`;
      const htmlContent = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(note.title)}</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:820px;margin:40px auto;line-height:1.6;padding:0 20px;}table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #ddd;padding:8px 10px;text-align:left;}th{background:#f8f9fa;}.callout{padding:12px;border-radius:6px;margin:14px 0;background:#f0f7ff;border-left:4px solid #2563eb;}pre{background:#1e1e24;color:#fff;padding:12px;border-radius:6px;overflow-x:auto;}</style></head><body>${note.content || ''}</body></html>`;
      downloadFile(fn, htmlContent, 'text/html;charset=utf-8;');
    }
  }

  function exportCurrentNote() {
    if (state.currentNoteId) {
      updateCurrentNoteFromView();
      exportNoteById(state.currentNoteId);
    }
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Archivo "${filename}" descargado`, 'success');
  }

  /* ==========================================================================
     Estadísticas y Notificaciones Toast
     ========================================================================== */
  function updateStats() {
    if (state.currentMode === 'grid') {
      const cellCount = state.gridEngine && state.gridEngine.data ? Object.keys(state.gridEngine.data).length : 0;
      DOM.statusWords.textContent = `${cellCount} celdas con datos`;
    } else if (state.currentMode === 'code') {
      const text = DOM.codeTextarea.value;
      const lines = text.split('\n').length;
      const chars = text.length;
      DOM.statusWords.textContent = `${lines} líneas | ${chars} caracteres`;
    } else {
      const text = DOM.docSheet.innerText || '';
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      DOM.statusWords.textContent = `${words} palabras | ${chars} caracteres`;
    }
  }

  function showToast(message, type = 'info') {
    if (state.wh && state.wh.ui && typeof state.wh.ui.toast === 'function') {
      state.wh.ui.toast(message, { type });
      return;
    }

    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.style.cssText = 'position:fixed;bottom:36px;right:20px;display:flex;flex-direction:column;gap:8px;z-index:9999;pointer-events:none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `background:var(--surface);border:1px solid var(--line-strong);color:var(--ink);padding:8px 14px;border-radius:var(--r-md);font-size:12.5px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.12);transition:opacity 0.2s;pointer-events:auto;display:flex;align-items:center;gap:8px;`;

    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 200);
    }, 2500);
  }

  function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ==========================================================================
     Event Listeners
     ========================================================================== */
  function setupEventListeners() {
    // Volver a Home
    DOM.btnNavHome.addEventListener('click', showHomeView);

    // Sidebar colapso
    DOM.btnToggleSidebar.addEventListener('click', () => {
      DOM.sidebar.classList.toggle('is-collapsed');
    });

    // Título del documento
    DOM.noteTitleInput.addEventListener('input', () => {
      triggerAutosave();
      renderSidebarNotes();
    });

    // Guardado manual
    DOM.btnSave.addEventListener('click', () => {
      saveNotes(true);
      showToast('Documento guardado correctamente', 'success');
    });

    // Exportar
    DOM.btnExport.addEventListener('click', exportCurrentNote);

    // Tareas Kanlane
    DOM.btnKanlaneTasks.addEventListener('click', openKanlaneTasksModal);

    // Selector de tema
    DOM.btnThemeToggle.addEventListener('click', toggleTheme);

    // Selector segmentado de modos en Header
    DOM.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (state.currentView === 'home') {
          showEditorView();
        }
        setMode(btn.dataset.mode);
      });
    });

    // Filtros en la vista Home
    DOM.homeFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.homeFilterBtns.forEach(b => b.classList.remove('is-on'));
        btn.classList.add('is-on');
        state.homeFilter = btn.dataset.filter;
        renderHomeDocsGrid();
      });
    });

    // Búsqueda en la vista Home
    DOM.homeSearchInput.addEventListener('input', (e) => {
      state.homeSearch = e.target.value;
      renderHomeDocsGrid();
    });

    // Nuevo documento desde el botón de la sidebar
    DOM.btnNewNoteSidebar.addEventListener('click', () => {
      createNewDoc(state.currentMode || 'doc');
    });

    // Filtros en la sidebar
    DOM.sidebarFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.sidebarFilterBtns.forEach(b => b.classList.remove('is-on'));
        btn.classList.add('is-on');
        state.sidebarFilter = btn.dataset.filter;
        renderSidebarNotes();
      });
    });

    // Búsqueda en la sidebar
    DOM.sidebarSearchInput.addEventListener('input', (e) => {
      state.sidebarSearch = e.target.value;
      renderSidebarNotes();
    });

    // Editor Docs (input)
    DOM.docSheet.addEventListener('input', () => {
      triggerAutosave();
      updateStats();
    });

    // Editor Notepad++ (input)
    DOM.codeTextarea.addEventListener('input', () => {
      updateLineNumbers();
      triggerAutosave();
      updateStats();
    });

    DOM.codeTextarea.addEventListener('scroll', () => {
      DOM.codeLineNumbers.scrollTop = DOM.codeTextarea.scrollTop;
    });

    DOM.codeTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = DOM.codeTextarea.selectionStart;
        const end = DOM.codeTextarea.selectionEnd;
        DOM.codeTextarea.value = DOM.codeTextarea.value.substring(0, start) + '  ' + DOM.codeTextarea.value.substring(end);
        DOM.codeTextarea.selectionStart = DOM.codeTextarea.selectionEnd = start + 2;
        updateLineNumbers();
        triggerAutosave();
      }
    });

    DOM.codeLangSelect.addEventListener('change', () => {
      const lang = DOM.codeLangSelect.value;
      DOM.statusMode.textContent = `Modo: Notepad++ [${lang.toUpperCase()}]`;
      triggerAutosave();
    });

    DOM.btnFormatCode.addEventListener('click', formatCurrentCode);
    DOM.btnCopyCode.addEventListener('click', copyCurrentCode);
    DOM.btnConfirmTable.addEventListener('click', confirmInsertTable);

    // Escape para cerrar modales
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModals();
    });
  }

  // API Global accesible por callbacks de la interfaz
  window.KanPad = {
    init,
    showHomeView,
    showEditorView,
    createNewDoc,
    selectNote,
    duplicateNote,
    deleteNote,
    exportNoteById,
    execDocCmd,
    insertTableModal,
    insertCallout,
    insertDocCodeBlock,
    formatGrid,
    gridAddRow,
    gridDeleteRow,
    gridAddCol,
    gridDeleteCol,
    insertGridFormula,
    exportGridCSV,
    handleCSVUpload,
    closeModals,
    copySnippet(btn) {
      const block = btn.closest('.doc-code-block');
      if (block) {
        const code = block.querySelector('code').innerText;
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = '¡Copiado!';
          setTimeout(() => { btn.textContent = 'Copiar'; }, 1500);
        });
      }
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
