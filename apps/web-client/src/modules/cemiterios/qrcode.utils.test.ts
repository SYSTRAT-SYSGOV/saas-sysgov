import { describe, it, expect } from 'vitest';
import {
  gerarUrlConsultaJazigo,
  gerarQrCodeDataUrl,
  gerarQrCodeSvg,
} from './qrcode.utils';

describe('qrcode.utils', () => {
  it('deve gerar a URL canônica de consulta do jazigo corretamente', () => {
    const url = gerarUrlConsultaJazigo({
      id: 42,
      codigo: 'JAZ-101',
      origem: 'https://municipio.gov.br',
    });

    expect(url).toBe('https://municipio.gov.br/cemiterios?plot_id=42&codigo=JAZ-101');
  });

  it('deve gerar dataURL em base64 com sucesso', async () => {
    const dataUrl = await gerarQrCodeDataUrl('https://exemplo.gov.br', { largura: 120 });
    expect(dataUrl).toMatch(/^data:image\/(svg\+xml|png)/);
  });

  it('deve gerar string SVG contendo tag <svg> com dimensões e paths', async () => {
    const svg = await gerarQrCodeSvg('https://exemplo.gov.br', { largura: 200 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('viewBox');
  });
});
