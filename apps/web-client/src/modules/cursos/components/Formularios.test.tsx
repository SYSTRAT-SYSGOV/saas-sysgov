import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// O Switch (Radix) mede o próprio tamanho com ResizeObserver, que o jsdom não tem.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const cursosApi = vi.hoisted(() => ({
  criarCurso: vi.fn(),
  atualizarCurso: vi.fn(),
  listarCursos: vi.fn(),
  listarModelos: vi.fn(),
  atualizarFormacao: vi.fn(),
  criarFormacao: vi.fn(),
  criarTurma: vi.fn(),
  atualizarTurma: vi.fn(),
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

import { CursoFormModal } from './CursoFormModal';
import { TurmaFormModal } from './TurmaFormModal';
import { FormacaoFormModal } from '../pages/FormacoesPage';

const modelos = [
  { id: 1, nome: 'Certificado padrão', titulo: 'Certificado', corpo: '', logotipo_path: null, assinaturas: null, padrao: true },
  { id: 2, nome: 'Certificado com nota', titulo: 'Certificado', corpo: '', logotipo_path: null, assinaturas: null, padrao: false },
];

/** O Radix repete o valor num <option> escondido; confere o texto do próprio seletor. */
const seletorMostra = (texto: string) => waitFor(() => expect(screen.getAllByRole('combobox').some((el) => el.textContent?.includes(texto))).toBe(true));

