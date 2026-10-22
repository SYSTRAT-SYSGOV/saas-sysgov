import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Pencil, Plus, Stamp, Trash2 } from 'lucide-react';
import { Button, Card, Input, Modal, Select, Switch } from '@sysgov/ui';
import { ConfirmDialog, EmptyState, ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type AssinaturaOrgao } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ErroFormulario } from '../components/ErroFormulario';
import { AssinaturaDesenhada, type AssinaturaDesenhadaRef } from '../components/AssinaturaDesenhada';

/**
 * Biblioteca de assinaturas do órgão (modelos visuais de certificado): nome, cargo, registro
 * profissional, imagem da assinatura e selo. Em uso num modelo, não pode ser excluída — só
 * desativada (continua impressa onde já está, mas não entra em elemento novo).
 */
export const AssinaturasPage: React.FC = () => {
  const [assinaturas, setAssinaturas] = useState<AssinaturaOrgao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<AssinaturaOrgao | null | undefined>(undefined);
  const [excluir, setExcluir] = useState<AssinaturaOrgao | null>(null);

  const carregar = useCallback(async () => {
    try {
      setAssinaturas((await sysgovApi.cursos.listarAssinaturas()).assinaturas);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar as assinaturas.'));
      setAssinaturas([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const alternarAtiva = async (a: AssinaturaOrgao) => {
    try {
      await sysgovApi.cursos.atualizarAssinatura(a.id, { ativa: !a.ativa });
      await carregar();
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível alterar a assinatura.'));
    }
  };

  if (assinaturas === null) return <ScreenState type="loading" title="Carregando assinaturas..." />;

  return (
    <div className="space-y-4">
      <ErroFormulario mensagem={erro} />
      <div className="flex justify-end">
        <Button onClick={() => setEdicao(null)}><Plus className="h-4 w-4" /> Nova assinatura</Button>
      </div>
      {assinaturas.length === 0 ? (
        <EmptyState icon={<Stamp className="h-8 w-8" />} title="Nenhuma assinatura cadastrada" description="Cadastre quem assina os certificados para posicioná-los nos modelos visuais." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assinaturas.map((a) => (
            <Card key={a.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground">{a.nome}</h3>
                  <p className="text-xs text-muted-foreground">{[a.cargo, a.registro_profissional].filter(Boolean).join(' — ') || 'Sem cargo'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <StatusChip label={a.ativa ? 'Ativa' : 'Inativa'} variant={a.ativa ? 'success' : 'neutral'} />
                  <Button size="icon-sm" variant="ghost" aria-label={`Editar ${a.nome}`} onClick={() => setEdicao(a)}><Pencil /></Button>
                  <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${a.nome}`} onClick={() => setExcluir(a)}><Trash2 /></Button>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex h-16 flex-1 items-center justify-center rounded border border-dashed border-border bg-white">
                  {a.imagem_url ? <img src={a.imagem_url} alt={`Assinatura de ${a.nome}`} className="max-h-14 max-w-full" /> : <span className="text-xs text-muted-foreground">sem imagem</span>}
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-border bg-white">
                  {a.selo_url ? <img src={a.selo_url} alt="Selo" className="max-h-14 max-w-full" /> : <span className="text-[10px] text-muted-foreground">sem selo</span>}
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={a.ativa} onCheckedChange={() => void alternarAtiva(a)} label="Ativa" />
                {a.ativa ? 'Disponível para novos elementos' : 'Desativada (continua nos modelos que já a usam)'}
              </label>
            </Card>
          ))}
        </div>
      )}
      <AssinaturaFormModal
        assinatura={edicao}
        onClose={() => setEdicao(undefined)}
        onSalvo={() => { setEdicao(undefined); void carregar(); }}
      />
      <ConfirmDialog
        open={excluir !== null}
        onClose={() => setExcluir(null)}
        requireReason={false}
        title="Excluir assinatura"
        description={`Excluir "${excluir?.nome ?? ''}"? Se ela estiver em algum modelo, a exclusão será recusada — desative-a.`}
        confirmLabel="Excluir"
        onConfirm={() => {
          const alvo = excluir;
          setExcluir(null);
          if (alvo) sysgovApi.cursos.excluirAssinatura(alvo.id).then(carregar).catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível excluir.')));
        }}
      />
    </div>
  );
};

const AssinaturaFormModal: React.FC<{ assinatura: AssinaturaOrgao | null | undefined; onClose: () => void; onSalvo: () => void }> = ({ assinatura, onClose, onSalvo }) => {
  const aberto = assinatura !== undefined;
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [registro, setRegistro] = useState('');
  const [imagem, setImagem] = useState<File | null>(null);
  const [selo, setSelo] = useState<File | null>(null);
  const [ativa, setAtiva] = useState(true);
  const [desenhou, setDesenhou] = useState(false);
  const desenho = useRef<AssinaturaDesenhadaRef>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setNome(assinatura?.nome ?? '');
    setCargo(assinatura?.cargo ?? '');
    setRegistro(assinatura?.registro_profissional ?? '');
    setAtiva(assinatura?.ativa ?? true);
    setImagem(null);
    setSelo(null);
    setDesenhou(false);
    setErro(null);
  }, [aberto, assinatura]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      // Desenhada na tela vale no lugar do arquivo (uma ou outra, como no sistema de referência).
      const desenhada = desenhou ? await desenho.current?.gerarPng() : null;
      if (!assinatura && !desenhada && !imagem) {
        setErro('Desenhe a assinatura na área indicada ou envie a imagem (PNG).');
        return;
      }
      const dados = { nome, cargo: cargo || null, registro_profissional: registro || null, ativa };
      const salva = assinatura ? await sysgovApi.cursos.atualizarAssinatura(assinatura.id, dados) : await sysgovApi.cursos.criarAssinatura(dados);
      const arquivo = desenhada ? new File([desenhada], 'assinatura-desenhada.png', { type: 'image/png' }) : imagem;
      if (arquivo) await sysgovApi.cursos.enviarImagemDaAssinatura(salva.id, arquivo);
      if (selo) await sysgovApi.cursos.enviarSeloDaAssinatura(salva.id, selo);
      onSalvo();
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível salvar a assinatura.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={aberto} onClose={onClose} title={assinatura ? 'Editar assinatura' : 'Nova assinatura'} icon={<Stamp className="h-5 w-5" />} size="lg">
      <form onSubmit={salvar} className="space-y-4">
        <ErroFormulario mensagem={erro} />
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <Input label="Nome do responsável" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={150} />
          <Select label="Status" value={ativa ? '1' : '0'} onChange={(v) => setAtiva(v === '1')} options={[{ value: '1', label: 'Ativa' }, { value: '0', label: 'Inativa' }]} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} maxLength={150} placeholder="Ex.: Secretária de Educação" />
          <Input label="Registro profissional" value={registro} onChange={(e) => setRegistro(e.target.value)} maxLength={60} placeholder="Ex.: CREA 12345" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Assinatura digital (desenhe na tela)</p>
          <AssinaturaDesenhada ref={desenho} onMudou={setDesenhou} />
          <p className="text-xs text-muted-foreground">
            Desenhe a assinatura acima <b>ou</b> envie uma imagem PNG abaixo.
            {assinatura?.imagem_url && ' Deixe os dois em branco para manter a imagem atual.'}
          </p>
        </div>
        {assinatura?.imagem_url && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Imagem atual: <img src={assinatura.imagem_url} alt={`Assinatura atual de ${assinatura.nome}`} className="h-10 rounded border border-border bg-white px-1" />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <ImagePlus className="h-4 w-4" /> Arquivo da assinatura (PNG com fundo transparente, até 2 MB)
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => setImagem(e.target.files?.[0] ?? null)} className="text-xs" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Stamp className="h-4 w-4" /> Selo (opcional)
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => setSelo(e.target.files?.[0] ?? null)} className="text-xs" />
        </label>
        <p className="text-xs text-muted-foreground">Trocar uma imagem não altera certificados já emitidos: eles guardam a imagem da época.</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AssinaturasPage;
