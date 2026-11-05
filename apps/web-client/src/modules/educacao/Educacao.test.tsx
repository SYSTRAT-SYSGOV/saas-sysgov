import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const acesso = vi.hoisted(() => ({ permissoes: [] as string[], modulos: [] as string[] }));
vi.mock('@/core/rbac/useCan', () => ({
  useCan: () => ({
    can: (p?: string) => !p || acesso.permissoes.includes(p),
    hasModule: (m?: string) => !m || acesso.modulos.includes(m),
  }),
}));

import { RedirecionaParaEducacao } from '@/core/router/AppRouter';
import { EducacaoHome } from './EducacaoHome';
import { EducacaoShell } from './EducacaoShell';
import { SUBMODULOS_EDUCACAO, rotaPorAlias, ROTA_CADASTRO_ESCOLAR } from './submodulos';

const TODOS = SUBMODULOS_EDUCACAO.map((s) => s.alias);
const liberar = (aliases: string[]) => { acesso.modulos = aliases; acesso.permissoes = aliases.map((a) => `${a}.view`); };

beforeEach(() => liberar(TODOS));

const Local: React.FC = () => { const l = useLocation(); return <p>{`${l.pathname}${l.search}${l.hash}`}</p>; };

describe('Educação — rotas', () => {
  it('as rotas antigas redirecionam para a nova preservando ?aba= e o fragmento', () => {
    render(
      <MemoryRouter initialEntries={['/transporte?aba=custos#parametros']}>
        <Routes>
          <Route path="/transporte" element={<RedirecionaParaEducacao para={rotaPorAlias('transporte')} />} />
          <Route path="*" element={<Local />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('/educacao/transporte?aba=custos#parametros')).toBeInTheDocument();
  });

  it('mapeia cada alias para /educacao/<slug>', () => {
    expect(SUBMODULOS_EDUCACAO.map((s) => rotaPorAlias(s.alias))).toEqual([
      '/educacao/cadastro-escolar', '/educacao/pedagogico', '/educacao/formatura', '/educacao/passeio', '/educacao/portfolio', '/educacao/transporte',
    ]);
    expect(ROTA_CADASTRO_ESCOLAR).toBe('/educacao/cadastro-escolar');
  });

  it('a lista fixa bate com os module.json (pai educacao, slug e rótulo)', () => {
    const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../api/Modules');
    const doBackend = fs.readdirSync(raiz)
      .map((pasta) => path.join(raiz, pasta, 'module.json'))
      .filter((arquivo) => fs.existsSync(arquivo))
      .map((arquivo) => JSON.parse(fs.readFileSync(arquivo, 'utf-8')) as { alias: string; menu?: { parent?: string; slug?: string; label?: string } })
      .filter((m) => m.menu?.parent === 'educacao')
      .map((m) => [m.alias, m.menu?.slug, m.menu?.label]);

    expect(doBackend.sort()).toEqual(SUBMODULOS_EDUCACAO.map((s) => [s.alias, s.slug, s.rotulo]).sort());
  });
});

describe('Educação — página inicial', () => {
  it('lista os seis submódulos para quem tem acesso a todos', () => {
    render(<MemoryRouter><EducacaoHome /></MemoryRouter>);

    const lista = screen.getByRole('list');
    expect(within(lista).getAllByRole('link').map((a) => a.textContent)).toHaveLength(6);
    expect(within(lista).getByRole('link', { name: /Passeios/ })).toHaveAttribute('href', '/educacao/passeio');
  });

  it('lista só o que o usuário pode abrir', () => {
    liberar(['pedagogico', 'transporte']);
    render(<MemoryRouter><EducacaoHome /></MemoryRouter>);

    const links = within(screen.getByRole('list')).getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Gestão Pedagógica/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Transporte Escolar/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Portfólio Digital/ })).not.toBeInTheDocument();
  });

  it('módulo ativo sem permissão não aparece', () => {
    acesso.modulos = TODOS;
    acesso.permissoes = ['escola.view'];
    render(<MemoryRouter><EducacaoHome /></MemoryRouter>);

    expect(within(screen.getByRole('list')).getAllByRole('link')).toHaveLength(1);
  });

  it('sem nenhum acesso, explica', () => {
    liberar([]);
    render(<MemoryRouter><EducacaoHome /></MemoryRouter>);

    expect(screen.getByRole('status')).toHaveTextContent('Você não tem acesso a nenhum submódulo da Educação');
  });
});

describe('Educação — barra de submódulos', () => {
  it('destaca o submódulo atual e permite trocar sem voltar ao menu', () => {
    render(
      <MemoryRouter initialEntries={['/educacao/pedagogico']}>
        <EducacaoShell><p>conteúdo</p></EducacaoShell>
      </MemoryRouter>,
    );

    const barra = screen.getByRole('navigation', { name: 'Submódulos da Educação' });
    expect(within(barra).getByRole('link', { name: 'Gestão Pedagógica' })).toHaveAttribute('aria-current', 'page');
    expect(within(barra).getByRole('link', { name: 'Transporte Escolar' })).toHaveAttribute('href', '/educacao/transporte');
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('mostra só os submódulos permitidos', () => {
    liberar(['escola', 'portfolio']);
    render(<MemoryRouter initialEntries={['/educacao/portfolio']}><EducacaoShell><p>x</p></EducacaoShell></MemoryRouter>);

    const barra = screen.getByRole('navigation', { name: 'Submódulos da Educação' });
    expect(within(barra).getAllByRole('link').map((a) => a.textContent)).toEqual(['Educação', 'Cadastro Escolar', 'Portfólio Digital']);
  });
});
