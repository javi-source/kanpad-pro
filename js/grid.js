/**
 * KanPad Pro - Grid Engine
 * Motor de Hoja de Cálculo (estilo Google Sheets / Excel)
 * Soporta celdas interactivas, fórmulas (SUM, AVERAGE, MIN, MAX, COUNT...),
 * formateo visual, navegación con teclado e importación/exportación CSV.
 */

(function (global) {
  'use strict';

  class GridSheet {
    constructor(containerEl, formulaBarInput, activeCellLabel, options = {}) {
      this.container = containerEl;
      this.formulaInput = formulaBarInput;
      this.activeLabel = activeCellLabel;
      this.onChange = options.onChange || null;

      this.rows = options.rows || 30;
      this.cols = options.cols || 12;
      this.data = options.data || {}; // { 'A1': { raw: '=SUM(B1:B5)', format: 'currency', bold: true } }

      this.selectedCell = 'A1';
      this.isEditing = false;

      this.init();
    }

    // Convertir índice numérico (0 -> A, 1 -> B, 26 -> AA)
    static colName(colIndex) {
      let name = '';
      let num = colIndex;
      while (num >= 0) {
        name = String.fromCharCode((num % 26) + 65) + name;
        num = Math.floor(num / 26) - 1;
      }
      return name;
    }

    // Convertir nombre de columna a índice (A -> 0, B -> 1)
    static colIndex(name) {
      let index = 0;
      for (let i = 0; i < name.length; i++) {
        index = index * 26 + (name.charCodeAt(i) - 64);
      }
      return index - 1;
    }

    // Separar "A1" en { col: 0, row: 0, colName: 'A', rowNum: 1 }
    static parseCoords(ref) {
      const match = String(ref).toUpperCase().match(/^([A-Z]+)([0-9]+)$/);
      if (!match) return null;
      return {
        colName: match[1],
        rowNum: parseInt(match[2], 10),
        col: GridSheet.colIndex(match[1]),
        row: parseInt(match[2], 10) - 1
      };
    }

    // Construir referencia "A1" a partir de col y row (0-indexed)
    static makeRef(col, row) {
      return `${GridSheet.colName(col)}${row + 1}`;
    }

    init() {
      this.render();
      this.bindGlobalEvents();
      this.selectCell('A1');
    }

    // Cargar nuevo conjunto de datos
    loadData(gridData) {
      if (gridData) {
        this.rows = gridData.rows || 30;
        this.cols = gridData.cols || 12;
        this.data = gridData.cells || {};
      } else {
        this.rows = 30;
        this.cols = 12;
        this.data = {};
      }
      this.render();
      this.selectCell('A1');
    }

    // Obtener estructura para guardar
    getData() {
      return {
        rows: this.rows,
        cols: this.cols,
        cells: this.data
      };
    }

    // Renderiza la cuadrícula completa
    render() {
      this.container.innerHTML = '';

      const tableWrapper = document.createElement('div');
      tableWrapper.className = 'grid-table-scroll';

      const table = document.createElement('table');
      table.className = 'grid-sheet-table';

      // Thead (Columnas: A, B, C...)
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');

      // Esquina superior izquierda
      const cornerTh = document.createElement('th');
      cornerTh.className = 'grid-corner-header';
      cornerTh.textContent = ' ';
      headerRow.appendChild(cornerTh);

      for (let c = 0; c < this.cols; c++) {
        const th = document.createElement('th');
        th.className = 'grid-col-header';
        th.dataset.col = c;
        th.textContent = GridSheet.colName(c);
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Tbody (Filas: 1, 2, 3...)
      const tbody = document.createElement('tbody');
      for (let r = 0; r < this.rows; r++) {
        const tr = document.createElement('tr');

        // Encabezado de fila
        const rowHeader = document.createElement('th');
        rowHeader.className = 'grid-row-header';
        rowHeader.dataset.row = r;
        rowHeader.textContent = String(r + 1);
        tr.appendChild(rowHeader);

        for (let c = 0; c < this.cols; c++) {
          const td = document.createElement('td');
          const ref = GridSheet.makeRef(c, r);
          td.className = 'grid-cell';
          td.dataset.ref = ref;
          td.dataset.col = c;
          td.dataset.row = r;

          this.updateCellDOM(td, ref);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      tableWrapper.appendChild(table);
      this.container.appendChild(tableWrapper);

      this.bindCellEvents();
    }

    // Actualiza el aspecto y valor visible de una celda
    updateCellDOM(td, ref) {
      const cellInfo = this.data[ref] || {};
      const calculatedVal = this.evaluateCell(ref);

      td.textContent = this.formatDisplayValue(calculatedVal, cellInfo.format);

      // Estilos
      td.style.fontWeight = cellInfo.bold ? '600' : 'normal';
      td.style.fontStyle = cellInfo.italic ? 'italic' : 'normal';
      td.style.textAlign = cellInfo.align || (typeof calculatedVal === 'number' ? 'right' : 'left');
      td.style.color = cellInfo.color || '';
      td.style.backgroundColor = cellInfo.bg || '';
    }

    // Formatear valor numérico según configuración
    formatDisplayValue(val, format) {
      if (val === null || val === undefined || val === '') return '';
      if (typeof val === 'number' && !isNaN(val)) {
        if (format === 'currency') {
          return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
        }
        if (format === 'currency_usd') {
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
        }
        if (format === 'percent') {
          return (val * 100).toFixed(1) + '%';
        }
        if (format === 'decimal') {
          return val.toFixed(2);
        }
        if (format === 'integer') {
          return Math.round(val).toString();
        }
      }
      return String(val);
    }

    // Evaluar valor de una celda (soporta fórmulas y referencias)
    evaluateCell(ref, visited = new Set()) {
      if (visited.has(ref)) return '#CIRCULAR!';
      visited.add(ref);

      const cellInfo = this.data[ref];
      if (!cellInfo || cellInfo.raw === undefined || cellInfo.raw === null) return '';

      const raw = String(cellInfo.raw).trim();
      if (!raw.startsWith('=')) {
        // Valor directo: ¿es número?
        if (raw !== '' && !isNaN(raw)) {
          return Number(raw);
        }
        return raw;
      }

      // Es una fórmula: evaluarla
      try {
        const formula = raw.substring(1).trim();
        return this.evaluateFormula(formula, visited);
      } catch (err) {
        console.warn(`Error en celda ${ref}:`, err);
        return '#ERROR!';
      }
    }

    // Evaluador de fórmulas matemáticas y funciones de hoja de cálculo
    evaluateFormula(formula, visited) {
      // Reemplazo de funciones tipo SUM(A1:A5), AVERAGE(B1:B10), etc.
      let expr = formula;

      // Soporte para funciones comunes
      expr = expr.replace(/(SUM|SUMA|AVERAGE|PROMEDIO|COUNT|CONTAR|MIN|MAX|COUNTA|CONTARA)\s*\(\s*([A-Z0-9:,]+)\s*\)/gi, (match, fn, args) => {
        const cells = this.expandRange(args);
        const values = cells.map(r => this.evaluateCell(r, new Set(visited)))
                             .filter(v => typeof v === 'number' && !isNaN(v));

        const fnUpper = fn.toUpperCase();
        if (fnUpper === 'SUM' || fnUpper === 'SUMA') {
          return values.reduce((a, b) => a + b, 0);
        }
        if (fnUpper === 'AVERAGE' || fnUpper === 'PROMEDIO') {
          return values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length) : 0;
        }
        if (fnUpper === 'COUNT' || fnUpper === 'CONTAR') {
          return values.length;
        }
        if (fnUpper === 'COUNTA' || fnUpper === 'CONTARA') {
          return cells.map(r => this.evaluateCell(r, new Set(visited))).filter(v => v !== '' && v !== null).length;
        }
        if (fnUpper === 'MIN') {
          return values.length > 0 ? Math.min(...values) : 0;
        }
        if (fnUpper === 'MAX') {
          return values.length > 0 ? Math.max(...values) : 0;
        }
        return 0;
      });

      // Reemplazar referencias individuales de celdas (e.g. A1, B4) por sus valores numéricos o literales
      expr = expr.replace(/\b([A-Z]+[0-9]+)\b/g, (match, cellRef) => {
        const val = this.evaluateCell(cellRef, new Set(visited));
        if (typeof val === 'number') return `(${val})`;
        if (typeof val === 'string') {
          if (!isNaN(val) && val.trim() !== '') return `(${Number(val)})`;
          return JSON.stringify(val);
        }
        return 0;
      });

      // Sanitizar expresión antes de evaluar: solo permitir números, operadores y paréntesis seguros
      if (!/^[0-9+\-*/().\s,><=!&|"'\w]+$/.test(expr)) {
        return '#SINTAXIS!';
      }

      // Evaluar la expresión aritmética
      // eslint-disable-next-line no-new-func
      const result = new Function(`return (${expr});`)();
      if (typeof result === 'number' && !isNaN(result)) {
        return Math.round(result * 10000) / 10000;
      }
      return result;
    }

    // Expande un rango como "A1:A5" o "A1,B2" a un array ['A1', 'A2', 'A3', 'A4', 'A5']
    expandRange(argStr) {
      const parts = argStr.split(/[,;]/);
      const result = [];

      parts.forEach(part => {
        const trimmed = part.trim().toUpperCase();
        if (trimmed.includes(':')) {
          const [startStr, endStr] = trimmed.split(':');
          const start = GridSheet.parseCoords(startStr);
          const end = GridSheet.parseCoords(endStr);
          if (start && end) {
            const minCol = Math.min(start.col, end.col);
            const maxCol = Math.max(start.col, end.col);
            const minRow = Math.min(start.row, end.row);
            const maxRow = Math.max(start.row, end.row);

            for (let c = minCol; c <= maxCol; c++) {
              for (let r = minRow; r <= maxRow; r++) {
                result.push(GridSheet.makeRef(c, r));
              }
            }
          }
        } else {
          result.push(trimmed);
        }
      });

      return result;
    }

    // Seleccionar una celda activa
    selectCell(ref) {
      if (this.isEditing) {
        this.commitEdit();
      }

      const prevCell = this.container.querySelector('.grid-cell.is-selected');
      if (prevCell) prevCell.classList.remove('is-selected');

      const nextCell = this.container.querySelector(`.grid-cell[data-ref="${ref}"]`);
      if (nextCell) {
        nextCell.classList.add('is-selected');
        this.selectedCell = ref;

        // Actualizar barra de fórmula y etiqueta
        if (this.activeLabel) this.activeLabel.textContent = ref;
        const cellData = this.data[ref] || {};
        if (this.formulaInput) {
          this.formulaInput.value = cellData.raw !== undefined ? cellData.raw : '';
        }

        // Resaltar encabezados de fila y columna
        const coords = GridSheet.parseCoords(ref);
        if (coords) {
          this.highlightHeaders(coords.col, coords.row);
        }
      }
    }

    highlightHeaders(colIdx, rowIdx) {
      this.container.querySelectorAll('.grid-col-header.is-active, .grid-row-header.is-active').forEach(el => {
        el.classList.remove('is-active');
      });
      const colEl = this.container.querySelector(`.grid-col-header[data-col="${colIdx}"]`);
      const rowEl = this.container.querySelector(`.grid-row-header[data-row="${rowIdx}"]`);
      if (colEl) colEl.classList.add('is-active');
      if (rowEl) rowEl.classList.add('is-active');
    }

    // Iniciar edición interactiva dentro de la celda
    startEdit(initialChar = null) {
      if (this.isEditing) return;

      const td = this.container.querySelector(`.grid-cell[data-ref="${this.selectedCell}"]`);
      if (!td) return;

      this.isEditing = true;
      const cellData = this.data[this.selectedCell] || {};
      const currentRaw = cellData.raw !== undefined ? String(cellData.raw) : '';

      td.innerHTML = '';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'grid-cell-editor';
      input.value = initialChar !== null ? initialChar : currentRaw;

      td.appendChild(input);
      input.focus();
      if (initialChar === null) {
        input.select();
      } else {
        input.setSelectionRange(input.value.length, input.value.length);
      }

      // Sincronizar con la barra de fórmula en tiempo real
      input.addEventListener('input', () => {
        if (this.formulaInput) this.formulaInput.value = input.value;
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.commitEdit(input.value);
          this.moveSelection(0, 1); // mover hacia abajo
        } else if (e.key === 'Tab') {
          e.preventDefault();
          this.commitEdit(input.value);
          this.moveSelection(e.shiftKey ? -1 : 1, 0); // mover derecha/izquierda
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.cancelEdit();
        }
      });
    }

    // Confirmar edición y recalcular hoja
    commitEdit(valueToSet = null) {
      if (!this.isEditing && valueToSet === null) return;

      const td = this.container.querySelector(`.grid-cell[data-ref="${this.selectedCell}"]`);
      const input = td ? td.querySelector('input.grid-cell-editor') : null;

      const finalVal = valueToSet !== null ? valueToSet : (input ? input.value : (this.formulaInput ? this.formulaInput.value : ''));

      if (!this.data[this.selectedCell]) {
        this.data[this.selectedCell] = {};
      }

      this.data[this.selectedCell].raw = finalVal;
      this.isEditing = false;

      this.recalculateAll();

      if (this.onChange) {
        this.onChange(this.getData());
      }
    }

    cancelEdit() {
      this.isEditing = false;
      this.recalculateAll();
    }

    // Recalcular y refrescar todas las celdas
    recalculateAll() {
      const cells = this.container.querySelectorAll('.grid-cell');
      cells.forEach(td => {
        const ref = td.dataset.ref;
        this.updateCellDOM(td, ref);
      });

      // Mantener selección
      this.selectCell(this.selectedCell);
    }

    // Desplazar selección en la cuadrícula
    moveSelection(deltaCol, deltaRow) {
      const coords = GridSheet.parseCoords(this.selectedCell);
      if (!coords) return;

      const nextCol = Math.max(0, Math.min(this.cols - 1, coords.col + deltaCol));
      const nextRow = Math.max(0, Math.min(this.rows - 1, coords.row + deltaRow));
      const nextRef = GridSheet.makeRef(nextCol, nextRow);

      this.selectCell(nextRef);

      // Scroll hacia la celda si está fuera de vista
      const td = this.container.querySelector(`.grid-cell[data-ref="${nextRef}"]`);
      if (td) td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    // Eventos de interacción en celdas
    bindCellEvents() {
      this.container.addEventListener('click', (e) => {
        const td = e.target.closest('.grid-cell');
        if (td && td.dataset.ref) {
          if (this.selectedCell === td.dataset.ref && !this.isEditing) {
            // Segundo clic: editar
            this.startEdit();
          } else {
            this.selectCell(td.dataset.ref);
          }
        }
      });

      this.container.addEventListener('dblclick', (e) => {
        const td = e.target.closest('.grid-cell');
        if (td && td.dataset.ref) {
          this.selectCell(td.dataset.ref);
          this.startEdit();
        }
      });
    }

    // Eventos globales del teclado y barra de fórmulas
    bindGlobalEvents() {
      // Input de fórmula superior
      if (this.formulaInput) {
        this.formulaInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.commitEdit(this.formulaInput.value);
            this.moveSelection(0, 1);
          } else if (e.key === 'Escape') {
            const cellData = this.data[this.selectedCell] || {};
            this.formulaInput.value = cellData.raw !== undefined ? cellData.raw : '';
            this.formulaInput.blur();
          }
        });
      }

      // Teclas de navegación en la tabla
      window.addEventListener('keydown', (e) => {
        // Ignorar si el foco está en un input externo o modal
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) {
          if (!document.activeElement.classList.contains('grid-cell-editor')) {
            return;
          }
        }

        // Si el contenedor de Grid no está visible, ignorar
        if (!this.container.offsetParent) return;

        if (this.isEditing) return;

        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            this.moveSelection(0, -1);
            break;
          case 'ArrowDown':
            e.preventDefault();
            this.moveSelection(0, 1);
            break;
          case 'ArrowLeft':
            e.preventDefault();
            this.moveSelection(-1, 0);
            break;
          case 'ArrowRight':
            e.preventDefault();
            this.moveSelection(1, 0);
            break;
          case 'Tab':
            e.preventDefault();
            this.moveSelection(e.shiftKey ? -1 : 1, 0);
            break;
          case 'Enter':
            e.preventDefault();
            this.startEdit();
            break;
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            this.clearSelectedCell();
            break;
          default:
            // Si el usuario escribe una letra o número, empezar a editar con ese caracter
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
              this.startEdit(e.key);
            }
            break;
        }
      });
    }

    // Formatear celda seleccionada
    formatSelectedCell(prop, value) {
      if (!this.selectedCell) return;
      if (!this.data[this.selectedCell]) {
        this.data[this.selectedCell] = {};
      }

      if (prop === 'bold') {
        this.data[this.selectedCell].bold = !this.data[this.selectedCell].bold;
      } else if (prop === 'italic') {
        this.data[this.selectedCell].italic = !this.data[this.selectedCell].italic;
      } else {
        this.data[this.selectedCell][prop] = value;
      }

      this.recalculateAll();
      if (this.onChange) this.onChange(this.getData());
    }

    clearSelectedCell() {
      if (this.data[this.selectedCell]) {
        delete this.data[this.selectedCell];
        this.recalculateAll();
        if (this.formulaInput) this.formulaInput.value = '';
        if (this.onChange) this.onChange(this.getData());
      }
    }

    // Insertar fila
    addRow() {
      this.rows++;
      this.render();
      if (this.onChange) this.onChange(this.getData());
    }

    // Eliminar fila
    deleteRow() {
      if (this.rows <= 2) return;
      this.rows--;
      this.render();
      if (this.onChange) this.onChange(this.getData());
    }

    // Insertar columna
    addColumn() {
      this.cols++;
      this.render();
      if (this.onChange) this.onChange(this.getData());
    }

    // Eliminar columna
    deleteColumn() {
      if (this.cols <= 2) return;
      this.cols--;
      this.render();
      if (this.onChange) this.onChange(this.getData());
    }

    // Exportar datos a CSV
    toCSV() {
      const rowsArr = [];
      for (let r = 0; r < this.rows; r++) {
        const rowVals = [];
        let hasContent = false;
        for (let c = 0; c < this.cols; c++) {
          const ref = GridSheet.makeRef(c, r);
          const cellVal = this.evaluateCell(ref);
          const valStr = cellVal !== null && cellVal !== undefined ? String(cellVal) : '';
          if (valStr.trim()) hasContent = true;
          // Escapar comillas dobles en CSV
          rowVals.push(`"${valStr.replace(/"/g, '""')}"`);
        }
        if (hasContent || r < 10) {
          rowsArr.push(rowVals.join(','));
        }
      }
      return rowsArr.join('\r\n');
    }

    // Importar datos desde CSV
    fromCSV(csvText) {
      if (!csvText) return;
      const lines = csvText.trim().split(/\r?\n/);
      this.data = {};

      lines.forEach((line, r) => {
        // Parser simple de CSV que respeta comillas
        const rowTokens = [];
        let currentToken = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
              currentToken += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (ch === ',' && !inQuotes) {
            rowTokens.push(currentToken.trim());
            currentToken = '';
          } else {
            currentToken += ch;
          }
        }
        rowTokens.push(currentToken.trim());

        rowTokens.forEach((token, c) => {
          if (token) {
            const ref = GridSheet.makeRef(c, r);
            this.data[ref] = { raw: token };
          }
        });
      });

      this.rows = Math.max(30, lines.length + 5);
      this.render();
      if (this.onChange) this.onChange(this.getData());
    }
  }

  global.GridSheet = GridSheet;
})(window);
