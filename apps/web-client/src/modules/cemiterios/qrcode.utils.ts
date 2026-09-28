// Gerador de QR Code 100% autônomo em TypeScript (Zero dependências externas)
// Compatível com navegadores, Vite HMR, Docker e ambientes de teste (Node / jsdom)

export interface QrCodeOpcoes {
  largura?: number;
  margem?: number;
  corEscura?: string;
  corClara?: string;
}

/**
 * Monta a URL canônica de consulta para identificação pública/fiscal da unidade de sepultamento.
 */
export function gerarUrlConsultaJazigo(params: {
  id: number;
  codigo: string;
  origem?: string;
}): string {
  const baseOrigem =
    params.origem || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = new URL('/cemiterios', baseOrigem || 'https://sysgov.gov.br');
  url.searchParams.set('plot_id', String(params.id));
  url.searchParams.set('codigo', params.codigo);
  return url.toString();
}

/* ------------------------------------------------------------------ */
/* Algoritmo Minimalista e Robusto de Geração de Matriz QR Code       */
/* ------------------------------------------------------------------ */

// Galois Field GF(256) Math
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

for (let i = 0, x = 1; i < 255; i++) {
  EXP_TABLE[i] = x;
  EXP_TABLE[i + 255] = x;
  LOG_TABLE[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}

function gmult(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

// Reed-Solomon polynomial generator
function rsGeneratorPoly(numEccBytes: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < numEccBytes; i++) {
    const nextPoly = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= gmult(poly[j], EXP_TABLE[i]);
      nextPoly[j + 1] ^= poly[j];
    }
    poly = nextPoly;
  }
  return poly;
}

// Reed-Solomon encoding
function rsEncode(data: Uint8Array, numEccBytes: number): Uint8Array {
  const genPoly = rsGeneratorPoly(numEccBytes);
  const ecc = new Uint8Array(numEccBytes);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ ecc[0];
    ecc.copyWithin(0, 1);
    ecc[numEccBytes - 1] = 0;
    for (let j = 0; j < numEccBytes; j++) {
      ecc[j] ^= gmult(genPoly[j], factor);
    }
  }
  return ecc;
}

// Capacidades de dados por versão para nível M (Medium - 15% recuperação)
// Cada entrada: [versão (1..10), totalCodewords, eccCodewords, numBlocks]
const QR_SPECS_M: [number, number, number, number][] = [
  [1, 26, 10, 1],
  [2, 44, 16, 1],
  [3, 70, 26, 1],
  [4, 100, 18, 2],
  [5, 134, 24, 2],
  [6, 172, 16, 4],
  [7, 196, 18, 4],
  [8, 242, 22, 4],
  [9, 292, 22, 5],
  [10, 346, 26, 5],
];

// Posições centrais dos padrões de alinhamento por versão
const ALIGNMENT_POS: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

/**
 * Cria a matriz booleana (true = escuro, false = claro) para o texto fornecido.
 */
