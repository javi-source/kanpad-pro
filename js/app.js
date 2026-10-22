/**
 * KanPad Pro - Aplicación Principal
 * El bloc de notas avanzado para Kanlane:
 * Documentos enriquecidos (tipo Word/Docs) con tablas + Editor de código (tipo Notepad++) con formateo inteligente.
 */

(function () {
  'use strict';

  // Estado de la aplicación
  const state = {
    wh: null,                // Instancia de Kanlane SDK si está conectado
    isStandalone: false,     // Modo de desarrollo/local
    notes: [],               // Lista de notas y documentos
    currentNoteId: null,     // ID de la nota activa
    currentMode: 'doc',      // 'doc' | 'code' | 'split'
    activeFilter: 'all',     // 'all' | 'doc' | 'code'
    searchQuery: '',
    autosaveTimer: null,
    isSaving: false
  };

  // Plantilla de nota por defecto si está vacío
  const defaultInitialNotes = [
    {
      id: 'welcome-doc',
      title: 'Bienvenido a KanPad Pro',
      type: 'doc',
      language: 'markdown',
      updatedAt: new Date().toISOString(),
      content: `
        <h1>🚀 Bienvenido a KanPad Pro para Kanlane</h1>
        <p>Este es tu nuevo bloc de notas avanzado y procesador de documentos. Diseñado para ofrecer <strong>lo mejor de Google Docs/Word</strong> y <strong>la potencia de Notepad++</strong>.</p>
        
        <div class="callout callout-success">
          <strong>💡 Tip Pro:</strong> Puedes alternar entre el <strong>Modo Documento</strong> (con formato y tablas) y el <strong>Modo Código / Notepad++</strong> (con números de línea y auto-formateo) usando el selector superior.
        </div>

        <h2>📊 Tablas interactivas</h2>
        <p>Crea y gestiona tablas fácilmente como en Word o Google Docs:</p>
        <table>
          <thead>
            <tr>
              <th>Característica</th>
              <th>Modo Documento</th>
              <th>Modo Notepad++</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Edición enriquecida</td>
              <td>✅ Negrita, H1/H2, Listas</td>
              <td>⚡ Texto plano / Monoespaciado</td>
            </tr>
            <tr>
              <td>Tablas y Cajas</td>
              <td>✅ Tablas completas y alertas</td>
              <td>❌ No aplica</td>
            </tr>
            <tr>
              <td>Detección y Resaltado</td>
              <td>✅ Snippets incrustados</td>
              <td>🚀 Detección y Prettify de código</td>
            </tr>
          </tbody>
        </table>

        <h2>💻 Fragmentos de código incrustados</h2>
        <p>Puedes incluir código con resaltado de sintaxis dentro de tus documentos:</p>
        <div class="doc-code-block">
          <div class="doc-code-header">
            <span>JavaScript</span>
            <button class="doc-code-copy-btn" onclick="KanPad.copySnippet(this)">Copiar</button>
          </div>
          <pre><code class="language-javascript">// Conexión nativa con Kanlane SDK
WorkhubPlugin.connect({
  id: 'com.yalerooo.kanpad-pro',
  name: 'KanPad Pro'
}).then(wh => {
  wh.ui.toast('¡KanPad Pro listo para usar!');
});</code></pre>
        </div>

        <p>¡Disfruta organizando tus notas, código y tareas en Kanlane!</p>
      `
    },
    {
      id: 'demo-code',
      title: 'Script_Utilidades.js',
      type: 'code',
      language: 'javascript',
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      rawCode: `// Ejemplo de código en modo Notepad++
// Pulsa el botón "⚡ Formatear Código" para ponerlo bonito automáticamente

function procesarTareas(tareas, filtroPrioridad){
if(!tareas||tareas.length===0){return[];}
return tareas.filter(t=>t.completada!==true&&t.prioridad===filtroPrioridad)
.map(t=>{
return {
id:t.id,
titulo:t.titulo.toUpperCase(),
fecha:new Date().toLocaleDateString()
};
});
}

const configServidor = {
puerto: 8080,
modo: "produccion",
ssl: true,
plugins: ["kanpad-pro", "timer", "work-report"]
};`
    }
  ];

  // Elementos del DOM
  const DOM = {
    // Header
    noteTitleInput: document.getElementById('noteTitleInput'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    btnSave: document.getElementById('btnSave'),
    btnNewNote: document.getElementById('btnNewNote'),
    btnExport: document.getElementById('btnExport'),
    btnKanlaneTasks: document.getElementById('btnKanlaneTasks'),
    btnToggleSidebar: document.getElementById('btnToggleSidebar'),
    sidebar: document.getElementById('sidebar'),
    notesList: document.getElementById('notesList'),
    searchInput: document.getElementById('searchInput'),
    filterTabs: document.querySelectorAll('.filter-tab'),
    // Views
    docViewport: document.getElementById('docViewport'),
    docSheet: document.getElementById('docSheet'),
    docToolbar: document.getElementById('docToolbar'),
    codeContainer: document.getElementById('codeContainer'),
    codeTextarea: document.getElementById('codeTextarea'),
    codeLineNumbers: document.getElementById('codeLineNumbers'),
    codeLangSelect: document.getElementById('codeLangSelect'),
    btnFormatCode: document.getElementById('btnFormatCode'),
    btnCopyCode: document.getElementById('btnCopyCode'),
    // Modals
    taskModal: document.getElementById('taskModal'),
    taskListContainer: document.getElementById('taskListContainer'),
    tableModal: document.getElementById('tableModal'),
    tableRowsInput: document.getElementById('tableRowsInput'),
    tableColsInput: document.getElementById('tableColsInput'),
    btnConfirmTable: document.getElementById('btnConfirmTable'),
    // Status bar
    statusMode: document.getElementById('statusMode'),
    statusWords: document.getElementById('statusWords'),
    statusCursor: document.getElementById('statusCursor'),
    statusSaveMsg: document.getElementById('statusSaveMsg'),
    statusDot: document.getElementById('statusDot')
  };

  /* ==========================================================================
     Inicialización e Integración con Kanlane SDK
     ========================================================================== */
  async function init() {
    setupEventListeners();
    updateLineNumbers();

    try {
      if (window.WorkhubPlugin && typeof window.WorkhubPlugin.connect === 'function') {
        state.wh = await window.WorkhubPlugin.connect({
          id: 'com.yalerooo.kanpad-pro',
          name: 'KanPad Pro',
          version: '1.0.0',
          icon: 'file-text',
          permissions: ['storage', 'tasks:read', 'tasks:write', 'ui:extend']
        });
        showToast('Conectado con Kanlane exitosamente', 'success');
      } else {
        throw new Error('SDK no disponible');
      }
    } catch (err) {
      console.info('KanPad Pro corriendo en modo independiente/local:', err.message);
      state.isStandalone = true;
      const badge = document.getElementById('envBadge');
      if (badge) {
        badge.textContent = 'LOCAL DEV';
        badge.title = 'Modo independiente. Guardando datos en el navegador.';
      }
    }

    await loadNotes();
    renderNotesList();

    if (state.notes.length > 0) {
      selectNote(state.notes[0].id);
    } else {
      createNewNote('doc');
    }
  }

  /* ==========================================================================
     Persistencia: Kanlane wh.storage con fallback a localStorage
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
        state.notes = JSON.parse(local);
        return;
      } catch (e) {}
    }

    // Si no hay datos, cargar notas por defecto
    state.notes = JSON.parse(JSON.stringify(defaultInitialNotes));
    await saveNotes();
  }

  async function saveNotes(showStatus = true) {
    if (showStatus) {
      setSavingStatus(true);
    }

    // Actualizar nota activa antes de guardar
    updateCurrentNoteFromView();

    try {
      if (state.wh && state.wh.storage) {
        await state.wh.storage.set('kanpad_notes', state.notes);
      }
    } catch (e) {
      console.warn('Error guardando en wh.storage:', e);
    }

    // Siempre respaldar también en localStorage
    try {
      localStorage.setItem('kanpad_notes', JSON.stringify(state.notes));
    } catch (e) {}

    if (showStatus) {
      setTimeout(() => {
        setSavingStatus(false);
      }, 300);
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
    }, 800);
  }

  /* ==========================================================================
     Gestión de Notas
     ========================================================================== */
  function createNewNote(type = 'doc') {
    const isCode = type === 'code';
    const newNote = {
      id: 'note_' + Date.now(),
      title: isCode ? 'nuevo_script.js' : 'Nuevo Documento',
      type: type,
      language: isCode ? 'javascript' : 'markdown',
      updatedAt: new Date().toISOString(),
      content: isCode ? '' : '<h1>Nuevo Documento</h1><p>Escribe aquí tu contenido...</p>',
      rawCode: isCode ? '// Nuevo archivo de código\n' : ''
    };

    state.notes.unshift(newNote);
    renderNotesList();
    selectNote(newNote.id);
    saveNotes();

    // Enfocar el título
    DOM.noteTitleInput.focus();
    DOM.noteTitleInput.select();
  }

  function selectNote(id) {
    const note = state.notes.find(n => n.id === id);
    if (!note) return;

    // Guardar cambios de la nota anterior si existía
    if (state.currentNoteId && state.currentNoteId !== id) {
      updateCurrentNoteFromView();
    }

    state.currentNoteId = id;
    DOM.noteTitleInput.value = note.title;

    // Cambiar modo automáticamente según el tipo de nota
    if (note.type === 'code') {
      DOM.codeTextarea.value = note.rawCode || '';
      DOM.codeLangSelect.value = note.language || 'javascript';
      setMode('code');
    } else {
      DOM.docSheet.innerHTML = note.content || '';
      setMode('doc');
    }

    renderNotesList();
    updateStats();
  }

  function deleteNote(id, event) {
    if (event) event.stopPropagation();

    if (state.notes.length <= 1) {
      showToast('No puedes eliminar la única nota existente', 'error');
      return;
    }

    const note = state.notes.find(n => n.id === id);
    const confirmMsg = `¿Deseas eliminar "${note ? note.title : 'esta nota'}"?`;
    if (!confirm(confirmMsg)) return;

    state.notes = state.notes.filter(n => n.id !== id);

    if (state.currentNoteId === id) {
      selectNote(state.notes[0].id);
    } else {
      renderNotesList();
    }

    saveNotes();
    showToast('Nota eliminada', 'info');
  }

  function updateCurrentNoteFromView() {
    const note = state.notes.find(n => n.id === state.currentNoteId);
    if (!note) return;

    note.title = DOM.noteTitleInput.value.trim() || 'Sin título';
    note.updatedAt = new Date().toISOString();

    if (state.currentMode === 'code') {
      note.rawCode = DOM.codeTextarea.value;
      note.language = DOM.codeLangSelect.value;
      note.type = 'code';
    } else {
      note.content = DOM.docSheet.innerHTML;
      note.type = 'doc';
    }
  }

  function renderNotesList() {
    const query = state.searchQuery.toLowerCase();
    const filtered = state.notes.filter(note => {
      const matchFilter = state.activeFilter === 'all' || note.type === state.activeFilter;
      const matchSearch = !query || note.title.toLowerCase().includes(query) ||
        (note.content && note.content.toLowerCase().includes(query)) ||
        (note.rawCode && note.rawCode.toLowerCase().includes(query));
      return matchFilter && matchSearch;
    });

    DOM.notesList.innerHTML = '';

    if (filtered.length === 0) {
      DOM.notesList.innerHTML = `
        <div style="padding: 24px 10px; text-align: center; color: var(--ink-faint); font-size: 12px;">
          No se encontraron notas
        </div>
      `;
      return;
    }

    filtered.forEach(note => {
      const isSelected = note.id === state.currentNoteId;
      const item = document.createElement('div');
      item.className = `note-item ${isSelected ? 'active' : ''}`;
      item.onclick = () => selectNote(note.id);

      // Limpiar preview
      let previewText = '';
      if (note.type === 'code') {
        previewText = (note.rawCode || '').trim().slice(0, 60);
      } else {
        const tmp = document.createElement('div');
        tmp.innerHTML = note.content || '';
        previewText = tmp.textContent.trim().slice(0, 60);
      }

      const dateStr = new Date(note.updatedAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      });

      item.innerHTML = `
        <div class="note-item-header">
          <span class="note-item-title">${escapeHtml(note.title)}</span>
          <span class="note-item-type">${note.type === 'code' ? (note.language || 'code') : 'doc'}</span>
        </div>
        <div class="note-item-preview">${escapeHtml(previewText || 'Nota vacía...')}</div>
        <div class="note-item-footer">
          <span>${dateStr}</span>
          <button class="note-item-delete" title="Eliminar nota" onclick="KanPad.deleteNote('${note.id}', event)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      DOM.notesList.appendChild(item);
    });
  }

  /* ==========================================================================
     Control de Modos: Documento (Word/Docs) vs Código (Notepad++)
     ========================================================================== */
  function setMode(mode) {
    state.currentMode = mode;

    DOM.modeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const note = state.notes.find(n => n.id === state.currentNoteId);

    if (mode === 'doc') {
      DOM.docToolbar.style.display = 'flex';
      DOM.docViewport.style.display = 'flex';
      DOM.codeContainer.style.display = 'none';

      // Si venimos de modo código, pasar el código como snippet o texto formateado
      if (note && note.type === 'code' && DOM.codeTextarea.value) {
        if (!DOM.docSheet.innerHTML.trim() || DOM.docSheet.innerHTML === '<p><br></p>') {
          DOM.docSheet.innerHTML = `<h1>${escapeHtml(note.title)}</h1><div class="doc-code-block"><div class="doc-code-header"><span>${note.language || 'code'}</span><button class="doc-code-copy-btn" onclick="KanPad.copySnippet(this)">Copiar</button></div><pre><code class="language-${note.language || 'javascript'}">${escapeHtml(DOM.codeTextarea.value)}</code></pre></div>`;
        }
      }
      DOM.statusMode.textContent = 'Modo: Documento (Word/Docs)';
    } else if (mode === 'code') {
      DOM.docToolbar.style.display = 'none';
      DOM.docViewport.style.display = 'none';
      DOM.codeContainer.style.display = 'flex';

      // Si venimos de modo doc, extraer texto limpio si el textarea está vacío
      if (note && note.type === 'doc' && !DOM.codeTextarea.value) {
        DOM.codeTextarea.value = DOM.docSheet.innerText || '';
      }

      updateLineNumbers();
      DOM.statusMode.textContent = `Modo: Notepad++ [${DOM.codeLangSelect.value.toUpperCase()}]`;
    }

    updateStats();
  }

  /* ==========================================================================
     Herramientas del Modo Documento (WYSIWYG, Tablas, Callouts)
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
      info: 'callout',
      warning: 'callout callout-warning',
      success: 'callout callout-success'
    };

    const html = `
      <div class="${classes[type]}">
        <div>
          <strong>${titles[type]}</strong><br>
          Escribe aquí el contenido de la alerta...
        </div>
      </div>
      <p><br></p>
    `;

    document.execCommand('insertHTML', false, html);
    triggerAutosave();
  }

  function insertDocCodeBlock() {
    const lang = prompt('Indica el lenguaje del bloque (javascript, python, html, css, sql, json):', 'javascript') || 'javascript';
    const sample = `// Escribe tu código ${lang} aquí...\nconsole.log("Hola desde KanPad Pro");`;

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
     Herramientas del Modo Notepad++ (Prettify, Formateo, Líneas)
     ========================================================================== */
  function formatCurrentCode() {
    const code = DOM.codeTextarea.value;
    if (!code.trim()) return;

    const lang = DOM.codeLangSelect.value;
    const formatted = window.CodeTools ? window.CodeTools.beautify(code, lang) : code;

    DOM.codeTextarea.value = formatted;
    updateLineNumbers();
    triggerAutosave();
    showToast('¡Código formateado con éxito!', 'success');
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
     Integración con Tareas de Kanlane
     ========================================================================== */
  async function openKanlaneTasksModal() {
    DOM.taskModal.classList.add('active');
    DOM.taskListContainer.innerHTML = '<div style="padding:16px; text-align:center;">Cargando tareas de Kanlane...</div>';

    let tasks = [];
    if (state.wh && state.wh.tasks) {
      try {
        tasks = await state.wh.tasks.list();
      } catch (e) {
        console.warn('Error listando tareas de Kanlane:', e);
      }
    }

    // Si no hay tareas o está en standalone, mostrar ejemplos demostrativos
    if (!tasks || tasks.length === 0) {
      tasks = [
        { id: 'task-1', title: 'Diseñar arquitectura del plugin', status: 'en_proceso', client: 'Kanlane' },
        { id: 'task-2', title: 'Implementar formateador de código', status: 'completada', client: 'Kanlane' },
        { id: 'task-3', title: 'Testear integración con tablas y storage', status: 'pendiente', client: 'Kanlane' }
      ];
    }

    DOM.taskListContainer.innerHTML = '';
    tasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'task-item-card';
      card.innerHTML = `
        <div>
          <div style="font-weight:600; font-size:13px; color:var(--ink);">${escapeHtml(task.title || 'Sin título')}</div>
          <div style="font-size:11px; color:var(--ink-faint);">${escapeHtml(task.client || 'Kanlane')} · ${escapeHtml(task.status || 'abierta')}</div>
        </div>
        <button class="app-btn btn-primary" style="height:24px; font-size:11px;">Insertar</button>
      `;

      card.onclick = () => {
        insertTaskIntoDocument(task);
        closeModals();
      };

      DOM.taskListContainer.appendChild(card);
    });
  }

  function insertTaskIntoDocument(task) {
    if (state.currentMode === 'code') {
      const comment = `// Tarea Kanlane #${task.id}: ${task.title} [${task.status}]\n`;
      const curPos = DOM.codeTextarea.selectionStart;
      const text = DOM.codeTextarea.value;
      DOM.codeTextarea.value = text.slice(0, curPos) + comment + text.slice(curPos);
      triggerAutosave();
    } else {
      const taskCardHTML = `
        <div class="callout callout-info" style="display:flex; justify-content:space-between; align-items:center; margin: 10px 0;">
          <div>
            <strong>📌 Tarea Kanlane:</strong> ${escapeHtml(task.title)}
            <span class="task-card-pill" style="margin-left:8px;">${escapeHtml(task.status || 'abierta')}</span>
          </div>
          <span style="font-size:11px; color:var(--ink-soft); font-family:var(--mono);">#${task.id}</span>
        </div>
        <p><br></p>
      `;
      document.execCommand('insertHTML', false, taskCardHTML);
      triggerAutosave();
    }
    showToast(`Tarea "${task.title}" vinculada`, 'success');
  }

  /* ==========================================================================
     Exportación de Archivos
     ========================================================================== */
  function exportCurrentNote() {
    const note = state.notes.find(n => n.id === state.currentNoteId);
    if (!note) return;

    updateCurrentNoteFromView();

    let content = '';
    let filename = note.title;
    let mimeType = 'text/plain';

    if (note.type === 'code') {
      content = note.rawCode || '';
      const extMap = {
        javascript: 'js',
        python: 'py',
        html: 'html',
        css: 'css',
        sql: 'sql',
        json: 'json',
        markdown: 'md'
      };
      const ext = extMap[note.language] || 'txt';
      if (!filename.includes('.')) filename += `.${ext}`;
    } else {
      content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(note.title)}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;line-height:1.6;padding:0 20px;}table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #ccc;padding:8px 12px;text-align:left;}th{background:#f0f0f0;}.callout{background:#f0f7ff;border-left:4px solid #2563eb;padding:12px;margin:16px 0;}pre{background:#2d3748;color:#fff;padding:14px;border-radius:6px;overflow-x:auto;}</style></head><body>${note.content}</body></html>`;
      if (!filename.endsWith('.html')) filename += '.html';
      mimeType = 'text/html';
    }

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
     Estadísticas y Utilidades
     ========================================================================== */
  function updateStats() {
    let text = '';
    if (state.currentMode === 'code') {
      text = DOM.codeTextarea.value;
      const lines = text.split('\n').length;
      const chars = text.length;
      DOM.statusWords.textContent = `${lines} líneas | ${chars} caracteres`;
    } else {
      text = DOM.docSheet.innerText || '';
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

    // Toast flotante propio
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.style.cssText = 'position:fixed;bottom:36px;right:20px;display:flex;flex-direction:column;gap:8px;z-index:9999;pointer-events:none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `background:var(--surface);border:1px solid var(--line-strong);color:var(--ink);padding:8px 14px;border-radius:var(--r-md);font-size:12px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.2s;pointer-events:auto;display:flex;align-items:center;gap:8px;`;
    
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
    // Título de la nota
    DOM.noteTitleInput.addEventListener('input', () => {
      triggerAutosave();
      renderNotesList();
    });

    // Guardado manual
    DOM.btnSave.addEventListener('click', () => {
      saveNotes(true);
      showToast('Guardado correctamente', 'success');
    });

    // Nueva nota
    DOM.btnNewNote.addEventListener('click', () => {
      createNewNote(state.currentMode === 'code' ? 'code' : 'doc');
    });

    // Exportar
    DOM.btnExport.addEventListener('click', exportCurrentNote);

    // Tareas Kanlane
    DOM.btnKanlaneTasks.addEventListener('click', openKanlaneTasksModal);

    // Sidebar colapso
    DOM.btnToggleSidebar.addEventListener('click', () => {
      DOM.sidebar.classList.toggle('is-collapsed');
    });

    // Búsqueda
    DOM.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderNotesList();
    });

    // Filtros de nota
    DOM.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        DOM.filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeFilter = tab.dataset.filter;
        renderNotesList();
      });
    });

    // Modos
    DOM.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setMode(btn.dataset.mode);
      });
    });

    // Editor de Documentos (input)
    DOM.docSheet.addEventListener('input', () => {
      triggerAutosave();
      updateStats();
    });

    // Editor de Código (textarea)
    DOM.codeTextarea.addEventListener('input', () => {
      updateLineNumbers();
      triggerAutosave();
      updateStats();
    });

    // Sincronizar scroll entre gutter de números y textarea
    DOM.codeTextarea.addEventListener('scroll', () => {
      DOM.codeLineNumbers.scrollTop = DOM.codeTextarea.scrollTop;
    });

    // Soporte para tecla Tab en el textarea
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

    // Selector de lenguaje en modo código
    DOM.codeLangSelect.addEventListener('change', () => {
      const lang = DOM.codeLangSelect.value;
      DOM.statusMode.textContent = `Modo: Notepad++ [${lang.toUpperCase()}]`;
      triggerAutosave();
    });

    // Formatear código (Prettify)
    DOM.btnFormatCode.addEventListener('click', formatCurrentCode);

    // Copiar código
    DOM.btnCopyCode.addEventListener('click', copyCurrentCode);

    // Confirmar inserción de tabla
    DOM.btnConfirmTable.addEventListener('click', confirmInsertTable);

    // Cerrar modales con tecla Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModals();
    });
  }

  // API pública para elementos dinámicos
  window.KanPad = {
    init,
    deleteNote,
    insertTableModal,
    insertCallout,
    insertDocCodeBlock,
    execDocCmd,
    closeModals,
    copySnippet(btn) {
      const codeBlock = btn.closest('.doc-code-block');
      if (codeBlock) {
        const code = codeBlock.querySelector('code').innerText;
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = '¡Copiado!';
          setTimeout(() => { btn.textContent = 'Copiar'; }, 1500);
        });
      }
    }
  };

  // Iniciar al cargar el DOM
  document.addEventListener('DOMContentLoaded', init);
})();
