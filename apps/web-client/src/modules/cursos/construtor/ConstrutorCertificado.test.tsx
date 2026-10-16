import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CatalogoLeiaute, ElementoLeiaute, ModeloCertificado } from '@sysgov/sdk';

const cursosApi = vi.hoisted(() => ({
  listarAssinaturas: vi.fn(),
  atualizarModelo: vi.fn(),
  preVisualizarModelo: vi.fn(),
  enviarFundo: vi.fn(),
  enviarVersoFundo: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { ConstrutorCertificado } from './ConstrutorCertificado';

const qr: ElementoLeiaute = { id: 'qr', tipo: 'qrcode', x: 60, y: 445, largura: 90 };
const nome: ElementoLeiaute = {
  id: 'nome', tipo: 'texto', campo: 'participante', texto: null, x: 100, y: 200, largura: 600,
  fonte: 'sans', tamanho: 24, cor: '#1b2a41', negrito: true, caixa_alta: true, alinhamento: 'centro',
};

const catalogo: CatalogoLeiaute = {
  paginas: { paisagem: [842, 595], retrato: [595, 842] },
  campos: ['participante', 'curso', 'codigo'],
  campos_texto_livre: ['participante', 'orgao', 'data_emissao', 'codigo'],
  fontes: ['sans', 'serif'],
  alinhamentos: ['esquerda', 'centro', 'direita', 'justificado'],
  max_elementos: 40, tamanho_min: 6, tamanho_max: 72,
  padrao: { paisagem: [qr], retrato: [qr] },
};

const modelo = (elementos: ElementoLeiaute[]): ModeloCertificado => ({
  id: 7, nome: 'Visual', tipo: 'visual', orientacao: 'paisagem', titulo: 'Certificado', corpo: 'Texto',
  logotipo_path: null, logotipo_url: null, fundo_url: null, elementos, verso_ativo: false, verso_fundo_url: null,
  assinaturas: null, padrao: false,
});

beforeAll(() => {
  // jsdom não tem PointerEvent: sem isto, clientX/clientY chegam vazios.
  if (!('PointerEvent' in globalThis)) {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      constructor(tipo: string, init: PointerEventInit = {}) {
        super(tipo, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }
    globalThis.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
  }
  globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} } as unknown as typeof ResizeObserver;
  Element.prototype.setPointerCapture = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  cursosApi.listarAssinaturas.mockResolvedValue({ assinaturas: [] });
  cursosApi.atualizarModelo.mockImplementation(async (_id: number, dados: { elementos: ElementoLeiaute[] }) => modelo(dados.elementos));
});

const ultimoSalvo = (): ElementoLeiaute[] => cursosApi.atualizarModelo.mock.calls.at(-1)![1].elementos;

describe('Construtor visual de certificado', () => {
  it('desenha os campos com valores de exemplo', () => {
    render(<ConstrutorCertificado modelo={modelo([qr, nome])} catalogo={catalogo} onVoltar={vi.fn()} onSalvo={vi.fn()} />);
    expect(screen.getByText('MARIA DA SILVA EXEMPLO')).toBeInTheDocument();
  });

  it('arrastar move o elemento em pontos e salvar envia a nova posição', async () => {
    render(<ConstrutorCertificado modelo={modelo([qr, nome])} catalogo={catalogo} onVoltar={vi.fn()} onSalvo={vi.fn()} />);
    const elemento = screen.getByRole('button', { name: 'Elemento Nome do participante' });

    // Escala mínima (0,3 px/pt): 30 px à direita = 100 pt; 15 px para baixo = 50 pt.
    fireEvent.pointerDown(elemento, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(elemento, { clientX: 40, clientY: 25, pointerId: 1 });
    fireEvent.pointerUp(elemento, { pointerId: 1 });

    fireEvent.click(screen.getByRole('button', { name: /Salvar leiaute/ }));
    await waitFor(() => expect(cursosApi.atualizarModelo).toHaveBeenCalled());
    expect(ultimoSalvo().find((e) => e.id === 'nome')).toMatchObject({ x: 200, y: 250 });
    expect(cursosApi.atualizarModelo.mock.calls[0][1]).toMatchObject({ tipo: 'visual', orientacao: 'paisagem', verso_ativo: false });
  });

  it('setas fazem ajuste fino e Delete remove o elemento', async () => {
    render(<ConstrutorCertificado modelo={modelo([qr, nome])} catalogo={catalogo} onVoltar={vi.fn()} onSalvo={vi.fn()} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elemento Nome do participante' }), { clientX: 0, clientY: 0, pointerId: 1 });
    const pagina = screen.getByLabelText('Página do certificado');

    fireEvent.keyDown(pagina, { key: 'ArrowRight' });
    fireEvent.keyDown(pagina, { key: 'ArrowDown', shiftKey: true });
    fireEvent.click(screen.getByRole('button', { name: /Salvar leiaute/ }));
    await waitFor(() => expect(cursosApi.atualizarModelo).toHaveBeenCalledTimes(1));
    expect(ultimoSalvo().find((e) => e.id === 'nome')).toMatchObject({ x: 101, y: 210 });

    fireEvent.keyDown(pagina, { key: 'Delete' });
    fireEvent.click(screen.getByRole('button', { name: /Salvar leiaute/ }));
    await waitFor(() => expect(cursosApi.atualizarModelo).toHaveBeenCalledTimes(2));
    expect(ultimoSalvo().map((e) => e.id)).toEqual(['qr']);
  });

  it('sem QR code não deixa salvar e avisa', () => {
    render(<ConstrutorCertificado modelo={modelo([nome])} catalogo={catalogo} onVoltar={vi.fn()} onSalvo={vi.fn()} />);
    expect(screen.getByText('Adicione o QR code de validação.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar leiaute/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /QR code/ }));
    expect(screen.queryByText('Adicione o QR code de validação.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar leiaute/ })).toBeEnabled();
  });

  it('alterar propriedades do texto no painel', async () => {
    render(<ConstrutorCertificado modelo={modelo([qr, nome])} catalogo={catalogo} onVoltar={vi.fn()} onSalvo={vi.fn()} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elemento Nome do participante' }), { clientX: 0, clientY: 0, pointerId: 1 });

    fireEvent.change(screen.getByLabelText('Tamanho fonte (pt)'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Largura caixa'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar leiaute/ }));
    await waitFor(() => expect(cursosApi.atualizarModelo).toHaveBeenCalled());
    // Largura limitada à página: 842 pt, e x recuado para caber.
    expect(ultimoSalvo().find((e) => e.id === 'nome')).toMatchObject({ tamanho: 30, largura: 842, x: 0 });
  });
});
