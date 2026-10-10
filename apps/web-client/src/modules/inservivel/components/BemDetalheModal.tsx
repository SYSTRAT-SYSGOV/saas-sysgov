import React from 'react';
import { Package, Pencil } from 'lucide-react';
import { AlertCard, Button, Modal, Skeleton, StatusChip } from '@sysgov/ui';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type Bem } from '../api';
import { formatarCentavos, formatarData, formatarDataHora, rotuloUnidade, VARIANTE_STATUS_LOTE } from '../formato';
import { ChipSituacao, FotoBem } from './Comuns';

const Campo: React.FC<{ rotulo: string; valor: React.ReactNode; mono?: boolean }> = ({ rotulo, valor, mono }) => (
  <div>
    <dt className="text-xs font-semibold uppercase text-muted-foreground">{rotulo}</dt>
    <dd className={`text-sm ${mono ? 'font-mono tabular-nums' : ''}`}>{valor || '—'}</dd>
  </div>
);

/** Visualização completa do bem: dados, fotos e lotes por onde passou (spec: Cadastro de bens). */
export const BemDetalheModal: React.FC<{ bemId: number | null; podeEditar: boolean; onFechar: () => void; onEditar: (id: number) => void }> = ({ bemId, podeEditar, onFechar, onEditar }) => {
  const carga = useCarga<Bem | null>(() => (bemId === null ? Promise.resolve(null) : inservivelApi.bem(bemId)), [bemId]);
  const b = carga.dados;

  return (
    <Modal open={bemId !== null} onClose={onFechar} title={b ? `Bem ${b.numero_patrimonial}` : 'Bem'} icon={<Package className="h-5 w-5" />} size="2xl"
      footer={<>{podeEditar && b && <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => onEditar(b.id)}>Editar</Button>}<Button onClick={onFechar}>Fechar</Button></>}>
      {carga.erro && <AlertCard priority="danger" title="Não foi possível carregar o bem" description={carga.erro} />}
      {!b && !carga.erro && <Skeleton className="h-80 w-full" />}
      {b && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2"><ChipSituacao situacao={b.situacao} />{b.estado_conservacao && <StatusChip label={b.estado_conservacao.nome} variant="neutral" />}</div>
          <p className="text-base">{b.descricao}</p>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Nº patrimonial" valor={b.numero_patrimonial} mono />
            <Campo rotulo="Plaqueta antiga" valor={b.plaqueta_antiga} mono />
            <Campo rotulo="Categoria" valor={b.categoria?.nome} />
            <Campo rotulo="Marca" valor={b.marca} />
            <Campo rotulo="Modelo" valor={b.modelo} />
            <Campo rotulo="Nº de série" valor={b.numero_serie} mono />
            <Campo rotulo="Secretaria / setor" valor={rotuloUnidade(b.secretaria, b.setor)} />
            <Campo rotulo="Valor contábil" valor={formatarCentavos(b.valor_contabil_cents)} mono />
            <Campo rotulo="Valor avaliado" valor={formatarCentavos(b.valor_avaliado_cents)} mono />
            <Campo rotulo="Aquisição" valor={formatarData(b.data_aquisicao)} mono />
            <Campo rotulo="Incorporação" valor={formatarData(b.data_incorporacao)} mono />
            <Campo rotulo="Cadastrado em" valor={formatarDataHora(b.created_at)} mono />
          </dl>
          {b.observacoes && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Observações</p><p className="whitespace-pre-line text-sm">{b.observacoes}</p></div>}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Fotos</p>
            {b.fotos.length === 0 ? <p className="text-sm text-muted-foreground">Sem fotos.</p> : (
              <div className="flex flex-wrap gap-3">
                {b.fotos.map((f) => <FotoBem key={f.id} chave={`${b.id}-${f.id}`} carregar={() => inservivelApi.foto(b.id, f.id)} alt={`Foto do bem ${b.numero_patrimonial}`} className="h-32 w-32" />)}
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Lotes</p>
            {b.lotes.length === 0 ? <p className="text-sm text-muted-foreground">O bem ainda não passou por nenhum lote.</p> : (
              <ul className="flex flex-wrap gap-2">
                {b.lotes.map((l) => <li key={l.id} className="flex items-center gap-2 text-sm"><span className="font-mono tabular-nums">Lote {l.numero}</span><StatusChip label={l.status_rotulo} variant={VARIANTE_STATUS_LOTE[l.status]} /></li>)}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
