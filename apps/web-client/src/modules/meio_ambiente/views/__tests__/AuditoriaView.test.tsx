import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuditoriaView, camposAlterados } from '../AuditoriaView';
import { meioAmbienteApi, type RegistroAuditoria, type TrilhaAuditoria } from '../../api';

const cumprida: RegistroAuditoria = {
  id: 2,
  modulo: 'meio_ambiente',
  acao: 'condicionante.cumprida',
  recurso: 'Condicionante #3 (ProcessoLicenciamento #1)',
  usuario: { id: 7, nome: 'Ana Auditora' },
  antes: { situacao: 'pendente', cumprida_em: null, updated_at: '2026-10-01' },
  depois: { situacao: 'cumprida', cumprida_em: '2026-10-09', updated_at: '2026-10-09' },
  ip: '10.0.0.1',
  registrado_em: '2026-10-09T10:00:00-03:00',
};

const trilhaMock: TrilhaAuditoria = {
  referencia: { tipo: 'processo_licenciamento', id: 1, numero: 'LP/2026/0001' },
  auditoria: [
    { ...cumprida, id: 1, acao: 'processo_licenciamento.aberto', recurso: 'ProcessoLicenciamento #1', antes: null, depois: { status: 'em_analise' } },
    cumprida,
    { ...cumprida, id: 3, modulo: 'vistoria', acao: 'processo_sancionatorio.julgado', usuario: null, antes: null, depois: null },
  ],
};

describe('AuditoriaView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(meioAmbienteApi, 'obterTrilhaAuditoria').mockResolvedValue(trilhaMock);
  });

  it('consulta a trilha e mostra usuário, ações e só os campos alterados', async () => {
    render(<AuditoriaView />);

    fireEvent.change(screen.getByLabelText('ID'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));

    await waitFor(() => expect(screen.getByText('condicionante.cumprida')).toBeInTheDocument());
    expect(meioAmbienteApi.obterTrilhaAuditoria).toHaveBeenCalledWith('processo_licenciamento', 1);
    expect(screen.getByText('LP/2026/0001')).toBeInTheDocument();
    expect(screen.getAllByText('Ana Auditora')).toHaveLength(2);
    expect(screen.getByText('Sistema')).toBeInTheDocument();
    expect(screen.getByText('Vistoria')).toBeInTheDocument();
    expect(screen.getByText('situacao')).toBeInTheDocument();
    expect(screen.queryByText('updated_at')).not.toBeInTheDocument();
  });

  it('mostra a mensagem de erro da API (ex.: sem permissão)', async () => {
    vi.spyOn(meioAmbienteApi, 'obterTrilhaAuditoria').mockRejectedValue({ response: { data: { message: 'This action is unauthorized.' } } });
    render(<AuditoriaView />);

    fireEvent.change(screen.getByLabelText('ID'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));

    await waitFor(() => expect(screen.getByText('This action is unauthorized.')).toBeInTheDocument());
  });

  it('camposAlterados ignora registros de criação e o updated_at', () => {
    expect(camposAlterados(trilhaMock.auditoria[0])).toEqual([]);
    expect(camposAlterados(cumprida).map((c) => c.campo)).toEqual(['situacao', 'cumprida_em']);
  });
});
