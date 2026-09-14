const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

export function sanitizeNumericInput(value: string, maximumFractionDigits = 0) {
  const latin = value
    .replace(/[۰-۹]/g, digit => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String(arabicDigits.indexOf(digit)))
    .replace(/[٬,\s]/g, '')
    .replace(/٫/g, '.');
  const numeric = latin.replace(/[^\d.]/g, '');
  const [integerPart = '', ...fractionParts] = numeric.split('.');
  const integer = integerPart.replace(/^0+(?=\d)/, '') || (numeric.includes('.') ? '0' : '');
  if (maximumFractionDigits === 0 || !numeric.includes('.')) return integer;
  const fraction = fractionParts.join('').slice(0, maximumFractionDigits);
  return `${integer || '0'}.${fraction}`;
}

export function formatNumericInput(value: string) {
  if (!value) return '';
  const [integer, fraction] = value.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

export function numericValue(value: string) {
  if (!value || value.endsWith('.')) return Number(value.slice(0, -1) || 0);
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
