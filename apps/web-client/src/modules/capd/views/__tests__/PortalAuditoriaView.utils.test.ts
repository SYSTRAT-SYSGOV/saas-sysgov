import { describe, it, expect } from 'vitest';
import {
  isValidSha256,
  verificarHashNaTrilha,
  calculateAuditoriaKpis,
  maskCpf,
  getMotivoAmostragemLabel,
  getAcaoLgpdLabel,
  gerarCsvTrilhaForense,
  gerarCsvAmostragem,
  type TrilhaForenseItem,
  type ItemAmostragemAuditoria,
} from '../PortalAuditoriaView.utils';

describe('PortalAuditoriaView.utils', () => {
  const mockTrilha: TrilhaForenseItem[] = [
    {
      id: 101,
      acao: 'capd.ciencia_servidor',
      modulo: 'CAPD / Avaliacao',
      entidade: 'capd_avaliacoes',
      entidade_id: 12,
      usuario: 'Carlos Silva',
      ip: '192.168.1.10',
      timestamp: '2026-09-20T10:00:00Z',
      hash_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      integridade: 'valida',
    },
    {
      id: 102,
      acao: 'capd.devolutiva_presencial',
      modulo: 'CAPD / Devolutiva',
      entidade: 'capd_avaliacoes',
      entidade_id: 14,
      usuario: 'Mariana Lima',
      ip: '192.168.1.15',
      timestamp: '2026-09-20T11:00:00Z',
      hash_sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      integridade: 'violada',
    },
  ];

  const mockAmostragem: ItemAmostragemAuditoria[] = [
    {
      id: 1,
      avaliacao_id: 50,
      servidor_nome: 'Ana Paula Souza',
      matricula: 'MAT-1001',
      cargo: 'Enfermeira',
      avaliador_nome: 'Roberto Dias',
      nota_final: 9.85,
      motivo_auditoria: 'nota_extrema_alta',
      possui_cit: true,
      qtd_incidentes_cit: 3,
      status_parecer: 'pendente',
    },
    {
      id: 2,
      avaliacao_id: 51,
      servidor_nome: 'Marcos Vinicius',
      matricula: 'MAT-1002',
      cargo: 'Motorista',
      avaliador_nome: 'Roberto Dias',
      nota_final: 3.2,
      motivo_auditoria: 'nota_extrema_baixa',
      possui_cit: false,
      qtd_incidentes_cit: 0,
      status_parecer: 'reavaliacao',
    },
  ];

  describe('isValidSha256', () => {
    it('deve validar hashes com 64 caracteres hexadecimais', () => {
      expect(isValidSha256('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08')).toBe(true);
      expect(isValidSha256('9F86D081884C7D659A2FEAA0C55AD015A3BF4F1B2B0B822CD15D6C15B0F00A08')).toBe(true);
      expect(isValidSha256('curto')).toBe(false);
      expect(isValidSha256('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a0G')).toBe(false); // G não é hex
      expect(isValidSha256(null)).toBe(false);
      expect(isValidSha256('')).toBe(false);
    });
  });

  describe('verificarHashNaTrilha', () => {
    it('deve confirmar integridade para hash autêntico presente na trilha', () => {
      const res = verificarHashNaTrilha('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', mockTrilha);
      expect(res.valido).toBe(true);
      expect(res.registro?.id).toBe(101);
      expect(res.mensagem).toContain('autêntica e íntegra');
    });

    it('deve acusar alerta de integridade violada se o log estiver corrompido', () => {
      const res = verificarHashNaTrilha('5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', mockTrilha);
      expect(res.valido).toBe(false);
      expect(res.mensagem).toContain('VIOLADA');
    });

    it('deve rejeitar hashes não localizados na trilha', () => {
      const res = verificarHashNaTrilha('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', mockTrilha);
      expect(res.valido).toBe(false);
      expect(res.mensagem).toContain('não localizado');
    });
  });

  describe('calculateAuditoriaKpis', () => {
    it('deve calcular corretamente indicadores de impedimentos, fila de amostragem e integridade', () => {
      const impedimentos = [
        { id: 1, status: 'ativo' },
        { id: 2, status: 'ativo' },
        { id: 3, status: 'resolvido' },
      ];

      const kpis = calculateAuditoriaKpis(impedimentos, mockTrilha, mockAmostragem);

      expect(kpis.impedimentosAtivos).toBe(2);
      expect(kpis.totalEventosForenses).toBe(2);
      // Apenas 1 pendente na amostragem
      expect(kpis.totalFilaAmostragem).toBe(1);
      // 1 válido de 2 logs = 50.0%
      expect(kpis.taxaIntegridadeSha256).toBe(50.0);
    });
  });

  describe('maskCpf', () => {
    it('deve mascarar os primeiros 3 e os últimos 2 dígitos do CPF', () => {
      expect(maskCpf('12345678901')).toBe('***.456.789-**');
      expect(maskCpf('123.456.789-01')).toBe('***.456.789-**');
      expect(maskCpf(null)).toBe('***.***.***-**');
    });
  });

  describe('getMotivoAmostragemLabel', () => {
    it('deve retornar descritivo normativo para cada motivo de auditoria', () => {
      expect(getMotivoAmostragemLabel('amostragem_10')).toContain('10% TCM');
      expect(getMotivoAmostragemLabel('nota_extrema_alta')).toContain('>= 9.50');
      expect(getMotivoAmostragemLabel('nota_extrema_baixa')).toContain('< 4.00');
    });
  });

  describe('geradores de CSV', () => {
    it('deve gerar CSV da trilha forense com cabeçalhos e linhas formatadas', () => {
      const csv = gerarCsvTrilhaForense(mockTrilha);
      expect(csv).toContain('Log_ID;Acao;Modulo;Entidade');
      expect(csv).toContain('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    });

    it('deve gerar CSV da amostragem com cabeçalhos e notas formatadas', () => {
      const csv = gerarCsvAmostragem(mockAmostragem);
      expect(csv).toContain('ID;Avaliacao_ID;Servidor;Matricula');
      expect(csv).toContain('9.85');
    });
  });
});
