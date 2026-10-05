/**
 * Tablero de Proyectos - Martín, Felipe y Ramiro  (versión 2)
 *
 * - Cuando una tarea pasa a "Hecha", la mueve de "Tareas" a "Historial"
 *   con la fecha de cierre, el responsable y si se cumplió a tiempo.
 * - rediseñar() convierte Tareas e Historial en Tablas de Google Sheets
 *   (encabezado, filas alternadas, desplegables tipo chip) y rehace el Panel.
 * - Menú "Tablero" > "Actualizar desplegables" para cuando se agregan
 *   proyectos o personas en la hoja Config.
 *
 * Instalación: Extensiones > Apps Script, reemplazar todo el código por este,
 * guardar, elegir la función "rediseñar" y tocar Ejecutar (una sola vez).
 */

const HOJA_TAREAS = 'Tareas';
const HOJA_HISTORIAL = 'Historial';
const HOJA_PANEL = 'Panel';
const HOJA_CONFIG = 'Config';

const PRIMERA_FILA = 5;   // primera fila de tareas (la 4 es el encabezado)
const ULTIMA_FILA = 150;  // última fila de la tabla de tareas
const COL_ESTADO = 5;     // columna E

const HIST_PRIMERA_FILA = 4; // la 3 es el encabezado
const HIST_ENCABEZADOS = ['Fecha de cierre', 'Proyecto', 'Tarea', 'Responsable',
  'Prioridad', 'Fecha límite', 'Cumplimiento', 'Comentarios'];

const C = {
  tinta: '#1F2937', gris: '#6B7280', linea: '#E5E7EB',
  encabezado: '#3F51B5', banda1: '#FFFFFF', banda2: '#F3F4FB',
  verde: '#188038', rojo: '#C5221F', ambar: '#B06000', violeta: '#3F51B5',
};

// ================================================================ Menú

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Tablero')
    .addItem('Actualizar desplegables', 'actualizarDesplegables')
    .addItem('Rediseñar todo', 'rediseñar')
    .addToUi();
}

// ================================================================ Disparador

function onEdit(e) {
  const hoja = e.range.getSheet();
  if (hoja.getName() !== HOJA_TAREAS) return;

  const colIni = e.range.getColumn();
  const colFin = colIni + e.range.getNumColumns() - 1;
  if (COL_ESTADO < colIni || COL_ESTADO > colFin) return;

  const filaIni = Math.max(e.range.getRow(), PRIMERA_FILA);
  const filaFin = e.range.getRow() + e.range.getNumRows() - 1;

  for (let fila = filaFin; fila >= filaIni; fila--) {
    if (hoja.getRange(fila, COL_ESTADO).getValue() === 'Hecha') {
      archivarFila_(hoja, fila);
    }
  }
}

// ================================================================ Archivado

function archivarFila_(hoja, fila) {
  const v = hoja.getRange(fila, 1, 1, 9).getValues()[0];
  const [proyecto, tarea, responsable, prioridad, , fechaLimite, , , comentarios] = v;
  if (tarea === '' && proyecto === '') return;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let cumplimiento = 'Sin fecha';
  if (fechaLimite instanceof Date) {
    const limite = new Date(fechaLimite);
    limite.setHours(0, 0, 0, 0);
    const atraso = Math.round((hoy - limite) / 86400000);
    cumplimiento = atraso <= 0 ? 'A tiempo'
      : atraso === 1 ? '1 día tarde' : atraso + ' días tarde';
  }

  const hist = obtenerHistorial_();
  hist.insertRowBefore(HIST_PRIMERA_FILA);
  hist.getRange(HIST_PRIMERA_FILA, 1, 1, HIST_ENCABEZADOS.length)
    .setValues([[new Date(), proyecto, tarea, responsable, prioridad,
      fechaLimite, cumplimiento, comentarios]]);
  formatearFilaHistorial_(hist, HIST_PRIMERA_FILA);

  // Saca la fila y repone una vacía dentro de la tabla, con sus fórmulas
  hoja.deleteRow(fila);
  const penultima = ULTIMA_FILA - 1;
  hoja.insertRowBefore(penultima);
  hoja.getRange(penultima + 1, 7, 1, 2).copyTo(hoja.getRange(penultima, 7, 1, 2));
}

