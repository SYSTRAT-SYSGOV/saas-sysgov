import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ElementoLeiaute, ModeloCertificado } from '@sysgov/sdk';

const cursosApi = vi.hoisted(() => ({
  listarCursos: vi.fn(),
  listarFundos: vi.fn(),
  listarTextos: vi.fn(),
  listarAssinaturas: vi.fn(),
  obterLeiauteDoCurso: vi.fn(),
  salvarLeiauteDoCurso: vi.fn(),
  preVisualizarLeiauteDoCurso: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { ConstrutorCursoPage } from './ConstrutorCursoPage';

beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} } as unknown as typeof ResizeObserver;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const leiauteSalvo = (elementos: ElementoLeiaute[]): ModeloCertificado => ({
  id: 9, curso_id: 3, fundo_id: 5, texto_id: 6, nome: 'Certificado — Curso Exemplo', tipo: 'visual', orientacao: 'paisagem',
  titulo: 'Certificado de Conclusão', corpo: 'x', logotipo_path: null, logotipo_url: null, fundo_url: null, elementos,
  verso_ativo: false, verso_fundo_url: null, assinaturas: null, padrao: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  cursosApi.listarCursos.mockResolvedValue({ data: [{ id: 3, titulo: 'Curso Exemplo' }] });
  cursosApi.listarFundos.mockResolvedValue({ fundos: [{ id: 5, nome: 'Fundo', descricao: null, imagem_url: '/f.jpg', orientacao: 'paisagem', ativo: true, created_at: null }] });
  cursosApi.listarTextos.mockResolvedValue({
    campos: ['participante'],
    textos: [{ id: 6, nome: 'Ricardo', tipo_certificado: 'Certificado de Conclusão', texto_principal: 'Certificamos que {{participante}} concluiu.', texto_complementar: null, observacoes: null, ativo: true }],
  });
  cursosApi.listarAssinaturas.mockResolvedValue({ assinaturas: [
    { id: 1, nome: 'Tatiana Assuiti', cargo: 'Secretária', registro_profissional: null, imagem_url: null, selo_url: null, ativa: true },
    { id: 2, nome: 'Antiga', cargo: null, registro_profissional: null, imagem_url: null, selo_url: null, ativa: false },
  ] });
  cursosApi.obterLeiauteDoCurso.mockResolvedValue({ leiaute: null });
  cursosApi.salvarLeiauteDoCurso.mockImplementation(async (_id: number, dados: { elementos: ElementoLeiaute[] }) => ({ leiaute: leiauteSalvo(dados.elementos) }));
});

/** O Select mostra o rótulo num <label> irmão do botão: acha o botão pelo texto do rótulo. */
function gatilho(rotulo: RegExp): HTMLElement {
  const label = screen.getByText(rotulo, { selector: 'label' });
  return within(label.parentElement as HTMLElement).getByRole('combobox');
}

/** Abre o Select (Radix) pelo teclado e escolhe a opção. */
async function escolher(rotulo: RegExp, opcao: string) {
  const alvo = gatilho(rotulo);
  await act(async () => {
    fireEvent.keyDown(alvo, { key: 'Enter' });
  });
  const item = await screen.findByRole('option', { name: opcao });
  await act(async () => {
    fireEvent.keyDown(item, { key: 'Enter' });
  });
}

async function montarCurso() {
  render(<ConstrutorCursoPage />);
  await screen.findByText(/Curso alvo/, { selector: 'label' });
  await escolher(/Curso alvo/, 'Curso Exemplo');
  await waitFor(() => expect(cursosApi.obterLeiauteDoCurso).toHaveBeenCalledWith(3));
}

describe('Construtor visual por curso', () => {
  it('mostra os passos e só permite salvar com curso, fundo e texto', async () => {
    await montarCurso();
    expect(screen.getByText('1. Selecionar vínculos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar layout visual/ })).toBeDisabled();

    await escolher(/Fundo/, 'Fundo');
    await escolher(/Modelo de texto/, 'Ricardo');

    expect(screen.getByRole('button', { name: /Salvar layout visual/ })).toBeEnabled();
    // Assinatura inativa fora de leiaute não é oferecida.
    expect(screen.queryByText('Antiga (inativa)')).not.toBeInTheDocument();
    // O texto principal aparece com valores de exemplo.
    expect(screen.getByText('Certificamos que Maria da Silva Exemplo concluiu.')).toBeInTheDocument();
  });

  it('assinatura e elemento opcional marcados aparecem na página e vão para o salvamento', async () => {
    await montarCurso();
    await escolher(/Fundo/, 'Fundo');
    await escolher(/Modelo de texto/, 'Ricardo');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Tatiana Assuiti' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nome do Participante' }));
    const pagina = screen.getByLabelText('Página do certificado');
    expect(within(pagina).getByRole('button', { name: 'Elemento Assinatura — Tatiana Assuiti' })).toBeInTheDocument();
    expect(within(pagina).getByText('Maria da Silva Exemplo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Salvar layout visual/ }));
    await waitFor(() => expect(cursosApi.salvarLeiauteDoCurso).toHaveBeenCalled());
    const [cursoId, dados] = cursosApi.salvarLeiauteDoCurso.mock.calls[0];
    expect(cursoId).toBe(3);
    expect(dados.fundo_id).toBe(5);
    expect(dados.texto_id).toBe(6);
    expect(dados.elementos.some((e: ElementoLeiaute) => e.tipo === 'assinatura' && e.assinatura_id === 1)).toBe(true);
    expect(dados.elementos.some((e: ElementoLeiaute) => e.tipo === 'texto' && e.campo === 'participante')).toBe(true);
    expect(await screen.findByText(/Leiaute salvo/)).toBeInTheDocument();
  });

  it('carrega o leiaute salvo do curso com as caixas já marcadas', async () => {
    cursosApi.obterLeiauteDoCurso.mockResolvedValue({ leiaute: leiauteSalvo([
      { id: 'corpo', tipo: 'texto', campo: 'corpo', texto: null, x: 50, y: 200, largura: 700, fonte: 'sans', tamanho: 14, cor: '#000000', negrito: false, caixa_alta: false, alinhamento: 'centro' },
      { id: 'qrcode', tipo: 'qrcode', x: 40, y: 445, largura: 90 },
      { id: 'titulo', tipo: 'texto', campo: 'titulo', texto: null, x: 50, y: 100, largura: 700, fonte: 'sans', tamanho: 24, cor: '#000000', negrito: false, caixa_alta: false, alinhamento: 'centro' },
      { id: 'ass-2', tipo: 'assinatura', assinatura_id: 2, x: 300, y: 400, largura: 160, mostrar_textos: true, tamanho: 10, cor: '#000000' },
    ]) });
    await montarCurso();

    expect(await screen.findByRole('checkbox', { name: 'Tipo de Certificado' })).toBeChecked();
    // Inativa, mas já no leiaute: continua listada e marcada.
    expect(screen.getByRole('checkbox', { name: 'Antiga (inativa)' })).toBeChecked();
    expect(screen.getByRole('button', { name: /Salvar layout visual/ })).toBeEnabled();
    // O código de autenticidade, que faltava, foi completado.
    expect(screen.getByText(/Código de Validação/)).toBeInTheDocument();
  });

  it('texto principal não pode ser removido pela lixeira', async () => {
    await montarCurso();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elemento Texto do certificado' }), { clientX: 0, clientY: 0, pointerId: 1 });
    expect(screen.getByText('Propriedades do elemento')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remover elemento' })).not.toBeInTheDocument();
  });
});
