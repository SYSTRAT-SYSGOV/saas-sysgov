import { describe, it, expect } from 'vitest';
import { getIcon, ICON_MAP } from './iconMap';
import { Layers, LayoutDashboard, FileText } from 'lucide-react';

describe('iconMap', () => {
  it('deve retornar o componente Lucide correto para nomes conhecidos', () => {
    expect(getIcon('LayoutDashboard')).toBe(LayoutDashboard);
    expect(getIcon('FileText')).toBe(FileText);
  });

  it('deve retornar o ícone fallback (Layers) para nomes desconhecidos ou vazios', () => {
    expect(getIcon('NonExistentIconName')).toBe(Layers);
    expect(getIcon('')).toBe(Layers);
    expect(getIcon(null)).toBe(Layers);
    expect(getIcon(undefined)).toBe(Layers);
  });
});
