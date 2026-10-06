import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { compressImage } from '../imageCompression';

/**
 * jsdom não implementa `createImageBitmap`/canvas 2D real — simulamos a API do
 * browser para validar a lógica de redimensionamento (maior lado -> maxDimension)
 * e a chamada correta a `toBlob`, não a decodificação real de imagem.
 */
function mockImagemComDimensoes(width: number, height: number) {
  const bitmap = { width, height, close: vi.fn() };
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));

  const drawImage = vi.fn();
  const toBlob = vi.fn((callback: BlobCallback, type?: string, quality?: number) => {
    callback(new Blob(['fake'], { type: type ?? 'image/jpeg' }));
  });

  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage }),
        toBlob,
      } as unknown as HTMLCanvasElement;
    }
    return originalCreateElement(tag);
  });

  return { bitmap, drawImage, toBlob };
}

describe('campo/imageCompression', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redimensiona pelo maior lado até o limite de 1920px', async () => {
    const { drawImage } = mockImagemComDimensoes(4000, 3000);

    await compressImage(new Blob(['x']));

    // Maior lado 4000 -> escala 1920/4000 = 0.48; 3000 * 0.48 = 1440
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1920, 1440);
  });

  it('não amplia imagens menores que o limite', async () => {
    const { drawImage } = mockImagemComDimensoes(800, 600);

    await compressImage(new Blob(['x']));

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 800, 600);
  });

  it('usa a qualidade informada ao exportar o JPEG', async () => {
    const { toBlob } = mockImagemComDimensoes(1000, 1000);

    const blob = await compressImage(new Blob(['x']), { quality: 0.5 });

    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.5);
    expect(blob).toBeInstanceOf(Blob);
  });
});