function formatearFilaHistorial_(hist, fila) {
  hist.getRange(fila, 1, 1, HIST_ENCABEZADOS.length)
    .setFontFamily('Arial').setFontSize(10).setFontColor(C.tinta)
    .setFontWeight('normal').setBackground(null).setVerticalAlignment('middle');
  hist.getRange(fila, 1).setNumberFormat('dd/mm/yyyy HH:mm');
  hist.getRange(fila, 6).setNumberFormat('dd/mm/yyyy');
  hist.setRowHeight(fila, 26);
}

// ================================================================ Historial

function obtenerHistorial_() {
  const ss = SpreadsheetApp.getActive();
  let hist = ss.getSheetByName(HOJA_HISTORIAL);
  if (hist) return hist;

  hist = ss.insertSheet(HOJA_HISTORIAL, ss.getSheets().length - 1);
  hist.getRange(3, 1, 1, HIST_ENCABEZADOS.length).setValues([HIST_ENCABEZADOS]);
  return hist;
}

// ================================================================ Rediseño

function rediseñar() {
  const ss = SpreadsheetApp.getActive();
  const tareas = ss.getSheetByName(HOJA_TAREAS);
  const hist = obtenerHistorial_();

  // Primero pasa al Historial lo que haya quedado como Hecha
  for (let fila = ULTIMA_FILA; fila >= PRIMERA_FILA; fila--) {
    if (tareas.getRange(fila, COL_ESTADO).getValue() === 'Hecha') archivarFila_(tareas, fila);
  }

  borrarTablas_(ss);
  estilizarTareas_(tareas);
  estilizarHistorial_(hist);
  crearTablas_(ss, tareas, hist);
  estilizarPanel_(ss.getSheetByName(HOJA_PANEL));
  estilizarConfig_(ss.getSheetByName(HOJA_CONFIG));

  ss.toast('Listo: tablas, desplegables y Panel actualizados.', 'Tablero', 5);
}

function encabezadoHoja_(hoja, titulo, subtitulo, ancho) {
  hoja.setHiddenGridlines(true);
  [1, 2].forEach(r => {
    const rg = hoja.getRange(r, 1, 1, ancho);
    rg.breakApart().clear();
  });
  hoja.getRange(1, 1).setValue(titulo).setFontFamily('Arial').setFontSize(22)
    .setFontWeight('bold').setFontColor(C.tinta).setVerticalAlignment('bottom');
  hoja.getRange(2, 1).setValue(subtitulo).setFontFamily('Arial').setFontSize(10)
    .setFontColor(C.gris).setVerticalAlignment('top');
  hoja.setRowHeight(1, 44);
  hoja.setRowHeight(2, 24);
}

function estilizarTareas_(t) {
  const filtro = t.getFilter();
  if (filtro) filtro.remove();
  t.clearConditionalFormatRules();

  encabezadoHoja_(t, 'Tareas', 'Martín · Felipe · Ramiro  |  Una tarea por fila. Al elegir "Hecha" en Estado, la tarea pasa sola al Historial.', 9);
  t.getRange('H1').setValue('Hoy').setFontFamily('Arial').setFontColor(C.gris)
    .setHorizontalAlignment('right').setVerticalAlignment('bottom');
  t.getRange('I1').setFormula('=TODAY()').setNumberFormat('dd/mm/yyyy')
    .setFontFamily('Arial').setFontWeight('bold').setFontColor(C.tinta).setVerticalAlignment('bottom');

  const filas = ULTIMA_FILA - PRIMERA_FILA + 1;
  const datos = t.getRange(4, 1, filas + 1, 9);
  datos.clearDataValidations();
  datos.clearFormat();
  datos.setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle');
  t.getRange(PRIMERA_FILA, 2, filas, 1).setWrap(true);
  t.getRange(PRIMERA_FILA, 9, filas, 1).setWrap(true);
  t.getRange(PRIMERA_FILA, 6, filas, 1).setNumberFormat('dd/mm/yyyy').setHorizontalAlignment('center');
  t.getRange(PRIMERA_FILA, 7, filas, 1).setNumberFormat('0;-0;"Hoy"').setHorizontalAlignment('center');
  t.getRange(PRIMERA_FILA, 8, filas, 1).setHorizontalAlignment('center').setFontWeight('bold');
  t.setRowHeights(PRIMERA_FILA, filas, 28);
  t.setRowHeight(3, 10);
  t.setRowHeight(4, 32);
  t.setFrozenRows(4);
  t.setFrozenColumns(0);

  // Colores de Alerta y días vencidos
  const H = t.getRange(PRIMERA_FILA, 8, filas, 1);
  const G = t.getRange(PRIMERA_FILA, 7, filas, 1);
  const regla = (txt, bg, fg) => SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(txt).setBackground(bg).setFontColor(fg).setRanges([H]).build();
  t.setConditionalFormatRules([
    regla('Vencida', '#FCE8E6', C.rojo),
    regla('Esta semana', '#FEF7E0', C.ambar),
    regla('En fecha', '#E6F4EA', C.verde),
    regla('Sin fecha', '#F1F3F4', C.gris),
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0)
      .setFontColor(C.rojo).setBold(true).setRanges([G]).build(),
  ]);
}

