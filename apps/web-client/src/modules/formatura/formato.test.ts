import { describe, expect, it } from 'vitest';
import type { Formando } from './api';
import {
  anosLetivos, centavosParaTexto, dadosDoAno, previaValorDevido, simularParcelas, periodoInvalido, recebidoDosParticipantes, chavesPixDeTexto, hojeIso, linkWhatsApp, periodoParaApi, proximaParcela, situacaoDoFormando,
} from './formato';

const formando = (parcial: Partial<Formando>): Formando => ({
  aluno_id: 1, numero: 1, nome: 'ANA', cgm: null, turma_id: 1, turma: '3º A', telefone: null, situacao_aluno: 'ativo', participa: true, convidados: 2,
  convidados_incluidos: 2, convidados_extras: 0, observacoes: null, valor_devido_centavos: 45000,
  total_pago_centavos: 0, saldo_devedor_centavos: 45000, situacao: 'pendente', ...parcial,
});

describe('situacaoDoFormando', () => {
  it('usa a situação do servidor e trata quem não participa', () => {
    expect(situacaoDoFormando(formando({ situacao: 'quitado' }))).toEqual({ rotulo: 'Quitado', variante: 'success' });
    expect(situacaoDoFormando(formando({ situacao: 'parcial' }))).toEqual({ rotulo: 'Parcial', variante: 'warning' });
    expect(situacaoDoFormando(formando({ situacao: 'pendente' }))).toEqual({ rotulo: 'Pendente', variante: 'danger' });
    expect(situacaoDoFormando(formando({ participa: false }))).toEqual({ rotulo: 'Não participa', variante: 'neutral' });
  });
});

describe('chavesPixDeTexto', () => {
  it('uma chave por linha, sem vazias nem repetidas, no máximo 5', () => {
    expect(chavesPixDeTexto(' a@pix \n\nb@pix\na@pix\nc\nd\ne\nf')).toEqual(['a@pix', 'b@pix', 'c', 'd', 'e']);
  });
});

describe('anosLetivos', () => {
  it('anos das turmas mais o atual, sem repetição, do mais novo ao mais antigo', () => {
    expect(anosLetivos([2025, 2026, 2025], 2026)).toEqual([2026, 2025]);
    expect(anosLetivos([], 2026)).toEqual([2026]);
    expect(anosLetivos([2027], 2026)).toEqual([2027, 2026]);
  });
});

describe('proximaParcela', () => {
  it('maior parcela + 1, limitada ao máximo', () => {
    expect(proximaParcela([], 12)).toBe(1);
    expect(proximaParcela([{ numero_parcela: 1 }, { numero_parcela: 3 }], 12)).toBe(4);
    expect(proximaParcela([{ numero_parcela: 12 }], 12)).toBe(12);
  });
});

describe('datas e período', () => {
  it('hoje no fuso local e período sem campos vazios', () => {
    expect(hojeIso(new Date(2026, 8, 29, 23, 30))).toBe('2026-09-29');
    expect(periodoParaApi('', '')).toEqual({});
    expect(periodoParaApi('2026-07-01', '')).toEqual({ data_inicio: '2026-07-01' });
  });
});

describe('linkWhatsApp', () => {
  it('monta o link só com telefone válido', () => {
    expect(linkWhatsApp('(41) 99999-0000')).toBe('https://wa.me/5541999990000');
    expect(linkWhatsApp('5541999990000')).toBe('https://wa.me/5541999990000');
    expect(linkWhatsApp('123')).toBeNull();
    expect(linkWhatsApp(null)).toBeNull();
  });
});

describe('centavosParaTexto', () => {
  it('centavos → texto editável em pt-BR', () => {
    expect(centavosParaTexto(15050)).toBe('150,50');
    expect(centavosParaTexto(0)).toBe('0,00');
  });
});

describe('recebidoDosParticipantes', () => {
  it('soma só pagamentos de quem participa (mesma base do relatório)', () => {
    expect(recebidoDosParticipantes([
      { valor_centavos: 15050, participa: true },
      { valor_centavos: 50000, participa: false },
    ])).toBe(15050);
  });
});

describe('periodoInvalido', () => {
  it('acusa data final antes da inicial e aceita período aberto', () => {
    expect(periodoInvalido('2026-07-31', '2026-07-01')).toBe(true);
    expect(periodoInvalido('2026-07-01', '2026-07-31')).toBe(false);
    expect(periodoInvalido('', '2026-07-01')).toBe(false);
  });
});

describe('dadosDoAno', () => {
  it('descarta dados carregados para outro ano letivo', () => {
    const dados = { ano: 2026, valor: 1 };
    expect(dadosDoAno(dados, 2026)).toBe(dados);
    expect(dadosDoAno(dados, 2027)).toBeNull();
    expect(dadosDoAno(null, 2026)).toBeNull();
  });
});

describe('previaValorDevido', () => {
  const base = { valor_base_centavos: 50000, valor_pessoa_extra_centavos: 8000 };
  it('segue a mesma fórmula do servidor (D16)', () => {
    expect(previaValorDevido({ ...base, tipo_calculo: 'fixo_mais_convidados' }, true, 3)).toBe(74000);
    expect(previaValorDevido({ ...base, tipo_calculo: 'por_pessoa', valor_base_centavos: 15000 }, true, 3)).toBe(60000);
    expect(previaValorDevido({ ...base, tipo_calculo: 'por_pessoa' }, false, 3)).toBe(0);
  });
});

describe('simularParcelas', () => {
  it('divide o saldo em centavos inteiros e põe o resto na última parcela', () => {
    expect(simularParcelas(100000, 3)).toEqual([{ quantidade: 2, valor: 33333 }, { quantidade: 1, valor: 33334 }]);
    expect(simularParcelas(90000, 3)).toEqual([{ quantidade: 3, valor: 30000 }]);
    expect(simularParcelas(0, 3)).toEqual([]);
  });
});
