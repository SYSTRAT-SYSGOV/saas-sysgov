import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({
  relatorio: vi.fn(),
  trabalhos: vi.fn(),
  desempenho: vi.fn(),
  materias: vi.fn(),
  criar: vi.fn(),
  atualizar: vi.fn(),
  enviarImagem: vi.fn(),
  excluir: vi.fn(),
  excluirImagem: vi.fn(),
}));
vi.mock('../api', async (original) => ({ ...(await original<typeof import('../api')>()), portfolioApi: api }));

import type { AlunoPortfolio } from '../api';
import { ListaAlunos } from './ListaAlunos';
import { CabecalhoAluno } from './CabecalhoAluno';

const alunos: AlunoPortfolio[] = [
  { id: 1, nome: 'Álvaro Lima', numero: 1, situacao: 'ativo', total_trabalhos: 3, media: 7.7 },
  { id: 2, nome: 'Bruna Souza', numero: 2, situacao: 'transferido', total_trabalhos: 0, media: null },
];

beforeEach(() => vi.clearAllMocks());

describe('Lista de alunos', () => {
  it('mostra total e média, filtra pela busca e seleciona', () => {
    const onSelecionar = vi.fn();
    render(<ListaAlunos alunos={alunos} selecionado={null} onSelecionar={onSelecionar} carregando={false} />);
    expect(screen.getByText('7,7')).toBeInTheDocument();
    expect(screen.getByText('Transferido')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Buscar aluno'), { target: { value: 'alva' } });
    expect(screen.queryByText('Bruna Souza')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Álvaro Lima/ }));
    expect(onSelecionar).toHaveBeenCalledWith(1);
  });
});

