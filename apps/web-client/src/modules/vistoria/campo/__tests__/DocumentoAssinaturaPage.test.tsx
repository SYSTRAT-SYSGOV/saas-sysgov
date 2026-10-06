import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as syncEngine from '../syncEngine';
import { DocumentoAssinaturaPage } from '../DocumentoAssinaturaPage';
import type { Documento } from '../../api';

const documentoMock: Documento = {
  id: 7,
  tenant_id: 1,
  execucao_id: 1,
  autuado_pessoa_id: null,
  tipo: 'auto_infracao',
  numero: 'auto_infracao/1/2026',
  numero_sequencial: 1,
  exercicio: 2026,
  irregularidade: null,
  enquadramento_legal: null,
  prazo_dias: null,
  prazo_limite: null,
  dados_autuado: null,
  caminho_pdf: null,
  assinatura_status: 'pendente',
};

/** jsdom não implementa o construtor global PointerEvent. */
class PointerEventPolyfill extends MouseEvent {
  pointerId: number;
  constructor(type: string, params: MouseEventInit & { pointerId: number }) {
    super(type, params);
    this.pointerId = params.pointerId;
  }
}

function dispararPointer(elemento: Element, tipo: string, coords: { clientX: number; clientY: number }) {
  fireEvent(elemento, new PointerEventPolyfill(tipo, { bubbles: true, cancelable: true, pointerId: 1, ...coords }));
}

describe('DocumentoAssinaturaPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('sysgov_auth_token', 'token-de-teste');
    vi.restoreAllMocks();

    Element.prototype.setPointerCapture = vi.fn();
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,FAKE');
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({ left: 0, top: 0, right: 600, bottom: 200, width: 600, height: 200 });
  });

  it('impede confirmar assinatura sem traçado', async () => {
    const onConcluido = vi.fn();
    render(<DocumentoAssinaturaPage documento={documentoMock} onBack={vi.fn()} onConcluido={onConcluido} />);

    fireEvent.click(screen.getByRole('button', { name: /confirmar assinatura/i }));

    expect(await screen.findByText(/colha a assinatura/i)).toBeInTheDocument();
    expect(onConcluido).not.toHaveBeenCalled();
  });

  it('enfileira a assinatura capturada e chama onConcluido', async () => {
    const spy = vi.spyOn(syncEngine, 'enqueueAssinatura');
    const onConcluido = vi.fn();
    render(<DocumentoAssinaturaPage documento={documentoMock} onBack={vi.fn()} onConcluido={onConcluido} />);

    const canvas = screen.getByRole('img');
    dispararPointer(canvas, 'pointerdown', { clientX: 10, clientY: 10 });
    dispararPointer(canvas, 'pointermove', { clientX: 20, clientY: 20 });
    dispararPointer(canvas, 'pointerup', { clientX: 20, clientY: 20 });

    fireEvent.click(screen.getByRole('button', { name: /confirmar assinatura/i }));

    await waitFor(() => expect(onConcluido).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith(
      documentoMock.id,
      expect.objectContaining({ papel: 'autuado', status: 'assinada', imagemBase64: 'data:image/png;base64,FAKE' }),
    );
  });

  it('exige motivo para confirmar a recusa', async () => {
    render(<DocumentoAssinaturaPage documento={documentoMock} onBack={vi.fn()} onConcluido={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /registrar recusa/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar recusa/i }));

    expect(await screen.findByText(/informe o motivo/i)).toBeInTheDocument();
  });

  it('enfileira a recusa com o motivo informado', async () => {
    const spy = vi.spyOn(syncEngine, 'enqueueAssinatura');
    const onConcluido = vi.fn();
    render(<DocumentoAssinaturaPage documento={documentoMock} onBack={vi.fn()} onConcluido={onConcluido} />);

    fireEvent.click(screen.getByRole('button', { name: /registrar recusa/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Recusou-se sem justificativa.' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar recusa/i }));

    await waitFor(() => expect(onConcluido).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith(
      documentoMock.id,
      expect.objectContaining({ status: 'recusada', motivo: 'Recusou-se sem justificativa.' }),
    );
  });
});
