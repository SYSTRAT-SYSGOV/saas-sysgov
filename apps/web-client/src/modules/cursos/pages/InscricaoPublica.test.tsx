import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const cursosApi = vi.hoisted(() => ({
  getPaginaOrgao: vi.fn(),
  listarCatalogoPublico: vi.fn(),
  getCursoPublico: vi.fn(),
  cadastrarExterno: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { AppRouter } from '@/core/router/AppRouter';

const identidadeA = { titulo: 'Portal da Prefeitura A', cor_primaria: '#123456', logo_url: null, assinatura_oculta: false };
const identidadeB = { titulo: 'Portal da Prefeitura B', cor_primaria: '#abcdef', logo_url: null, assinatura_oculta: true };

describe('Página pública do órgão (catálogo)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza a identidade e os cursos vindos da API', async () => {
    cursosApi.getPaginaOrgao.mockResolvedValue({ nome: 'Prefeitura A', slug: 'prefeitura-a', boas_vindas: 'Bem-vindo aos nossos cursos!', identidade: identidadeA });
    cursosApi.listarCatalogoPublico.mockResolvedValue([
      { slug: 'gestao-de-contratos', tipo: 'curso', titulo: 'Gestão de Contratos', carga_horaria_minutos: 480, capa_url: null },
    ]);

    render(
      <MemoryRouter initialEntries={['/inscricao/prefeitura-a']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Portal da Prefeitura A')).toBeInTheDocument();
    expect(screen.getByText('Bem-vindo aos nossos cursos!')).toBeInTheDocument();
    expect(screen.getByText('Gestão de Contratos')).toBeInTheDocument();
    expect(cursosApi.listarCatalogoPublico).toHaveBeenCalledWith('prefeitura-a');
  });

  it('órgão sem página pública mostra aviso, não uma tela em branco ou erro técnico', async () => {
    cursosApi.getPaginaOrgao.mockRejectedValue(Object.assign(new Error('404'), { response: { status: 404 } }));

    render(
      <MemoryRouter initialEntries={['/inscricao/nao-existe']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/não disponível para este órgão/)).toBeInTheDocument();
  });

  /** Nenhum dado do órgão pode estar embutido no código: dois órgãos diferentes têm que renderizar dados diferentes, vindos só da API. */
  it('não tem identidade de nenhum órgão embutida no código — o mesmo componente reflete o que a API mandar', async () => {
    cursosApi.getPaginaOrgao.mockResolvedValueOnce({ nome: 'Prefeitura A', slug: 'prefeitura-a', boas_vindas: null, identidade: identidadeA });
    cursosApi.listarCatalogoPublico.mockResolvedValue([]);
    const { unmount } = render(
      <MemoryRouter initialEntries={['/inscricao/prefeitura-a']}>
        <AppRouter />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Portal da Prefeitura A')).toBeInTheDocument();
    expect(screen.queryByText('Portal da Prefeitura B')).not.toBeInTheDocument();
    unmount();

    cursosApi.getPaginaOrgao.mockResolvedValueOnce({ nome: 'Prefeitura B', slug: 'prefeitura-b', boas_vindas: null, identidade: identidadeB });
    render(
      <MemoryRouter initialEntries={['/inscricao/prefeitura-b']}>
        <AppRouter />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Portal da Prefeitura B')).toBeInTheDocument();
    expect(screen.queryByText('Portal da Prefeitura A')).not.toBeInTheDocument();
    // assinatura_oculta=true pro órgão B: o rodapé "Portal SYSGOV" some.
    expect(screen.queryByText('Portal SYSGOV — SYSTRAT')).not.toBeInTheDocument();
  });
});

describe('Página pública do curso', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra o texto de divulgação, as turmas e as vagas restantes (nunca a capacidade total)', async () => {
    cursosApi.getPaginaOrgao.mockResolvedValue({ nome: 'Prefeitura A', slug: 'prefeitura-a', boas_vindas: null, identidade: identidadeA });
    cursosApi.getCursoPublico.mockResolvedValue({
      slug: 'gestao-de-contratos', tipo: 'curso', titulo: 'Gestão de Contratos', carga_horaria_minutos: 480, capa_url: null,
      descricao: null, texto_publico: '<p>Inscreva-se já</p>',
      turmas: [{ id: 1, nome: 'Turma 1', data_inicio: '2026-10-01', data_fim: '2026-10-31', inscricoes_inicio: '2026-09-01T00:00:00Z', inscricoes_fim: '2026-09-30T00:00:00Z', modalidade: 'presencial', local: 'Auditório', vagas_restantes: 3 }],
    });

    render(
      <MemoryRouter initialEntries={['/inscricao/prefeitura-a/cursos/gestao-de-contratos']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Gestão de Contratos')).toBeInTheDocument();
    expect(screen.getByText('Inscreva-se já')).toBeInTheDocument();
    expect(screen.getByText('Turma 1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText(/vagas totais/i)).not.toBeInTheDocument();
  });
});

describe('Cadastro externo', () => {
  beforeEach(() => vi.clearAllMocks());

  const preencherEIr = async (comAceite: boolean) => {
    cursosApi.getPaginaOrgao.mockResolvedValue({ nome: 'Prefeitura A', slug: 'prefeitura-a', boas_vindas: null, identidade: identidadeA });

    render(
      <MemoryRouter initialEntries={['/inscricao/prefeitura-a/cadastro']}>
        <AppRouter />
      </MemoryRouter>,
    );

    await screen.findByText('Criar cadastro');
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana Externa' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@fora.gov.br' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Senha@123' } });
    fireEvent.change(screen.getByLabelText('Confirme a senha'), { target: { value: 'Senha@123' } });
    if (comAceite) fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));
  };

  it('cenário: sem aceitar o termo, a inscrição é recusada sem chamar a API', async () => {
    await preencherEIr(false);

    expect(await screen.findByText('É preciso aceitar o termo para continuar.')).toBeInTheDocument();
    expect(cursosApi.cadastrarExterno).not.toHaveBeenCalled();
  });

  it('com o aceite marcado, envia o cadastro e mostra a mensagem de sucesso', async () => {
    cursosApi.cadastrarExterno.mockResolvedValue({ mensagem: 'Se os dados estiverem corretos...' });

    await preencherEIr(true);

    await waitFor(() => expect(cursosApi.cadastrarExterno).toHaveBeenCalledTimes(1));
    expect(cursosApi.cadastrarExterno).toHaveBeenCalledWith('prefeitura-a', expect.objectContaining({ nome: 'Ana Externa', email: 'ana@fora.gov.br', aceite: true, website: '' }));
    expect(await screen.findByTestId('cadastro-concluido')).toBeInTheDocument();
  });

  it('o campo isca fica fora da tela e não atrapalha o preenchimento normal', async () => {
    cursosApi.getPaginaOrgao.mockResolvedValue({ nome: 'Prefeitura A', slug: 'prefeitura-a', boas_vindas: null, identidade: identidadeA });
    render(
      <MemoryRouter initialEntries={['/inscricao/prefeitura-a/cadastro']}>
        <AppRouter />
      </MemoryRouter>,
    );
    await screen.findByText('Criar cadastro');

    const isca = document.getElementById('website') as HTMLInputElement;
    expect(isca).toBeTruthy();
    expect(isca.tabIndex).toBe(-1);
    expect(isca.value).toBe('');
  });
});
