import * as XLSX from 'xlsx';

/**
 * Exporta un array de objetos JSON a un archivo Excel (.xlsx) y desencadena su descarga.
 * @param data Array de objetos conteniendo los registros a exportar
 * @param fileName Nombre del archivo resultante (sin extensión)
 * @param sheetName Nombre de la pestaña de la hoja de cálculo
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Datos') {
  if (!data || data.length === 0) {
    console.warn('Exportar Excel: No hay datos para exportar.');
    return;
  }
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Escribir archivo e iniciar descarga
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
