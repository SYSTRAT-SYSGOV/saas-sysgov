import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { UserPlus, Users, Download, ShieldCheck, FileDown } from 'lucide-react';
import { Button, DataTable, Modal, PageHeader, Select, StatusChip } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { pessoasApi, TIPOS_VINCULO, type Pessoa, type PessoaVinculo, type TipoVinculo } from './api';
import { ErroBox, FormModal, Mono, useAcao, useDados } from './views/comum';

const opcoesVinculo = Object.entries(TIPOS_VINCULO).map(([value, label]) => ({ value, label }));

/** Módulo de Cadastro de Pessoas Físicas (servidores e munícipes) — base para outros módulos. */
export const PessoasModule: React.FC = () => {
  const { can } = useCan();
  const [busca, setBusca] = useState('');
  const [tipoVinculo, setTipoVinculo] = useState<TipoVinculo | null>(null);
  const [modal, setModal] = useState<'pessoa' | 'importar' | null>(null);
  const [pessoaSelecionada, setPessoaSelecionada] = useState<Pessoa | null>(null);
  const [pessoaDetalhe, setPessoaDetalhe] = useState<Pessoa | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { erro, executar } = useAcao();

  const pessoas = useDados(
    () => pessoasApi.listar({ q: busca || undefined, tipo_vinculo: tipoVinculo || undefined, per_page: 50 }),
    [busca, tipoVinculo],
  );

  const podeGerenciar = can('cadastros.pessoas.update');
  const podeImportar = can('cadastros.pessoas.import');
  const podePromover = can('cadastros.pessoas.promote');

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
          <Button size="xs" variant="outline" onClick={() => void abrirDetalhe(row.original)}>Gerenciar</Button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-4">
      <PageHeader title="Cadastro de Pessoas" subtitle="Servidores e munícipes — base de identidade civil do SYSGOV." icon={<Users className="h-6 w-6" />} />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Buscar por nome ou CPF…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Select value={tipoVinculo} onChange={(v) => setTipoVinculo(v as TipoVinculo | null)} options={opcoesVinculo} placeholder="Todos os vínculos" />
        </div>
        <div className="flex gap-2">
          {can('cadastros.pessoas.view') && <Button variant="outline" onClick={() => void pessoasApi.exportarCsv()}><FileDown className="h-4 w-4" /> Exportar CSV</Button>}
          {podeGerenciar && podeImportar && <Button variant="outline" onClick={() => setModal('importar')}><Download className="h-4 w-4" /> Importar por CPF</Button>}
          {podeGerenciar && <Button onClick={() => { setPessoaSelecionada(null); setModal('pessoa'); }}><UserPlus className="h-4 w-4" /> Nova pessoa</Button>}
        </div>
      </div>

      {aviso && <p className="rounded-md border border-border bg-accent/50 p-3 text-sm" role="status">{aviso}</p>}
      <ErroBox erro={erro ?? pessoas.erro} />
      <DataTable columns={colunas} data={pessoas.dados?.data ?? []} loading={pessoas.carregando} emptyText="Nenhuma pessoa cadastrada." />

      <FormModal aberto={modal === 'pessoa'} titulo={pessoaSelecionada ? 'Editar pessoa' : 'Nova pessoa'} onFechar={() => setModal(null)}
        iniciais={pessoaSelecionada ? { nome: pessoaSelecionada.nome, nome_social: pessoaSelecionada.nome_social ?? '' } : {}}
        campos={[
          { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true },
          ...(pessoaSelecionada ? [] : [{ nome: 'cpf', rotulo: 'CPF', obrigatorio: true, dica: 'Armazenado cifrado; exibido mascarado.' } as const]),
          { nome: 'nome_social', rotulo: 'Nome social' },
          { nome: 'data_nascimento', rotulo: 'Data de nascimento', tipo: 'date' as const },
          { nome: 'nome_mae', rotulo: 'Nome da mãe' },
        ]}
        onEnviar={async (v) => {
          if (pessoaSelecionada) await pessoasApi.atualizar(pessoaSelecionada.id, v);
          else await pessoasApi.criar(v);
          await pessoas.recarregar();
        }} />

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
          onFechar={() => setPessoaDetalhe(null)}
          onAtualizado={async () => { setPessoaDetalhe(await pessoasApi.obter(pessoaDetalhe.id)); await pessoas.recarregar(); }}
        />
      )}
    </div>
  );
};

