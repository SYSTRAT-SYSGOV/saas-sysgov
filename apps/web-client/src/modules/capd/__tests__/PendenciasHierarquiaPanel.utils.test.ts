import { describe, it, expect } from 'vitest';
import type { ApiPendenciaHierarquia } from '@sysgov/sdk';
import {
  calcularKpisPendencias,
  filtrarPendencias,
  gerarCsvPendencias,
  obterConfigTipoPendencia,
  formatarDataHoraBr,
} from '../PendenciasHierarquiaPanel.utils';

const mockPendencias: ApiPendenciaHierarquia[] = [
  {
    id: 1,
    servidor_id: 101,
    ciclo_id: 1,
    tipo_pendencia: 'sem_superior',
    motivo: 'Unidade Secretaria de Saúde sem chefe imediato associado',
    status: 'aberta',
    created_at: '2026-09-01T10:00:00Z',
    servidor: { id: 101, nome_completo: 'Carlos Eduardo Silva', matricula: 'MAT-1001' },
    ciclo: { id: 1, nome: 'Ciclo 2026', ano_referencia: 2026 },
  },
  {
    id: 2,
    servidor_id: 102,
    ciclo_id: 1,
    tipo_pendencia: 'afastamento_sem_substituto',
    motivo: 'Chefe imediato em licença médica sem substituto legal',
    status: 'aberta',
    created_at: '2026-09-02T14:30:00Z',
    servidor: { id: 102, nome_completo: 'Mariana Costa Ferreira', matricula: 'MAT-1002' },
    ciclo: { id: 1, nome: 'Ciclo 2026', ano_referencia: 2026 },
  },
  {
    id: 3,
    servidor_id: 103,
    ciclo_id: 1,
    tipo_pendencia: 'topo_sem_config',
    motivo: 'Gabinete do Prefeito sem avaliador homologado',
    status: 'resolvida',
    avaliador_designado_id: 50,
    resolvido_por: 1,
    resolvido_em: '2026-09-03T09:15:00Z',
    created_at: '2026-09-01T08:00:00Z',
    servidor: { id: 103, nome_completo: 'Roberto Santos', matricula: 'MAT-1003' },
    ciclo: { id: 1, nome: 'Ciclo 2026', ano_referencia: 2026 },
  },
  {
    id: 4,
    servidor_id: 104,
    ciclo_id: 2,
    tipo_pendencia: 'sem_superior',
    motivo: 'Lotação em setor em extinção',
    status: 'resolvida',
    avaliador_designado_id: 52,
    resolvido_por: 1,
    resolvido_em: '2026-09-05T11:20:00Z',
    created_at: '2026-09-04T16:00:00Z',
    servidor: { id: 104, nome_completo: 'Ana Paula Souza', matricula: 'MAT-1004' },
    ciclo: { id: 2, nome: 'Ciclo 2025', ano_referencia: 2025 },
  },
];