describe('Cabeçalho do aluno', () => {
  it('baixa o PDF do período', async () => {
    api.relatorio.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:x');
    globalThis.URL.revokeObjectURL = vi.fn();
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<CabecalhoAluno aluno={alunos[0]} turma="6º A" periodo={{ ano: 2026, trimestre: 2 }} avisar={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Exportar PDF/ }));
    await waitFor(() => expect(api.relatorio).toHaveBeenCalledWith(1, { ano: 2026, trimestre: 2 }));
    await waitFor(() => expect(clique).toHaveBeenCalled());
    // Revogar logo após o clique cancela o download no Firefox/Safari: a revogação fica para depois.
    expect(globalThis.URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});

import { TrabalhoFormModal } from './TrabalhoFormModal';

vi.mock('../reduzirImagem', async (original) => ({
  ...(await original<typeof import('../reduzirImagem')>()),
  reduzirImagem: vi.fn(async () => new Blob(['jpeg'], { type: 'image/jpeg' })),
}));

describe('Formulário de trabalho', () => {
  const props = {
    aberto: true, alunoId: 1, anoLetivo: 2026, trabalho: null,
    materias: [{ id: 10, nome: 'Matemática' }], onFechar: vi.fn(), onSalvo: vi.fn(), avisar: vi.fn(),
  };

  it('recusa avaliação com duas casas e não envia', async () => {
    render(<TrabalhoFormModal {...props} />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Maquete' } });
    fireEvent.change(screen.getByLabelText('Avaliação (0 a 10)'), { target: { value: '7,25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe uma avaliação de 0 a 10 com no máximo uma casa decimal.')).toBeInTheDocument();
    expect(api.criar).not.toHaveBeenCalled();
  });

  it('cria o trabalho e envia cada foto reduzida', async () => {
    api.criar.mockResolvedValue({ id: 99 });
    api.enviarImagem.mockResolvedValue({ id: 1, nome: 'a.jpg', url: '/x' });
    render(<TrabalhoFormModal {...props} />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Maquete' } });
    fireEvent.change(screen.getByLabelText('Avaliação (0 a 10)'), { target: { value: '8,5' } });
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-06-15' } });
    const fotos = [new File(['a'], 'a.webp', { type: 'image/webp' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })];
    fireEvent.change(screen.getByLabelText('Fotos (até 6)'), { target: { files: fotos } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.criar).toHaveBeenCalledWith(1, expect.objectContaining({ titulo: 'Maquete', materia_id: 10, avaliacao: 8.5, data: '2026-06-15' })));
    await waitFor(() => expect(api.enviarImagem).toHaveBeenCalledTimes(2));
    expect(api.enviarImagem).toHaveBeenCalledWith(99, expect.any(Blob), 'a.jpg');
    expect(props.onSalvo).toHaveBeenCalled();
  });
});

import { PainelDesempenho } from './PainelDesempenho';

describe('Painel de desempenho', () => {
  it('mostra os indicadores e a mensagem sem trabalhos', async () => {
    api.desempenho.mockResolvedValueOnce({
      total: 3, media: 7.7,
      por_materia: [{ materia_id: 1, materia: 'História', quantidade: 2, media: 8 }, { materia_id: 2, materia: 'Matemática', quantidade: 1, media: 7 }],
      por_trimestre: [{ trimestre: 1, quantidade: 3, media: 7.7 }, { trimestre: 2, quantidade: 0, media: null }, { trimestre: 3, quantidade: 0, media: null }],
    }).mockResolvedValueOnce({ total: 0, media: null, por_materia: [], por_trimestre: null });

    const { rerender } = render(<PainelDesempenho alunoId={1} periodo={{ ano: 2026, trimestre: null }} />);
    expect(await screen.findByText('7,7')).toBeInTheDocument();
    expect(screen.getByText('História')).toBeInTheDocument(); // melhor matéria
    expect(screen.getByText('Matemática')).toBeInTheDocument(); // pior matéria

    rerender(<PainelDesempenho alunoId={1} periodo={{ ano: 2026, trimestre: 2 }} />);
    expect(await screen.findByText('Nenhum trabalho no período.')).toBeInTheDocument();
  });
});

describe('Correções da revisão', () => {
  const base = {
    aberto: true, alunoId: 1, anoLetivo: 2026, trabalho: null,
    materias: [{ id: 10, nome: 'Matemática' }], onFechar: vi.fn(), onSalvo: vi.fn(), avisar: vi.fn(),
  };

  it('foto que falha não duplica o trabalho ao salvar de novo', async () => {
    api.criar.mockResolvedValue({ id: 99, imagens: [] });
    api.atualizar.mockResolvedValue({ id: 99, imagens: [] });
    api.enviarImagem.mockResolvedValueOnce({ id: 1, nome: 'a.jpg', url: '/x' }).mockRejectedValueOnce(new Error('rede')).mockResolvedValue({ id: 2, nome: 'b.jpg', url: '/y' });
    const onSalvo = vi.fn();
    render(<TrabalhoFormModal {...base} onSalvo={onSalvo} />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Maquete' } });
    fireEvent.change(screen.getByLabelText('Avaliação (0 a 10)'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Fotos (até 6)'), { target: { files: [new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })] } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await screen.findByRole('alert');
    expect(onSalvo).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(api.criar).toHaveBeenCalledTimes(1);
    expect(api.atualizar).toHaveBeenCalledWith(99, expect.objectContaining({ titulo: 'Maquete' }));
    expect(api.enviarImagem).toHaveBeenCalledTimes(3); // a, b (falhou), b de novo — a não é reenviada
    expect(api.enviarImagem).toHaveBeenLastCalledWith(99, expect.any(Blob), 'b.jpg');
  });

  it('resposta atrasada de outro aluno não substitui a linha do tempo atual', async () => {
    let soltarAntigo: (v: unknown) => void = () => {};
    api.materias.mockResolvedValue({ materias: [], sem_vinculos: false });
    api.trabalhos
      .mockImplementationOnce(() => new Promise((r) => { soltarAntigo = r; }))
      .mockResolvedValueOnce([{ ...trabalhoFake, id: 2, titulo: 'Trabalho da Bruna' }]);
    const props = { turmaId: 8, periodo: { ano: 2026, trimestre: null }, avisar: vi.fn(), aoAlterar: vi.fn(), podeLancar: true };
    const { rerender } = render(<MemoryRouter><LinhaDoTempo alunoId={1} {...props} /></MemoryRouter>);
    rerender(<MemoryRouter><LinhaDoTempo alunoId={2} {...props} /></MemoryRouter>);
    expect(await screen.findByText('Trabalho da Bruna')).toBeInTheDocument();

    soltarAntigo([{ ...trabalhoFake, id: 1, titulo: 'Trabalho do Álvaro' }]);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('Trabalho do Álvaro')).not.toBeInTheDocument();
    expect(screen.getByText('Trabalho da Bruna')).toBeInTheDocument();
  });
});

import { LinhaDoTempo } from './LinhaDoTempo';
import type { Trabalho } from '../api';

const trabalhoFake: Trabalho = {
  id: 0, aluno_id: 1, turma: { id: 8, nome: '6º A' }, materia: { id: 10, nome: 'Matemática' }, ano_letivo: 2026, trimestre: 2,
  titulo: '', descricao: null, observacoes: null, data: '2026-06-10', avaliacao: 8, autor: { id: 1, nome: 'Prof' }, imagens: [], pode_editar: false, created_at: null,
};

describe('Novo trabalho e turma sem matérias', () => {
  const props = { alunoId: 1, turmaId: 3, periodo: { ano: 2026, trimestre: null }, avisar: vi.fn(), aoAlterar: vi.fn() };

  it('turma sem matérias vinculadas: botão desabilitado, aviso e atalho para o Cadastro Escolar', async () => {
    api.trabalhos.mockResolvedValue([]);
    api.materias.mockResolvedValue({ materias: [], sem_vinculos: true });
    render(<MemoryRouter><LinhaDoTempo {...props} podeLancar /></MemoryRouter>);

    expect(await screen.findByText(/ainda não tem matérias vinculadas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Novo trabalho/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Abrir Cadastro Escolar/ })).toBeInTheDocument();
  });

  it('turma com matérias: botão habilitado', async () => {
    api.trabalhos.mockResolvedValue([]);
    api.materias.mockResolvedValue({ materias: [{ id: 10, nome: 'Matemática' }], sem_vinculos: false });
    render(<MemoryRouter><LinhaDoTempo {...props} podeLancar /></MemoryRouter>);

    await waitFor(() => expect(screen.getByRole('button', { name: /Novo trabalho/ })).toBeEnabled());
    expect(screen.queryByText(/ainda não tem matérias vinculadas/)).not.toBeInTheDocument();
  });

  it('quem só consulta não vê o botão', async () => {
    api.trabalhos.mockResolvedValue([]);
    api.materias.mockResolvedValue({ materias: [], sem_vinculos: false });
    render(<MemoryRouter><LinhaDoTempo {...props} podeLancar={false} /></MemoryRouter>);

    expect(await screen.findByText('Nenhum trabalho registrado neste período.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo trabalho/ })).not.toBeInTheDocument();
  });
});
