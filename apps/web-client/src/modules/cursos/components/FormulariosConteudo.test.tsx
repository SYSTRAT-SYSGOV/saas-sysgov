import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const cursosApi = vi.hoisted(() => ({
  criarMaterial: vi.fn(),
  atualizarMaterial: vi.fn(),
  enviarArquivoMaterial: vi.fn(),
  criarQuestao: vi.fn(),
  atualizarQuestao: vi.fn(),
  criarAvaliacao: vi.fn(),
  atualizarAvaliacao: vi.fn(),
  listarQuestoes: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

// O TinyMCE carrega sob demanda e o jsdom não o suporta: um textarea faz o papel do editor.
vi.mock('@sysgov/ui', async (original) => ({
  ...(await original<typeof import('@sysgov/ui')>()),
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="Editor de texto" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import type { Aula, Avaliacao, Material, Questao } from '@sysgov/sdk';
import { AvaliacaoFormModal } from './AvaliacaoFormModal';
import { MaterialFormModal } from './MaterialFormModal';
import { QuestaoFormModal } from './QuestaoFormModal';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const aulas = [{ id: 4, curso_id: 1, titulo: 'Abertura', descricao: null, ordem: 1, duracao_minutos: 120 }] as Aula[];

const material = (extra: Partial<Material> = {}): Material =>
  ({
    id: 8, curso_id: 1, aula_id: null, tipo: 'texto', titulo: 'Apostila', descricao: null, ordem: 1, publicado: false, conteudo: '<p>Olá</p>', url: null,
    video_provedor: null, video_id: null, embed_url: null, arquivo_nome: null, arquivo_tamanho: null, liberacao_regra: 'imediata', liberacao_dias: null, ...extra,
  }) as Material;

describe('MaterialFormModal — regra de liberação', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recusa "no início da aula" sem aula, sem chamar a API', async () => {
    render(<MaterialFormModal open cursoId={1} aulas={aulas} material={material({ liberacao_regra: 'inicio_aula', aula_id: null })} onClose={() => undefined} onSalvo={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText(/exige escolher a aula/)).toBeInTheDocument();
    expect(cursosApi.atualizarMaterial).not.toHaveBeenCalled();
  });

  it('recusa "dias após o início" sem os dias ou fora de 0 a 365', async () => {
    render(<MaterialFormModal open cursoId={1} aulas={aulas} material={material({ liberacao_regra: 'dias_apos_inicio', liberacao_dias: null })} onClose={() => undefined} onSalvo={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/0 a 365/);

    fireEvent.change(screen.getByLabelText('Dias após o início da turma'), { target: { value: '366' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/0 a 365/);
    expect(cursosApi.atualizarMaterial).not.toHaveBeenCalled();
  });

  it('envia a regra de dias com os dias e sem a aula quando não há', async () => {
    cursosApi.atualizarMaterial.mockResolvedValue(material());
    const onSalvo = vi.fn();
    render(<MaterialFormModal open cursoId={1} aulas={aulas} material={material({ liberacao_regra: 'dias_apos_inicio', liberacao_dias: 7 })} onClose={() => undefined} onSalvo={onSalvo} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(cursosApi.atualizarMaterial).toHaveBeenCalledWith(8, expect.objectContaining({ liberacao_regra: 'dias_apos_inicio', liberacao_dias: 7, aula_id: null, conteudo: '<p>Olá</p>' }));
  });

  it('material de texto exige conteúdo', async () => {
    render(<MaterialFormModal open cursoId={1} aulas={aulas} material={material({ conteudo: '<p> </p>' })} onClose={() => undefined} onSalvo={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o conteúdo do texto.')).toBeInTheDocument();
    expect(cursosApi.atualizarMaterial).not.toHaveBeenCalled();
  });

  it('um PDF novo é criado como rascunho, enviado e só então publicado', async () => {
    cursosApi.atualizarMaterial.mockResolvedValue(material({ tipo: 'arquivo', publicado: false }));
    cursosApi.enviarArquivoMaterial.mockResolvedValue(material({ tipo: 'arquivo' }));
    const onSalvo = vi.fn();
    render(
      <MaterialFormModal open cursoId={1} aulas={aulas} material={material({ tipo: 'arquivo', conteudo: null, publicado: true })} onClose={() => undefined} onSalvo={onSalvo} />,
    );

    const pdf = new File(['%PDF-1.4'], 'apostila.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Arquivo PDF'), { target: { files: [pdf] } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(cursosApi.atualizarMaterial).toHaveBeenNthCalledWith(1, 8, expect.objectContaining({ publicado: false }));
    expect(cursosApi.enviarArquivoMaterial).toHaveBeenCalledWith(8, pdf);
    expect(cursosApi.atualizarMaterial).toHaveBeenNthCalledWith(2, 8, { publicado: true });
  });

  it('recusa arquivo que não é PDF antes de enviar', async () => {
    render(<MaterialFormModal open cursoId={1} aulas={aulas} material={material({ tipo: 'arquivo', conteudo: null })} onClose={() => undefined} onSalvo={() => undefined} />);

    fireEvent.change(screen.getByLabelText('Arquivo PDF'), { target: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] } });

    expect(await screen.findByText('Envie um arquivo PDF.')).toBeInTheDocument();
  });
});

describe('QuestaoFormModal — alternativas da objetiva', () => {
  beforeEach(() => vi.clearAllMocks());

  const preencher = (textos: string[]) => textos.forEach((t, i) => fireEvent.change(screen.getByLabelText(`Texto da alternativa ${String.fromCharCode(65 + i)}`), { target: { value: t } }));
  const enunciado = () => fireEvent.change(screen.getByLabelText('Editor de texto'), { target: { value: '<p>Qual é a capital?</p>' } });

  it('começa com 4 alternativas e recusa alternativa em branco', async () => {
    render(<QuestaoFormModal open cursoId={1} onClose={() => undefined} onSalvo={() => undefined} />);
    enunciado();
    preencher(['Curitiba', 'Londrina']);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Toda alternativa precisa de um texto.')).toBeInTheDocument();
    expect(cursosApi.criarQuestao).not.toHaveBeenCalled();
  });

  it('não deixa passar de 6 nem ficar com menos de 2 alternativas', () => {
    render(<QuestaoFormModal open cursoId={1} onClose={() => undefined} onSalvo={() => undefined} />);
    const adicionar = screen.getByRole('button', { name: /Adicionar alternativa/ });

    fireEvent.click(adicionar);
    fireEvent.click(adicionar);
    expect(screen.getAllByLabelText(/^Texto da alternativa/)).toHaveLength(6);
    expect(adicionar).toBeDisabled();

    for (const letra of ['F', 'E', 'D', 'C']) fireEvent.click(screen.getByRole('button', { name: `Remover alternativa ${letra}` }));
    expect(screen.getAllByLabelText(/^Texto da alternativa/)).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Remover alternativa A' })).toBeDisabled();
  });

  it('envia as alternativas com exatamente uma correta e a pontuação', async () => {
    cursosApi.criarQuestao.mockResolvedValue({ id: 1 });
    const onSalvo = vi.fn();
    render(<QuestaoFormModal open cursoId={7} onClose={() => undefined} onSalvo={onSalvo} />);
    enunciado();
    preencher(['Curitiba', 'Londrina', 'Maringá', 'Cascavel']);
    fireEvent.change(screen.getByLabelText('Pontuação'), { target: { value: '2.5' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(cursosApi.criarQuestao).toHaveBeenCalledWith(7, {
      tipo: 'objetiva',
      enunciado: '<p>Qual é a capital?</p>',
      pontuacao: 2.5,
      alternativas: [
        { texto: 'Curitiba', correta: true },
        { texto: 'Londrina', correta: false },
        { texto: 'Maringá', correta: false },
        { texto: 'Cascavel', correta: false },
      ],
    });
  });

  it('exige enunciado e pontuação maior que zero', async () => {
    render(<QuestaoFormModal open cursoId={1} onClose={() => undefined} onSalvo={() => undefined} />);
    preencher(['A', 'B', 'C', 'D']);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe o enunciado da questão.')).toBeInTheDocument();

    enunciado();
    fireEvent.change(screen.getByLabelText('Pontuação'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/pontuação deve ser maior que zero/)).toBeInTheDocument();
    expect(cursosApi.criarQuestao).not.toHaveBeenCalled();
  });

  it('a dissertativa não envia alternativas e leva a orientação de correção', async () => {
    cursosApi.atualizarQuestao.mockResolvedValue({});
    const onSalvo = vi.fn();
    const questao = { id: 3, curso_id: 1, tipo: 'dissertativa', enunciado: '<p>Explique</p>', pontuacao: '2.00', orientacao_correcao: '<p>Citar a lei</p>', ativa: true, alternativas: [] } as unknown as Questao;
    render(<QuestaoFormModal open cursoId={1} questao={questao} onClose={() => undefined} onSalvo={onSalvo} />);

    expect(screen.queryByLabelText(/^Texto da alternativa/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(cursosApi.atualizarQuestao).toHaveBeenCalledWith(3, { enunciado: '<p>Explique</p>', pontuacao: 2, orientacao_correcao: '<p>Citar a lei</p>' });
  });

  it('edição de objetiva carrega as alternativas e a correta', async () => {
    cursosApi.atualizarQuestao.mockResolvedValue({});
    const onSalvo = vi.fn();
    const questao = {
      id: 4, curso_id: 1, tipo: 'objetiva', enunciado: '<p>Q</p>', pontuacao: '1.00', orientacao_correcao: null, ativa: true,
      alternativas: [{ id: 1, questao_id: 4, texto: 'X', correta: false, ordem: 1 }, { id: 2, questao_id: 4, texto: 'Y', correta: true, ordem: 2 }],
    } as unknown as Questao;
    render(<QuestaoFormModal open cursoId={1} questao={questao} onClose={() => undefined} onSalvo={onSalvo} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(cursosApi.atualizarQuestao).toHaveBeenCalledWith(4, expect.objectContaining({ alternativas: [{ texto: 'X', correta: false }, { texto: 'Y', correta: true }] }));
  });
});

describe('AvaliacaoFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cursosApi.listarQuestoes.mockResolvedValue([
      { id: 1, curso_id: 1, tipo: 'objetiva', enunciado: '<p>Primeira</p>', pontuacao: '1.00', ativa: true, alternativas: [] },
      { id: 2, curso_id: 1, tipo: 'dissertativa', enunciado: '<p>Segunda</p>', pontuacao: '2.00', ativa: true, alternativas: [] },
      { id: 3, curso_id: 1, tipo: 'objetiva', enunciado: '<p>Desativada</p>', pontuacao: '1.00', ativa: false, alternativas: [] },
    ]);
  });

  it('monta a prova com as questões na ordem escolhida e só oferece as ativas', async () => {
    cursosApi.criarAvaliacao.mockResolvedValue({});
    const onSalvo = vi.fn();
    render(<AvaliacaoFormModal open cursoId={1} aulas={aulas} onClose={() => undefined} onSalvo={onSalvo} />);

    fireEvent.click(await screen.findByRole('button', { name: /Adicionar questão: Segunda/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Adicionar questão: Primeira/ }));
    expect(screen.queryByRole('button', { name: /Adicionar questão: Desativada/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Prova final' } });
    fireEvent.change(screen.getByLabelText('Peso na nota final (1 a 10)'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Tempo limite (minutos)'), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(cursosApi.criarAvaliacao).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ titulo: 'Prova final', peso: 3, tentativas_max: 1, tempo_limite_minutos: 45, questoes: [2, 1], liberacao_regra: 'imediata' }),
    );
  });

  it('recusa peso e tentativas fora dos limites', async () => {
    render(<AvaliacaoFormModal open cursoId={1} aulas={aulas} onClose={() => undefined} onSalvo={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Prova' } });

    fireEvent.change(screen.getByLabelText('Peso na nota final (1 a 10)'), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('O peso deve ser um inteiro de 1 a 10.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Peso na nota final (1 a 10)'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Tentativas (1 a 10)'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('O número de tentativas deve ser de 1 a 10.')).toBeInTheDocument();
    expect(cursosApi.criarAvaliacao).not.toHaveBeenCalled();
  });

  it('com tentativas feitas, as questões e a ordem ficam travadas e não são enviadas', async () => {
    cursosApi.atualizarAvaliacao.mockResolvedValue({});
    const onSalvo = vi.fn();
    const avaliacao = {
      id: 9, curso_id: 1, aula_id: null, titulo: 'Prova', instrucoes: null, peso: 1, tentativas_max: 1, tempo_limite_minutos: null, publicada: true,
      liberacao_regra: 'imediata', liberacao_dias: null, questoes_count: 1, tentativas_count: 2,
      questoes: [{ questao_id: 1, ordem: 1, questao: { id: 1, enunciado: '<p>Primeira</p>', pontuacao: '1.00' } }],
    } as unknown as Avaliacao;
    render(<AvaliacaoFormModal open cursoId={1} aulas={aulas} avaliacao={avaliacao} onClose={() => undefined} onSalvo={onSalvo} />);

    expect(await screen.findByText(/já tem tentativas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retirar questão/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Peso na nota final (1 a 10)'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    const enviado = cursosApi.atualizarAvaliacao.mock.calls[0][1];
    expect(enviado).toMatchObject({ peso: 4 });
    expect(enviado).not.toHaveProperty('questoes');
  });

  it('regra "no início da aula" sem aula é recusada', async () => {
    render(<AvaliacaoFormModal open cursoId={1} aulas={aulas} avaliacao={{ id: 9, curso_id: 1, aula_id: null, titulo: 'P', instrucoes: null, peso: 1, tentativas_max: 1, tempo_limite_minutos: null, publicada: false, liberacao_regra: 'inicio_aula', liberacao_dias: null, questoes_count: 0, tentativas_count: 0, questoes: [] }} onClose={() => undefined} onSalvo={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText(/exige escolher a aula/)).toBeInTheDocument();
    expect(cursosApi.atualizarAvaliacao).not.toHaveBeenCalled();
  });
});
