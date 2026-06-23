// Formatea un número como pesos argentinos (e.g., $ 1.500,50)
export function formatCurrency(value: number, currencyCode: string = 'ARS'): string {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(value);
  } catch (e) {
    return `${currencyCode} $ ${value.toFixed(2)}`;
  }
}

// Formatea una fecha en formato local (DD/MM/AAAA HH:MM)
export function formatDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  try {
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch (e) {
    return date.toLocaleString();
  }
}

// Clase helper para concatenar nombres de clases en CSS Modules
export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Normaliza texto eliminando acentos y diacríticos, y convirtiendo a minúsculas
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
