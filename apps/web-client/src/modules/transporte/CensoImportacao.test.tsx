import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const api = vi.hoisted(() => ({
  leiautesImportacao: vi.fn(), leiauteImportacao: vi.fn(), salvarLeiauteImportacao: vi.fn(), duplicarLeiauteImportacao: vi.fn(),
  restaurarLeiauteImportacao: vi.fn(), padraoLeiauteImportacao: vi.fn(), excluirLeiauteImportacao: vi.fn(),
  testarLeiaute: vi.fn(), previaCenso: vi.fn(), confirmarImportacao: vi.fn(), importacao: vi.fn(), cancelarImportacao: vi.fn(),
  leiautes: vi.fn(), modelos: vi.fn(),
}));
vi.mock('./api', async (original) => ({ ...(await original<typeof import('./api')>()), transporteApi: api }));

import type { CampoLeiaute, ImportacaoCsv, LeiauteImportacao, Opcoes, TesteLeiaute } from './api';
import { CensoAbas } from './components/CensoAbas';
import { CensoImportar } from './components/CensoImportar';
import { LeiauteImportacaoTela } from './components/LeiauteImportacao';

Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const avisar = vi.fn();

const campo = (extra: Partial<CampoLeiaute>): CampoLeiaute => ({
  chave: 'pessoa_cep', registro: '30', registro_nome: 'Pessoa', posicao: 41, posicao_padrao: 41, rotulo: 'CEP de residência', tipo: 'texto', destino: 'extra.aluno',
  ativo: true, ativo_padrao: true, travado: false, sensivel: true, nativo: true, mapa: null, formato: 'd/m/Y', valor_verdadeiro: '1', ...extra,
});

const leiaute = (campos: CampoLeiaute[] = [], extra: Partial<LeiauteImportacao> = {}): LeiauteImportacao => ({
  id: 1, nome: 'Educacenso 2023', base: 'educacenso-2023', ano_censo: 2023, delimitador: '|', codificacao: 'ISO-8859-1', padrao: true,
  campos, registros: { '00': 'Escola', '20': 'Turma', '30': 'Pessoa', '60': 'Matrícula' }, formatos_data: ['d/m/Y', 'Y-m-d'], codificacoes: ['ISO-8859-1', 'UTF-8'], ...extra,
});

const resumoLista = (l: LeiauteImportacao): LeiauteImportacao => ({ ...l, campos: undefined });

const imp = (extra: Partial<ImportacaoCsv> = {}): ImportacaoCsv => ({
  id: 9, tipo: 'censo', arquivo: 'educacenso.txt', status: 'previa', total: 3, validas: 2, criadas: 0, ignoradas: 1, com_erro: 0,
  divergencias: [{ linha: 12, codigo: 'aluno_nao_cadastrado', mensagem: 'O aluno 1003 da escola 41000001 não está cadastrado no Escola.' }],
  avisos: [], truncado: false, mensagem: null, concluida_em: null,
  resumo: { sem_alocacao: 2, casados_cpf: 1, casados_nome: 1, inep_preenchido: 2, alunos_nao_cadastrados: 1, alunos_em_escola_nao_cadastrada: 4 },
  escolas_pendentes: [{ inep: '99999999', alunos: 4 }], opcoes: { casar_por_nome: true }, leiaute: { id: 1, nome: 'Educacenso 2023', ano_censo: 2023 }, sem_alocacao: 2, ...extra,
});

const arquivo = () => new File(['00|41000001\n'], 'educacenso.txt', { type: 'text/plain' });

beforeEach(() => {
  vi.clearAllMocks();
  api.leiautesImportacao.mockResolvedValue([resumoLista(leiaute())]);
});

