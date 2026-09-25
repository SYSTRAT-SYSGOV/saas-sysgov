import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@sysgov/ui';
import { ConfirmDialog, EmptyState, ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type Aula, type Material } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { TIPO_MATERIAL, descreverLiberacao, formatarTamanho } from '../utils/formatos';
import { abrirPdfEmNovaAba } from '../utils/arquivos';
import { ErroFormulario } from './ErroFormulario';
import { MaterialFormModal } from './MaterialFormModal';

interface Props {
  cursoId: number;
  aulas: Aula[];
  editavel: boolean;
}

/** Materiais do curso (gestão): cadastro, ordem, publicação e regra de liberação. */
export const MateriaisTab: React.FC<Props> = ({ cursoId, aulas, editavel }) => {
  const [materiais, setMateriais] = useState<Material[] | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [emEdicao, setEmEdicao] = useState<Material | null | undefined>(undefined);
  const [excluir, setExcluir] = useState<Material | null>(null);

  const carregar = useCallback(async () => {
    setErroCarga(null);
    try {
      setMateriais(await sysgovApi.cursos.listarMateriais(cursoId));
    } catch (e) {
      setErroCarga(getApiErrorMessage(e, 'Não foi possível carregar os materiais.'));
    }
  }, [cursoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const executar = async (acao: () => Promise<unknown>, falha: string) => {
    setErro(null);
    try {
      await acao();
      await carregar();
    } catch (e) {
      setErro(getApiErrorMessage(e, falha));
    }
  };

  const mover = (i: number, delta: number) => {
    if (!materiais) return;
    const ids = materiais.map((m) => m.id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void executar(() => sysgovApi.cursos.reordenarMateriais(cursoId, ids), 'Não foi possível reordenar os materiais.');
  };

  if (erroCarga) return <ScreenState type="error" title="Erro ao carregar" description={erroCarga} actionLabel="Tentar novamente" onAction={carregar} />;
  if (!materiais) return <ScreenState type="loading" title="Carregando materiais..." />;

  const aulaDe = (id: number | null) => aulas.find((a) => a.id === id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Apostilas, vídeos, links e textos do curso, com liberação programada por turma.</p>
        {editavel && (
          <Button size="sm" onClick={() => setEmEdicao(null)}>
            <Plus className="h-4 w-4" /> Novo material
          </Button>
        )}
      </div>
      <ErroFormulario mensagem={erro} />

      {materiais.length === 0 ? (
        <EmptyState title="Nenhum material" description="Cadastre PDFs, vídeos do YouTube ou Vimeo, links e textos para os participantes." />
      ) : (
        <ol className="divide-y divide-border rounded-lg border border-border">
          {materiais.map((m, i) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  <span className="font-mono tabular-nums text-muted-foreground">{i + 1}.</span> {m.titulo}
                </p>
                <p className="text-xs text-muted-foreground">
                  {TIPO_MATERIAL[m.tipo]} · {descreverLiberacao(m.liberacao_regra, m.liberacao_dias)}
                  {aulaDe(m.aula_id) && ` · aula "${aulaDe(m.aula_id)?.titulo}"`}
                  {m.tipo === 'arquivo' && (m.arquivo_nome ? ` · ${m.arquivo_nome} (${formatarTamanho(m.arquivo_tamanho)})` : ' · PDF ainda não enviado')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <StatusChip label={m.publicado ? 'Publicado' : 'Rascunho'} variant={m.publicado ? 'success' : 'neutral'} />
                {m.tipo === 'arquivo' && m.arquivo_nome && (
                  <Button size="icon-sm" variant="ghost" aria-label={`Abrir PDF de ${m.titulo}`} onClick={() => void executar(async () => abrirPdfEmNovaAba(await sysgovApi.cursos.baixarArquivoMaterial(m.id)), 'Não foi possível abrir o PDF.')}>
                    <ExternalLink />
                  </Button>
                )}
                {editavel && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => void executar(() => sysgovApi.cursos.atualizarMaterial(m.id, { publicado: !m.publicado }), 'Não foi possível alterar a publicação.')}>
                      {m.publicado ? 'Despublicar' : 'Publicar'}
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Subir ${m.titulo}`} onClick={() => mover(i, -1)} disabled={i === 0}>
                      <ArrowUp />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Descer ${m.titulo}`} onClick={() => mover(i, 1)} disabled={i === materiais.length - 1}>
                      <ArrowDown />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Editar ${m.titulo}`} onClick={() => setEmEdicao(m)}>
                      <Pencil />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${m.titulo}`} onClick={() => setExcluir(m)}>
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <MaterialFormModal
        open={emEdicao !== undefined}
        cursoId={cursoId}
        aulas={aulas}
        material={emEdicao}
        onClose={() => setEmEdicao(undefined)}
        onSalvo={() => {
          setEmEdicao(undefined);
          void carregar();
        }}
      />
      <ConfirmDialog
        open={excluir !== null}
        onClose={() => setExcluir(null)}
        requireReason={false}
        title="Excluir material"
        description={`Excluir "${excluir?.titulo ?? ''}"? O arquivo, se houver, também é apagado.`}
        confirmLabel="Excluir"
        onConfirm={() => {
          const alvo = excluir;
          setExcluir(null);
          if (alvo) void executar(() => sysgovApi.cursos.excluirMaterial(alvo.id), 'Não foi possível excluir o material.');
        }}
      />
    </div>
  );
};

export default MateriaisTab;
