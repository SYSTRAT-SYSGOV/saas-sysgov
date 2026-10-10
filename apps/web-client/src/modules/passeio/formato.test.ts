import { describe, expect, it } from 'vitest';
import type { MapaAssentos, Veiculo } from './api';
import { csvInscricoes, dadosDoForm, demonstrativo, distribuir, emPares, filtrarInscricoes, FILTRO_INICIAL, formDoPasseio, hora, periodoDoPasseio, semAssento } from './formato';
import { escolherAtivo } from './ModuloPasseioMain';
import { inscricao, passeio } from './fixtures.test-utils';

const lista = [
  inscricao(1, 'Álvaro', 1, '5º A', { pago: true }),
  inscricao(2, 'Bruna', 1, '5º A', { autorizacao_entregue: true }),
  inscricao(3, 'Caio', 2, '5º B', { vai: false }),
];

describe('formato do Passeio', () => {
  it('formata horários e o período do passeio', () => {
    expect(hora('07:30:00')).toBe('07:30');
    expect(periodoDoPasseio(passeio)).toBe('07:30 às 12:00');
    expect(periodoDoPasseio({ horario_saida: '07:30:00', horario_retorno: null })).toBe('saída às 07:30');
  });

  it('converte o formulário em centavos e recusa valor inválido', () => {
    const form = formDoPasseio(passeio);
    expect(form.valor).toBe('45,00');
    expect(form.horario_saida).toBe('07:30');
    expect(dadosDoForm({ ...form, valor: '1.250,50' })).toMatchObject({ valor_centavos: 125050, data_limite_autorizacao: '2026-10-10' });
    expect(dadosDoForm({ ...form, valor: 'abc' })).toBe('Informe o valor por aluno em reais (ex.: 45,00).');
  });

  it('filtra por turma, participação, termo, pagamento e busca sem acento', () => {
    expect(filtrarInscricoes(lista, { ...FILTRO_INICIAL, turmaId: 1 })).toHaveLength(2);
    expect(filtrarInscricoes(lista, { ...FILTRO_INICIAL, participacao: 'nao_vai' }).map((i) => i.id)).toEqual([3]);
    expect(filtrarInscricoes(lista, { ...FILTRO_INICIAL, termo: 'entregue' }).map((i) => i.id)).toEqual([2]);
    expect(filtrarInscricoes(lista, { ...FILTRO_INICIAL, pagamento: 'pago' }).map((i) => i.id)).toEqual([1]);
    expect(filtrarInscricoes(lista, { ...FILTRO_INICIAL, busca: 'alvaro' }).map((i) => i.id)).toEqual([1]);
  });

  it('demonstrativo conta só quem vai', () => {
    const { linhas, total } = demonstrativo(lista, 4500);
    expect(linhas).toEqual([{ turma: '5º A', vao: 2, pagos: 1, pendentes: 1, arrecadadoCentavos: 4500, aReceberCentavos: 4500 }]);
    expect(total).toMatchObject({ vao: 2, arrecadadoCentavos: 4500 });
  });

  it('distribui quem vai sem assento nos lugares livres, sem mexer nos ocupados', () => {
    const veiculos = [{ id: 5, capacidade: 3 } as Veiculo, { id: 6, capacidade: 2 } as Veiculo];
    const mapas: MapaAssentos[] = [
      { veiculo_id: 5, capacidade: 3, ocupados: [{ numero: 1, aluno_id: 10, aluno: 'Álvaro', turma: '5º A' }] },
      { veiculo_id: 6, capacidade: 2, ocupados: [] },
    ];
    expect(semAssento(lista, mapas).map((i) => i.id)).toEqual([2]);
    expect(distribuir(lista, veiculos, mapas)).toEqual([{ veiculoId: 5, numero: 2, alunoId: 20 }]);
  });

  it('agrupa em pares e gera CSV com BOM e aspas escapadas', () => {
    expect(emPares([1, 2, 3])).toEqual([[1, 2], [3]]);
    const csv = csvInscricoes([inscricao(4, 'Dani "Dé"', 1, '5º A', { observacao: 'alergia' })]);
    expect(csv.startsWith('﻿"Nº";"Aluno"')).toBe(true);
    expect(csv).toContain('"Dani ""Dé"""');
  });

  it('escolhe o passeio da URL, senão o próximo agendado, senão o primeiro', () => {
    const antigo = { ...passeio, id: 1, status: 'concluido' as const, data_passeio: '2026-05-01' };
    const proximo = { ...passeio, id: 2, data_passeio: '2026-11-01' };
    const depois = { ...passeio, id: 3, data_passeio: '2026-12-01' };
    expect(escolherAtivo([antigo, depois, proximo], 3)?.id).toBe(3);
    expect(escolherAtivo([antigo, depois, proximo], null)?.id).toBe(2);
    expect(escolherAtivo([antigo], 99)?.id).toBe(1);
    expect(escolherAtivo([], null)).toBeNull();
  });
});
