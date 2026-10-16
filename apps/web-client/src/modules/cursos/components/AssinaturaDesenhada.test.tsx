import React, { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AssinaturaDesenhada } from './AssinaturaDesenhada';

describe('AssinaturaDesenhada', () => {
  afterEach(() => vi.restoreAllMocks());

  it('em StrictMode a escala do traço não acumula (efeito rodando duas vezes)', () => {
    const ctx = { setTransform: vi.fn(), scale: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

    render(
      <StrictMode>
        <AssinaturaDesenhada />
      </StrictMode>,
    );

    expect(ctx.scale).not.toHaveBeenCalled();
    expect(ctx.setTransform).toHaveBeenCalled();
    for (const chamada of ctx.setTransform.mock.calls) expect(chamada).toEqual([3, 0, 0, 3, 0, 0]);
  });
});
