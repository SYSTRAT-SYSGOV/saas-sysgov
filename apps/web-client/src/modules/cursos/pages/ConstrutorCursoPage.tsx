import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Save } from 'lucide-react';
import { Button, Card, Checkbox, Select, Switch } from '@sysgov/ui';
import {
  sysgovApi,
  type AssinaturaOrgao,
  type Curso,
  type ElementoLeiaute,
  type FundoCertificado,
  type LeiauteCursoInput,
  type OrientacaoCertificado,
  type TextoCertificado,
} from '@sysgov/sdk';
import { ConfirmDialog, ScreenState } from '@/components/ui';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ErroFormulario } from '../components/ErroFormulario';
import { CAMPOS_TEXTO_LIVRE, TAMANHO_MAX, TAMANHO_MIN, limitar, problemas } from '../construtor/leiaute';
import {
  OPCIONAIS,
  alternarAssinatura,
  alternarCampo,
  comFixos,
  elementoFixo,
  leiauteInicial,
  temAssinatura,
  temCampo,
  type CampoOpcional,
} from '../construtor/leiauteCurso';
import { PaginaCertificado } from '../construtor/PaginaCertificado';
import { PropriedadesElemento } from '../construtor/PropriedadesElemento';

/**
 * Construtor visual por curso (D8), no formato do sistema de referência: 1) curso alvo, fundo e
 * modelo de texto; 2) assinaturas; 3) elementos opcionais avulsos. Cada item marcado aparece na
 * página ao lado e pode ser arrastado e configurado. Salvar grava o leiaute como o modelo do curso.
 */
