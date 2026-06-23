import { jsPDF } from 'jspdf';
import { formatCurrency } from './utils';

export function generateTicketPDF(sale: any, tenantConfig?: any) {
  // Configuración de dimensiones dinámicas para el ticketera térmica de 80mm
  const width = 80;
  const itemsCount = sale.items?.length || 0;
  const height = 110 + itemsCount * 8; // Altura dinámica según cantidad de productos
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [width, height],
  });

  let y = 8;

  // Nombre de Fantasía del Negocio
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const businessName = tenantConfig?.name || 'ControlComercio';
  doc.text(businessName, width / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  // CUIT del Negocio
  if (tenantConfig?.cuit) {
    doc.text(`CUIT: ${tenantConfig.cuit}`, width / 2, y, { align: 'center' });
    y += 4;
  }

  doc.text('DOCUMENTO NO VÁLIDO COMO FACTURA', width / 2, y, { align: 'center' });
  y += 4;

  // Línea divisoria
  doc.setLineWidth(0.1);
  doc.line(4, y, width - 4, y);
  y += 4;

  // Información del Ticket
  doc.setFont('helvetica', 'bold');
  doc.text(`TICKET Nro: #${sale.id.substring(0, 8).toUpperCase()}`, 4, y);
  y += 3.5;

  doc.setFont('helvetica', 'normal');
  const dateStr = new Date(sale.createdAt).toLocaleString('es-AR');
  doc.text(`Fecha: ${dateStr}`, 4, y);
  y += 3.5;

  const paymentLabel = (method: string) => {
    switch (method) {
      case 'CASH': return 'Efectivo';
      case 'DEBIT': return 'Débito';
      case 'CREDIT': return 'Crédito';
      case 'TRANSFER': return 'Transf. / QR';
      case 'DEBT': return 'Fiado / Cta Cte';
      default: return method;
    }
  };
  doc.text(`Medio de Pago: ${paymentLabel(sale.paymentMethod)}`, 4, y);
  y += 3.5;

  if (sale.client) {
    doc.text(`Cliente: ${sale.client.name}`, 4, y);
    y += 3.5;
  }

  // Línea divisoria
  doc.line(4, y, width - 4, y);
  y += 4;

  // Cabecera de Tabla de Productos
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle', 4, y);
  doc.text('Cant', 44, y, { align: 'right' });
  doc.text('P.Unit', 58, y, { align: 'right' });
  doc.text('Subtot', 76, y, { align: 'right' });
  y += 3;
  
  doc.line(4, y, width - 4, y);
  y += 3.5;

  // Listado de ítems
  doc.setFont('helvetica', 'normal');
  sale.items?.forEach((item: any) => {
    let name = item.product?.name || 'Producto';
    if (name.length > 20) {
      name = name.substring(0, 18) + '..';
    }

    doc.text(name, 4, y);
    doc.text(item.quantity.toString(), 44, y, { align: 'right' });
    
    const uPrice = formatCurrency(item.unitPrice).replace('$', '').trim();
    doc.text(uPrice, 58, y, { align: 'right' });

    const sTotal = formatCurrency(item.subtotal).replace('$', '').trim();
    doc.text(sTotal, 76, y, { align: 'right' });
    
    y += 4.5;
  });

  // Línea divisoria
  doc.line(4, y, width - 4, y);
  y += 4.5;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL A COBRAR:', 4, y);
  doc.text(formatCurrency(sale.totalAmount), 76, y, { align: 'right' });
  y += 7;

  // Pie de página
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text('¡Muchas gracias por su compra!', width / 2, y, { align: 'center' });

  // Guardar/Descargar
  doc.save(`ticket-${sale.id.substring(0, 8).toUpperCase()}.pdf`);
}
