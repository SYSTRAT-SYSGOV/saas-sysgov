import React, { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { UserPlus, Users, Download, ShieldCheck, FileDown } from 'lucide-react';
import { Button, DataTable, Modal, PageHeader, Select, StatusChip } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { IntegracoesPanel } from './IntegracoesPanel';
import { NovaPessoaWizard } from './NovaPessoaWizard';
import { PromoverPessoaModal } from './PromoverPessoaModal';
import { pessoasApi, TIPOS_VINCULO, type Pessoa, type PessoaVinculo, type TipoVinculo } from './api';
import { CamposFormulario, ErroBox, FormModal, Mono, useAcao, useDados, type CampoForm } from './views/comum';

const opcoesVinculo = Object.entries(TIPOS_VINCULO).map(([value, label]) => ({ value, label }));
const opcoesStatus = [{ value: 'ativo', label: 'Ativo' }, { value: 'inativo', label: 'Inativo' }];

/** Módulo de Cadastro de Pessoas Físicas (servidores e munícipes) — base para outros módulos. */
export const PessoasModule: React.FC = () => {
  const { can } = useCan();
  const [visao, setVisao] = useState<'pessoas' | 'integracoes'>('pessoas');
  const [busca, setBusca] = useState('');
  const [tipoVinculo, setTipoVinculo] = useState<TipoVinculo | null>(null);
  const [status, setStatus] = useState<'ativo' | 'inativo' | null>(null);
  const [wizardAberto, setWizardAberto] = useState(false);
  const [modal, setModal] = useState<'editar' | 'importar' | null>(null);
  const [pessoaSelecionada, setPessoaSelecionada] = useState<Pessoa | null>(null);
  const [pessoaDetalhe, setPessoaDetalhe] = useState<Pessoa | null>(null);
  const [pessoaPromovendo, setPessoaPromovendo] = useState<Pessoa | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { erro, executar } = useAcao();

  const pessoas = useDados(
    () => pessoasApi.listar({ q: busca || undefined, tipo_vinculo: tipoVinculo || undefined, status: status || undefined, per_page: 50 }),
    [busca, tipoVinculo, status],
  );

  const podeGerenciar = can('cadastros.pessoas.update');
  const podeImportar = can('cadastros.pessoas.import');
  const podePromover = can('cadastros.pessoas.promote');
  const podeExcluir = can('cadastros.pessoas.delete');
  const podeGerenciarIntegracoes = can('cadastros.pessoas.integracoes.manage');

  const abrirDetalhe = async (pessoa: Pessoa) => setPessoaDetalhe(await pessoasApi.obter(pessoa.id));

  const colunas = useMemo<ColumnDef<Pessoa, unknown>[]>(() => [
    { id: 'nome', header: 'Nome', accessorKey: 'nome' },
    { id: 'cpf', header: 'CPF', cell: ({ row }) => <Mono>{row.original.cpf_mascarado}</Mono> },
    {
      id: 'vinculos', header: 'Vínculos', cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.vinculos ?? []).map((v) => <StatusChip key={v.id} label={TIPOS_VINCULO[v.tipo_vinculo]} variant="info" />)}
        </div>
      ),
    },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusChip label={row.original.status} variant={row.original.status === 'ativo' ? 'success' : 'neutral'} /> },
    {
      id: 'acoes', header: '', cell: ({ row }) => (
        <div className="flex gap-1">
          {podePromover && !row.original.usuario && (
            <Button size="xs" variant="outline" onClick={() => setPessoaPromovendo(row.original)} title="Promover a usuário">
              <ShieldCheck className="h-3 w-3" />
            </Button>
          )}
          <Button size="xs" variant="outline" onClick={() => void abrirDetalhe(row.original)}>Gerenciar</Button>
        </div>
      ),
    },
  ], [podePromover]);

  if (visao === 'integracoes' && podeGerenciarIntegracoes) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setVisao('pessoas')}>← Voltar ao cadastro</Button>
        </div>
        <IntegracoesPanel />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <PageHeader title="Cadastro de Pessoas" subtitle="Servidores e munícipes — base de identidade civil do SYSGOV." icon={<Users className="h-6 w-6" />} />
        {podeGerenciarIntegracoes && <Button size="sm" variant="outline" onClick={() => setVisao('integracoes')}>Integrações</Button>}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Buscar por nome ou CPF…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Select value={tipoVinculo} onChange={(v) => setTipoVinculo(v as TipoVinculo | null)} options={opcoesVinculo} placeholder="Todos os vínculos" />
          <Select value={status} onChange={(v) => setStatus(v as 'ativo' | 'inativo' | null)} options={opcoesStatus} placeholder="Todos os status" />
        </div>
        <div className="flex gap-2">
          {can('cadastros.pessoas.view') && <Button variant="outline" onClick={() => void pessoasApi.exportarCsv()}><FileDown className="h-4 w-4" /> Exportar CSV</Button>}
          {podeGerenciar && podeImportar && <Button variant="outline" onClick={() => setModal('importar')}><Download className="h-4 w-4" /> Importar por CPF</Button>}
          {podeGerenciar && <Button onClick={() => setWizardAberto(true)}><UserPlus className="h-4 w-4" /> Nova pessoa</Button>}
        </div>
      </div>

      {aviso && <p className="rounded-md border border-border bg-accent/50 p-3 text-sm" role="status">{aviso}</p>}
      <ErroBox erro={erro ?? pessoas.erro} />
      <DataTable columns={colunas} data={pessoas.dados?.data ?? []} loading={pessoas.carregando} emptyText="Nenhuma pessoa cadastrada." />

      {wizardAberto && (
        <NovaPessoaWizard
          onFechar={() => setWizardAberto(false)}
          onConcluido={async () => { setWizardAberto(false); await pessoas.recarregar(); }}
        />
      )}

      <EditarPessoaModal
        pessoa={modal === 'editar' ? pessoaSelecionada : null}
        onFechar={() => setModal(null)}
        onSalvo={pessoas.recarregar}
      />

      <FormModal aberto={modal === 'importar'} titulo="Importar pessoa do sistema da prefeitura" rotuloEnviar="Importar" onFechar={() => setModal(null)}
        campos={[{ nome: 'documento', rotulo: 'CPF', obrigatorio: true }]}
        onEnviar={async (v) => {
          await executar(() => pessoasApi.importar(String(v.documento)));
          setAviso('Importação agendada — a pessoa aparecerá na lista quando o sincronismo concluir.');
        }} />

      {pessoaDetalhe && (
        <DetalhePessoaModal
          pessoa={pessoaDetalhe}
          podeGerenciar={podeGerenciar}
          podePromover={podePromover}
          podeExcluir={podeExcluir}
          onFechar={() => setPessoaDetalhe(null)}
          onAtualizado={async () => { setPessoaDetalhe(await pessoasApi.obter(pessoaDetalhe.id)); await pessoas.recarregar(); }}
          onExcluido={async () => { setPessoaDetalhe(null); await pessoas.recarregar(); }}
          onEditar={() => { setPessoaSelecionada(pessoaDetalhe); setModal('editar'); }}
          onPromover={() => setPessoaPromovendo(pessoaDetalhe)}
        />
      )}

      <PromoverPessoaModal
        pessoa={pessoaPromovendo}
        onFechar={() => setPessoaPromovendo(null)}
        onPromovido={async () => {
          setPessoaPromovendo(null);
          await pessoas.recarregar();
          if (pessoaDetalhe && pessoaPromovendo && pessoaDetalhe.id === pessoaPromovendo.id) {
            setPessoaDetalhe(await pessoasApi.obter(pessoaDetalhe.id));
          }
        }}
      />
    </div>
  );
};

