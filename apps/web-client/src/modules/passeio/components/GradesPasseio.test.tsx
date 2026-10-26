import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { acionarMenu } from '@/test-utils/acoesMenu';

const api = vi.hoisted(() => ({ excluirPasseio: vi.fn(), excluirInscricao: vi.fn(), atualizarInscricao: vi.fn() }));
vi.mock('../api', async (original) => ({ ...(await original<typeof import('../api')>()), passeioApi: api }));

import { passeio, propsAba } from '../fixtures.test-utils';
import { PasseiosLista } from './PasseiosLista';
import { InscricoesTermos } from './InscricoesTermos';

beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.scrollIntoView = vi.fn();
});
beforeEach(() => vi.clearAllMocks());

const propsLista = (passeios: boolean, extra: Partial<React.ComponentProps<typeof PasseiosLista>> = {}): React.ComponentProps<typeof PasseiosLista> => ({
  passeios: [passeio], ativoId: 7, permissoes: { passeios, frota: false }, avisar: vi.fn(), recarregar: vi.fn().mockResolvedValue(undefined), selecionar: vi.fn(), ...extra,
});

describe('Grade de passeios', () => {
  it('lista o passeio com valor, destino e a marca "Em uso" no ativo, e exporta', () => {
    render(<PasseiosLista {...propsLista(true)} />);
    expect(screen.getByRole('button', { name: 'Trabalhar no passeio Museu Oscar Niemeyer' })).toBeInTheDocument();
    expect(screen.getByText('Em uso')).toBeInTheDocument();
    expect(screen.getByText('R$ 45,00')).toBeInTheDocument();
    expect(screen.getByText('Profa. Ana')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();
  });

  it('seleciona o passeio pelo nome', () => {
    const props = propsLista(true, { ativoId: null });
    render(<PasseiosLista {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Trabalhar no passeio Museu Oscar Niemeyer' }));
    expect(props.selecionar).toHaveBeenCalledWith(passeio);
    expect(screen.queryByText('Em uso')).not.toBeInTheDocument();
  });

  it('edita e exclui pelo menu da linha; excluir pede confirmação', async () => {
    api.excluirPasseio.mockResolvedValue(undefined);
    const props = propsLista(true);
    render(<PasseiosLista {...props} />);

    await acionarMenu(/Ações de Museu Oscar Niemeyer/, 'Editar');
    expect(await screen.findByText('Editar passeio')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await acionarMenu(/Ações de Museu Oscar Niemeyer/, 'Excluir');
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(api.excluirPasseio).toHaveBeenCalledWith(7));
    expect(props.recarregar).toHaveBeenCalled();
  });

  it('Apoio vê a lista sem o menu de ações', () => {
    render(<PasseiosLista {...propsLista(false)} />);
    expect(screen.getByText('Museu Oscar Niemeyer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ações de/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo passeio' })).not.toBeInTheDocument();
  });
});

describe('Grade de inscrições', () => {
  it('remove o aluno pelo menu da linha, depois de confirmar, e usa a exportação da grade', async () => {
    api.excluirInscricao.mockResolvedValue(undefined);
    const props = propsAba();
    render(<InscricoesTermos {...props} />);

    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exportar CSV' })).not.toBeInTheDocument();

    await acionarMenu(/Ações de BRUNO LIMA/, 'Remover do passeio');
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Remover' }));
    await waitFor(() => expect(api.excluirInscricao).toHaveBeenCalledWith(2));
    expect(props.recarregar).toHaveBeenCalled();
  });

  it('observação abre pelo menu e grava na inscrição', async () => {
    api.atualizarInscricao.mockResolvedValue({});
    render(<InscricoesTermos {...propsAba()} />);

    await acionarMenu(/Ações de ALICIA SOUZA/, 'Observação');
    const campo = await screen.findByLabelText('Observação da inscrição');
    fireEvent.change(campo, { target: { value: 'alergia a amendoim' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api.atualizarInscricao).toHaveBeenCalledWith(1, { observacao: 'alergia a amendoim' }));
  });
});