function estilizarHistorial_(h) {
  encabezadoHoja_(h, 'Historial', 'Tareas terminadas. Las más recientes arriba.', 8);
  h.setTabColor('#188038');
  const ultima = Math.max(h.getLastRow(), HIST_PRIMERA_FILA);
  const datos = h.getRange(3, 1, ultima - 2, HIST_ENCABEZADOS.length);
  datos.clearFormat().clearDataValidations();
  datos.setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle');
  h.getRange(3, 1, 1, HIST_ENCABEZADOS.length).setValues([HIST_ENCABEZADOS]);
  h.getRange(HIST_PRIMERA_FILA, 1, ultima, 1).setNumberFormat('dd/mm/yyyy HH:mm');
  h.getRange(HIST_PRIMERA_FILA, 6, ultima, 1).setNumberFormat('dd/mm/yyyy');
  h.setRowHeight(3, 32);
  h.setFrozenRows(3);
  [16, 22, 46, 14, 12, 14, 16, 44].forEach((w, i) => h.setColumnWidth(i + 1, w * 7));

  const G = h.getRange(HIST_PRIMERA_FILA, 7, 1000, 1);
  h.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('A tiempo')
      .setBackground('#E6F4EA').setFontColor(C.verde).setBold(true).setRanges([G]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains('tarde')
      .setBackground('#FCE8E6').setFontColor(C.rojo).setBold(true).setRanges([G]).build(),
  ]);
}

// ---------------------------------------------------------------- Tablas (API de Sheets)

// Usa el servicio avanzado "Google Sheets API" (Servicios > + en el editor)
function sheetsApi_(metodo, campos, cuerpo) {
  if (typeof Sheets === 'undefined') {
    throw new Error('Falta agregar el servicio: en el editor de Apps Script, a la izquierda, ' +
      'Servicios > + > Google Sheets API > Agregar. Después volvé a ejecutar.');
  }
  const id = SpreadsheetApp.getActive().getId();
  if (metodo === 'get') return Sheets.Spreadsheets.get(id, { fields: campos });
  return Sheets.Spreadsheets.batchUpdate(cuerpo, id);
}

function tablasExistentes_() {
  const r = sheetsApi_('get', 'sheets(properties(sheetId,title),tables(tableId,name))');
  const out = [];
  (r.sheets || []).forEach(s => (s.tables || []).forEach(tb =>
    out.push({ hoja: s.properties.title, id: tb.tableId, nombre: tb.name })));
  return out;
}

function borrarTablas_() {
  const tablas = tablasExistentes_().filter(t => t.hoja === HOJA_TAREAS || t.hoja === HOJA_HISTORIAL);
  if (!tablas.length) return;
  sheetsApi_('post', ':batchUpdate', {
    requests: tablas.map(t => ({ deleteTable: { tableId: t.id } })),
  });
}

function listaConfig_(rango) {
  return SpreadsheetApp.getActive().getSheetByName(HOJA_CONFIG).getRange(rango)
    .getValues().map(r => String(r[0]).trim()).filter(v => v !== '');
}

function columnaDesplegable_(indice, nombre, valores) {
  return {
    columnIndex: indice, columnName: nombre, columnType: 'DROPDOWN',
    dataValidationRule: { condition: { type: 'ONE_OF_LIST',
      values: valores.map(v => ({ userEnteredValue: v })) } },
  };
}

function columnasTareas_() {
  return [
    columnaDesplegable_(0, 'Proyecto', listaConfig_('A5:A30')),
    { columnIndex: 1, columnName: 'Tarea', columnType: 'TEXT' },
    columnaDesplegable_(2, 'Responsable', listaConfig_('C5:C15')),
    columnaDesplegable_(3, 'Prioridad', listaConfig_('E5:E10')),
    columnaDesplegable_(4, 'Estado', listaConfig_('G5:G10')),
    { columnIndex: 5, columnName: 'Fecha límite', columnType: 'DATE' },
    { columnIndex: 6, columnName: 'Días restantes' },
    { columnIndex: 7, columnName: 'Alerta' },
    { columnIndex: 8, columnName: 'Comentarios', columnType: 'TEXT' },
  ];
}

