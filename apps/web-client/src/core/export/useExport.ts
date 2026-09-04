import { useCallback } from 'react';

export type ExportFormat = 'csv' | 'json';

export interface ExportOptions {
  filename: string;
  format: ExportFormat;
  BOM?: boolean;
}

interface UseExportReturn {
  exportData: <T>(data: T[], options: ExportOptions) => void;
  exportFromEndpoint: (url: string, options: ExportOptions) => void;
}

const BOM = '\uFEFF';

function toCSV<T>(data: T[], BOM = false): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0] as object);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = (row as any)[h];
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  return (BOM ? BOM : '') + [headers.join(','), ...rows].join('\n');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const useExport = (): UseExportReturn => {
  const exportData = useCallback(<T>(data: T[], { filename, format, BOM: useBOM }: ExportOptions) => {
    if (!data || data.length === 0) return;
    if (format === 'csv') {
      const csv = toCSV(data, useBOM);
      downloadBlob(csv, `${filename}.csv`, 'text/csv;charset=utf-8');
    } else {
      const json = JSON.stringify(data, null, 2);
      downloadBlob(json, `${filename}.json`, 'application/json');
    }
  }, []);

  const exportFromEndpoint = useCallback((url: string, { filename, format, BOM: useBOM }: ExportOptions) => {
    fetch(url)
      .then((res) => res.json())
      .then((body) => {
        const data = body?.data ?? body;
        if (Array.isArray(data)) {
          if (format === 'csv') {
            const csv = toCSV(data, useBOM);
            downloadBlob(csv, `${filename}.csv`, 'text/csv;charset=utf-8');
          } else {
            const json = JSON.stringify(data, null, 2);
            downloadBlob(json, `${filename}.json`, 'application/json');
          }
        }
      })
      .catch(() => {});
  }, []);

  return { exportData, exportFromEndpoint };
};

export default useExport;