describe('Importar do Educacenso', () => {
  it('explica que escola e aluno precisam estar cadastrados e que nada é criado', async () => {
    render(<CensoImportar avisar={avisar} />);

    expect(await screen.findByText(/a importação não cria cadastro/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escolher arquivo do Educacenso/ })).toBeInTheDocument();
  });

  it('a prévia mostra reconhecidos, pendências e escolas não cadastradas, sem gravar', async () => {
    api.previaCenso.mockResolvedValue(imp());
    render(<CensoImportar avisar={avisar} />);
    await screen.findByLabelText('Arquivo do Educacenso');

    fireEvent.change(screen.getByLabelText('Arquivo do Educacenso'), { target: { files: [arquivo()] } });

    expect(await screen.findByText('educacenso.txt')).toBeInTheDocument();
    expect(api.previaCenso).toHaveBeenCalledWith(expect.any(File), 1);
    expect(screen.getByText('Inep 99999999')).toBeInTheDocument();
    expect(screen.getByText('O aluno 1003 da escola 41000001 não está cadastrado no Escola.')).toBeInTheDocument();
    expect(screen.getByText('Reconhecidos pelo CPF')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar: atualizar 2 aluno(s)' })).toBeEnabled();
    expect(api.confirmarImportacao).not.toHaveBeenCalled();
  });

  it('confirmar envia a opção de casar por nome e mostra o resultado', async () => {
    api.previaCenso.mockResolvedValue(imp());
    api.confirmarImportacao.mockResolvedValue(imp({ status: 'concluida', criadas: 2 }));
    render(<CensoImportar avisar={avisar} />);
    await screen.findByLabelText('Arquivo do Educacenso');
    fireEvent.change(screen.getByLabelText('Arquivo do Educacenso'), { target: { files: [arquivo()] } });
    fireEvent.click(await screen.findByLabelText('Reconhecer por nome e data de nascimento'));

    fireEvent.click(screen.getByRole('button', { name: /Confirmar: atualizar/ }));

    await waitFor(() => expect(api.confirmarImportacao).toHaveBeenCalledWith(9, { casar_por_nome: false }));
    expect(await screen.findByText('Concluída')).toBeInTheDocument();
    expect(avisar).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('sem aluno reconhecido não deixa confirmar', async () => {
    api.previaCenso.mockResolvedValue(imp({ validas: 0 }));
    render(<CensoImportar avisar={avisar} />);
    await screen.findByLabelText('Arquivo do Educacenso');

    fireEvent.change(screen.getByLabelText('Arquivo do Educacenso'), { target: { files: [arquivo()] } });

    expect(await screen.findByText('Nenhum aluno cadastrado foi reconhecido.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar: atualizar/ })).toBeDisabled();
  });

  it('cancelar a prévia apaga o arquivo no servidor', async () => {
    api.previaCenso.mockResolvedValue(imp());
    api.cancelarImportacao.mockResolvedValue(imp({ status: 'cancelada' }));
    render(<CensoImportar avisar={avisar} />);
    await screen.findByLabelText('Arquivo do Educacenso');
    fireEvent.change(screen.getByLabelText('Arquivo do Educacenso'), { target: { files: [arquivo()] } });

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(api.cancelarImportacao).toHaveBeenCalledWith(9));
    expect(await screen.findByRole('button', { name: /Escolher arquivo do Educacenso/ })).toBeInTheDocument();
  });

  it('mostra o erro de um arquivo recusado', async () => {
    api.previaCenso.mockRejectedValue({ response: { data: { error: 'Nenhum registro do Educacenso (00, 20, 30 ou 60) foi encontrado.' } } });
    render(<CensoImportar avisar={avisar} />);
    await screen.findByLabelText('Arquivo do Educacenso');

    fireEvent.change(screen.getByLabelText('Arquivo do Educacenso'), { target: { files: [arquivo()] } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Nenhum registro do Educacenso');
  });

  it('testar o leiaute mostra a amostra por registro e os alertas, sem importar', async () => {
    const teste: TesteLeiaute = {
      linhas_lidas: 4, desconhecidos: 1,
      registros: [
        { registro: '00', nome: 'Escola', linhas: 0, amostras: [] },
        { registro: '30', nome: 'Pessoa', linhas: 1, amostras: [[
          { posicao: 4, chave: 'pessoa_cpf', rotulo: 'CPF', valor: '***.***.***-12', alerta: null },
          { posicao: 6, chave: 'pessoa_nascimento', rotulo: 'Data de nascimento', valor: '******2015', alerta: 'não é uma data no formato d/m/Y' },
        ]] },
      ],
      alertas: [{ registro: '30', chave: 'pessoa_nascimento', rotulo: 'Data de nascimento', posicao: 6, codigo: 'valor_incoerente', mensagem: 'Não é uma data no formato d/m/Y', ocorrencias: 1 }],
    };
    api.testarLeiaute.mockResolvedValue(teste);
    render(<CensoImportar avisar={avisar} />);
    await screen.findByLabelText('Arquivo para testar o leiaute');

    fireEvent.change(screen.getByLabelText('Arquivo para testar o leiaute'), { target: { files: [arquivo()] } });

    const regiao = await screen.findByRole('region', { name: 'Resultado do teste do leiaute' });
    expect(api.testarLeiaute).toHaveBeenCalledWith(expect.any(File), 1);
    expect(within(regiao).getByText('***.***.***-12')).toBeInTheDocument();
    expect(within(regiao).getByText(/Registro 30, coluna 6/)).toBeInTheDocument();
    expect(api.previaCenso).not.toHaveBeenCalled();
  });
});

describe('Leiaute de importação', () => {
  const cep = campo({});
  const email = campo({ chave: 'pessoa_email', rotulo: 'E-mail', posicao: 80 });
  const inep = campo({ chave: 'matricula_escola_inep', registro: '60', registro_nome: 'Matrícula', rotulo: 'Código Inep da escola', posicao: 1, posicao_padrao: 1, travado: true, sensivel: false, destino: 'matricula.escola_inep' });

  beforeEach(() => {
    api.leiautesImportacao.mockResolvedValue([resumoLista(leiaute())]);
    api.leiauteImportacao.mockResolvedValue(leiaute([cep, email, inep]));
  });

  it('lista os campos por registro e trava o que é necessário para reconhecer o aluno', async () => {
    render(<LeiauteImportacaoTela avisar={avisar} />);

    expect(await screen.findByLabelText('Coluna de CEP de residência')).toHaveValue(41);
    expect(screen.getByRole('region', { name: 'Registro 60' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Código Inep da escola ativo' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'E-mail ativo' })).toBeEnabled();
    expect(screen.getAllByText('necessário').length).toBe(1);
  });

  it('mudar a coluna e desativar um campo envia só os ajustes ao salvar', async () => {
    api.salvarLeiauteImportacao.mockResolvedValue(leiaute([campo({ posicao: 44 }), { ...email, ativo: false }, inep]));
    render(<LeiauteImportacaoTela avisar={avisar} />);
    const coluna = await screen.findByLabelText('Coluna de CEP de residência');
    expect(screen.getByRole('button', { name: /Salvar alterações/ })).toBeDisabled();

    fireEvent.change(coluna, { target: { value: '44' } });
    fireEvent.click(screen.getByRole('switch', { name: 'E-mail ativo' }));
    expect(screen.getByText('Há alterações não salvas.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }));

    await waitFor(() => expect(api.salvarLeiauteImportacao).toHaveBeenCalledTimes(1));
    const [idSalvo, corpo] = api.salvarLeiauteImportacao.mock.calls[0] as [number, { campos: { chave: string; posicao?: number; ativo?: boolean }[] }];
    expect(idSalvo).toBe(1);
    expect(corpo.campos.find((c) => c.chave === 'pessoa_cep')).toMatchObject({ posicao: 44, ativo: true });
    expect(corpo.campos.find((c) => c.chave === 'pessoa_email')).toMatchObject({ ativo: false });
    expect(await screen.findByLabelText('Coluna de CEP de residência')).toHaveValue(44);
    expect(avisar).toHaveBeenCalledWith(expect.objectContaining({ title: 'Leiaute' }));
  });

  it('adiciona um campo novo ao leiaute e o envia completo', async () => {
    api.salvarLeiauteImportacao.mockResolvedValue(leiaute([cep, email, inep]));
    render(<LeiauteImportacaoTela avisar={avisar} />);
    await screen.findByLabelText('Coluna de CEP de residência');

    fireEvent.click(screen.getByRole('button', { name: /Adicionar campo/ }));
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByLabelText('Chave *'), { target: { value: 'poder_publico' } });
    fireEvent.change(within(modal).getByLabelText('Rótulo *'), { target: { value: 'Poder público responsável' } });
    fireEvent.change(within(modal).getByLabelText('Coluna *'), { target: { value: '21' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Adicionar' }));

    expect(await screen.findByLabelText('Coluna de Poder público responsável')).toHaveValue(21);
    expect(screen.getByText('criado pelo órgão')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }));

    await waitFor(() => expect(api.salvarLeiauteImportacao).toHaveBeenCalled());
    const corpo = api.salvarLeiauteImportacao.mock.calls[0][1] as { campos: Record<string, unknown>[] };
    expect(corpo.campos.find((c) => c.chave === 'poder_publico')).toMatchObject({ registro: '30', posicao: 21, tipo: 'texto', rotulo: 'Poder público responsável' });
  });

  it('recusa chave inválida e coluna fora da faixa antes de enviar', async () => {
    render(<LeiauteImportacaoTela avisar={avisar} />);
    await screen.findByLabelText('Coluna de CEP de residência');

    fireEvent.click(screen.getByRole('button', { name: /Adicionar campo/ }));
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByLabelText('Chave *'), { target: { value: 'x' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Adicionar' }));

    expect(await screen.findByText(/letras minúsculas, números e sublinhado/)).toBeInTheDocument();
    expect(screen.getByText(/Informe a coluna/)).toBeInTheDocument();
  });

  it('excluir um campo criado pelo órgão o tira da lista; nativo só desativa', async () => {
    const proprio = campo({ chave: 'poder_publico', rotulo: 'Poder público responsável', nativo: false, posicao: 21, posicao_padrao: null, sensivel: false });
    api.leiauteImportacao.mockResolvedValue(leiaute([cep, proprio, inep]));
    render(<LeiauteImportacaoTela avisar={avisar} />);
    await screen.findByLabelText('Coluna de Poder público responsável');

    expect(screen.queryByRole('button', { name: 'Excluir CEP de residência' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Poder público responsável' }));

    expect(screen.queryByLabelText('Coluna de Poder público responsável')).not.toBeInTheDocument();
  });

  it('mostra um aviso quando o servidor recusa o leiaute', async () => {
    api.salvarLeiauteImportacao.mockRejectedValue({ response: { data: { error: 'Os campos "A" e "B" estão na mesma posição (80) do Registro 30.' } } });
    render(<LeiauteImportacaoTela avisar={avisar} />);
    fireEvent.change(await screen.findByLabelText('Coluna de CEP de residência'), { target: { value: '80' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('mesma posição (80)');
  });

  it('restaurar o padrão pede confirmação', async () => {
    api.restaurarLeiauteImportacao.mockResolvedValue(leiaute([cep, email, inep]));
    render(<LeiauteImportacaoTela avisar={avisar} />);
    await screen.findByLabelText('Coluna de CEP de residência');

    fireEvent.click(screen.getByRole('button', { name: /Restaurar padrão de fábrica/ }));
    expect(api.restaurarLeiauteImportacao).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(api.restaurarLeiauteImportacao).toHaveBeenCalledWith(1));
  });

  it('duplicar para o próximo ano sugere nome e ano', async () => {
    api.duplicarLeiauteImportacao.mockResolvedValue(leiaute([cep, email, inep], { id: 2, nome: 'Educacenso 2024', ano_censo: 2024, padrao: false }));
    render(<LeiauteImportacaoTela avisar={avisar} />);
    await screen.findByLabelText('Coluna de CEP de residência');

    fireEvent.click(screen.getByRole('button', { name: /Duplicar para novo ano/ }));
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByLabelText('Nome do novo leiaute')).toHaveValue('Educacenso 2024');
    fireEvent.click(within(modal).getByRole('button', { name: 'Duplicar' }));

    await waitFor(() => expect(api.duplicarLeiauteImportacao).toHaveBeenCalledWith({ nome: 'Educacenso 2024', ano_censo: 2024, copiar_de: 1 }));
    expect(await screen.findByDisplayValue('Educacenso 2024')).toBeInTheDocument();
  });
});

describe('Abas do Censo', () => {
  const base: Opcoes = {
    tipos_empresa: [], origens: [], tipos_rede: [], turnos: [], escolas: [], anos_letivos: [2026], veiculos: [], poderes_publicos: [], mediacoes: [], categorias_cnh: [],
    tipologias: [], empresas: [], motoristas: [],
    caracteristicas_trecho: [],
    ramos_fornecedor: [], tipos_servico: [],
    permissoes: { gerenciar_frota: true, gerenciar_rotas: true, gerenciar_alocacoes: true, exceder_capacidade: false, exportar_censo: false, importar_censo: false, configurar_leiaute_censo: false, ver_custos: false, gerenciar_parametros_custo: false, ver_manutencao: false, gerenciar_manutencao: false, auditar: false },
  };

  it('operador que só importa vê a importação direto, sem aba de leiaute', async () => {
    render(<CensoAbas opcoes={{ ...base, permissoes: { ...base.permissoes, importar_censo: true } }} avisar={avisar} />);

    expect(await screen.findByText('Importar arquivo do Educacenso')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Leiaute de importação' })).not.toBeInTheDocument();
  });

  it('coordenação vê as três abas', async () => {
    api.leiautes.mockResolvedValue([]);
    api.modelos.mockResolvedValue([]);
    render(<CensoAbas opcoes={{ ...base, permissoes: { ...base.permissoes, exportar_censo: true, importar_censo: true, configurar_leiaute_censo: true, ver_custos: false, gerenciar_parametros_custo: false, ver_manutencao: false, gerenciar_manutencao: false } }} avisar={avisar} />);

    expect(screen.getByRole('tab', { name: 'Exportar' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Importar do Educacenso' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Leiaute de importação' })).toBeInTheDocument();
  });
});