function hex_(h) {
  return { rgbColor: { red: parseInt(h.substr(1, 2), 16) / 255,
    green: parseInt(h.substr(3, 2), 16) / 255, blue: parseInt(h.substr(5, 2), 16) / 255 } };
}

function crearTablas_(ss, tareas, hist) {
  const estilo = (enc) => ({
    headerColorStyle: hex_(enc),
    firstBandColorStyle: hex_(C.banda1),
    secondBandColorStyle: hex_(C.banda2),
  });
  const ultimaHist = Math.max(hist.getLastRow(), HIST_PRIMERA_FILA);
  sheetsApi_('post', ':batchUpdate', { requests: [
    { addTable: { table: {
      name: 'Tareas',
      range: { sheetId: tareas.getSheetId(), startRowIndex: 3, endRowIndex: ULTIMA_FILA,
        startColumnIndex: 0, endColumnIndex: 9 },
      rowsProperties: estilo(C.encabezado),
      columnProperties: columnasTareas_(),
    } } },
    { addTable: { table: {
      name: 'Historial',
      range: { sheetId: hist.getSheetId(), startRowIndex: 2, endRowIndex: ultimaHist,
        startColumnIndex: 0, endColumnIndex: HIST_ENCABEZADOS.length },
      rowsProperties: estilo('#188038'),
      columnProperties: [
        { columnIndex: 0, columnName: 'Fecha de cierre' },
        { columnIndex: 1, columnName: 'Proyecto', columnType: 'TEXT' },
        { columnIndex: 2, columnName: 'Tarea', columnType: 'TEXT' },
        { columnIndex: 3, columnName: 'Responsable', columnType: 'TEXT' },
        { columnIndex: 4, columnName: 'Prioridad', columnType: 'TEXT' },
        { columnIndex: 5, columnName: 'Fecha límite', columnType: 'DATE' },
        { columnIndex: 6, columnName: 'Cumplimiento', columnType: 'TEXT' },
        { columnIndex: 7, columnName: 'Comentarios', columnType: 'TEXT' },
      ],
    } } },
  ] });
}

function actualizarDesplegables() {
  const tabla = tablasExistentes_().find(t => t.hoja === HOJA_TAREAS);
  if (!tabla) { rediseñar(); return; }
  sheetsApi_('post', ':batchUpdate', { requests: [{ updateTable: {
    table: { tableId: tabla.id, columnProperties: columnasTareas_() },
    fields: 'columnProperties',
  } }] });
  SpreadsheetApp.getActive().toast('Desplegables actualizados con la hoja Config.', 'Tablero', 4);
}

// ---------------------------------------------------------------- Panel

function estilizarPanel_(p) {
  p.setHiddenGridlines(true);
  const todo = p.getRange('A1:J30');
  todo.breakApart();
  todo.setBorder(false, false, false, false, false, false);
  todo.setBackground(null).setFontFamily('Arial').setFontColor(C.tinta);

  p.getRange('B1').setValue('Panel de proyectos').setFontSize(22).setFontWeight('bold')
    .setVerticalAlignment('bottom');
  p.getRange('B2').setFormula('="Actualizado al "&TEXT(TODAY(),"dd/mm/yyyy")')
    .setFontSize(10).setFontWeight('normal').setFontColor(C.gris).setVerticalAlignment('top');
  p.setRowHeight(1, 44);
  p.setRowHeight(2, 24);

  // Tarjetas
  const tarjetas = [
    ['B', 'C', 'Tareas abiertas', '=COUNTIFS(Tareas!B5:B,"<>",Tareas!E5:E,"<>Hecha")', '0', C.tinta],
    ['D', 'E', 'Vencidas', '=COUNTIF(Tareas!H5:H,"Vencida")', '0', C.rojo],
    ['F', 'G', 'Vencen esta semana', '=COUNTIF(Tareas!H5:H,"Esta semana")', '0', C.ambar],
    ['H', 'I', 'Hechas', '=MAX(0,COUNTA(Historial!C:C)-1)', '0', C.verde],
    ['J', 'J', 'Avance general', '=IFERROR(H5/(B5+H5),0)', '0%', C.violeta],
  ];
  tarjetas.forEach(([a, b, titulo, f, fmt, color]) => {
    const t = p.getRange(`${a}4:${b}4`), v = p.getRange(`${a}5:${b}5`);
    if (a !== b) { t.merge(); v.merge(); }
    p.getRange(`${a}4`).setValue(titulo).setFontSize(9).setFontWeight('bold').setFontColor(C.gris);
    p.getRange(`${a}5`).setFormula(f).setNumberFormat(fmt).setFontSize(26).setFontWeight('bold').setFontColor(color);
    p.getRange(`${a}4:${b}5`).setBackground('#F8F9FA').setHorizontalAlignment('center').setVerticalAlignment('middle');
    p.getRange(`${a}5:${b}5`).setBorder(null, null, true, null, null, null, color, SpreadsheetApp.BorderStyle.SOLID_THICK);
  });
  p.setRowHeight(4, 26);
  p.setRowHeight(5, 48);

  // Tablas por proyecto y por persona
  tablaPanel_(p, 7, 'Por proyecto', 'Proyecto', 12, 'A', 'B', 'Config!A');
  tablaPanel_(p, 22, 'Por persona', 'Responsable', 4, 'C', 'D', 'Config!C');
  p.setColumnWidth(10, 220);
}

