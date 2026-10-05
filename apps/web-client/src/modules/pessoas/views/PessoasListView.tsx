import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { UserPlus, Users, ShieldCheck, FileDown, Upload } from 'lucide-react';
import { Button, DataTable, PageHeader, StatusChip } from '@/components/ui';
import { TIPOS_VINCULO, type Pessoa } from '../api';
import { NovaPessoaWizard } from '../NovaPessoaWizard';
import { ErroBox } from './comum';
import { FiltrosAvancadosPessoas } from './FiltrosAvancadosPessoas';
import { ModalImportadorPessoas } from './ModalImportadorPessoas';
import { usePessoas } from '../hooks/usePessoas';

function rotuloStatus(pessoa: Pessoa): string {
  if (pessoa.falecido || pessoa.status === 'falecido') return 'Falecido(a)';
  return pessoa.status === 'ativo' ? 'Ativo' : 'Inativo';
}

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
    filtros: {
      busca,
      setBusca,
      tipo,
      setTipo,
      tipoVinculo,
      setTipoVinculo,
      status,
      setStatus,
      falecido,
      setFalecido,
      sexo,
      setSexo,
      dataNascimentoDe,
      setDataNascimentoDe,
      dataNascimentoAte,
      setDataNascimentoAte,
    },
    recarregar,
    exportarCsv,
  } = usePessoas();

  const [wizardAberto, setWizardAberto] = useState(false);
  const [modalImportarMassa, setModalImportarMassa] = useState(false);

  const colunas = useMemo<ColumnDef<Pessoa, unknown>[]>(
    () => [
      {
        id: 'nome',
        header: 'Nome',
        size: 260,
        meta: { exportValue: (p: Pessoa) => p.nome },
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
        id: 'tipo',
        header: 'Tipo',
        size: 110,
        meta: { exportValue: (p: Pessoa) => (p.tipo === 'juridica' ? 'Jurídica' : 'Física') },
        cell: ({ row }) => (
          <StatusChip
            label={row.original.tipo === 'juridica' ? 'Jurídica' : 'Física'}
            variant={row.original.tipo === 'juridica' ? 'info' : 'neutral'}
          />
        ),
      },
      {
        id: 'documento',
        header: 'CPF/CNPJ',
        size: 170,
        meta: { exportValue: (p: Pessoa) => p.cpf_mascarado },
        cell: ({ row }) => <span className="font-mono tabular-nums whitespace-nowrap">{row.original.cpf_mascarado}</span>,
      },
      {
        id: 'vinculos',
        header: 'Vínculos',
        size: 220,
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
        size: 140,
        meta: { exportValue: (p: Pessoa) => rotuloStatus(p) },
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
        size: 160,
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

      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex gap-2">
          <Button variant="outline" disabled={exportando} onClick={() => void exportarCsv()}>
            <FileDown className="h-4 w-4 mr-1" /> {exportando ? 'Exportando…' : 'Exportar CSV'}
          </Button>
          {podeGerenciar && podeImportar && (
            <Button variant="outline" onClick={() => setModalImportarMassa(true)}>
              <Upload className="h-4 w-4 mr-1" /> Importar planilha
            </Button>
          )}
          {podeGerenciar && (
            <Button onClick={() => setWizardAberto(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Nova pessoa
            </Button>
          )}
        </div>
      </div>

      <FiltrosAvancadosPessoas
        busca={busca}
        onBuscaChange={setBusca}
        tipo={tipo}
        onTipoChange={setTipo}
        tipoVinculo={tipoVinculo}
        onTipoVinculoChange={setTipoVinculo}
        status={status}
        onStatusChange={setStatus}
        falecido={falecido}
        onFalecidoChange={setFalecido}
        sexo={sexo}
        onSexoChange={setSexo}
        dataNascimentoDe={dataNascimentoDe}
        onDataNascimentoDeChange={setDataNascimentoDe}
        dataNascimentoAte={dataNascimentoAte}
        onDataNascimentoAteChange={setDataNascimentoAte}
        onLimparFiltros={() => {
          setBusca('');
          setTipo(null);
          setTipoVinculo(null);
          setStatus(null);
          setFalecido(null);
          setSexo(null);
          setDataNascimentoDe('');
          setDataNascimentoAte('');
        }}
      />

      <ErroBox erro={erro} />

      <DataTable
        columns={colunas}
        data={resultado?.data ?? []}
        loading={carregando}
        emptyText="Nenhuma pessoa cadastrada."
        fixedLayout
        exportable
        exportFileName="pessoas"
        exportTitle="Cadastro de Pessoas"
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

      <ModalImportadorPessoas
        aberto={modalImportarMassa}
        onFechar={() => setModalImportarMassa(false)}
        onSucesso={() => {
          void recarregar();
        }}
      />
    </div>
  );
};
