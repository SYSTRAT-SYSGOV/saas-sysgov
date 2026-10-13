import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({
  obter: vi.fn(), pendentes: vi.fn(), assinar: vi.fn(), salvarRascunho: vi.fn(), salvarTexto: vi.fn(), finalizar: vi.fn(), pdf: vi.fn(), previewPdf: vi.fn(),
}));
const validacao = vi.hoisted(() => ({ validar: vi.fn() }));

vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), ataApi: api, validacaoApi: validacao }));
// TinyMCE não roda no jsdom: o editor vira um <textarea> com o mesmo contrato (value/onChange/disabled).
vi.mock('@sysgov/ui', async (original) => ({
  ...(await original<typeof import('@sysgov/ui')>()),
  RichTextEditor: ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => (
    <textarea aria-label="Texto da ata" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import type { AtaDetalhe, Opcoes } from './api';
import { EditorAta, anexarDitado, anexarIa } from './components/EditorAta';
import { AssinarModal } from './components/AssinarModal';
import { ValidarAtaPage } from './pages/ValidarAtaPage';

/** O Select do Radix rola até a opção e checa o ponteiro: o jsdom não tem essas APIs. */
Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const opcoes: Opcoes = {
  tipos: [], secretarias: [], ia_disponivel: false, modos_ia: [{ valor: 2, rotulo: 'Texto formal (ata padrão)' }],
  permissoes: { criar: true, gerenciar: false, auditar: false }, redator_sugerido: 'Maria',
};

const ata = (extra: Partial<AtaDetalhe> = {}): AtaDetalhe => ({
  id: 9, numero: '03/2026', titulo: 'Reunião do conselho', secretaria: { id: 1, nome: 'Secretaria de Educação' }, tipo: null, sigilosa: false,
  status: 'em_redacao', status_rotulo: 'Em redação', pode_abrir: true, data_reuniao: '2026-10-12T14:00', autor: 'Maria', assinaturas: { feitas: 0, total: 2 },
  criado_em: null, local: 'Sala 1', cidade: 'Cidade', redator: 'Maria', conteudo_html: '<p>Texto</p>', codigo_validacao: 'ATA-2026-0123456789ABCDEF',
  tem_pdf: false, rascunho_em: null, finalizada_em: null, editavel: true, aceita_assinatura: false, ia_disponivel: false,
  participantes: [
    { id: 1, pessoa_id: null, nome: 'Ana Souza', cargo: null, assinou: true, assinado_em: '2026-10-12T15:00:00Z' },
    { id: 2, pessoa_id: null, nome: 'Bruno Lima', cargo: null, assinou: false, assinado_em: null },
  ],
  ...extra,
});

beforeEach(() => vi.clearAllMocks());

describe('Texto da ata', () => {
  it('ditado entra no fim do último parágrafo, escapado', () => {
    expect(anexarDitado('<p>Abertura</p>', 'pauta <aprovada>')).toBe('<p>Abertura pauta &lt;aprovada&gt;</p>');
    expect(anexarDitado('', 'início')).toBe('<p>início</p>');
  });

  it('IA: texto anterior fica em vermelho e o gerado entra depois', () => {
    expect(anexarIa('<p>Velho</p>', '<p>Novo</p>')).toBe('<div style="color: #ef4444"><p>Velho</p></div><p><strong>[Texto gerado pelo Assistente IA]</strong></p><p>Novo</p>');
    expect(anexarIa('<p></p>', '<p>Novo</p>')).toBe('<p><strong>[Texto gerado pelo Assistente IA]</strong></p><p>Novo</p>');
  });
});

describe('Editor — padrão de ata', () => {
  it('em redação: texto editável, Salvar rascunho disponível e Finalizar bloqueado', async () => {
    api.obter.mockResolvedValue(ata());
    render(<EditorAta id={9} opcoes={opcoes} avisar={vi.fn()} aoVoltar={vi.fn()} />);
    expect(await screen.findByLabelText('Texto da ata')).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Salvar rascunho/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Finalizar e salvar PDF/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Assistente IA/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Assinar/ })).not.toBeInTheDocument();
  });

  it('salvar rascunho pede confirmação e trava o texto', async () => {
    api.obter.mockResolvedValue(ata());
    api.salvarRascunho.mockResolvedValue(ata({ status: 'rascunho', status_rotulo: 'Rascunho (aguardando assinaturas)', editavel: false, aceita_assinatura: true }));
    render(<EditorAta id={9} opcoes={opcoes} avisar={vi.fn()} aoVoltar={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Salvar rascunho/ }));
    expect(screen.getByText(/ficam travados/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Salvar e travar o texto/ }));

    await waitFor(() => expect(api.salvarRascunho).toHaveBeenCalledWith(9, '<p>Texto</p>'));
    expect(await screen.findByLabelText('Texto da ata')).toHaveAttribute('aria-readonly', 'true');
    expect(screen.queryByRole('button', { name: /Salvar rascunho/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Digitação por voz/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Assinar \(1\)/ })).toBeEnabled();
  });

  it('rascunho com todas as assinaturas libera Finalizar', async () => {
    api.obter.mockResolvedValue(ata({
      status: 'rascunho', status_rotulo: 'Rascunho', editavel: false, aceita_assinatura: true,
      participantes: [{ id: 1, pessoa_id: null, nome: 'Ana Souza', cargo: null, assinou: true, assinado_em: 'x' }],
    }));
    render(<EditorAta id={9} opcoes={opcoes} avisar={vi.fn()} aoVoltar={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /Finalizar e salvar PDF/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Assinar \(0\)/ })).toBeDisabled();
  });

  it('finalizada: só Baixar PDF, Ver PDF e Imprimir', async () => {
    api.obter.mockResolvedValue(ata({ status: 'finalizada', status_rotulo: 'Finalizada', editavel: false, aceita_assinatura: false, tem_pdf: true }));
    render(<EditorAta id={9} opcoes={opcoes} avisar={vi.fn()} aoVoltar={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /Baixar PDF/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Imprimir/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Assinar/ })).not.toBeInTheDocument();
    expect(screen.getByText('ATA-2026-0123456789ABCDEF')).toBeInTheDocument();
  });
});