const DetalhePessoaModal: React.FC<{
  pessoa: Pessoa;
  podeGerenciar: boolean;
  podePromover: boolean;
  onFechar: () => void;
  onAtualizado: () => Promise<void>;
}> = ({ pessoa, podeGerenciar, podePromover, onFechar, onAtualizado }) => {
  const [modalVinculo, setModalVinculo] = useState(false);
  const [modalPromover, setModalPromover] = useState(false);
  const [modalDocumento, setModalDocumento] = useState(false);
  const [modalEndereco, setModalEndereco] = useState(false);
  const [modalContato, setModalContato] = useState(false);
  const { erro, executar } = useAcao();

  const encerrar = async (vinculo: PessoaVinculo) => {
    await executar(() => pessoasApi.encerrarVinculo(pessoa.id, vinculo.id));
    await onAtualizado();
  };

  return (
    <>
      <Modal open onClose={onFechar} title={pessoa.nome} description={`CPF ${pessoa.cpf_mascarado}`} size="lg">
        <div className="space-y-4">
          <ErroBox erro={erro} />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Vínculos</h3>
              {podeGerenciar && <Button size="xs" variant="outline" onClick={() => setModalVinculo(true)}>Adicionar vínculo</Button>}
            </div>
            <ul className="space-y-1">
              {(pessoa.vinculos ?? []).map((v) => (
                <li key={v.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                  <span>{TIPOS_VINCULO[v.tipo_vinculo]}{v.fim ? ` — encerrado em ${v.fim}` : ''}</span>
                  {podeGerenciar && !v.fim && <Button size="xs" variant="outline" onClick={() => void encerrar(v)}>Encerrar</Button>}
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
              <Button size="sm" onClick={() => setModalPromover(true)}><ShieldCheck className="h-4 w-4" /> Promover a usuário</Button>
            ) : (
              <p className="text-sm text-muted-foreground">Sem conta de acesso vinculada.</p>
            )}
          </div>
        </div>
      </Modal>

      <FormModal aberto={modalVinculo} titulo="Adicionar vínculo" onFechar={() => setModalVinculo(false)}
        campos={[
          { nome: 'tipo_vinculo', rotulo: 'Tipo de vínculo', tipo: 'select', obrigatorio: true, opcoes: opcoesVinculo },
          { nome: 'inicio', rotulo: 'Início', tipo: 'date' },
        ]}
        onEnviar={async (v) => { await pessoasApi.adicionarVinculo(pessoa.id, v as { tipo_vinculo: TipoVinculo; inicio?: string }); await onAtualizado(); }} />

      <FormModal aberto={modalPromover} titulo="Promover a usuário do SYSGOV" rotuloEnviar="Promover" onFechar={() => setModalPromover(false)}
        campos={[
          { nome: 'email', rotulo: 'E-mail de acesso', obrigatorio: true, dica: 'Senha definida no primeiro acesso.' },
          { nome: 'role_id', rotulo: 'ID do papel (role)', tipo: 'number', obrigatorio: true },
        ]}
        onEnviar={async (v) => { await pessoasApi.promover(pessoa.id, { email: String(v.email), role_id: Number(v.role_id) }); await onAtualizado(); }} />

      <FormModal aberto={modalDocumento} titulo="Adicionar documento" onFechar={() => setModalDocumento(false)}
        campos={[
          { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', obrigatorio: true, opcoes: [{ value: 'rg', label: 'RG' }, { value: 'cnh', label: 'CNH' }, { value: 'titulo_eleitor', label: 'Título de eleitor' }] },
          { nome: 'numero', rotulo: 'Número', obrigatorio: true },
          { nome: 'orgao_emissor', rotulo: 'Órgão emissor' },
        ]}
        onEnviar={async (v) => { await pessoasApi.adicionarDocumento(pessoa.id, v as { tipo: 'rg' | 'cnh' | 'titulo_eleitor'; numero: string }); await onAtualizado(); }} />

      <FormModal aberto={modalEndereco} titulo="Adicionar endereço" onFechar={() => setModalEndereco(false)}
        campos={[
          { nome: 'cep', rotulo: 'CEP' }, { nome: 'logradouro', rotulo: 'Logradouro' }, { nome: 'numero', rotulo: 'Número' },
          { nome: 'complemento', rotulo: 'Complemento' }, { nome: 'bairro', rotulo: 'Bairro' }, { nome: 'cidade', rotulo: 'Cidade' }, { nome: 'uf', rotulo: 'UF' },
        ]}
        onEnviar={async (v) => { await pessoasApi.adicionarEndereco(pessoa.id, v); await onAtualizado(); }} />

      <FormModal aberto={modalContato} titulo="Adicionar contato" onFechar={() => setModalContato(false)}
        campos={[
          { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', obrigatorio: true, opcoes: [{ value: 'celular', label: 'Celular' }, { value: 'email', label: 'E-mail' }, { value: 'telefone', label: 'Telefone' }] },
          { nome: 'valor', rotulo: 'Valor', obrigatorio: true },
          { nome: 'principal', rotulo: 'Principal', tipo: 'switch' },
        ]}
        onEnviar={async (v) => { await pessoasApi.adicionarContato(pessoa.id, v as { tipo: 'celular' | 'email' | 'telefone'; valor: string; principal?: boolean }); await onAtualizado(); }} />
    </>
  );
};

export default PessoasModule;