describe('CursoFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cursosApi.listarModelos.mockResolvedValue({ modelos, campos_dinamicos: [] });
  });

  it('sem escolha, o modelo de certificado é o padrão do órgão e vai como nulo', async () => {
    cursosApi.criarCurso.mockResolvedValue({ id: 10 });
    render(<CursoFormModal open onClose={() => undefined} onSalvo={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Padrão' } });
    fireEvent.change(screen.getByLabelText('Carga horária (horas)'), { target: { value: '2' } });

    expect(await screen.findByText('Padrão do órgão')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(cursosApi.criarCurso).toHaveBeenCalledWith(expect.objectContaining({ modelo_certificado_id: null })));
  });

  it('edição mostra o modelo vinculado e o preserva ao salvar', async () => {
    cursosApi.atualizarCurso.mockResolvedValue({ id: 1 });
    const curso = { id: 1, tipo: 'curso', titulo: 'C', descricao: null, carga_horaria_minutos: 60, frequencia_minima: 75, nota_minima: '7.00', modelo_certificado_id: 2 } as unknown as import('@sysgov/sdk').Curso;
    render(<CursoFormModal open curso={curso} onClose={() => undefined} onSalvo={() => undefined} />);

    await seletorMostra('Certificado com nota');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(cursosApi.atualizarCurso).toHaveBeenCalledWith(1, expect.objectContaining({ modelo_certificado_id: 2 })));
  });

  it('segue funcionando quando a lista de modelos não carrega', async () => {
    cursosApi.listarModelos.mockRejectedValue(new Error('falha'));
    cursosApi.criarCurso.mockResolvedValue({ id: 11 });
    render(<CursoFormModal open onClose={() => undefined} onSalvo={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Sem lista' } });
    fireEvent.change(screen.getByLabelText('Carga horária (horas)'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(cursosApi.criarCurso).toHaveBeenCalledWith(expect.objectContaining({ modelo_certificado_id: null })));
  });

  it('envia a carga horária em minutos (horas × 60 + minutos)', async () => {
    cursosApi.criarCurso.mockResolvedValue({ id: 7 });
    const onSalvo = vi.fn();
    render(<CursoFormModal open onClose={() => undefined} onSalvo={onSalvo} />);

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Gestão de Contratos' } });
    fireEvent.change(screen.getByLabelText('Carga horária (horas)'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Minutos'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalledWith({ id: 7 }));
    expect(cursosApi.criarCurso).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Gestão de Contratos', carga_horaria_minutos: 510, frequencia_minima: 75, tipo: 'curso' }));
  });

  it('envia a nota mínima como número e recusa fora da escala de 0 a 10', async () => {
    cursosApi.criarCurso.mockResolvedValue({ id: 8 });
    const onSalvo = vi.fn();
    render(<CursoFormModal open onClose={() => undefined} onSalvo={onSalvo} />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Com nota' } });
    fireEvent.change(screen.getByLabelText('Carga horária (horas)'), { target: { value: '4' } });

    fireEvent.change(screen.getByLabelText('Nota mínima (0 a 10)'), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    expect(await screen.findByText('A nota mínima deve estar na escala de 0 a 10.')).toBeInTheDocument();
    expect(cursosApi.criarCurso).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Nota mínima (0 a 10)'), { target: { value: '7.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(cursosApi.criarCurso).toHaveBeenCalledWith(expect.objectContaining({ nota_minima: 7.5 }));
  });

  it('sem nota mínima envia nulo; evento não tem o campo', async () => {
    cursosApi.criarCurso.mockResolvedValue({ id: 9 });
    render(<CursoFormModal open onClose={() => undefined} onSalvo={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Sem nota' } });
    fireEvent.change(screen.getByLabelText('Carga horária (horas)'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(cursosApi.criarCurso).toHaveBeenCalledWith(expect.objectContaining({ nota_minima: null })));
  });

  it('edição de curso carrega a nota mínima existente', () => {
    render(<CursoFormModal open curso={{ id: 1, tipo: 'curso', titulo: 'C', descricao: null, carga_horaria_minutos: 60, frequencia_minima: 75, nota_minima: '7.00' } as unknown as import('@sysgov/sdk').Curso} onClose={() => undefined} onSalvo={() => undefined} />);

    expect(screen.getByLabelText('Nota mínima (0 a 10)')).toHaveValue(7);
  });

  it('não envia sem carga horária', async () => {
    render(<CursoFormModal open onClose={() => undefined} onSalvo={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Sem carga' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

    expect(await screen.findByText('Informe a carga horária.')).toBeInTheDocument();
    expect(cursosApi.criarCurso).not.toHaveBeenCalled();
  });

  it('slug e texto público vazios vão como nulo (o backend gera o slug a partir do título)', async () => {
    cursosApi.criarCurso.mockResolvedValue({ id: 12 });
    render(<CursoFormModal open onClose={() => undefined} onSalvo={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Gestão Pública' } });
    fireEvent.change(screen.getByLabelText('Carga horária (horas)'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(cursosApi.criarCurso).toHaveBeenCalledWith(expect.objectContaining({ slug: null, texto_publico: null })));
  });

  it('envia slug e texto público preenchidos', async () => {
    cursosApi.criarCurso.mockResolvedValue({ id: 13 });
    render(<CursoFormModal open onClose={() => undefined} onSalvo={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Gestão Pública' } });
    fireEvent.change(screen.getByLabelText('Carga horária (horas)'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Endereço da página pública (slug)'), { target: { value: 'gestao-publica' } });
    fireEvent.change(screen.getByLabelText('Editor de texto'), { target: { value: '<p>Curso aberto ao público.</p>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() =>
      expect(cursosApi.criarCurso).toHaveBeenCalledWith(expect.objectContaining({ slug: 'gestao-publica', texto_publico: '<p>Curso aberto ao público.</p>' })),
    );
  });

  it('edição carrega o slug e o texto público existentes', () => {
    const curso = {
      id: 1, tipo: 'curso', titulo: 'C', slug: 'curso-c', descricao: null, texto_publico: '<p>Olá</p>',
      carga_horaria_minutos: 60, frequencia_minima: 75, nota_minima: null,
    } as unknown as import('@sysgov/sdk').Curso;
    render(<CursoFormModal open curso={curso} onClose={() => undefined} onSalvo={() => undefined} />);

    expect(screen.getByLabelText('Endereço da página pública (slug)')).toHaveValue('curso-c');
    expect(screen.getByLabelText('Editor de texto')).toHaveValue('<p>Olá</p>');
  });
});

describe('TurmaFormModal', () => {
  beforeEach(() => vi.clearAllMocks());

  const instrutor = { id: 9, name: 'Ana Instrutora' };
  const turmaBase = {
    id: 20, curso_id: 1, nome: 'Turma A', data_inicio: '2026-01-10', data_fim: '2026-02-10',
    inscricoes_inicio: '2026-01-01 00:00:00', inscricoes_fim: '2026-01-09 23:59:59', vagas: 30,
    modalidade: 'online', local: null, link: 'https://sala.exemplo.gov.br', aprovacao_manual: false,
    aceita_externos: true, instrutores: [instrutor], status: 'aberta',
  } as unknown as import('@sysgov/sdk').Turma;

  it('carrega "aceita externos" existente e envia desmarcado ao desligar', async () => {
    cursosApi.atualizarTurma.mockResolvedValue({ id: 20 });
    render(<TurmaFormModal open cursoId={1} turma={turmaBase} onClose={() => undefined} onSalvo={() => undefined} />);

    const interruptor = screen.getByRole('switch', { name: 'Aceitar participantes externos' });
    expect(interruptor).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(interruptor);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(cursosApi.atualizarTurma).toHaveBeenCalledWith(20, expect.objectContaining({ aceita_externos: false })));
  });

  it('nova turma: "aceita externos" começa desligado e vai marcado ao ligar', async () => {
    cursosApi.criarTurma.mockResolvedValue({ id: 21 });
    render(<TurmaFormModal open cursoId={1} onClose={() => undefined} onSalvo={() => undefined} />);

    const interruptor = screen.getByRole('switch', { name: 'Aceitar participantes externos' });
    expect(interruptor).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(interruptor);

    fireEvent.change(screen.getByLabelText('Nome da turma'), { target: { value: 'Turma B' } });
    fireEvent.change(screen.getByLabelText('Início das aulas'), { target: { value: '2026-03-01' } });
    fireEvent.change(screen.getByLabelText('Fim das aulas'), { target: { value: '2026-03-30' } });
    fireEvent.change(screen.getByLabelText('Inscrições a partir de'), { target: { value: '2026-02-01T00:00' } });
    fireEvent.change(screen.getByLabelText('Inscrições até'), { target: { value: '2026-02-28T23:59' } });
    fireEvent.change(screen.getByLabelText('Local'), { target: { value: 'Auditório central' } });

    fireEvent.click(screen.getByRole('button', { name: 'Criar turma' }));
    expect(await screen.findByText('Escolha ao menos um instrutor.')).toBeInTheDocument();
    expect(cursosApi.criarTurma).not.toHaveBeenCalled();
  });
});

describe('FormacaoFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cursosApi.listarCursos.mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });
    cursosApi.listarModelos.mockResolvedValue({ modelos, campos_dinamicos: [] });
  });

  const formacao = {
    id: 3,
    titulo: 'Trilha de Compras',
    descricao: null,
    modelo_certificado_id: null,
    cursos: [{ id: 10, titulo: 'Lei 14.133', carga_horaria_minutos: 600, pivot: { ordem: 1, obrigatorio: true } }],
  } as unknown as import('@sysgov/sdk').Formacao;

  it('exige ao menos um curso obrigatório antes de salvar', async () => {
    render(<FormacaoFormModal formacao={formacao} onClose={() => undefined} onSalvo={() => undefined} />);

    fireEvent.click(await screen.findByRole('switch', { name: 'Lei 14.133 é obrigatório' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Marque ao menos um curso como obrigatório.')).toBeInTheDocument();
    expect(cursosApi.atualizarFormacao).not.toHaveBeenCalled();
  });

  it('mostra o modelo de certificado da formação e o preserva ao salvar', async () => {
    cursosApi.atualizarFormacao.mockResolvedValue({});
    render(<FormacaoFormModal formacao={{ ...formacao, modelo_certificado_id: 2 }} onClose={() => undefined} onSalvo={() => undefined} />);

    await seletorMostra('Certificado com nota');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(cursosApi.atualizarFormacao).toHaveBeenCalledWith(3, expect.objectContaining({ modelo_certificado_id: 2 })));
  });

  it('envia a composição com a ordem da lista', async () => {
    cursosApi.atualizarFormacao.mockResolvedValue({});
    const onSalvo = vi.fn();
    render(<FormacaoFormModal formacao={formacao} onClose={() => undefined} onSalvo={onSalvo} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(cursosApi.atualizarFormacao).toHaveBeenCalledWith(3, expect.objectContaining({ cursos: [{ curso_id: 10, obrigatorio: true, ordem: 1 }] }));
  });
});
