import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const cursosApi = vi.hoisted(() => ({
  getInscricao: vi.fn(),
  getConteudoInscricao: vi.fn(),
  baixarArquivoMaterial: vi.fn(),
  iniciarTentativa: vi.fn(),
}));

vi.mock('@sysgov/sdk', async (original) => ({
  ...(await original<typeof import('@sysgov/sdk')>()),
  sysgovApi: { cursos: cursosApi },
}));

import { InscricaoDetalhePage } from './InscricaoDetalhePage';

const inscricao = {
  id: 5, status: 'confirmada', posicao_fila: null, frequencia_apurada: null, frequencia: { aulas: 4, presencas: 3, percentual: 75 },
  turma: { id: 1, nome: 'Turma 1', data_inicio: '2026-10-01', data_fim: '2026-10-31', status: 'aberta', curso: { id: 1, titulo: 'Gestão de Contratos', frequencia_minima: 75 } },
  participante: { id: 1, nome: 'Aluno', email: 'aluno@teste.gov.br' }, aulas: [], nota: 7.5,
};

const base = { inscricao_id: 5, turma_id: 1, status: 'confirmada', acesso: true, nota: 7.5, nota_tipo: 'parcial' };
const libera = { liberado: true, prevista_em: null, aguardando_agendamento: false };

