import { describe, expect, it } from 'vitest';
import type { ElementoLeiaute } from '@sysgov/sdk';
import { escalaPara, limitar, mover, novoTexto, problemas, redimensionar, textoExemplo, variaveisDesconhecidas } from './leiaute';

const qr: ElementoLeiaute = { id: 'qr', tipo: 'qrcode', x: 60, y: 445, largura: 90 };

describe('leiaute do construtor', () => {
  it('converte tela em pontos pela escala da página', () => {
    const escala = escalaPara(421, 'paisagem'); // metade do A4 paisagem
    expect(escala).toBeCloseTo(0.5);
    expect(mover(qr, 20, 10, escala, 'paisagem')).toMatchObject({ x: 100, y: 465 });
  });

  it('não deixa o elemento sair da página', () => {
    expect(mover(qr, 10000, 10000, 1, 'paisagem')).toMatchObject({ x: 752, y: 505 });
    expect(mover(qr, -500, -500, 1, 'paisagem')).toMatchObject({ x: 0, y: 0 });
    expect(redimensionar(qr, -500, 1, 'paisagem').largura).toBe(10);
    expect(limitar({ ...qr, x: 800 }, 'retrato').x).toBe(505);
  });

  it('aponta QR ausente/repetido e campo desconhecido', () => {
    const texto = { ...novoTexto('paisagem', { texto: 'CPF {{cpf}}' }) };
    expect(problemas([texto], ['NOME'])).toEqual(['Adicione o QR code de validação.', 'Elemento 1: variável desconhecida {{cpf}}.']);
    const novo = novoTexto('paisagem', { texto: '{NOME} e {RG}' });
    expect(problemas([qr, novo], ['NOME'])).toEqual(['Elemento 2: variável desconhecida {RG}.']);
    expect(problemas([qr, { ...qr, id: 'qr2' }], [])).toEqual(['Deixe só um QR code de validação.']);
    expect(problemas([qr], [])).toEqual([]);
  });

  it('desenha os campos com valores de exemplo', () => {
    const nome = { ...novoTexto('paisagem', { campo: 'participante' }), caixa_alta: true };
    expect(textoExemplo(nome, { titulo: 'Certificado', corpo: '' })).toBe('MARIA DA SILVA EXEMPLO');
    const livre = novoTexto('paisagem', { texto: '{{orgao}}, {{data_emissao}}.' });
    expect(textoExemplo(livre, { titulo: '', corpo: '' })).toBe('Prefeitura Municipal, 30/09/2026.');
  });

  it('preenche as variáveis do sistema de referência e o formato antigo', () => {
    const el = novoTexto('paisagem', { texto: '{NOME}, CPF {CPF}, {EMPRESA} — {CARGA_HORARIA} horas — {{orgao}} — {DESCONHECIDA}' });
    expect(textoExemplo(el, { titulo: 'T', corpo: '' })).toBe(
      'Maria da Silva Exemplo, CPF 123.456.789-00, Empresa Exemplo Ltda. — 20 horas — Prefeitura Municipal — {DESCONHECIDA}',
    );
    expect(variaveisDesconhecidas('{NOME} {CODIGO_CERTIFICADO} {{periodo}}')).toEqual([]);
  });
});
