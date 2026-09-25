import { describe, it, expect } from 'vitest';
import {
  calcularStatusConcessao,
  calcularStatusExumacao,
  obterAlertasReguloriosJazigo,
  diferencaDias,
} from './regulamentacao.utils';
import type { Concessao, Inumacao, Jazigo, Vistoria, ProcessoAbandono } from './api';

describe('regulamentacao.utils', () => {
  const dataHoje = new Date('2026-09-23T12:00:00Z');

  describe('diferencaDias', () => {
    it('calcula corretamente a diferença em dias positivos e negativos', () => {
      expect(diferencaDias('2026-09-25T12:00:00Z', dataHoje)).toBe(2);
      expect(diferencaDias('2026-09-20T12:00:00Z', dataHoje)).toBe(-3);
      expect(diferencaDias('data-invalida', dataHoje)).toBe(0);
    });
  });

  describe('calcularStatusConcessao', () => {
    it('identifica ausência de concessão', () => {
      const res = calcularStatusConcessao(null, dataHoje);
      expect(res.status).toBe('sem_concessao');
    });

    it('identifica concessão perpétua sem termo final', () => {
      const concessao: Pick<Concessao, 'modalidade' | 'termino' | 'situacao'> = {
        modalidade: 'perpetua',
        termino: null,
        situacao: 'ativa',
      };
      const res = calcularStatusConcessao(concessao, dataHoje);
      expect(res.status).toBe('perpetua');
    });

    it('identifica concessão vencida', () => {
      const concessao: Pick<Concessao, 'modalidade' | 'termino' | 'situacao'> = {
        modalidade: 'temporaria',
        termino: '2026-08-01',
        situacao: 'ativa',
      };
      const res = calcularStatusConcessao(concessao, dataHoje);
      expect(res.status).toBe('vencida');
      expect(res.dias).toBeGreaterThan(0);
    });

    it('identifica concessão a vencer em menos de 60 dias', () => {
      const concessao: Pick<Concessao, 'modalidade' | 'termino' | 'situacao'> = {
        modalidade: 'temporaria',
        termino: '2026-10-15',
        situacao: 'ativa',
      };
      const res = calcularStatusConcessao(concessao, dataHoje);
      expect(res.status).toBe('a_vencer');
      expect(res.dias).toBeLessThanOrEqual(60);
      expect(res.dias).toBeGreaterThan(0);
    });

    it('identifica concessão vigente com mais de 60 dias', () => {
      const concessao: Pick<Concessao, 'modalidade' | 'termino' | 'situacao'> = {
        modalidade: 'temporaria',
        termino: '2027-09-23',
        situacao: 'ativa',
      };
      const res = calcularStatusConcessao(concessao, dataHoje);
      expect(res.status).toBe('vigente');
      expect(res.dias).toBeGreaterThan(60);
    });
  });

  describe('calcularStatusExumacao', () => {
    it('identifica inumação elegível para exumação (>= 3 anos)', () => {
      const inumacao: Pick<Inumacao, 'sepultado_em'> = {
        sepultado_em: '2022-05-10',
      };
      const res = calcularStatusExumacao(inumacao, 3, dataHoje);
      expect(res.elegivel).toBe(true);
      expect(res.anosDecorridos).toBeGreaterThanOrEqual(3);
      expect(res.descricao).toContain('Interstício sanitário atingido');
    });

    it('identifica inumação em cumprimento de interstício (< 3 anos)', () => {
      const inumacao: Pick<Inumacao, 'sepultado_em'> = {
        sepultado_em: '2025-01-15',
      };
      const res = calcularStatusExumacao(inumacao, 3, dataHoje);
      expect(res.elegivel).toBe(false);
      expect(res.anosDecorridos).toBeLessThan(3);
      expect(res.descricao).toContain('Em cumprimento de interstício');
    });
  });

  describe('obterAlertasReguloriosJazigo', () => {
    const jazigoBase: Pick<Jazigo, 'estado' | 'tipo' | 'ocupacao'> = {
      estado: 'ocupado',
      tipo: 'jazigo',
      ocupacao: 2,
    };

    it('consolida múltiplos alertas (concessão a vencer, exumação elegível e manutenção)', () => {
      const concessao: Concessao = {
        id: 1,
        numero: 'CONC-2021/045',
        plot_id: 1,
        holder_id: 10,
        modalidade: 'temporaria',
        inicio: '2021-10-01',
        termino: '2026-10-10', // ~17 dias para hoje
        situacao: 'ativa',
        pendencia_regularizacao: false,
      };

      const inumacoes: Inumacao[] = [
        {
          id: 101,
          deceased_id: 201,
          plot_id: 1,
          sepultado_em: '2021-02-15', // mais de 5 anos -> elegível
          situacao: 'sepultado',
          origem: 'guia',
          revisao_pendente: false,
          livro_referencia: 'Livro 1 Fls 40',
          carencia_desde: '2021-02-15',
          service_order_id: null,
          falecido: {
            id: 201,
            nome: 'Severino de Souza',
            nascimento: '1940-01-01',
            falecimento: '2021-02-14',
            idade_obito: 81,
            certidao_numero: '12345',
          },
        },
      ];

      const vistorias: Vistoria[] = [
        {
          id: 1,
          plot_id: 1,
          data: '2026-09-01',
          estado_conservacao: 'critico',
          risco: 'alto',
          observacoes: 'Rachadura na laje superior',
          fotos: [],
        },
      ];

      const alertas = obterAlertasReguloriosJazigo({
        jazigo: jazigoBase,
        concessao,
        inumacoes,
        vistorias,
        dataRef: dataHoje,
      });

      expect(alertas.some((a) => a.tipo === 'concessao_a_vencer')).toBe(true);
      expect(alertas.some((a) => a.tipo === 'exumacao_elegivel')).toBe(true);
      expect(alertas.some((a) => a.tipo === 'risco_estrutural')).toBe(true);
    });

    it('inclui alerta de titular falecido com sucessao pendente', () => {
      const concessao: Concessao = {
        id: 2,
        numero: 'CONC-1985/012',
        plot_id: 1,
        holder_id: 10,
        modalidade: 'perpetua',
        inicio: '1985-05-10',
        termino: null,
        situacao: 'ativa',
        pendencia_regularizacao: false,
        concessionario: {
          id: 10,
          nome: 'Antonio da Silva (Espólio)',
          titular_falecido: true,
          data_falecimento_titular: '2024-03-15',
          processo_inventario: '0012345-67.2024.8.26.0000',
        },
      };

      const alertas = obterAlertasReguloriosJazigo({
        jazigo: jazigoBase,
        concessao,
        dataRef: dataHoje,
      });

      expect(alertas.some((a) => a.tipo === 'titular_falecido')).toBe(true);
      const alerta = alertas.find((a) => a.tipo === 'titular_falecido');
      expect(alerta?.severidade).toBe('critico');
      expect(alerta?.descricao).toContain('Titular falecido');
      expect(alerta?.descricao).toContain('0012345-67.2024.8.26.0000');
    });

    it('inclui alerta de processo de abandono se ativo', () => {
      const processoAbandono: ProcessoAbandono = {
        id: 1,
        plot_id: 1,
        concession_id: 1,
        situacao: 'edital_publicado',
        instaurado_em: '2026-05-10',
        edital_publicado_em: '2026-06-01',
        prazo_dias_aplicado: 90,
        prazo_fim: '2026-09-01',
        decisao: null,
        remocao_pendente: false,
      };

      const alertas = obterAlertasReguloriosJazigo({
        jazigo: jazigoBase,
        processoAbandono,
        dataRef: dataHoje,
      });

      expect(alertas.some((a) => a.tipo === 'processo_abandono')).toBe(true);
    });
  });
});
