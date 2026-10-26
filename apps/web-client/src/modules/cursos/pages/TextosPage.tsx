import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText, Pencil, Save, Trash2, X } from 'lucide-react';
import { Button, Card, Input, Switch, Textarea, DataTable } from '@sysgov/ui';
import { sysgovApi, type TextoCertificado, type TextoCertificadoInput } from '@sysgov/sdk';
import { ConfirmDialog, EmptyState, ScreenState, StatusChip } from '@/components/ui';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { colunaAcoes } from '@/lib/colunaAcoes';
import { ErroFormulario } from '../components/ErroFormulario';
import { DESCRICAO_VARIAVEL, marcador } from '../construtor/leiaute';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

const VAZIO: TextoCertificadoInput = { nome: '', tipo_certificado: '', texto_principal: '', texto_complementar: '', observacoes: '' };

/**
 * Biblioteca de modelos de texto do certificado (D8): tipo de certificado, texto principal com as
 * variáveis do sistema de referência ({NOME}, {CPF}… — clique para inserir onde está o cursor) e
 * texto complementar. O
 * leiaute do curso usa sempre a versão atual do texto.
 */
export const TextosPage: React.FC = () => {
  const [textos, setTextos] = useState<TextoCertificado[] | null>(null);
  const [campos, setCampos] = useState<string[]>([]);
  const [form, setForm] = useState<TextoCertificadoInput>(VAZIO);
  const [editando, setEditando] = useState<TextoCertificado | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { modal: modalValidacao, validar, tratarErro } = useFormValidationModal();
  const [excluir, setExcluir] = useState<TextoCertificado | null>(null);
  const [focado, setFocado] = useState<'texto_principal' | 'texto_complementar'>('texto_principal');
  const principal = useRef<HTMLTextAreaElement>(null);
  const complementar = useRef<HTMLTextAreaElement>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await sysgovApi.cursos.listarTextos();
      setTextos(r.textos);
      setCampos(r.campos);
    } catch (e) {
      if (!tratarErro(e)) setErro(getApiErrorMessage(e, 'Não foi possível carregar os textos.'));
      setTextos([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const definir = (campo: keyof TextoCertificadoInput, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  /** Insere {VARIAVEL} na posição do cursor do último texto em foco. */
  const inserirCampo = (campo: string) => {
    const alvo = focado === 'texto_principal' ? principal.current : complementar.current;
    const atual = (form[focado] ?? '') as string;
    const inicio = alvo?.selectionStart ?? atual.length;
    const fim = alvo?.selectionEnd ?? atual.length;
    const texto = marcador(campo);
    definir(focado, atual.slice(0, inicio) + texto + atual.slice(fim));
    requestAnimationFrame(() => {
      alvo?.focus();
      alvo?.setSelectionRange(inicio + texto.length, inicio + texto.length);
    });
  };

  const editar = (t: TextoCertificado) => {
    setEditando(t);
    setErro(null);
    setForm({
      nome: t.nome, tipo_certificado: t.tipo_certificado ?? '', texto_principal: t.texto_principal,
      texto_complementar: t.texto_complementar ?? '', observacoes: t.observacoes ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelar = () => {
    setEditando(null);
    setForm(VAZIO);
    setErro(null);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar([['Nome de identificação', form.nome], ['Texto principal', form.texto_principal]])) return;
    setSalvando(true);
    setErro(null);
    const dados: TextoCertificadoInput = {
      ...form,
      tipo_certificado: form.tipo_certificado || null,
      texto_complementar: form.texto_complementar || null,
      observacoes: form.observacoes || null,
    };
    try {
      if (editando) await sysgovApi.cursos.atualizarTexto(editando.id, dados);
      else await sysgovApi.cursos.criarTexto(dados);
      cancelar();
      await carregar();
    } catch (err) {
      if (!tratarErro(err)) setErro(getApiErrorMessage(err, 'Não foi possível salvar o modelo de texto.'));
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (t: TextoCertificado) => {
    try {
      await sysgovApi.cursos.atualizarTexto(t.id, { ativo: !t.ativo });
      await carregar();
    } catch (e) {
      if (!tratarErro(e)) setErro(getApiErrorMessage(e, 'Não foi possível alterar o texto.'));
    }
  };

  // Colunas estáveis (o switch não remonta ao gravar); os handlers atuais vêm por ref.
  const ctxTextos = useRef({ editar, alternarAtivo });
  ctxTextos.current = { editar, alternarAtivo };
  const colunas = useMemo<ColumnDef<TextoCertificado, unknown>[]>(() => [
    colunaAcoes<TextoCertificado>((t) => `Ações de ${t.nome}`, (t) => [
      { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => ctxTextos.current.editar(t) },
      { key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setExcluir(t) },
    ]),
    { id: 'nome', header: 'Nome do modelo', accessorKey: 'nome', cell: ({ row }) => <span className="font-medium">{row.original.nome}</span>, meta: { exportHeader: 'Nome do modelo', exportValue: (t) => t.nome } },
    { id: 'tipo', header: 'Tipo', accessorFn: (t) => t.tipo_certificado ?? '', cell: ({ row }) => <span className="text-sm">{row.original.tipo_certificado || '—'}</span>, meta: { exportHeader: 'Tipo', exportValue: (t) => t.tipo_certificado ?? '' } },
    {
      id: 'texto', header: 'Texto principal', accessorKey: 'texto_principal',
      cell: ({ row }) => <span className="block max-w-md truncate text-sm text-muted-foreground" title={row.original.texto_principal}>{row.original.texto_principal}</span>,
      meta: { exportHeader: 'Texto principal', exportValue: (t) => t.texto_principal },
    },
    {
      id: 'status', header: 'Status', accessorFn: (t) => (t.ativo ? 'Ativo' : 'Inativo'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch checked={row.original.ativo} onCheckedChange={() => void ctxTextos.current.alternarAtivo(row.original)} label={`Ativar ${row.original.nome}`} />
          <StatusChip label={row.original.ativo ? 'Ativo' : 'Inativo'} variant={row.original.ativo ? 'success' : 'neutral'} />
        </div>
      ),
      meta: { exportHeader: 'Status', exportValue: (t) => (t.ativo ? 'Ativo' : 'Inativo') },
    },
  ], []);

  if (textos === null) return <ScreenState type="loading" title="Carregando textos..." />;

  return (
    <div className="space-y-4">
      {modalValidacao}
      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold">{editando ? `Editar modelo de texto — ${editando.nome}` : 'Cadastrar novo modelo de texto'}</h3>
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Variáveis disponíveis:</p>
          <div className="flex flex-wrap gap-2">
            {campos.map((c) => (
              <Button key={c} type="button" size="xs" variant="outline" className="font-mono" title={DESCRICAO_VARIAVEL[c] ?? c} onClick={() => inserirCampo(c)}>
                {marcador(c)}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Clique em uma variável para inseri-la onde está o cursor (no texto principal ou no complementar).</p>
        </div>
        <form noValidate onSubmit={salvar} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_20rem]">
            <Input label="Nome de identificação (ex.: Padrão Conclusão) *" value={form.nome} onChange={(e) => definir('nome', e.target.value)} maxLength={150} />
            <Input label="Tipo de certificado" value={form.tipo_certificado ?? ''} onChange={(e) => definir('tipo_certificado', e.target.value)} maxLength={150} placeholder="Ex.: Certificado de Conclusão" />
          </div>
          <label className="block space-y-1 text-sm font-medium">
            Texto principal *
            <Textarea
              ref={principal}
              rows={4}
              value={form.texto_principal}
              onFocus={() => setFocado('texto_principal')}
              onChange={(e) => definir('texto_principal', e.target.value)}
              maxLength={5000}
              placeholder="Certificamos que {NOME}, portador(a) do CPF {CPF}, participou do {CURSO} no dia {DATA_CONCLUSAO} com carga horária de {CARGA_HORARIA} horas."
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Texto complementar / rodapé (opcional)
            <Textarea
              ref={complementar}
              rows={2}
              value={form.texto_complementar ?? ''}
              onFocus={() => setFocado('texto_complementar')}
              onChange={(e) => definir('texto_complementar', e.target.value)}
              maxLength={2000}
            />
          </label>
          <Input label="Observações internas" value={form.observacoes ?? ''} onChange={(e) => definir('observacoes', e.target.value)} maxLength={255} />
          <ErroFormulario mensagem={erro} />
          <div className="flex gap-2">
            <Button type="submit" isLoading={salvando}><Save className="h-4 w-4" /> Salvar modelo de texto</Button>
            {editando && <Button type="button" variant="outline" onClick={cancelar}><X className="h-4 w-4" /> Cancelar edição</Button>}
          </div>
        </form>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold">Modelos cadastrados</h3>
        {textos.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8" />} title="Nenhum modelo de texto" description="Cadastre o texto do certificado para usá-lo no construtor visual." />
        ) : (
          <DataTable
            columns={colunas}
            data={textos}
            emptyText="Nenhum modelo de texto."
            exportable
            exportFileName="cursos-modelos-texto"
            exportTitle="Cursos — Modelos de texto do certificado"
          />
        )}
      </Card>

      <ConfirmDialog
        open={excluir !== null}
        onClose={() => setExcluir(null)}
        requireReason={false}
        title="Excluir modelo de texto"
        description={`Excluir "${excluir?.nome ?? ''}"? Se ele estiver no leiaute de algum curso, a exclusão será recusada — desative-o.`}
        confirmLabel="Excluir"
        onConfirm={() => {
          const alvo = excluir;
          setExcluir(null);
          if (alvo) sysgovApi.cursos.excluirTexto(alvo.id).then(carregar).catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível excluir.')));
        }}
      />
    </div>
  );
};

export default TextosPage;
