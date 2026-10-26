import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({
  listar: vi.fn(), tipos: vi.fn(), salvarTipo: vi.fn(), excluirTipo: vi.fn(), secretarias: vi.fn(), auditoria: vi.fn(),
}));

vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), ataApi: api }));

import type { AtaResumo, Opcoes } from './api';
import { PainelAtas } from './components/PainelAtas';
import { TiposAta } from './components/TiposAta';
import { SecretariasAta } from './components/SecretariasAta';
import { AuditoriaAta } from './components/AuditoriaAta';

const opcoes: Opcoes = {
  tipos: [], secretarias: [], ia_disponivel: false, modos_ia: [],
  permissoes: { criar: true, gerenciar: true, auditar: true }, redator_sugerido: 'Maria',
};

const ata = (id: number, titulo: string, extra: Partial<AtaResumo> = {}): AtaResumo => ({
  id, numero: `0${id}/2026`, titulo, secretaria: { id: 1, nome: 'Secretaria de Educação' }, tipo: { id: 1, nome: 'Ata do conselho' }, sigilosa: false,
  status: 'em_redacao', status_rotulo: 'Em redação', pode_abrir: true, data_reuniao: '2026-10-12T14:00', autor: 'Maria', assinaturas: { feitas: 1, total: 3 },
  criado_em: null, ...extra,
});

beforeEach(() => vi.clearAllMocks());

describe('Grades do módulo Atas (DataTable padrão)', () => {
  it('painel de atas: ação "Abrir" só aparece para quem pode abrir e a grade exporta', async () => {
    api.listar.mockResolvedValue({
      data: [ata(1, 'Reunião do conselho'), ata(2, 'Ata sigilosa', { sigilosa: true, pode_abrir: false })],
      indicadores: { total: 2, em_redacao: 2, rascunhos: 0, finalizadas: 0, sigilosas: 1 },
    });
    const abrir = vi.fn();
    render(<PainelAtas opcoes={opcoes} avisar={vi.fn()} abrir={abrir} />);

    expect(await screen.findByText('Reunião do conselho')).toBeInTheDocument();
    expect(screen.getByText('Ata sigilosa')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Abrir$/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Abrir$/ }));
    expect(abrir).toHaveBeenCalledWith(1);
  });

  it('painel de atas: clicar na linha de ata sem permissão não abre', async () => {
    api.listar.mockResolvedValue({
      data: [ata(2, 'Ata sigilosa', { sigilosa: true, pode_abrir: false })],
      indicadores: { total: 1, em_redacao: 1, rascunhos: 0, finalizadas: 0, sigilosas: 1 },
    });
    const abrir = vi.fn();
    render(<PainelAtas opcoes={opcoes} avisar={vi.fn()} abrir={abrir} />);

    fireEvent.click(await screen.findByText('Ata sigilosa'));
    expect(abrir).not.toHaveBeenCalled();
  });

  it('tipos de ata: exclui pela ação da linha e alterna o ativo pelo switch', async () => {
    api.tipos.mockResolvedValue([{ id: 1, nome: 'Ata do conselho', ativo: true }, { id: 2, nome: 'Assembleia', ativo: false }]);
    api.excluirTipo.mockResolvedValue(undefined);
    api.salvarTipo.mockResolvedValue(undefined);
    render(<TiposAta avisar={vi.fn()} aoMudar={vi.fn()} />);

    expect(await screen.findByText('Assembleia')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Ativar Assembleia' }));
    await waitFor(() => expect(api.salvarTipo).toHaveBeenCalledWith({ id: 2, nome: 'Assembleia', ativo: true }));

    fireEvent.click(screen.getAllByRole('button', { name: /^Excluir$/ })[0]);
    await waitFor(() => expect(api.excluirTipo).toHaveBeenCalledWith(1));
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();
  });

  it('secretarias: "Configurar" abre a configuração da secretaria', async () => {
    api.secretarias.mockResolvedValue([{ id: 7, nome: 'Secretaria de Obras', sigla: 'SEMOB', tem_timbrado: false }]);
    render(<SecretariasAta avisar={vi.fn()} />);

    expect(await screen.findByText('SEMOB')).toBeInTheDocument();
    expect(screen.getByText('Sem timbrado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Configurar$/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('auditoria: traduz a ação, resume os detalhes e pede 50 por página ao servidor', async () => {
    api.auditoria.mockResolvedValue({
      data: [{ id: 1, data: '2026-10-12T14:00:00Z', usuario: 'Maria', acao: 'ata.criada', recurso: 'ata:9', detalhes: { numero: 3, ano: 2026, titulo: 'Reunião do conselho' }, ip: null }],
      current_page: 1, last_page: 1, total: 1,
    });
    render(<AuditoriaAta />);

    expect(await screen.findByText('Criou a ata')).toBeInTheDocument();
    expect(screen.getByText('03/2026 — Reunião do conselho')).toBeInTheDocument();
    expect(api.auditoria).toHaveBeenCalledWith({ acao: undefined, page: 1, per_page: 50 });
  });
});
