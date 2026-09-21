import { describe, it, expect } from 'vitest';
import {
  maskApiKey,
  calculateKpis,
  generateIframeSnippet,
  isValidHttpUrl,
  getDriverLabel,
  formatIsoDate,
  type RhConector,
  type RhSyncLogItem,
} from '../IntegracoesEmbedPanel.utils';

describe('IntegracoesEmbedPanel.utils', () => {
  describe('maskApiKey', () => {
    it('deve mascarar chave longa preservando os 6 primeiros e os 4 últimos caracteres', () => {
      const key = 'rh_live_98a7b6c5d4e3f2a10987654321';
      const masked = maskApiKey(key);
      expect(masked).toBe('rh_liv••••••••••••4321');
      expect(masked.startsWith('rh_liv')).toBe(true);
      expect(masked.endsWith('4321')).toBe(true);
    });

    it('deve tratar chaves nulas, vazias ou curtas com segurança', () => {
      expect(maskApiKey(null)).toBe('••••••••••••••••');
      expect(maskApiKey('')).toBe('••••••••••••••••');
      expect(maskApiKey('12345')).toBe('••••••••••••');
    });
  });

  describe('calculateKpis', () => {
    it('deve calcular corretamente métricas de conectores e taxa de sucesso dos logs', () => {
      const conectores: RhConector[] = [
        {
          id: 1,
          nome: 'Betha Folha',
          driver: 'betha',
          api_key: 'key1',
          is_active: true,
        },
        {
          id: 2,
          nome: 'IPM Gestão',
          driver: 'ipm',
          api_key: 'key2',
          is_active: false,
        },
        {
          id: 3,
          nome: 'REST Auxiliar',
          driver: 'generic_rest',
          api_key: 'key3',
          is_active: true,
        },
      ];

      const logs: RhSyncLogItem[] = [
        {
          id: 101,
          tipo: 'servidores',
          direcao: 'inbound',
          status: 'sucesso',
          registros_processados: 150,
          registros_sucesso: 150,
          registros_falha: 0,
          created_at: '2026-09-20T10:00:00Z',
        },
        {
          id: 102,
          tipo: 'frequencia',
          direcao: 'inbound',
          status: 'sucesso',
          registros_processados: 80,
          registros_sucesso: 80,
          registros_falha: 0,
          created_at: '2026-09-20T11:00:00Z',
        },
        {
          id: 103,
          tipo: 'afastamentos',
          direcao: 'inbound',
          status: 'erro',
          registros_processados: 12,
          registros_sucesso: 0,
          registros_falha: 12,
          created_at: '2026-09-20T12:00:00Z',
        },
        {
          id: 104,
          tipo: 'homologacao',
          direcao: 'outbound',
          status: 'sucesso',
          registros_processados: 45,
          registros_sucesso: 45,
          registros_falha: 0,
          created_at: '2026-09-20T13:00:00Z',
        },
      ];

      const kpis = calculateKpis(conectores, logs, 5);

      expect(kpis.totalConectores).toBe(3);
      expect(kpis.conectoresAtivos).toBe(2);
      expect(kpis.totalSincronizacoes).toBe(4);
      // 3 sucessos de 4 total = 75.0%
      expect(kpis.taxaSucesso).toBe(75.0);
      expect(kpis.totalEmbedAtivos).toBe(5);
    });

    it('deve retornar taxa de 100% caso não existam logs ainda', () => {
      const kpis = calculateKpis([], [], 0);
      expect(kpis.totalConectores).toBe(0);
      expect(kpis.conectoresAtivos).toBe(0);
      expect(kpis.totalSincronizacoes).toBe(0);
      expect(kpis.taxaSucesso).toBe(100);
      expect(kpis.totalEmbedAtivos).toBe(0);
    });
  });

  describe('generateIframeSnippet', () => {
    it('deve gerar código HTML de iframe com atributos seguros e sandbox', () => {
      const url = 'https://sysgov.municipio.gov.br/capd/embed?token=emb_test_123';
      const snippet = generateIframeSnippet(url, 'Portal do Servidor - CAPD');

      expect(snippet).toContain('<iframe');
      expect(snippet).toContain(`src="${url}"`);
      expect(snippet).toContain('title="Portal do Servidor - CAPD"');
      expect(snippet).toContain('sandbox="allow-scripts allow-forms allow-same-origin allow-popups"');
      expect(snippet).toContain('loading="lazy"');
    });

    it('deve retornar string vazia para URL vazia', () => {
      expect(generateIframeSnippet('')).toBe('');
    });
  });

  describe('isValidHttpUrl', () => {
    it('deve validar URLs com protocolo http e https', () => {
      expect(isValidHttpUrl('https://api.betha.cloud/v1')).toBe(true);
      expect(isValidHttpUrl('http://192.168.1.100:8080/api')).toBe(true);
      expect(isValidHttpUrl('ftp://servidor.com')).toBe(false);
      expect(isValidHttpUrl('invalid-url')).toBe(false);
      expect(isValidHttpUrl(null)).toBe(false);
      expect(isValidHttpUrl('')).toBe(false);
    });
  });

  describe('getDriverLabel', () => {
    it('deve retornar rótulo amigável para cada driver suportado', () => {
      expect(getDriverLabel('betha')).toBe('Betha Sistemas (Fly)');
      expect(getDriverLabel('ipm')).toBe('IPM Atende.net');
      expect(getDriverLabel('senior')).toBe('Senior Ronda / Gestão de Pessoas');
      expect(getDriverLabel('totvs')).toBe('TOTVS Protheus RH');
      expect(getDriverLabel('generic_rest')).toBe('REST API Genérico');
      expect(getDriverLabel('custom_driver')).toBe('CUSTOM_DRIVER');
      expect(getDriverLabel(undefined)).toBe('Desconhecido');
    });
  });

  describe('formatIsoDate', () => {
    it('deve formatar data ISO válida no padrão brasileiro', () => {
      const formatted = formatIsoDate('2026-09-20T14:30:00Z');
      expect(formatted).not.toBe('—');
      expect(formatted.length).toBeGreaterThan(10);
    });

    it('deve retornar traço para datas nulas ou inválidas', () => {
      expect(formatIsoDate(null)).toBe('—');
      expect(formatIsoDate(undefined)).toBe('—');
      expect(formatIsoDate('data-invalida')).toBe('—');
    });
  });
});