export const ConstrutorCursoPage: React.FC = () => {
  const [cursos, setCursos] = useState<Curso[] | null>(null);
  const [fundos, setFundos] = useState<FundoCertificado[]>([]);
  const [textos, setTextos] = useState<TextoCertificado[]>([]);
  const [assinaturas, setAssinaturas] = useState<AssinaturaOrgao[]>([]);

  const [cursoId, setCursoId] = useState<number | null>(null);
  const [fundoId, setFundoId] = useState<number | null>(null);
  const [textoId, setTextoId] = useState<number | null>(null);
  const [versoAtivo, setVersoAtivo] = useState(false);
  const [elementos, setElementos] = useState<ElementoLeiaute[]>(() => leiauteInicial('paisagem'));
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [salvoEm, setSalvoEm] = useState<{ fundo: number | null; texto: number | null }>({ fundo: null, texto: null });

  const [sujo, setSujo] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trocarPara, setTrocarPara] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      sysgovApi.cursos.listarCursos({ per_page: 200 }),
      sysgovApi.cursos.listarFundos(),
      sysgovApi.cursos.listarTextos(),
      sysgovApi.cursos.listarAssinaturas(),
    ]).then(([c, f, t, a]) => {
      setCursos(c.data);
      setFundos(f.fundos);
      setTextos(t.textos);
      setAssinaturas(a.assinaturas);
    }).catch((e) => {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar os cadastros do construtor.'));
      setCursos([]);
    });
  }, []);

  const fundo = fundos.find((f) => f.id === fundoId) ?? null;
  const texto = textos.find((t) => t.id === textoId) ?? null;
  const orientacao: OrientacaoCertificado = fundo?.orientacao ?? 'paisagem';
  const assinaturaPorId = useMemo(() => new Map(assinaturas.map((a) => [a.id, a])), [assinaturas]);
  const atual = elementos.find((e) => e.id === selecionado) ?? null;
  const curso = cursos?.find((c) => c.id === cursoId) ?? null;
  // O construtor mostra o curso escolhido; os demais campos seguem com valores de exemplo.
  const valoresDoCurso = useMemo(() => {
    if (!curso) return undefined;
    const valores: Record<string, string> = { curso: curso.titulo, carga_horaria: formatarCarga(curso.carga_horaria_minutos), carga_horas: formatarHoras(curso.carga_horaria_minutos) };
    if (curso.responsavel) valores.responsavel = curso.responsavel;
    if (curso.conteudo_programatico) valores.conteudo_programatico = curso.conteudo_programatico;
    return valores;
  }, [curso]);
  const avisos = useMemo(() => problemas(elementos, CAMPOS_TEXTO_LIVRE), [elementos]);

  const mudar = useCallback((fn: (lista: ElementoLeiaute[]) => ElementoLeiaute[]) => {
    setElementos(fn);
    setSujo(true);
    setAviso(null);
  }, []);

  // ------------------------------------------------------------ passo 1: curso, fundo e texto
  const carregarCurso = async (id: number) => {
    setCursoId(id);
    setSelecionado(null);
    setErro(null);
    setAviso(null);
    setOcupado('Carregando o leiaute do curso...');
    try {
      const { leiaute } = await sysgovApi.cursos.obterLeiauteDoCurso(id);
      const fundoDoLeiaute = leiaute?.fundo_id ?? null;
      const textoDoLeiaute = leiaute?.texto_id ?? null;
      const orient = leiaute?.orientacao ?? 'paisagem';
      setFundoId(fundoDoLeiaute);
      setTextoId(textoDoLeiaute);
      setVersoAtivo(leiaute?.verso_ativo ?? false);
      setElementos(leiaute?.elementos ? comFixos(leiaute.elementos, orient) : leiauteInicial(orient));
      setSalvoEm({ fundo: fundoDoLeiaute, texto: textoDoLeiaute });
      setSujo(false);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar o leiaute do curso.'));
    } finally {
      setOcupado(null);
    }
  };

  const escolherCurso = (id: number) => {
    if (id === cursoId) return;
    if (sujo) {
      setTrocarPara(id);
      return;
    }
    void carregarCurso(id);
  };

  const escolherFundo = (id: number) => {
    const novo = fundos.find((f) => f.id === id);
    setFundoId(id);
    // Fundo de outra orientação: os elementos são trazidos para dentro da página nova.
    if (novo && novo.orientacao !== orientacao) mudar((lista) => lista.map((e) => limitar(e, novo.orientacao)));
    else setSujo(true);
  };

  // ------------------------------------------------------------ salvar e pré-visualizar
  const pronto = cursoId !== null && fundoId !== null && textoId !== null;
  const payload = (): LeiauteCursoInput => ({ fundo_id: fundoId as number, texto_id: textoId as number, elementos, verso_ativo: versoAtivo });

  const salvar = async () => {
    if (!pronto) return;
    setOcupado('Salvando o leiaute...');
    setErro(null);
    try {
      await sysgovApi.cursos.salvarLeiauteDoCurso(cursoId, payload());
      setSalvoEm({ fundo: fundoId, texto: textoId });
      setSujo(false);
      setAviso('Leiaute salvo: os certificados deste curso passam a sair com ele.');
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível salvar o leiaute.'));
    } finally {
      setOcupado(null);
    }
  };

  const preVisualizar = async () => {
    if (!pronto) return;
    setOcupado('Gerando o PDF de exemplo...');
    setErro(null);
    const janela = window.open('', '_blank');
    try {
      const pdf = await sysgovApi.cursos.preVisualizarLeiauteDoCurso(cursoId, payload());
      const url = URL.createObjectURL(pdf);
      if (janela) janela.location.href = url;
      else window.open(url, '_blank');
    } catch (e) {
      janela?.close();
      setErro(getApiErrorMessage(e, 'Não foi possível gerar a pré-visualização.'));
    } finally {
      setOcupado(null);
    }
  };

  if (cursos === null) return <ScreenState type="loading" title="Carregando o construtor..." />;

  // Itens inativos só aparecem se já estão no leiaute salvo deste curso.
  const fundosOferecidos = fundos.filter((f) => f.ativo || f.id === salvoEm.fundo);
  const textosOferecidos = textos.filter((t) => t.ativo || t.id === salvoEm.texto);
  const assinaturasOferecidas = assinaturas.filter((a) => a.ativa || temAssinatura(elementos, a.id));
  const opcionais = OPCIONAIS.filter((o) => o.campo !== 'complementar' || (texto?.texto_complementar ?? '') !== '' || temCampo(elementos, 'complementar'));

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      <Card className="h-fit space-y-5 p-4">
        <section className="space-y-3">
          <h3 className="text-base font-semibold">1. Selecionar vínculos</h3>
          <Select
            label="Curso alvo *"
            value={cursoId}
            placeholder="Selecione o curso"
            onChange={(v) => escolherCurso(Number(v))}
            options={cursos.map((c) => ({ value: c.id, label: c.titulo }))}
          />
          <Select
            label="Fundo *"
            value={fundoId}
            placeholder={fundosOferecidos.length ? 'Selecione o fundo' : 'Cadastre fundos na aba Fundos'}
            disabled={cursoId === null || fundosOferecidos.length === 0}
            onChange={(v) => escolherFundo(Number(v))}
            options={fundosOferecidos.map((f) => ({ value: f.id, label: f.ativo ? f.nome : `${f.nome} (inativo)` }))}
          />
          <Select
            label="Modelo de texto *"
            value={textoId}
            placeholder={textosOferecidos.length ? 'Selecione o texto' : 'Cadastre textos na aba Textos'}
            disabled={cursoId === null || textosOferecidos.length === 0}
            onChange={(v) => { setTextoId(Number(v)); setSujo(true); }}
            options={textosOferecidos.map((t) => ({ value: t.id, label: t.ativo ? t.nome : `${t.nome} (inativo)` }))}
          />
          <div className="flex items-center gap-2">
            <Switch id="verso-curso" checked={versoAtivo} disabled={cursoId === null} onCheckedChange={(v) => { setVersoAtivo(v); setSujo(true); }} label="Imprimir verso" />
            <label htmlFor="verso-curso" className="text-sm">Verso com o conteúdo programático</label>
          </div>
        </section>

        <section className="space-y-2 border-t border-border pt-4">
          <h3 className="text-base font-semibold">2. Assinaturas</h3>
          <p className="text-xs text-muted-foreground">Selecione quais assinaturas aparecerão neste certificado:</p>
          {assinaturasOferecidas.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma assinatura ativa — cadastre na aba Assinaturas.</p>}
          {assinaturasOferecidas.map((a) => (
            <Checkbox
              key={a.id}
              label={a.ativa ? a.nome : `${a.nome} (inativa)`}
              checked={temAssinatura(elementos, a.id)}
              disabled={cursoId === null}
              onCheckedChange={(v) => mudar((lista) => alternarAssinatura(lista, a.id, v === true, orientacao))}
            />
          ))}
        </section>

        <section className="space-y-2 border-t border-border pt-4">
          <h3 className="text-base font-semibold">3. Elementos opcionais avulsos</h3>
          <p className="text-xs text-muted-foreground">Ative caso queira posicionar estes itens separadamente, com tamanhos diferentes do texto principal:</p>
          {opcionais.map((o) => (
            <Checkbox
              key={o.campo}
              label={o.rotulo}
              checked={temCampo(elementos, o.campo)}
              disabled={cursoId === null}
              onCheckedChange={(v) => mudar((lista) => alternarCampo(lista, o.campo as CampoOpcional, v === true, orientacao))}
            />
          ))}
        </section>

        {atual && (
          <PropriedadesElemento
            elemento={atual}
            assinaturas={assinaturaPorId}
            onChange={(m) => mudar((lista) => lista.map((e) => (e.id === atual.id ? limitar({ ...e, ...m } as ElementoLeiaute, orientacao) : e)))}
            onRemover={elementoFixo(atual) ? undefined : () => { mudar((lista) => lista.filter((e) => e.id !== atual.id)); setSelecionado(null); }}
            camposLivres={CAMPOS_TEXTO_LIVRE}
            tamanhoMin={TAMANHO_MIN}
            tamanhoMax={TAMANHO_MAX}
          />
        )}

        <div className="space-y-2 border-t border-border pt-4">
          <ErroFormulario mensagem={erro} />
          {avisos.length > 0 && (
            <ul className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              {avisos.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
          {aviso && <p className="text-xs text-emerald-700 dark:text-emerald-400">{aviso}</p>}
          {!pronto && <p className="text-xs text-muted-foreground">Escolha o curso, o fundo e o modelo de texto para salvar.</p>}
          {sujo && pronto && <p className="text-xs text-amber-600">Alterações não salvas.</p>}
          {ocupado && <p className="text-xs text-muted-foreground">{ocupado}</p>}
          <Button className="w-full" onClick={() => void salvar()} disabled={!pronto || ocupado !== null || avisos.length > 0}><Save className="h-4 w-4" /> Salvar layout visual</Button>
          <Button className="w-full" variant="outline" onClick={() => void preVisualizar()} disabled={!pronto || ocupado !== null}><Eye className="h-4 w-4" /> Pré-visualizar PDF</Button>
        </div>
      </Card>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <PaginaCertificado
          orientacao={orientacao}
          elementos={elementos}
          onElementos={mudar}
          selecionado={selecionado}
          onSelecionar={setSelecionado}
          fundoUrl={fundo?.imagem_url ?? null}
          textos={{ titulo: texto?.tipo_certificado || 'Tipo de Certificado', corpo: texto?.texto_principal ?? 'Texto Principal', complementar: texto?.texto_complementar, valores: valoresDoCurso }}
          assinaturas={assinaturaPorId}
          semFundo={cursoId === null ? 'Escolha o curso alvo para começar' : 'Escolha o fundo no passo 1'}
          podeRemover={(el) => !elementoFixo(el)}
          reservaVertical={160}
        />
      </div>

      <ConfirmDialog
        open={trocarPara !== null}
        onClose={() => setTrocarPara(null)}
        requireReason={false}
        title="Trocar de curso sem salvar?"
        description="O leiaute deste curso tem alterações que ainda não foram salvas."
        confirmLabel="Trocar sem salvar"
        onConfirm={() => { const id = trocarPara; setTrocarPara(null); if (id !== null) void carregarCurso(id); }}
      />
    </div>
  );
};

/** Mesmo formato do servidor: "20 horas", "1 hora", "1h30", "45 minutos". */
/** {CARGA_HORARIA}: só o número de horas ("20", "1,5"), como no servidor. */
function formatarHoras(minutos: number): string {
  return minutos % 60 === 0 ? String(minutos / 60) : (minutos / 60).toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
}

function formatarCarga(minutos: number | null | undefined): string {
  const total = Number(minutos ?? 0);
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  if (resto === 0) return horas === 1 ? '1 hora' : `${horas} horas`;
  return horas === 0 ? `${resto} minutos` : `${horas}h${String(resto).padStart(2, '0')}`;
}

export default ConstrutorCursoPage;
