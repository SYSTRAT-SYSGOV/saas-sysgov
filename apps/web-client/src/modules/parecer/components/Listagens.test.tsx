import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Catalogo, Habilidade, TelaConteudos, TurmaConfig } from '../api';
import Configuracoes from './Configuracoes';
import Conteudos from './Conteudos';
import { ParecerContext } from './comum';

// O Checkbox do Radix mede o tamanho com ResizeObserver, que o jsdom não tem.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const api = vi.hoisted(() => ({ conteudos: vi.fn(), configuracoes: vi.fn(), moverHabilidade: vi.fn(), alternarHabilidade: vi.fn() }));
vi.mock('../api', async (original) => ({ ...(await original<typeof import('../api')>()), parecerApi: api }));

const catalogo = {
  materias: { LP: 'Língua Portuguesa' },
  series: {},
  conceitos: {},
  funcoes: { professor_regente: { rotulo: 'Professor(a) regente', materias: ['LP'] } },
  media_aprovacao: 6,
  aulas_por_dia: 5,
  gestor: true,
  auditoria: true,
} as unknown as Catalogo;

const com = (ui: React.ReactElement) => render(<ParecerContext.Provider value={{ catalogo, ano: 2026, ir: vi.fn(), imprimir: vi.fn() }}>{ui}</ParecerContext.Provider>);

const hab = (id: number, descricao: string, extra: Partial<Habilidade> = {}): Habilidade => ({ id, serie: 3, materia: 'LP', ordem: id, descricao, codigo_bncc: null, trimestres: '123', ativo: true, ...extra });
const telaConteudos = (pode: boolean): TelaConteudos => ({
  serie: 3,
  materia: 'LP',
  visiveis: { '3': ['LP'] },
  pode_editar: pode,
  bncc_configurada: false,
  contagem: { LP: 2 },
  por_trimestre: { '1': 2, '2': 2, '3': 2 },
  habilidades: [hab(1, 'Ler textos curtos'), hab(2, 'Escrever o próprio nome', { codigo_bncc: 'EF03LP01', ativo: false })],
});

describe('Parecer — listagens na grade padrão', () => {
  it('Conteúdos: habilidades em DataTable com busca, sem paginação e ações no menu ⋮ (gestor)', async () => {
    api.conteudos.mockResolvedValue(telaConteudos(true));
    com(<Conteudos serieInicial={3} materiaInicial="LP" />);

    await waitFor(() => expect(screen.getByText('Ler textos curtos')).toBeInTheDocument());
    for (const titulo of ['Nº', 'Habilidade', 'Trimestres', 'Ordem', 'Ações']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(titulo) })).toBeInTheDocument();
    }
    expect(screen.getByPlaceholderText(/Buscar habilidade/)).toBeInTheDocument();
    expect(screen.getByText('(desativada)')).toBeInTheDocument();
    // a primeira não sobe e a última não desce
    const [subir1] = screen.getAllByRole('button', { name: 'Subir' });
    expect(subir1).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Descer' }).at(-1)).toBeDisabled();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Ações da habilidade 2' }), { key: 'Enter' });
    expect(await screen.findByRole('menuitem', { name: 'Ativar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Excluir' })).toBeInTheDocument();
  });

  it('Conteúdos: o professor só consulta (sem Ordem nem Ações)', async () => {
    api.conteudos.mockResolvedValue(telaConteudos(false));
    com(<Conteudos serieInicial={3} materiaInicial="LP" />);

    await waitFor(() => expect(screen.getByText('Ler textos curtos')).toBeInTheDocument());
    expect(screen.queryByRole('columnheader', { name: /Ordem/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Ações/ })).not.toBeInTheDocument();
  });

  it('Configurações: turmas em DataTable com busca e menu de ações (Editar / Retirar do parecer)', async () => {
    const turmas: TurmaConfig[] = [
      { turma_id: 1, nome: '3º Ano A', turno: 'Manhã', serie: 3, funcoes: { professor_regente: 3 } },
      { turma_id: 2, nome: '6º Ano A', turno: null, serie: null, funcoes: {} },
    ];
    api.configuracoes.mockResolvedValue({ turmas, equipe: [{ id: 3, nome: 'Cleber Silva' }] });
    com(<Configuracoes />);

    await waitFor(() => expect(screen.getByText('3º Ano A')).toBeInTheDocument());
    expect(screen.getByText('Cleber Silva')).toBeInTheDocument();
    expect(screen.getByText('fora do parecer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Buscar turma/)).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Ações da turma 3º Ano A' }), { key: 'Enter' });
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Retirar do parecer' })).toBeInTheDocument();
  });
});