describe('PendenciasHierarquiaPanel.utils', () => {
  describe('calcularKpisPendencias', () => {
    it('deve calcular corretamente os totais e percentuais de uma lista com pendências mistas', () => {
      const kpis = calcularKpisPendencias(mockPendencias);

      expect(kpis.totalGeral).toBe(4);
      expect(kpis.totalAbertas).toBe(2);
      expect(kpis.totalResolvidas).toBe(2);
      expect(kpis.taxaSaneamento).toBe('50,0%');
      expect(kpis.taxaSaneamentoNumero).toBe(50.0);
      expect(kpis.porTipo.sem_superior).toBe(2);
      expect(kpis.porTipo.afastamento_sem_substituto).toBe(1);
      expect(kpis.porTipo.topo_sem_config).toBe(1);
      expect(kpis.porTipo.outros).toBe(0);
    });

    it('deve retornar 100% de saneamento para lista vazia', () => {
      const kpis = calcularKpisPendencias([]);

      expect(kpis.totalGeral).toBe(0);
      expect(kpis.totalAbertas).toBe(0);
      expect(kpis.totalResolvidas).toBe(0);
      expect(kpis.taxaSaneamento).toBe('100,0%');
      expect(kpis.taxaSaneamentoNumero).toBe(100.0);
    });
  });

  describe('filtrarPendencias', () => {
    it('deve filtrar por status aberta', () => {
      const res = filtrarPendencias(mockPendencias, { status: 'aberta' });
      expect(res.length).toBe(2);
      expect(res.every((p) => p.status === 'aberta')).toBe(true);
    });

    it('deve filtrar por status resolvida', () => {
      const res = filtrarPendencias(mockPendencias, { status: 'resolvida' });
      expect(res.length).toBe(2);
      expect(res.every((p) => p.status === 'resolvida')).toBe(true);
    });

    it('deve filtrar por tipo de pendência', () => {
      const res = filtrarPendencias(mockPendencias, { tipo: 'afastamento_sem_substituto' });
      expect(res.length).toBe(1);
      expect(res[0].servidor?.nome_completo).toBe('Mariana Costa Ferreira');
    });

    it('deve filtrar por cicloId', () => {
      const res = filtrarPendencias(mockPendencias, { cicloId: 2 });
      expect(res.length).toBe(1);
      expect(res[0].servidor?.nome_completo).toBe('Ana Paula Souza');
    });

    it('deve realizar busca textual por nome do servidor', () => {
      const res = filtrarPendencias(mockPendencias, { busca: 'carlos' });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe(1);
    });

    it('deve realizar busca textual por matrícula', () => {
      const res = filtrarPendencias(mockPendencias, { busca: 'MAT-1003' });
      expect(res.length).toBe(1);
      expect(res[0].servidor?.nome_completo).toBe('Roberto Santos');
    });

    it('deve realizar busca textual por trecho do motivo/diagnóstico', () => {
      const res = filtrarPendencias(mockPendencias, { busca: 'extinção' });
      expect(res.length).toBe(1);
      expect(res[0].servidor?.nome_completo).toBe('Ana Paula Souza');
    });

    it('deve combinar busca e filtros múltiplos', () => {
      const res = filtrarPendencias(mockPendencias, {
        status: 'aberta',
        tipo: 'sem_superior',
        busca: 'carlos',
      });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe(1);
    });
  });

  describe('obterConfigTipoPendencia', () => {
    it('deve retornar a configuração correta para sem_superior', () => {
      const config = obterConfigTipoPendencia('sem_superior');
      expect(config.label).toBe('Sem superior resolvido');
      expect(config.badgeVariant).toBe('warning');
    });

    it('deve retornar a configuração correta para afastamento_sem_substituto', () => {
      const config = obterConfigTipoPendencia('afastamento_sem_substituto');
      expect(config.label).toBe('Afastamento sem substituto');
      expect(config.badgeVariant).toBe('info');
    });

    it('deve retornar fallback seguro para tipo desconhecido', () => {
      const config = obterConfigTipoPendencia('tipo_customizado_xyz');
      expect(config.label).toBe('tipo customizado xyz');
      expect(config.badgeVariant).toBe('outline');
    });
  });

  describe('formatarDataHoraBr', () => {
    it('deve retornar travessão para datas nulas ou indefinidas', () => {
      expect(formatarDataHoraBr(null)).toBe('—');
      expect(formatarDataHoraBr(undefined)).toBe('—');
    });

    it('deve formatar data válida', () => {
      const dataIso = '2026-09-21T15:30:00Z';
      const formatada = formatarDataHoraBr(dataIso);
      expect(formatada).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    });
  });

  describe('gerarCsvPendencias', () => {
    it('deve gerar arquivo CSV com UTF-8 BOM e cabeçalhos em português', () => {
      const csv = gerarCsvPendencias(mockPendencias);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('"ID";"Servidor";"Matricula";"Ciclo";"Tipo Pendencia";"Diagnostico / Motivo";"Status";"ID Avaliador Designado";"Resolvido Em";"Criado Em"');
      expect(csv).toContain('"Carlos Eduardo Silva"');
      expect(csv).toContain('"MAT-1001"');
      expect(csv).toContain('"Sem superior resolvido"');
      expect(csv).toContain('"Aberta"');
    });
  });
});