const DetalhePessoaModal: React.FC<{
  pessoa: Pessoa;
  podeGerenciar: boolean;
  podePromover: boolean;
  podeExcluir: boolean;
  onFechar: () => void;
  onAtualizado: () => Promise<void>;
  onExcluido: () => Promise<void>;
  onEditar: () => void;
  onPromover: () => void;
}> = ({ pessoa, podeGerenciar, podePromover, podeExcluir, onFechar, onAtualizado, onExcluido, onEditar, onPromover }) => {
  const [modalVinculo, setModalVinculo] = useState(false);
  const [vinculoEncerrando, setVinculoEncerrando] = useState<PessoaVinculo | null>(null);
  const [modalDocumento, setModalDocumento] = useState(false);
  const [modalEndereco, setModalEndereco] = useState(false);
  const [modalContato, setModalContato] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const { erro, executar } = useAcao();

  const excluir = async () => {
    const resultado = await executar(() => pessoasApi.excluir(pessoa.id));
    if (resultado) await onExcluido();
  };

  return (
    <>
      <Modal
        open
        onClose={onFechar}
        title={pessoa.nome}
        description={`CPF ${pessoa.cpf_mascarado}`}
        size="lg"
        footer={podeExcluir ? (
          confirmandoExclusao ? (
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-sm text-destructive">Excluir esta pessoa e todo o seu histórico de vínculos, documentos, endereços e contatos?</span>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => setConfirmandoExclusao(false)}>Cancelar</Button>
                <Button size="sm" variant="destructive" onClick={() => void excluir()}>Confirmar exclusão</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => setConfirmandoExclusao(true)}>Excluir pessoa</Button>
          )
        ) : undefined}
      >
        <div className="space-y-4">
          <ErroBox erro={erro} />

          {!pessoa.usuario && podePromover && (
            <div className="flex justify-end">
              <Button size="sm" onClick={onPromover}><ShieldCheck className="h-4 w-4" /> Promover a usuário</Button>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Dados civis</h3>
              {podeGerenciar && <Button size="xs" variant="outline" onClick={onEditar}>Editar</Button>}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              {pessoa.nome_social && <><dt className="text-muted-foreground">Nome social</dt><dd>{pessoa.nome_social}</dd></>}
              {pessoa.data_nascimento && <><dt className="text-muted-foreground">Nascimento</dt><dd><Mono>{pessoa.data_nascimento}</Mono></dd></>}
              {pessoa.sexo && <><dt className="text-muted-foreground">Sexo</dt><dd>{pessoa.sexo}</dd></>}
              {pessoa.estado_civil && <><dt className="text-muted-foreground">Estado civil</dt><dd>{pessoa.estado_civil}</dd></>}
              {pessoa.nacionalidade && <><dt className="text-muted-foreground">Nacionalidade</dt><dd>{pessoa.nacionalidade}</dd></>}
              {pessoa.naturalidade && <><dt className="text-muted-foreground">Naturalidade</dt><dd>{pessoa.naturalidade}</dd></>}
              {pessoa.nome_mae && <><dt className="text-muted-foreground">Nome da mãe</dt><dd>{pessoa.nome_mae}</dd></>}
              {pessoa.nome_pai && <><dt className="text-muted-foreground">Nome do pai</dt><dd>{pessoa.nome_pai}</dd></>}
              {pessoa.nis && <><dt className="text-muted-foreground">NIS</dt><dd><Mono>{pessoa.nis}</Mono></dd></>}
            </dl>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Vínculos</h3>
              {podeGerenciar && <Button size="xs" variant="outline" onClick={() => setModalVinculo(true)}>Adicionar vínculo</Button>}
            </div>
            <ul className="space-y-1">
              {(pessoa.vinculos ?? []).map((v) => (
                <li key={v.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                  <span>{TIPOS_VINCULO[v.tipo_vinculo]}{v.fim ? ` — encerrado em ${v.fim}` : ''}</span>
                  {podeGerenciar && !v.fim && <Button size="xs" variant="outline" onClick={() => setVinculoEncerrando(v)}>Encerrar</Button>}
                </li>
              ))}
              {(pessoa.vinculos ?? []).length === 0 && <li className="text-sm text-muted-foreground">Nenhum vínculo cadastrado.</li>}
            </ul>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Documentos</h3>
              {podeGerenciar && <Button size="xs" variant="outline" onClick={() => setModalDocumento(true)}>Adicionar documento</Button>}
            </div>
            <ul className="space-y-1">
              {(pessoa.documentos ?? []).map((d) => <li key={d.id} className="text-sm"><Mono>{d.numero}</Mono> ({d.tipo})</li>)}
              {(pessoa.documentos ?? []).length === 0 && <li className="text-sm text-muted-foreground">Nenhum documento cadastrado.</li>}
            </ul>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Endereços</h3>
              {podeGerenciar && <Button size="xs" variant="outline" onClick={() => setModalEndereco(true)}>Adicionar endereço</Button>}
            </div>
            <ul className="space-y-1">
              {(pessoa.enderecos ?? []).map((e) => <li key={e.id} className="text-sm">{[e.logradouro, e.numero, e.bairro, e.cidade, e.uf].filter(Boolean).join(', ')}</li>)}
              {(pessoa.enderecos ?? []).length === 0 && <li className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</li>}
            </ul>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Contatos</h3>
              {podeGerenciar && <Button size="xs" variant="outline" onClick={() => setModalContato(true)}>Adicionar contato</Button>}
            </div>
            <ul className="space-y-1">
              {(pessoa.contatos ?? []).map((c) => <li key={c.id} className="text-sm">{c.valor} ({c.tipo}){c.principal ? ' — principal' : ''}</li>)}
              {(pessoa.contatos ?? []).length === 0 && <li className="text-sm text-muted-foreground">Nenhum contato cadastrado.</li>}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Conta de acesso</h3>
            {pessoa.usuario ? (
              <p className="text-sm text-muted-foreground">Já promovida a usuário do SYSGOV.</p>
            ) : podePromover ? (
              <Button size="sm" onClick={onPromover}><ShieldCheck className="h-4 w-4" /> Promover a usuário</Button>
            ) : (
              <p className="text-sm text-muted-foreground">Sem conta de acesso vinculada.</p>
            )}
          </div>
        </div>
      </Modal>

      <FormModal aberto={modalVinculo} titulo="Adicionar vínculo" onFechar={() => setModalVinculo(false)}
        campos={[
          { nome: 'tipo_vinculo', rotulo: 'Tipo de vínculo', tipo: 'select', obrigatorio: true, opcoes: opcoesVinculo },
          { nome: 'matricula', rotulo: 'Matrícula funcional', mono: true },
          { nome: 'inicio', rotulo: 'Início', tipo: 'date' },
        ]}
        onEnviar={async (v) => { await pessoasApi.adicionarVinculo(pessoa.id, v as { tipo_vinculo: TipoVinculo; matricula?: string; inicio?: string }); await onAtualizado(); }} />

      <FormModal aberto={vinculoEncerrando !== null} titulo="Encerrar vínculo" rotuloEnviar="Encerrar" onFechar={() => setVinculoEncerrando(null)}
        campos={[{ nome: 'fim', rotulo: 'Data de término', tipo: 'date', dica: 'Deixe em branco para usar a data de hoje.' }]}
        onEnviar={async (v) => {
          if (!vinculoEncerrando) return;
          await pessoasApi.encerrarVinculo(pessoa.id, vinculoEncerrando.id, v.fim ? String(v.fim) : undefined);
          await onAtualizado();
        }} />

      <FormModal aberto={modalDocumento} titulo="Adicionar documento" onFechar={() => setModalDocumento(false)}
        campos={[
          { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', obrigatorio: true, opcoes: [{ value: 'rg', label: 'RG' }, { value: 'cnh', label: 'CNH' }, { value: 'titulo_eleitor', label: 'Título de eleitor' }] },
          { nome: 'numero', rotulo: 'Número', obrigatorio: true, mono: true },
          { nome: 'orgao_emissor', rotulo: 'Órgão emissor' },
          { nome: 'uf_emissao', rotulo: 'UF de emissão' },
          { nome: 'data_emissao', rotulo: 'Data de emissão', tipo: 'date' },
        ]}
        onEnviar={async (v) => { await pessoasApi.adicionarDocumento(pessoa.id, v as { tipo: 'rg' | 'cnh' | 'titulo_eleitor'; numero: string }); await onAtualizado(); }} />

      <FormModal aberto={modalEndereco} titulo="Adicionar endereço" onFechar={() => setModalEndereco(false)}
        campos={[
          { nome: 'cep', rotulo: 'CEP' }, { nome: 'logradouro', rotulo: 'Logradouro' }, { nome: 'numero', rotulo: 'Número' },
          { nome: 'complemento', rotulo: 'Complemento' }, { nome: 'bairro', rotulo: 'Bairro' }, { nome: 'cidade', rotulo: 'Cidade' }, { nome: 'uf', rotulo: 'UF' },
        ]}
        onEnviar={async (v) => { await pessoasApi.adicionarEndereco(pessoa.id, v); await onAtualizado(); }} />

      <FormModal aberto={modalContato} titulo="Adicionar contato" onFechar={() => setModalContato(false)}
        iniciais={{ autoriza_notificacoes: true }}
        campos={[
          { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', obrigatorio: true, opcoes: [{ value: 'celular', label: 'Celular' }, { value: 'email', label: 'E-mail' }, { value: 'telefone', label: 'Telefone' }] },
          { nome: 'valor', rotulo: 'Valor', obrigatorio: true },
          { nome: 'principal', rotulo: 'Principal', tipo: 'switch' },
          { nome: 'autoriza_notificacoes', rotulo: 'Autoriza notificações', tipo: 'switch' },
        ]}
        onEnviar={async (v) => { await pessoasApi.adicionarContato(pessoa.id, v as { tipo: 'celular' | 'email' | 'telefone'; valor: string; principal?: boolean; autoriza_notificacoes?: boolean }); await onAtualizado(); }} />
    </>
  );
};

const SECOES_EDITAR: { titulo: string; campos: CampoForm[] }[] = [
  {
    titulo: 'Identificação',
    campos: [
      { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true },
      { nome: 'nome_social', rotulo: 'Nome social' },
      { nome: 'data_nascimento', rotulo: 'Data de nascimento', tipo: 'date' },
      { nome: 'sexo', rotulo: 'Sexo' },
    ],
  },
  {
    titulo: 'Filiação',
    campos: [
      { nome: 'nome_mae', rotulo: 'Nome da mãe' },
      { nome: 'nome_pai', rotulo: 'Nome do pai' },
      { nome: 'estado_civil', rotulo: 'Estado civil' },
    ],
  },
  {
    titulo: 'Documentos civis',
    campos: [
      { nome: 'nacionalidade', rotulo: 'Nacionalidade' },
      { nome: 'naturalidade', rotulo: 'Naturalidade' },
      { nome: 'nis', rotulo: 'NIS', mono: true },
    ],
  },
];

/** Edição de dados civis já existentes — formulário único (não wizard), organizado em seções visuais. */
const EditarPessoaModal: React.FC<{
  pessoa: Pessoa | null;
  onFechar: () => void;
  onSalvo: () => Promise<void>;
}> = ({ pessoa, onFechar, onSalvo }) => {
  const [valores, setValores] = useState<Record<string, unknown>>({});
  const { erro, enviando, executar, setErro } = useAcao();

  useEffect(() => {
    if (pessoa) {
      setValores({
        nome: pessoa.nome,
        nome_social: pessoa.nome_social ?? '',
        data_nascimento: pessoa.data_nascimento ?? '',
        sexo: pessoa.sexo ?? '',
        nome_mae: pessoa.nome_mae ?? '',
        nome_pai: pessoa.nome_pai ?? '',
        estado_civil: pessoa.estado_civil ?? '',
        nacionalidade: pessoa.nacionalidade ?? '',
        naturalidade: pessoa.naturalidade ?? '',
        nis: pessoa.nis ?? '',
      });
      setErro(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pessoa]);

  const definir = (nome: string, valor: unknown) => setValores((v) => ({ ...v, [nome]: valor }));

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!pessoa) return;
    const resultado = await executar(() => pessoasApi.atualizar(pessoa.id, valores));
    if (resultado) {
      onFechar();
      await onSalvo();
    }
  };

  return (
    <Modal
      open={pessoa !== null}
      onClose={onFechar}
      title="Editar pessoa"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" form="form-editar-pessoa" disabled={enviando}>{enviando ? 'Enviando…' : 'Salvar'}</Button>
        </div>
      }
    >
      <form id="form-editar-pessoa" onSubmit={salvar} className="space-y-4">
        {SECOES_EDITAR.map((secao) => (
          <div key={secao.titulo}>
            <h4 className="mb-2 text-sm font-semibold text-muted-foreground">{secao.titulo}</h4>
            <CamposFormulario campos={secao.campos} valores={valores} onChange={definir} erro={erro} />
          </div>
        ))}
      </form>
      <div className="mt-3"><ErroBox erro={erro} /></div>
    </Modal>
  );
};

export default PessoasModule;
