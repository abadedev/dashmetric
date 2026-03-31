import { parseXlsx } from '../src/lib/importacao/parse-xlsx';
import * as XLSX from 'xlsx';
import fs from 'fs';

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ['Retornos · IQIv · IQRv · RTV · RST · ICT | Use os filtros para pesquisar'],
  ['Nº OS', 'Indicador ', 'Motivo/Razão     '],
  ['1229056', 'IQIv', 'Motivo 1'],
]);
XLSX.utils.book_append_sheet(wb, ws, 'Plan1');
const buffer = XLSX.write(wb, { type: 'buffer' });
try {
  console.log(parseXlsx(buffer));
} catch (e) {
  console.error(e);
}