describe('Assinatura', () => {
  it('a seleção lista só quem ainda não assinou', async () => {
    api.pendentes.mockResolvedValue([{ id: 2, nome: 'Bruno Lima', cargo: null }]);
    render(<AssinarModal ataId={9} aoFechar={vi.fn()} aoAssinar={vi.fn()} />);
    await waitFor(() => expect(api.pendentes).toHaveBeenCalledWith(9));
    fireEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: 'Bruno Lima' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Ana Souza' })).not.toBeInTheDocument();
  });

  it('todas colhidas: avisa e não oferece seleção', async () => {
    api.pendentes.mockResolvedValue([]);
    render(<AssinarModal ataId={9} aoFechar={vi.fn()} aoAssinar={vi.fn()} />);
    expect(await screen.findByText('Todas as assinaturas já foram colhidas.')).toBeInTheDocument();
  });
});

describe('Validação pública', () => {
  it('mostra o documento autêntico pelo link do QR Code', async () => {
    validacao.validar.mockResolvedValue({ valido: true, mensagem: 'Documento autêntico, gerado digitalmente pelo sistema oficial.', numero: '03/2026', secretaria: 'Secretaria de Educação', codigo: 'ATA-2026-0123456789ABCDEF', sigilosa: true, titulo: null, redator: null, finalizada_em: null });
    render(<MemoryRouter initialEntries={['/validar-ata/prefeitura-a/ATA-2026-0123456789ABCDEF']}><Routes><Route path="/validar-ata/:tenantSlug/:codigo?" element={<ValidarAtaPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(/Documento autêntico/)).toBeInTheDocument();
    expect(validacao.validar).toHaveBeenCalledWith('prefeitura-a', 'ATA-2026-0123456789ABCDEF');
    expect(screen.getByText(/título e o redator não são exibidos/)).toBeInTheDocument();
  });
});
