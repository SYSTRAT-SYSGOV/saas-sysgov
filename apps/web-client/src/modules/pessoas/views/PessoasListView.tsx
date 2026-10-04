import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { UserPlus, Users, Download, ShieldCheck, FileDown } from 'lucide-react';
import { Button, DataTable, PageHeader, Select, StatusChip } from '@/components/ui';
import { TIPOS_VINCULO, type Pessoa, type TipoVinculo } from '../api';
import { NovaPessoaWizard } from '../NovaPessoaWizard';
import { ErroBox, FormModal, Mono } from './comum';
import { usePessoas } from '../hooks/usePessoas';

const opcoesVinculo = Object.entries(TIPOS_VINCULO).map(([value, label]) => ({ value, label }));
const opcoesStatus = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
];

interface PessoasListViewProps {
  podeGerenciar: boolean;
  podeImportar: boolean;
  podePromover: boolean;
  podeGerenciarIntegracoes: boolean;
  onAbrirDetalhe: (pessoa: Pessoa) => void;
  onPromover: (pessoa: Pessoa) => void;
  onIrParaIntegracoes?: () => void;
}

export const PessoasListView: React.FC<PessoasListViewProps> = ({
  podeGerenciar,
  podeImportar,
  podePromover,
  podeGerenciarIntegracoes,
  onAbrirDetalhe,
  onPromover,
  onIrParaIntegracoes,
}) => {
  const {
    resultado,
    carregando,
    erro,
    exportando,
    filtros: { busca, setBusca, tipoVinculo, setTipoVinculo, status, setStatus },
    recarregar,
    exportarCsv,
    importarPorCpf,
  } = usePessoas();

  const [wizardAberto, setWizardAberto] = useState(false);
  const [modalImportar, setModalImportar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const colunas = useMemo<ColumnDef<Pessoa, unknown>[]>(
    () => [
      {
        id: 'nome',
        header: 'Nome',
        cell: ({ row }) => (
          <div className="min-w-0 max-w-xs" title={row.original.nome_social ? `${row.original.nome} (${row.original.nome_social})` : row.original.nome}>
            <div className="font-medium text-foreground truncate">{row.original.nome}</div>
            {row.original.nome_social && (
              <div className="text-xs text-muted-foreground truncate">({row.original.nome_social})</div>
            )}
          </div>
        ),
      },
      {
        id: 'cpf',
        header: 'CPF',
        cell: ({ row }) => <span className="font-mono tabular-nums whitespace-nowrap">{row.original.cpf_mascarado}</span>,
      },
      {
        id: 'vinculos',
        header: 'Vínculos',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1 max-w-sm">
            {(row.original.vinculos ?? []).length > 0 ? (
              (row.original.vinculos ?? []).map((v) => (
                <StatusChip key={v.id} label={TIPOS_VINCULO[v.tipo_vinculo]} variant="info" />
              ))
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const isFalecido = row.original.falecido || row.original.status === 'falecido';
          if (isFalecido) {
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700">
                Falecido(a)
              </span>
            );
          }
          return (
            <StatusChip
              label={row.original.status}
              variant={row.original.status === 'ativo' ? 'success' : 'neutral'}
            />
          );
        },
      },
      {
        id: 'acoes',
        header: '',
        cell: ({ row }) => (
          <div className="flex gap-1 justify-end">
            {podePromover && !row.original.usuario && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => onPromover(row.original)}
                title="Promover a usuário do sistema"
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Promover
              </Button>
            )}
            <Button size="xs" variant="outline" onClick={() => onAbrirDetalhe(row.original)}>
              Gerenciar
            </Button>
          </div>
        ),
      },
    ],
    [podePromover, onPromover, onAbrirDetalhe]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <PageHeader
          title="Cadastro de Pessoas"
          subtitle="Servidores e munícipes — base de identidade civil e Master Data (MDM) do SYSGOV."
          icon={<Users className="h-6 w-6" />}
        />
        {podeGerenciarIntegracoes && onIrParaIntegracoes && (
          <Button size="sm" variant="outline" onClick={onIrParaIntegracoes}>
            Integrações
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Buscar por nome ou CPF…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Select
            value={tipoVinculo}
            onChange={(v) => setTipoVinculo(v as TipoVinculo | null)}
            options={opcoesVinculo}
            placeholder="Todos os vínculos"
          />
          <Select
            value={status}
            onChange={(v) => setStatus(v as 'ativo' | 'inativo' | null)}
            options={opcoesStatus}
            placeholder="Todos os status"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={exportando} onClick={() => void exportarCsv()}>
            <FileDown className="h-4 w-4 mr-1" /> {exportando ? 'Exportando…' : 'Exportar CSV'}
          </Button>
          {podeGerenciar && podeImportar && (
            <Button variant="outline" onClick={() => setModalImportar(true)}>
              <Download className="h-4 w-4 mr-1" /> Importar por CPF
            </Button>
          )}
          {podeGerenciar && (
            <Button onClick={() => setWizardAberto(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Nova pessoa
            </Button>
          )}
        </div>
      </div>

      {aviso && (
        <p className="rounded-md border border-border bg-accent/50 p-3 text-sm text-foreground" role="status">
          {aviso}
        </p>
      )}

      <ErroBox erro={erro} />

      <DataTable
        columns={colunas}
        data={resultado?.data ?? []}
        loading={carregando}
        emptyText="Nenhuma pessoa cadastrada."
      />

      {wizardAberto && (
        <NovaPessoaWizard
          onFechar={() => setWizardAberto(false)}
          onConcluido={async () => {
            setWizardAberto(false);
            await recarregar();
          }}
        />
      )}

      <FormModal
        aberto={modalImportar}
        titulo="Importar pessoa do sistema da prefeitura"
        rotuloEnviar="Importar pessoa"
        size="lg"
        onFechar={() => setModalImportar(false)}
        campos={[{ nome: 'documento', rotulo: 'CPF', obrigatorio: true, mono: true }]}
        onEnviar={async (v) => {
          await importarPorCpf(String(v.documento));
          setAviso('Importação agendada via mensageria — a pessoa aparecerá na lista assim que o sincronismo for concluído.');
        }}
      />
    </div>
  );
};
