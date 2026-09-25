import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

const cursosApi = vi.hoisted(() => ({
  getTentativa: vi.fn(),
  salvarResposta: vi.fn(),
  enviarTentativa: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import type { TentativaParticipante } from '@sysgov/sdk';
import { TentativaPage } from './TentativaPage';

const AGORA = new Date('2026-10-05T12:00:00Z');

const questoes = [
  {
    questao_id: 1, ordem: 1, tipo: 'objetiva', enunciado: '<p>Qual é a capital do Paraná?</p>', pontuacao: 1,
    alternativas: [{ id: 11, texto: 'Curitiba', ordem: 1 }, { id: 12, texto: 'Londrina', ordem: 2 }],
    resposta: { alternativa_id: null, texto: null },
  },
  {
    questao_id: 2, ordem: 2, tipo: 'dissertativa', enunciado: '<p>Explique o princípio da legalidade.</p>', pontuacao: 2,
    alternativas: [], resposta: { alternativa_id: null, texto: null },
  },
];

const tentativa = (extra: Partial<TentativaParticipante> = {}): TentativaParticipante =>
  ({
    id: 7, avaliacao: { id: 3, titulo: 'Prova final', instrucoes: '<p>Leia com atenção</p>', tempo_limite_minutos: null, tentativas_max: 2 },
    inscricao_id: 5, numero: 1, status: 'em_andamento', iniciada_em: AGORA.toISOString(), prazo_em: null, enviada_em: null, corrigida_em: null,
    servidor_agora: AGORA.toISOString(), nota: null, questoes, ...extra,
  }) as TentativaParticipante;

const avancar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const montar = async (t = tentativa(), onVoltar = vi.fn()) => {
  cursosApi.getTentativa.mockResolvedValue(t);
  render(<TentativaPage tentativaId={7} onVoltar={onVoltar} />);
  await avancar(0);
  return onVoltar;
};

describe('TentativaPage — responder com autosave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(AGORA);
    cursosApi.salvarResposta.mockResolvedValue({});
  });
  afterEach(() => vi.useRealTimers());

  it('mostra as instruções e as questões, e a objetiva salva na hora ao escolher', async () => {
    await montar();

    expect(screen.getByText('Leia com atenção')).toBeInTheDocument();
    expect(screen.getByText('Qual é a capital do Paraná?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Curitiba/ }));
    await avancar(0);

    expect(cursosApi.salvarResposta).toHaveBeenCalledTimes(1);
    expect(cursosApi.salvarResposta).toHaveBeenCalledWith(7, 1, { alternativa_id: 11 });
    expect(screen.getByRole('radio', { name: /Curitiba/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByText('Resposta salva')).toHaveLength(1);
  });

  it('clicar de novo na alternativa marcada limpa a resposta', async () => {
    await montar();

    fireEvent.click(screen.getByRole('radio', { name: /Curitiba/ }));
    await avancar(0);
    fireEvent.click(screen.getByRole('radio', { name: /Curitiba/ }));
    await avancar(0);

    expect(cursosApi.salvarResposta).toHaveBeenLastCalledWith(7, 1, { alternativa_id: null });
    expect(screen.getByRole('radio', { name: /Curitiba/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('a dissertativa só salva depois de uma pausa na digitação, uma vez, com o texto final', async () => {
    await montar();
    const caixa = screen.getByLabelText('Sua resposta');

    fireEvent.change(caixa, { target: { value: 'A' } });
    await avancar(300);
    fireEvent.change(caixa, { target: { value: 'A lei' } });
    await avancar(300);
    fireEvent.change(caixa, { target: { value: 'A lei limita o Estado' } });
    await avancar(500);
    expect(cursosApi.salvarResposta).not.toHaveBeenCalled();

    await avancar(400);

    expect(cursosApi.salvarResposta).toHaveBeenCalledTimes(1);
    expect(cursosApi.salvarResposta).toHaveBeenCalledWith(7, 2, { texto: 'A lei limita o Estado' });
    expect(caixa).toHaveValue('A lei limita o Estado');
  });

  it('enviar salva antes o texto que ainda esperava a pausa e só então envia', async () => {
    cursosApi.enviarTentativa.mockResolvedValue(tentativa({ status: 'aguardando_correcao', enviada_em: AGORA.toISOString() }));
    await montar();
    fireEvent.change(screen.getByLabelText('Sua resposta'), { target: { value: 'Rascunho quase pronto' } });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar respostas' }));
    await avancar(0);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar agora' }));
    await avancar(0);

    expect(cursosApi.salvarResposta).toHaveBeenCalledWith(7, 2, { texto: 'Rascunho quase pronto' });
    expect(cursosApi.enviarTentativa).toHaveBeenCalledWith(7);
    expect(cursosApi.salvarResposta.mock.invocationCallOrder[0]).toBeLessThan(cursosApi.enviarTentativa.mock.invocationCallOrder[0]);
    expect(screen.getByText(/aguardando a correção do instrutor/)).toBeInTheDocument();
  });

  it('o envio pede confirmação e avisa das questões sem resposta', async () => {
    await montar();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar respostas' }));
    await avancar(0);

    expect(screen.getByText(/Você deixou 2 questões sem resposta/)).toBeInTheDocument();
    expect(cursosApi.enviarTentativa).not.toHaveBeenCalled();
  });

  it('erro ao salvar mostra a mensagem e recarrega a tentativa', async () => {
    cursosApi.salvarResposta.mockRejectedValue(Object.assign(new Error('422'), { response: { status: 422, data: { error: 'Esta tentativa já foi enviada e não pode mais ser alterada.' } } }));
    await montar();

    fireEvent.click(screen.getByRole('radio', { name: /Londrina/ }));
    await avancar(0);

    expect(screen.getByText('Esta tentativa já foi enviada e não pode mais ser alterada.')).toBeInTheDocument();
    expect(screen.getByText('Não foi possível salvar — tente de novo')).toBeInTheDocument();
    expect(cursosApi.getTentativa).toHaveBeenCalledTimes(2);
  });

  it('voltar não perde o texto que ainda esperava a pausa', async () => {
    const onVoltar = await montar();
    fireEvent.change(screen.getByLabelText('Sua resposta'), { target: { value: 'Não posso perder' } });

    fireEvent.click(screen.getByRole('button', { name: /Voltar/ }));
    await avancar(0);

    expect(cursosApi.salvarResposta).toHaveBeenCalledWith(7, 2, { texto: 'Não posso perder' });
    expect(onVoltar).toHaveBeenCalled();
  });
});

describe('TentativaPage — tempo limite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(AGORA);
    cursosApi.salvarResposta.mockResolvedValue({});
  });
  afterEach(() => vi.useRealTimers());

  const comPrazo = (segundos: number, extra: Partial<TentativaParticipante> = {}) => tentativa({ prazo_em: new Date(AGORA.getTime() + segundos * 1000).toISOString(), ...extra });

  it('mostra o tempo restante e conta os segundos', async () => {
    await montar(comPrazo(125));

    expect(screen.getByRole('timer')).toHaveTextContent('02:05');
    await avancar(5000);
    expect(screen.getByRole('timer')).toHaveTextContent('02:00');
  });

  it('o cronômetro usa o relógio do servidor, não o do navegador', async () => {
    // O relógio do computador está 10 minutos atrasado em relação ao servidor; o prazo é 5 minutos depois da hora do servidor.
    const servidor = new Date(AGORA.getTime() + 10 * 60_000);
    await montar(tentativa({ servidor_agora: servidor.toISOString(), prazo_em: new Date(servidor.getTime() + 5 * 60_000).toISOString() }));

    expect(screen.getByRole('timer')).toHaveTextContent('05:00');
  });

  it('ao fim do prazo bloqueia as respostas e envia o que estava salvo', async () => {
    cursosApi.enviarTentativa.mockResolvedValue(comPrazo(3, { status: 'corrigida', nota: '5.00', enviada_em: AGORA.toISOString() }));
    await montar(comPrazo(3));
    fireEvent.click(screen.getByRole('radio', { name: /Curitiba/ }));
    await avancar(0);
    expect(cursosApi.salvarResposta).toHaveBeenCalledTimes(1);

    await avancar(3000);

    expect(cursosApi.enviarTentativa).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/O tempo terminou/)).toBeInTheDocument();
    // Depois do envio a tela é a do resultado: não há mais como responder.
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Sua resposta')).not.toBeInTheDocument();
    expect(screen.getByText('5,00')).toBeInTheDocument();
    expect(cursosApi.salvarResposta).toHaveBeenCalledTimes(1);
  });

  it('enquanto o envio por tempo está em andamento as respostas ficam desabilitadas', async () => {
    let concluir: (t: TentativaParticipante) => void = () => undefined;
    cursosApi.enviarTentativa.mockReturnValue(new Promise<TentativaParticipante>((resolve) => { concluir = resolve; }));
    await montar(comPrazo(2));

    await avancar(2000);

    expect(screen.getByRole('radio', { name: /Curitiba/ })).toBeDisabled();
    expect(screen.getByLabelText('Sua resposta')).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /Curitiba/ }));
    await avancar(0);
    expect(cursosApi.salvarResposta).not.toHaveBeenCalled();

    concluir(comPrazo(2, { status: 'corrigida', nota: '0.00' }));
    await avancar(0);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('o texto pendente na hora do fim do prazo ainda é salvo antes do envio', async () => {
    cursosApi.enviarTentativa.mockResolvedValue(comPrazo(2, { status: 'aguardando_correcao' }));
    await montar(comPrazo(2));
    fireEvent.change(screen.getByLabelText('Sua resposta'), { target: { value: 'Quase no fim' } });

    await avancar(2000);

    expect(cursosApi.salvarResposta).toHaveBeenCalledWith(7, 2, { texto: 'Quase no fim' });
    expect(cursosApi.salvarResposta.mock.invocationCallOrder[0]).toBeLessThan(cursosApi.enviarTentativa.mock.invocationCallOrder[0]);
  });

  it('sem tempo limite não há cronômetro', async () => {
    await montar(tentativa());

    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('o cronômetro fica vermelho no último minuto', async () => {
    await montar(comPrazo(45));

    expect(screen.getByRole('timer').className).toContain('text-destructive');
  });
});

describe('TentativaPage — resultado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  const respondidas = [
    { ...questoes[0], resposta: { alternativa_id: 12, texto: null } },
    { ...questoes[1], resposta: { alternativa_id: null, texto: 'A lei limita o Estado' } },
  ];

  it('aguardando correção: mostra as respostas dadas, sem nota nem resultado', async () => {
    await montar(tentativa({ status: 'aguardando_correcao', enviada_em: AGORA.toISOString(), questoes: respondidas as TentativaParticipante['questoes'] }));

    expect(screen.getByText(/aguardando a correção do instrutor/)).toBeInTheDocument();
    expect(screen.getByText('B. Londrina')).toBeInTheDocument();
    expect(screen.getByText('A lei limita o Estado')).toBeInTheDocument();
    expect(screen.queryByText('Nota desta tentativa')).not.toBeInTheDocument();
    expect(screen.queryByText('Acertou')).not.toBeInTheDocument();
    expect(screen.queryByText('Errou')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar respostas' })).not.toBeInTheDocument();
  });

  it('corrigida: nota, pontos, acertou/errou e comentário, e nunca a alternativa correta', async () => {
    const corrigidas = [
      { ...respondidas[0], resultado: { pontos: 0, comentario: null, acertou: false } },
      { ...respondidas[1], resultado: { pontos: 1.5, comentario: 'Faltou citar o artigo 37' } },
    ];
    await montar(tentativa({ status: 'corrigida', nota: '5.00', enviada_em: AGORA.toISOString(), questoes: corrigidas as TentativaParticipante['questoes'] }));

    expect(screen.getByText('Nota desta tentativa')).toBeInTheDocument();
    expect(screen.getByText('5,00')).toBeInTheDocument();
    expect(screen.getByText('Errou')).toBeInTheDocument();
    expect(screen.getByText('0/1')).toBeInTheDocument();
    expect(screen.getByText('1.5/2')).toBeInTheDocument();
    expect(screen.getByText('Faltou citar o artigo 37')).toBeInTheDocument();
    // Só a alternativa que a pessoa marcou aparece; a outra (a correta) não é revelada.
    expect(screen.queryByText(/Curitiba/)).not.toBeInTheDocument();
  });

  it('resposta em branco aparece como "Sem resposta"', async () => {
    await montar(tentativa({ status: 'corrigida', nota: '0.00', questoes: questoes.map((q) => ({ ...q, resultado: { pontos: 0, comentario: null } })) as TentativaParticipante['questoes'] }));

    expect(screen.getAllByText('Sem resposta')).toHaveLength(2);
  });

  it('o texto da dissertativa é exibido como texto puro, sem interpretar HTML', async () => {
    const html = '<img src=x onerror="window.hackeado = true"> <b>negrito</b>';
    await montar(tentativa({ status: 'aguardando_correcao', questoes: [{ ...questoes[1], resposta: { alternativa_id: null, texto: html } }] as TentativaParticipante['questoes'] }));

    expect(screen.getByText(html)).toBeInTheDocument();
    expect(document.querySelector('img[onerror]')).toBeNull();
    expect(document.querySelector('b')).toBeNull();
  });

  it('erro ao carregar oferece tentar de novo', async () => {
    cursosApi.getTentativa.mockRejectedValue(Object.assign(new Error('403'), { response: { status: 403, data: { message: 'This action is unauthorized.' } } }));
    render(<TentativaPage tentativaId={7} onVoltar={() => undefined} />);
    await avancar(0);

    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
