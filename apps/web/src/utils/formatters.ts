export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyDetailed(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `R$ ${(value / 1_000_000_000).toFixed(2).replace('.', ',')} bi`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0).replace('.', ',')} mil`;
  }
  return formatCurrency(value);
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals).replace('.', ',')}%`;
}

export function isEmendaRecente(dataProcessamento?: string, dias: number = 7): boolean {
  if (!dataProcessamento) return false;
  const data = new Date(dataProcessamento).getTime();
  if (isNaN(data)) return false;
  const now = Date.now();
  const diffMs = now - data;
  const maxMs = dias * 24 * 60 * 60 * 1000;
  return diffMs >= 0 && diffMs <= maxMs;
}

export function formatDataBR(dataInput?: string | Date | null): string {
  if (!dataInput) return '-';
  if (dataInput instanceof Date) {
    if (isNaN(dataInput.getTime())) return '-';
    return dataInput.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
  if (typeof dataInput !== 'string') return '-';
  const trimmed = dataInput.trim();
  if (!trimmed) return '-';

  // Se já estiver no formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // Remove parte de hora se houver (ex.: 2026-03-02T00:00:00.000Z ou 2026-03-02 00:00:00)
  const clean = trimmed.split('T')[0].split(' ')[0];
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const ano = parts[0];
    const mes = parts[1].padStart(2, '0');
    const dia = parts[2].padStart(2, '0');
    return `${dia}/${mes}/${ano}`;
  }

  // Tenta parse via Date
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  return trimmed;
}

export function getDiasDecorridos(dataStr?: string): number {
  if (!dataStr) return 999;
  const data = new Date(dataStr).getTime();
  if (isNaN(data)) return 999;
  return Math.max(0, Math.floor((Date.now() - data) / (24 * 60 * 60 * 1000)));
}

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(';'),
    ...rows.map(row =>
      headers
        .map(header => {
          let cell = row[header] ?? '';
          if (typeof cell === 'string') {
            cell = `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(';')
    ),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


