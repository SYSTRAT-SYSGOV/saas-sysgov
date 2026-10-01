import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@sysgov/ui';
import { ConfirmDialog, EmptyState, ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type CampoInscricao } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { TIPO_CAMPO_INSCRICAO } from '../utils/formatos';
import { ErroFormulario } from './ErroFormulario';
import { CampoInscricaoFormModal } from './CampoInscricaoFormModal';

interface Props {
  cursoId: number;
  editavel: boolean;
}

/** Campos extras do formulário de inscrição (design D9): cadastro, ordem e ativação. */
export const CamposInscricaoTab: React.FC<Props> = ({ cursoId, editavel }) => {
  const [campos, setCampos] = useState<CampoInscricao[] | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [emEdicao, setEmEdicao] = useState<CampoInscricao | null | undefined>(undefined);
  const [excluir, setExcluir] = useState<CampoInscricao | null>(null);

  const carregar = useCallback(async () => {
    setErroCarga(null);
    try {
      setCampos(await sysgovApi.cursos.listarCamposInscricao(cursoId));
    } catch (e) {
      setErroCarga(getApiErrorMessage(e, 'Não foi possível carregar os campos do formulário.'));
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
    if (!campos) return;
    const ids = campos.map((c) => c.id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void executar(() => sysgovApi.cursos.reordenarCamposInscricao(cursoId, ids), 'Não foi possível reordenar os campos.');
  };

  if (erroCarga) return <ScreenState type="error" title="Erro ao carregar" description={erroCarga} actionLabel="Tentar novamente" onAction={carregar} />;
  if (!campos) return <ScreenState type="loading" title="Carregando campos..." />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Campos extras exibidos no formulário de inscrição, além dos dados padrão do participante.</p>
        {editavel && (
          <Button size="sm" onClick={() => setEmEdicao(null)}>
            <Plus className="h-4 w-4" /> Novo campo
          </Button>
        )}
      </div>
      <ErroFormulario mensagem={erro} />

      {campos.length === 0 ? (
        <EmptyState title="Nenhum campo extra" description="O formulário de inscrição usa só os dados padrão do participante." />
      ) : (
        <ol className="divide-y divide-border rounded-lg border border-border">
          {campos.map((c, i) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  <span className="font-mono tabular-nums text-muted-foreground">{i + 1}.</span> {c.rotulo}
                </p>
                <p className="text-xs text-muted-foreground">
                  {TIPO_CAMPO_INSCRICAO[c.tipo]} · {c.obrigatorio ? 'Obrigatório' : 'Opcional'}
                  {c.tipo === 'selecao' && c.opcoes && ` · ${c.opcoes.length} ${c.opcoes.length === 1 ? 'opção' : 'opções'}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <StatusChip label={c.ativo ? 'Ativo' : 'Inativo'} variant={c.ativo ? 'success' : 'neutral'} />
                {editavel && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void executar(
                          () => (c.ativo ? sysgovApi.cursos.desativarCampoInscricao(c.id) : sysgovApi.cursos.ativarCampoInscricao(c.id)),
                          'Não foi possível alterar a ativação.',
                        )
                      }
                    >
                      {c.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Subir ${c.rotulo}`} onClick={() => mover(i, -1)} disabled={i === 0}>
                      <ArrowUp />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Descer ${c.rotulo}`} onClick={() => mover(i, 1)} disabled={i === campos.length - 1}>
                      <ArrowDown />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Editar ${c.rotulo}`} onClick={() => setEmEdicao(c)}>
                      <Pencil />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${c.rotulo}`} onClick={() => setExcluir(c)}>
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <CampoInscricaoFormModal
        open={emEdicao !== undefined}
        cursoId={cursoId}
        campo={emEdicao}
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
        title="Excluir campo"
        description={`Excluir "${excluir?.rotulo ?? ''}"? Se já houver respostas para este campo, use "Desativar" em vez de excluir.`}
        confirmLabel="Excluir"
        onConfirm={() => {
          const alvo = excluir;
          setExcluir(null);
          if (alvo) void executar(() => sysgovApi.cursos.excluirCampoInscricao(alvo.id), 'Não foi possível excluir o campo.');
        }}
      />
    </div>
  );
};

export default CamposInscricaoTab;
