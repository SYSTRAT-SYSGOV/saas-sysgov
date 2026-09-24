import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileBadge, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Input, Modal, Switch } from '@sysgov/ui';
import { ConfirmDialog, EmptyState, ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type ModeloCertificado } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { CampoTexto } from '../components/CampoTexto';
import { ErroFormulario } from '../components/ErroFormulario';

const CORPO_SUGERIDO =
  'Certificamos que {{participante}} concluiu {{curso}}, com carga horária de {{carga_horaria}}, realizado no período de {{periodo}}.\n\n{{orgao}}, {{data_emissao}}.';

/** Modelos de certificado do órgão: texto com campos dinâmicos, logotipo e até 3 assinaturas. */
export const ModelosCertificadoPage: React.FC = () => {
  const [modelos, setModelos] = useState<ModeloCertificado[]>([]);
  const [campos, setCampos] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<ModeloCertificado | null | undefined>(undefined);
  const [excluir, setExcluir] = useState<ModeloCertificado | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const r = await sysgovApi.cursos.listarModelos();
      setModelos(r.modelos);
      setCampos(r.campos_dinamicos);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar os modelos.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (carregando && modelos.length === 0) return <ScreenState type="loading" title="Carregando modelos..." />;

  return (
    <div className="space-y-4">
      <ErroFormulario mensagem={erro} />
      <div className="flex justify-end">
        <Button onClick={() => setEdicao(null)}>
          <Plus className="h-4 w-4" /> Novo modelo
        </Button>
      </div>
      {modelos.length === 0 ? (
        <EmptyState
          icon={<FileBadge className="h-8 w-8" />}
          title="Nenhum modelo de certificado"
          description="Sem um modelo padrão, os certificados ficam pendentes ao encerrar as turmas."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {modelos.map((m) => (
            <Card key={m.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{m.nome}</h3>
                  <p className="text-xs text-muted-foreground">Título impresso: {m.titulo}</p>
                </div>
                <div className="flex items-center gap-1">
                  {m.padrao && <StatusChip label="Padrão" variant="primary" />}
                  <Button size="icon-sm" variant="ghost" aria-label={`Editar ${m.nome}`} onClick={() => setEdicao(m)}>
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${m.nome}`} onClick={() => setExcluir(m)}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">{m.corpo}</p>
              <p className="text-xs text-muted-foreground">
                {m.logotipo_path ? 'Com logotipo' : 'Sem logotipo'} · {(m.assinaturas ?? []).length} assinatura(s)
              </p>
            </Card>
          ))}
        </div>
      )}
      <ModeloFormModal modelo={edicao} campos={campos} onClose={() => setEdicao(undefined)} onSalvo={() => { setEdicao(undefined); void carregar(); }} />
      <ConfirmDialog
        open={excluir !== null}
        onClose={() => setExcluir(null)}
        requireReason={false}
        title="Excluir modelo"
        description={`Excluir o modelo "${excluir?.nome ?? ''}"? Certificados já emitidos não mudam.`}
        confirmLabel="Excluir"
        onConfirm={() => {
          const alvo = excluir;
          setExcluir(null);
          if (alvo) sysgovApi.cursos.excluirModelo(alvo.id).then(carregar).catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível excluir.')));
        }}
      />
    </div>
  );
};

/** Formulário de modelo; exportado para teste. */
export const ModeloFormModal: React.FC<{ modelo: ModeloCertificado | null | undefined; campos: string[]; onClose: () => void; onSalvo: () => void }> = ({
  modelo,
  campos,
  onClose,
  onSalvo,
}) => {
  const aberto = modelo !== undefined;
  const [nome, setNome] = useState('');
  const [titulo, setTitulo] = useState('Certificado');
  const [corpo, setCorpo] = useState(CORPO_SUGERIDO);
  const [padrao, setPadrao] = useState(false);
  const [assinaturas, setAssinaturas] = useState<{ nome: string; cargo: string }[]>([]);
  const [logotipo, setLogotipo] = useState<File | null>(null);
  const [imagens, setImagens] = useState<Record<number, File>>({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputCorpo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setNome(modelo?.nome ?? '');
    setTitulo(modelo?.titulo ?? 'Certificado');
    setCorpo(modelo?.corpo ?? CORPO_SUGERIDO);
    setPadrao(modelo?.padrao ?? false);
    setAssinaturas((modelo?.assinaturas ?? []).map((a) => ({ nome: a.nome, cargo: a.cargo })));
    setLogotipo(null);
    setImagens({});
  }, [aberto, modelo]);

  const inserirCampo = (campo: string) => {
    const el = inputCorpo.current;
    const marcador = `{{${campo}}}`;
    if (!el) {
      setCorpo((c) => c + marcador);
      return;
    }
    const { selectionStart: ini, selectionEnd: fim } = el;
    setCorpo((c) => c.slice(0, ini) + marcador + c.slice(fim));
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const dados = { nome, titulo, corpo, padrao, assinaturas };
      const salvo = modelo ? await sysgovApi.cursos.atualizarModelo(modelo.id, dados) : await sysgovApi.cursos.criarModelo(dados);
      if (logotipo) await sysgovApi.cursos.enviarLogotipo(salvo.id, logotipo);
      for (const [indice, arquivo] of Object.entries(imagens)) {
        await sysgovApi.cursos.enviarImagemAssinatura(salvo.id, Number(indice), arquivo);
      }
      onSalvo();
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível salvar o modelo.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={aberto} onClose={onClose} title={modelo ? 'Editar modelo de certificado' : 'Novo modelo de certificado'} icon={<FileBadge className="h-5 w-5" />} size="xl">
      <form onSubmit={salvar} className="space-y-4">
        <ErroFormulario mensagem={erro} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Nome do modelo" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={150} />
          <Input label="Título impresso" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={150} />
        </div>
        <CampoTexto ref={inputCorpo} label="Texto do certificado" value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={6} required maxLength={5000} />
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground">Inserir campo:</span>
          {campos.map((c) => (
            <Button key={c} type="button" size="xs" variant="outline" onClick={() => inserirCampo(c)} className="font-mono">
              {`{{${c}}}`}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Switch id="modelo-padrao" checked={padrao} onCheckedChange={setPadrao} label="Modelo padrão do órgão" />
          <label htmlFor="modelo-padrao" className="text-sm">
            Modelo padrão do órgão (usado quando o curso não define um)
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <ImagePlus className="h-4 w-4" /> Logotipo (PNG ou JPG, até 2 MB)
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => setLogotipo(e.target.files?.[0] ?? null)} className="text-xs" />
        </label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Assinaturas</span>
            {assinaturas.length < 3 && (
              <Button type="button" size="sm" variant="outline" onClick={() => setAssinaturas((a) => [...a, { nome: '', cargo: '' }])}>
                <Plus className="h-4 w-4" /> Assinatura
              </Button>
            )}
          </div>
          {assinaturas.map((a, i) => (
            <div key={i} className="grid items-end gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
              <Input label="Nome" value={a.nome} onChange={(e) => setAssinaturas((l) => l.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} required />
              <Input label="Cargo" value={a.cargo} onChange={(e) => setAssinaturas((l) => l.map((x, j) => (j === i ? { ...x, cargo: e.target.value } : x)))} required />
              <Button type="button" size="icon-sm" variant="ghost" aria-label={`Remover assinatura ${i + 1}`} onClick={() => setAssinaturas((l) => l.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
              <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-3">
                Imagem da assinatura:
                <input type="file" accept="image/png,image/jpeg" onChange={(e) => { const f = e.target.files?.[0]; if (f) setImagens((m) => ({ ...m, [i]: f })); }} />
              </label>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={salvando}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ModelosCertificadoPage;