const materiais = [
  { id: 1, tipo: 'texto', titulo: 'Apostila em texto', ordem: 1, aula_id: null, ...libera, descricao: 'Leia antes da aula 1', conteudo: '<p>Conteúdo <b>importante</b></p><script>window.hackeado = true</script><img src=x onerror="window.hackeado = true">' },
  { id: 2, tipo: 'link', titulo: 'Portal da transparência', ordem: 2, aula_id: null, ...libera, descricao: null, url: 'https://exemplo.gov.br/portal' },
  { id: 3, tipo: 'video', titulo: 'Aula gravada', ordem: 3, aula_id: null, ...libera, descricao: null, embed_url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' },
  { id: 4, tipo: 'arquivo', titulo: 'Apostila em PDF', ordem: 4, aula_id: null, ...libera, descricao: null, arquivo_nome: 'apostila.pdf', arquivo_tamanho: 2_097_152 },
  { id: 5, tipo: 'texto', titulo: 'Módulo avançado', ordem: 5, aula_id: null, liberado: false, prevista_em: '2026-10-20T03:00:00Z', aguardando_agendamento: false },
  { id: 6, tipo: 'texto', titulo: 'Material da aula 3', ordem: 6, aula_id: 3, liberado: false, prevista_em: null, aguardando_agendamento: true },
];

const avaliacoes = [
  {
    id: 10, titulo: 'Prova final', peso: 2, tentativas_max: 3, tempo_limite_minutos: 30, questoes_total: 5, ...libera, instrucoes: '<p>Leia com <b>atenção</b></p>',
    tentativas_usadas: 1, tentativas_restantes: 2, melhor_nota: 6, tentativa_em_andamento_id: null, pode_iniciar: true,
    tentativas: [{ id: 77, numero: 1, status: 'corrigida', iniciada_em: '2026-10-05T12:00:00Z', prazo_em: null, enviada_em: '2026-10-05T12:20:00Z', nota: '6.00' }],
  },
  {
    id: 11, titulo: 'Prova de recuperação', peso: 1, tentativas_max: 1, tempo_limite_minutos: null, questoes_total: 3, liberado: false, prevista_em: '2026-11-01T03:00:00Z', aguardando_agendamento: false,
    tentativas_usadas: 0, tentativas_restantes: 1, melhor_nota: null, tentativa_em_andamento_id: null, pode_iniciar: false, tentativas: [],
  },
];

const renderizar = (onAbrirTentativa = vi.fn()) => {
  render(<InscricaoDetalhePage inscricaoId={5} onVoltar={() => undefined} onAbrirTentativa={onAbrirTentativa} />);
  return onAbrirTentativa;
};

describe('Área do participante — materiais e avaliações da inscrição', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as unknown as { hackeado?: boolean }).hackeado;
    cursosApi.getInscricao.mockResolvedValue(inscricao);
    cursosApi.getConteudoInscricao.mockResolvedValue({ ...base, materiais, avaliacoes });
  });

  it('mostra os liberados com acesso ao conteúdo e os não liberados só com a data prevista', async () => {
    renderizar();

    expect(await screen.findByText('Apostila em texto')).toBeInTheDocument();
    // Liberados têm o botão de acesso; os bloqueados não.
    expect(screen.getByRole('button', { name: 'Ler' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir link/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assistir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir PDF/ })).toBeInTheDocument();
    expect(screen.getByText('apostila.pdf', { exact: false })).toBeInTheDocument();

    const bloqueado = screen.getByText('Módulo avançado').closest('li') as HTMLElement;
    expect(within(bloqueado).getByText(/Libera em 20\/10\/2026/)).toBeInTheDocument();
    expect(within(bloqueado).queryByRole('button')).not.toBeInTheDocument();

    const aguardando = screen.getByText('Material da aula 3').closest('li') as HTMLElement;
    expect(within(aguardando).getByText('Aguardando agendamento')).toBeInTheDocument();
  });

  it('cada avaliação mostra as tentativas restantes, a melhor nota e a nota da tentativa; a bloqueada mostra a data', async () => {
    renderizar();

    const prova = (await screen.findByText('Prova final')).closest('li') as HTMLElement;
    expect(within(prova).getByText(/tentativas restantes/)).toHaveTextContent('tentativas restantes: 2 de 3');
    expect(within(prova).getByText('Melhor nota')).toHaveTextContent('Melhor nota 6,00');
    expect(within(prova).getByText('Corrigida')).toBeInTheDocument();
    // 6,00 aparece na melhor nota e na linha da tentativa corrigida.
    expect(within(prova).getAllByText('6,00')).toHaveLength(2);
    expect(within(prova).getByText('atenção')).toBeInTheDocument();
    expect(within(prova).getByRole('button', { name: 'Iniciar tentativa' })).toBeInTheDocument();

    const recuperacao = screen.getByText('Prova de recuperação').closest('li') as HTMLElement;
    expect(within(recuperacao).getByText(/Libera em 01\/11\/2026/)).toBeInTheDocument();
    expect(within(recuperacao).queryByRole('button', { name: 'Iniciar tentativa' })).not.toBeInTheDocument();

    expect(screen.getByText('Nota parcial')).toBeInTheDocument();
    expect(screen.getByText('7,50')).toBeInTheDocument();
  });

  it('o texto do material passa pelo DOMPurify: sem script nem atributos de evento', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: 'Ler' }));

    expect(screen.getByText('importante')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('[onerror]')).toBeNull();
    expect((window as unknown as { hackeado?: boolean }).hackeado).toBeUndefined();
  });

  it('o vídeo abre num iframe com sandbox e referrer policy, só a partir do embed do servidor', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: 'Assistir' }));

    const iframe = screen.getByTitle('Vídeo: Aula gravada');
    expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  });

  it('um embed fora dos players conhecidos nunca vira iframe', async () => {
    cursosApi.getConteudoInscricao.mockResolvedValue({
      ...base, avaliacoes: [],
      materiais: [{ id: 3, tipo: 'video', titulo: 'Suspeito', ordem: 1, aula_id: null, ...libera, descricao: null, embed_url: 'https://evil.example/embed/abc' }],
    });
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: 'Assistir' }));

    expect(screen.queryByTitle('Vídeo: Suspeito')).not.toBeInTheDocument();
    expect(screen.getByText('Não foi possível exibir este vídeo.')).toBeInTheDocument();
  });

  it('o link abre em outra aba com noopener e noreferrer; esquema que não é http nem aparece', async () => {
    cursosApi.getConteudoInscricao.mockResolvedValue({
      ...base, avaliacoes: [],
      materiais: [
        { id: 2, tipo: 'link', titulo: 'Bom', ordem: 1, aula_id: null, ...libera, descricao: null, url: 'https://exemplo.gov.br/portal' },
        { id: 3, tipo: 'link', titulo: 'Mau', ordem: 2, aula_id: null, ...libera, descricao: null, url: 'javascript:alert(1)' },
      ],
    });
    renderizar();

    const link = await screen.findByRole('link', { name: /Abrir link/ });
    expect(link).toHaveAttribute('href', 'https://exemplo.gov.br/portal');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('o PDF é baixado autenticado como blob e aberto em nova aba', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    cursosApi.baixarArquivoMaterial.mockResolvedValue(blob);
    const criar = vi.fn(() => 'blob:pdf-1');
    const revogar = vi.fn();
    Object.assign(URL, { createObjectURL: criar, revokeObjectURL: revogar });
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    renderizar();

    fireEvent.click(await screen.findByRole('button', { name: /Abrir PDF/ }));

    await waitFor(() => expect(abrir).toHaveBeenCalledWith('blob:pdf-1', '_blank', 'noopener,noreferrer'));
    expect(cursosApi.baixarArquivoMaterial).toHaveBeenCalledWith(4);
    abrir.mockRestore();
  });

  it('falha ao abrir o PDF mostra o erro do servidor', async () => {
    cursosApi.baixarArquivoMaterial.mockRejectedValue(Object.assign(new Error('403'), { response: { status: 403, data: { error: 'Sem acesso.' } } }));
    renderizar();

    fireEvent.click(await screen.findByRole('button', { name: /Abrir PDF/ }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('inicia a tentativa sem tempo limite direto e abre a tela de responder', async () => {
    cursosApi.getConteudoInscricao.mockResolvedValue({ ...base, materiais: [], avaliacoes: [{ ...avaliacoes[0], tempo_limite_minutos: null }] });
    cursosApi.iniciarTentativa.mockResolvedValue({ id: 88 });
    const onAbrir = renderizar();

    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar tentativa' }));

    await waitFor(() => expect(onAbrir).toHaveBeenCalledWith(88));
    expect(cursosApi.iniciarTentativa).toHaveBeenCalledWith(10, 5);
  });

  it('com tempo limite pede confirmação antes de começar a contar', async () => {
    cursosApi.iniciarTentativa.mockResolvedValue({ id: 89 });
    const onAbrir = renderizar();

    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar tentativa' }));
    expect(await screen.findByText(/tempo limite de 30 minutos/)).toBeInTheDocument();
    expect(cursosApi.iniciarTentativa).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar agora' }));
    await waitFor(() => expect(onAbrir).toHaveBeenCalledWith(89));
  });

  it('tentativa em andamento oferece continuar e não iniciar outra', async () => {
    cursosApi.getConteudoInscricao.mockResolvedValue({
      ...base, materiais: [],
      avaliacoes: [{ ...avaliacoes[0], tentativa_em_andamento_id: 91, pode_iniciar: false, tentativas: [{ id: 91, numero: 2, status: 'em_andamento', iniciada_em: '2026-10-06T12:00:00Z', prazo_em: '2026-10-06T12:30:00Z', enviada_em: null, nota: null }] }],
    });
    const onAbrir = renderizar();

    fireEvent.click(await screen.findByRole('button', { name: 'Continuar tentativa' }));

    expect(onAbrir).toHaveBeenCalledWith(91);
    expect(screen.queryByRole('button', { name: 'Iniciar tentativa' })).not.toBeInTheDocument();
  });

  it('erro ao iniciar mostra a mensagem do servidor', async () => {
    cursosApi.getConteudoInscricao.mockResolvedValue({ ...base, materiais: [], avaliacoes: [{ ...avaliacoes[0], tempo_limite_minutos: null }] });
    cursosApi.iniciarTentativa.mockRejectedValue(Object.assign(new Error('422'), { response: { status: 422, data: { error: 'O limite de tentativas desta avaliação foi atingido.' } } }));
    renderizar();

    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar tentativa' }));

    expect(await screen.findByText('O limite de tentativas desta avaliação foi atingido.')).toBeInTheDocument();
  });

  it('inscrição sem acesso (lista de espera) não mostra materiais nem avaliações', async () => {
    cursosApi.getConteudoInscricao.mockResolvedValue({ ...base, status: 'lista_espera', acesso: false, nota: null, nota_tipo: null, materiais: [], avaliacoes: [] });
    renderizar();

    expect(await screen.findByText(/ficam disponíveis quando a inscrição está confirmada/)).toBeInTheDocument();
    expect(screen.queryByText('Materiais')).not.toBeInTheDocument();
  });

  it('curso sem materiais e sem avaliações avisa em cada seção', async () => {
    cursosApi.getConteudoInscricao.mockResolvedValue({ ...base, nota: null, nota_tipo: null, materiais: [], avaliacoes: [] });
    renderizar();

    expect(await screen.findByText('Nenhum material publicado neste curso.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma avaliação publicada neste curso.')).toBeInTheDocument();
    expect(screen.queryByText('Nota parcial')).not.toBeInTheDocument();
  });

  it('depois do encerramento mostra a nota final', async () => {
    cursosApi.getConteudoInscricao.mockResolvedValue({ ...base, nota_tipo: 'final', materiais: [], avaliacoes: [] });
    renderizar();

    expect(await screen.findByText('Nota final')).toBeInTheDocument();
  });
});