function tablaPanel_(p, fila, titulo, clave, n, colTareas, colHist, colConfig) {
  p.getRange(fila, 2).setValue(titulo).setFontSize(13).setFontWeight('bold').setFontColor(C.tinta);
  p.setRowHeight(fila, 30);
  const enc = fila + 1;
  const heads = [clave, 'Abiertas', 'En curso', 'Bloqueadas', 'Vencidas', 'Hechas', 'Total', 'Avance', 'Progreso'];
  p.getRange(enc, 2, 1, 9).setValues([heads]).setBackground(C.encabezado).setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  p.getRange(enc, 2).setHorizontalAlignment('left');
  p.setRowHeight(enc, 32);

  const K = `Tareas!$${colTareas}$5:$${colTareas}`;
  for (let j = 0; j < n; j++) {
    const r = enc + 1 + j;
    // Apps Script recibe las fórmulas en sintaxis inglesa (coma como separador)
    const si = (expr) => `=IF($B${r}="","",${expr})`;
    p.getRange(r, 2, 1, 9).setFormulas([[
      `=IF(${colConfig}${5 + j}="","",${colConfig}${5 + j})`,
      si(`COUNTIFS(${K},$B${r},Tareas!$B$5:$B,"<>",Tareas!$E$5:$E,"<>Hecha")`),
      si(`COUNTIFS(${K},$B${r},Tareas!$E$5:$E,"En curso")`),
      si(`COUNTIFS(${K},$B${r},Tareas!$E$5:$E,"Bloqueada")`),
      si(`COUNTIFS(${K},$B${r},Tareas!$H$5:$H,"Vencida")`),
      si(`COUNTIF(Historial!$${colHist}:$${colHist},$B${r})`),
      si(`C${r}+G${r}`),
      `=IF(OR($B${r}="",N(H${r})=0),"",G${r}/H${r})`,
      `=IF(I${r}="","",SPARKLINE(I${r},{"charttype","bar";"max",1;"color1","#3F51B5";"empty","zero"}))`,
    ]]);
    const fondo = j % 2 ? C.banda2 : C.banda1;
    p.getRange(r, 2, 1, 9).setBackground(fondo).setFontSize(10).setFontWeight('normal')
      .setFontColor(C.tinta).setHorizontalAlignment('center').setVerticalAlignment('middle');
    p.getRange(r, 2).setHorizontalAlignment('left').setFontWeight('bold');
    p.getRange(r, 9).setNumberFormat('0%');
    p.setRowHeight(r, 28);
  }
  const datos = p.getRange(enc + 1, 2, n, 9);
  const vencidas = p.getRange(enc + 1, 6, n, 1);
  const reglas = p.getConditionalFormatRules().filter(rg =>
    !rg.getRanges().some(x => x.getRow() >= enc && x.getRow() <= enc + n));
  reglas.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0)
    .setFontColor(C.rojo).setBold(true).setRanges([vencidas]).build());
  p.setConditionalFormatRules(reglas);
  datos.setBorder(null, null, true, null, null, true, C.linea, SpreadsheetApp.BorderStyle.SOLID);
}

// ---------------------------------------------------------------- Config

function estilizarConfig_(c) {
  c.getRange('A2').setValue('Para sumar un proyecto o una persona, escribilo al final de su lista y después usá el menú Tablero > Actualizar desplegables.');
  ['A4', 'C4', 'E4', 'G4'].forEach(a => c.getRange(a).setBackground(C.encabezado));
}