export function criarMatrizQrCode(texto: string): boolean[][] {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(texto);

  // Selecionar versão adequada (suporta textos normais até ~180 caracteres em UTF-8)
  let spec = QR_SPECS_M[0];
  let versao = 1;
  let dataCodewordsCount = 0;

  for (const s of QR_SPECS_M) {
    const [ver, total, ecc] = s;
    const dataCap = total - ecc;
    // Overhead do modo byte: 4 bits (modo) + 8 ou 16 bits (tamanho)
    const countBits = ver <= 9 ? 8 : 16;
    const requiredBits = 4 + countBits + rawBytes.length * 8;
    if (requiredBits <= dataCap * 8) {
      spec = s;
      versao = ver;
      dataCodewordsCount = dataCap;
      break;
    }
  }

  if (dataCodewordsCount === 0) {
    spec = QR_SPECS_M[QR_SPECS_M.length - 1];
    versao = spec[0];
    dataCodewordsCount = spec[1] - spec[2];
  }

  const [_, totalCodewords, eccPerBlock, numBlocks] = spec;
  const countBits = versao <= 9 ? 8 : 16;

  // Montagem do bitstream
  const bits: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  // Modo byte (0100)
  pushBits(0b0100, 4);
  pushBits(rawBytes.length, countBits);
  for (const b of rawBytes) {
    pushBits(b, 8);
  }

  // Terminador
  const maxDataBits = dataCodewordsCount * 8;
  const padLen = Math.min(4, maxDataBits - bits.length);
  pushBits(0, padLen);

  // Alinhar a byte
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Preencher com bytes alternados 0xEC e 0x11
  const dataBytes = new Uint8Array(dataCodewordsCount);
  for (let i = 0; i < bits.length / 8; i++) {
    let byteVal = 0;
    for (let j = 0; j < 8; j++) {
      byteVal = (byteVal << 1) | bits[i * 8 + j];
    }
    dataBytes[i] = byteVal;
  }

  let padIndex = 0;
  for (let i = bits.length / 8; i < dataCodewordsCount; i++) {
    dataBytes[i] = padIndex % 2 === 0 ? 0xec : 0x11;
    padIndex++;
  }

  // Divisão em blocos e cálculo de Reed-Solomon ECC
  const blockSize = Math.floor(dataCodewordsCount / numBlocks);
  const extraBlocks = dataCodewordsCount % numBlocks;

  const dataBlocks: Uint8Array[] = [];
  const eccBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let b = 0; b < numBlocks; b++) {
    const curSize = blockSize + (b >= numBlocks - extraBlocks ? 1 : 0);
    const slice = dataBytes.slice(offset, offset + curSize);
    dataBlocks.push(slice);
    eccBlocks.push(rsEncode(slice, eccPerBlock));
    offset += curSize;
  }

  // Intercalação de dados e ECC
  const finalCodewords: number[] = [];
  const maxBlockLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (const b of dataBlocks) {
      if (i < b.length) finalCodewords.push(b[i]);
    }
  }
  for (let i = 0; i < eccPerBlock; i++) {
    for (const eb of eccBlocks) {
      finalCodewords.push(eb[i]);
    }
  }

  // Dimensão da matriz: 17 + 4 * versão
  const size = 17 + 4 * versao;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  );
  const isReserved: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  function setModule(r: number, c: number, isDark: boolean, reserved = true) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = isDark;
      if (reserved) isReserved[r][c] = true;
    }
  }

  // Padrões de localização (Finder patterns 7x7) nos cantos
  function addFinderPattern(startR: number, startC: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = startR + r;
        const col = startC + c;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        const isDark = (r >= 0 && r <= 6 && c >= 0 && c <= 6) && (isBorder || isCenter);
        setModule(row, col, isDark, true);
      }
    }
  }

  addFinderPattern(0, 0);
  addFinderPattern(0, size - 7);
  addFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setModule(6, i, i % 2 === 0, true);
    setModule(i, 6, i % 2 === 0, true);
  }

  // Alignment patterns para versão >= 2
  const alignCoords = ALIGNMENT_POS[versao] || [];
  for (const r of alignCoords) {
    for (const c of alignCoords) {
      if (isReserved[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isDark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setModule(r + dr, c + dc, isDark, true);
        }
      }
    }
  }

  // Ponto negro fixo
  setModule(4 * versao + 9, 8, true, true);

  // Reserva de linhas de formato
  for (let i = 0; i < 9; i++) {
    if (!isReserved[8][i]) isReserved[8][i] = true;
    if (!isReserved[i][8]) isReserved[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    if (!isReserved[8][i]) isReserved[8][i] = true;
    if (!isReserved[i][8]) isReserved[i][8] = true;
  }

  // Disposição dos dados (ziguezague de 2 colunas da direita para a esquerda)
  let cwIndex = 0;
  let bitIdx = 7;
  let upward = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Pular coluna de temporização vertical
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (isReserved[r][c]) continue;
        let isDark = false;
        if (cwIndex < finalCodewords.length) {
          isDark = ((finalCodewords[cwIndex] >> bitIdx) & 1) === 1;
        }
        // Aplicar máscara 0: (row + col) % 2 === 0
        if ((r + c) % 2 === 0) {
          isDark = !isDark;
        }
        matrix[r][c] = isDark;

        bitIdx--;
        if (bitIdx < 0) {
          bitIdx = 7;
          cwIndex++;
        }
      }
    }
    upward = !upward;
  }

  // Formato da informação: Nível M (00) + Máscara 0 (000) = 0b00000 -> BCH format 0x4aa5
  // Código pré-calculado para nível M, máscara 0: 101010000010010 (15 bits)
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];

  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1;
  matrix[8][7] = formatBits[6] === 1;
  matrix[8][8] = formatBits[7] === 1;
  matrix[7][8] = formatBits[8] === 1;
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1;

  for (let i = 0; i < 8; i++) matrix[size - 1 - i][8] = formatBits[i] === 1;
  for (let i = 8; i < 15; i++) matrix[8][size - 15 + i] = formatBits[i] === 1;

  // Substituir eventuais nulos por falso
  return matrix.map((row) => row.map((cell) => cell ?? false));
}

/**
 * Gera string SVG pura do QR Code para impressão vetorial com resolução infinita.
 */
export async function gerarQrCodeSvg(
  texto: string,
  opcoes?: QrCodeOpcoes
): Promise<string> {
  const matriz = criarMatrizQrCode(texto);
  const matrixSize = matriz.length;
  const margem = opcoes?.margem ?? 2;
  const totalCells = matrixSize + margem * 2;
  const larguraFinal = opcoes?.largura ?? 256;
  const corEscura = opcoes?.corEscura ?? '#000000';
  const corClara = opcoes?.corClara ?? '#ffffff';

  let rects = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matriz[r][c]) {
        rects += `<rect x="${c + margem}" y="${r + margem}" width="1" height="1" fill="${corEscura}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalCells} ${totalCells}" width="${larguraFinal}" height="${larguraFinal}"><rect width="100%" height="100%" fill="${corClara}"/>${rects}</svg>`;
}

/**
 * Gera DataURL (SVG codificado em base64/URI) para uso em tags <img>, canvas ou impressão.
 */
export async function gerarQrCodeDataUrl(
  texto: string,
  opcoes?: QrCodeOpcoes
): Promise<string> {
  const svg = await gerarQrCodeSvg(texto, opcoes);
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}
