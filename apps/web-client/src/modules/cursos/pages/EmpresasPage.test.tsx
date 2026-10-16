import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const cursosApi = vi.hoisted(() => ({
  listarEmpresas: vi.fn(),
  criarEmpresa: vi.fn(),
  atualizarEmpresa: vi.fn(),
  excluirEmpresa: vi.fn(),
  listarTextos: vi.fn(),
  criarTexto: vi.fn(),
  atualizarTexto: vi.fn(),
  excluirTexto: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { EmpresasPage } from './EmpresasPage';
import { TextosPage } from './TextosPage';

const VARIAVEIS = ['NOME', 'CPF', 'EMPRESA', 'CNPJ', 'CURSO', 'CARGA_HORARIA', 'DATA', 'DATA_CONCLUSAO', 'CODIGO_CERTIFICADO', 'RESPONSAVEL', 'CONTEUDO_PROGRAMATICO'];

beforeEach(() => {
  vi.clearAllMocks();
  cursosApi.listarEmpresas.mockResolvedValue({
    empresas: [{ id: 1, razao_social: 'Construtora Pinheiro Ltda.', nome_fantasia: 'Pinheiro', cnpj: '11222333000181', email: null, telefone: null, responsavel: null, observacoes: null, ativa: true }],
  });
  cursosApi.criarEmpresa.mockResolvedValue({ id: 2 });
  cursosApi.listarTextos.mockResolvedValue({ textos: [], campos: VARIAVEIS });
});

describe('Empresas', () => {
  it('lista com o CNPJ mascarado e cadastra a empresa nova', async () => {
    render(<EmpresasPage />);
    expect(await screen.findByText('11.222.333/0001-81')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Razão social/), { target: { value: 'Comércio Araucária' } });
    fireEvent.change(screen.getByLabelText(/^CNPJ/), { target: { value: '11.444.777/0001-61' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar empresa/ }));

    await waitFor(() => expect(cursosApi.criarEmpresa).toHaveBeenCalledWith(expect.objectContaining({ razao_social: 'Comércio Araucária', cnpj: '11.444.777/0001-61', nome_fantasia: null })));
  });
});

describe('Textos — variáveis do sistema de referência', () => {
  it('mostra as variáveis {NOME}… e insere a escolhida no texto', async () => {
    render(<TextosPage />);
    expect(await screen.findByText('Variáveis disponíveis:')).toBeInTheDocument();
    for (const v of VARIAVEIS) expect(screen.getByRole('button', { name: `{${v}}` })).toBeInTheDocument();

    const principal = screen.getByLabelText(/Texto principal/) as HTMLTextAreaElement;
    fireEvent.change(principal, { target: { value: 'Certificamos que ' } });
    principal.setSelectionRange(17, 17);
    fireEvent.click(screen.getByRole('button', { name: '{NOME}' }));

    expect(principal.value).toBe('Certificamos que {NOME}');
  });
});
