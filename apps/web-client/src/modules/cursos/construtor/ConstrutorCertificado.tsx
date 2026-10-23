import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, FileImage, Image as ImageIcon, QrCode, Save, Type } from 'lucide-react';
import { Button, Card, Select, Switch } from '@sysgov/ui';
import {
  sysgovApi,
  type AssinaturaOrgao,
  type CatalogoLeiaute,
  type ElementoLeiaute,
  type ModeloCertificado,
  type OrientacaoCertificado,
} from '@sysgov/sdk';
import { ConfirmDialog } from '@/components/ui';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ErroFormulario } from '../components/ErroFormulario';
import { PAGINAS, ROTULO_CAMPO, limitar, novoId, novoTexto, problemas } from './leiaute';
import { PaginaCertificado } from './PaginaCertificado';
import { PropriedadesElemento } from './PropriedadesElemento';
import { prepararFundo } from './pdfParaImagem';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

interface ConstrutorProps {
  modelo: ModeloCertificado;
  catalogo: CatalogoLeiaute;
  onVoltar: () => void;
  onSalvo: (modelo: ModeloCertificado) => void;
}

/**
 * Construtor visual do certificado (change cursos-construtor-visual-certificado): a página A4 em
 * escala com a arte de fundo e os elementos (textos, QR code, logotipo, assinaturas e selos)
 * posicionados por arrastar. Coordenadas em pontos — as mesmas do PDF gerado pelo servidor.
 */
export const ConstrutorCertificado: React.FC<ConstrutorProps> = ({ modelo, catalogo, onVoltar, onSalvo }) => {
  const [orientacao, setOrientacao] = useState<OrientacaoCertificado>(modelo.orientacao ?? 'paisagem');
  const [elementos, setElementos] = useState<ElementoLeiaute[]>(() => modelo.elementos ?? catalogo.padrao[modelo.orientacao ?? 'paisagem']);
  const [versoAtivo, setVersoAtivo] = useState(modelo.verso_ativo);
  const [fundoUrl, setFundoUrl] = useState<string | null>(modelo.fundo_url);
  const [versoFundoUrl, setVersoFundoUrl] = useState<string | null>(modelo.verso_fundo_url);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [assinaturas, setAssinaturas] = useState<AssinaturaOrgao[]>([]);
  const [sujo, setSujo] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { modal: modalValidacao, tratarErro } = useFormValidationModal();
  const [confirmarSaida, setConfirmarSaida] = useState(false);

  const [largura, altura] = PAGINAS[orientacao];
  const avisos = useMemo(() => problemas(elementos, catalogo.campos_texto_livre), [elementos, catalogo.campos_texto_livre]);
  const atual = elementos.find((e) => e.id === selecionado) ?? null;
  const assinaturaPorId = useMemo(() => new Map(assinaturas.map((a) => [a.id, a])), [assinaturas]);

  useEffect(() => {
    sysgovApi.cursos.listarAssinaturas().then((r) => setAssinaturas(r.assinaturas)).catch(() => setAssinaturas([]));
  }, []);

  const alterar = useCallback((id: string, mudar: (e: ElementoLeiaute) => ElementoLeiaute) => {
    setElementos((lista) => lista.map((e) => (e.id === id ? limitar(mudar(e), orientacao) : e)));
    setSujo(true);
  }, [orientacao]);

  const adicionar = (el: ElementoLeiaute) => {
    setElementos((lista) => [...lista, limitar(el, orientacao)]);
    setSelecionado(el.id);
    setSujo(true);
  };

  const remover = (id: string) => {
    setElementos((lista) => lista.filter((e) => e.id !== id));
    setSelecionado(null);
    setSujo(true);
  };

  // ------------------------------------------------------------ página, fundo e verso
  const trocarOrientacao = (nova: OrientacaoCertificado) => {
    setOrientacao(nova);
    setElementos((lista) => lista.map((e) => limitar(e, nova)));
    setSujo(true);
  };

  const enviarFundo = async (arquivo: File | undefined, verso: boolean) => {
    if (!arquivo) return;
    setOcupado(verso ? 'Enviando fundo do verso...' : 'Preparando o fundo...');
    setErro(null);
    try {
      const { blob, nome } = await prepararFundo(arquivo);
      const salvo = verso
        ? await sysgovApi.cursos.enviarVersoFundo(modelo.id, blob, nome)
        : await sysgovApi.cursos.enviarFundo(modelo.id, blob, nome);
      if (verso) setVersoFundoUrl(salvo.verso_fundo_url);
      else setFundoUrl(salvo.fundo_url);
    } catch (e) {
      if (!tratarErro(e)) setErro(getApiErrorMessage(e, 'Não foi possível enviar o fundo.'));
    } finally {
      setOcupado(null);
    }
  };

  // ------------------------------------------------------------ salvar e pré-visualizar
  const alteracoes = () => ({ tipo: 'visual' as const, orientacao, elementos, verso_ativo: versoAtivo });

  const salvar = async () => {
    setOcupado('Salvando...');
    setErro(null);
    try {
      const salvo = await sysgovApi.cursos.atualizarModelo(modelo.id, alteracoes());
      setSujo(false);
      onSalvo(salvo);
    } catch (e) {
      if (!tratarErro(e)) setErro(getApiErrorMessage(e, 'Não foi possível salvar o leiaute.'));
    } finally {
      setOcupado(null);
    }
  };

  const preVisualizar = async () => {
    setOcupado('Gerando PDF de exemplo...');
    setErro(null);
    const janela = window.open('', '_blank');
    try {
      const pdf = await sysgovApi.cursos.preVisualizarModelo(modelo.id, alteracoes());
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

  const voltar = () => {
    if (sujo) {
      setConfirmarSaida(true);
      return;
    }
    onVoltar();
  };

  const ativas = assinaturas.filter((a) => a.ativa);
  const temQr = elementos.some((e) => e.tipo === 'qrcode');

  return (
    <div className="space-y-3">
      {modalValidacao}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={voltar}><ArrowLeft className="h-4 w-4" /> Modelos</Button>
          <h2 className="text-base font-semibold text-foreground">Construtor — {modelo.nome}</h2>
          {sujo && <span className="text-xs text-amber-600">alterações não salvas</span>}
        </div>
        <div className="flex items-center gap-2">
          {ocupado && <span className="text-xs text-muted-foreground">{ocupado}</span>}
          <Button variant="outline" size="sm" onClick={() => void preVisualizar()} disabled={ocupado !== null}><Eye className="h-4 w-4" /> Pré-visualizar PDF</Button>
          <Button size="sm" onClick={() => void salvar()} disabled={ocupado !== null || avisos.length > 0}><Save className="h-4 w-4" /> Salvar leiaute</Button>
        </div>
      </div>
      <ErroFormulario mensagem={erro} />
      <ConfirmDialog
        open={confirmarSaida}
        onClose={() => setConfirmarSaida(false)}
        requireReason={false}
        title="Sair sem salvar?"
        description="Há alterações no leiaute que ainda não foram salvas."
        confirmLabel="Sair sem salvar"
        onConfirm={() => { setConfirmarSaida(false); onVoltar(); }}
      />
      {avisos.length > 0 && (
        <ul className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {avisos.map((a) => <li key={a}>{a}</li>)}
        </ul>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
        <PaginaCertificado
          orientacao={orientacao}
          elementos={elementos}
          onElementos={(mudar) => { setElementos(mudar); setSujo(true); }}
          selecionado={selecionado}
          onSelecionar={setSelecionado}
          fundoUrl={fundoUrl}
          textos={{ titulo: modelo.titulo, corpo: modelo.corpo }}
          assinaturas={assinaturaPorId}
          logotipoUrl={modelo.logotipo_url}
          semFundo="Sem fundo — envie a arte do certificado no painel ao lado"
        />

        {/* Painel lateral */}
        <div className="space-y-3">
          <Card className="space-y-2 p-3">
            <h3 className="text-sm font-semibold">Adicionar</h3>
            <Select
              value={null}
              placeholder="Campo do certificado…"
              onChange={(campo) => adicionar(novoTexto(orientacao, { campo }))}
              options={catalogo.campos.map((c) => ({ value: c, label: ROTULO_CAMPO[c] ?? c }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => adicionar(novoTexto(orientacao, { texto: '{DATA}' }))}><Type className="h-4 w-4" /> Texto livre</Button>
              <Button size="sm" variant="outline" disabled={temQr} onClick={() => adicionar({ id: novoId('qr'), tipo: 'qrcode', x: 60, y: altura - 150, largura: 90 })}><QrCode className="h-4 w-4" /> QR code</Button>
              <Button size="sm" variant="outline" onClick={() => adicionar({ id: novoId('logo'), tipo: 'logotipo', x: largura / 2 - 60, y: 30, largura: 120 })}><ImageIcon className="h-4 w-4" /> Logotipo</Button>
            </div>
            <Select
              value={null}
              placeholder={ativas.length ? 'Assinatura…' : 'Cadastre assinaturas na aba Assinaturas'}
              disabled={ativas.length === 0}
              onChange={(id) => adicionar({ id: novoId('ass'), tipo: 'assinatura', assinatura_id: Number(id), x: largura / 2 - 80, y: altura - 160, largura: 160, mostrar_textos: true, tamanho: 10, cor: '#1b2a41' })}
              options={ativas.map((a) => ({ value: a.id, label: `${a.nome}${a.cargo ? ` — ${a.cargo}` : ''}` }))}
            />
            <Select
              value={null}
              placeholder="Selo…"
              disabled={!ativas.some((a) => a.selo_url)}
              onChange={(id) => adicionar({ id: novoId('selo'), tipo: 'selo', assinatura_id: Number(id), x: largura - 160, y: altura - 160, largura: 80 })}
              options={ativas.filter((a) => a.selo_url).map((a) => ({ value: a.id, label: `Selo de ${a.nome}` }))}
            />
          </Card>

          <Card className="space-y-2 p-3">
            <h3 className="text-sm font-semibold">Página</h3>
            <Select
              label="Orientação"
              value={orientacao}
              onChange={(v) => trocarOrientacao(v as OrientacaoCertificado)}
              options={[{ value: 'paisagem', label: 'Paisagem (842 × 595 pt)' }, { value: 'retrato', label: 'Retrato (595 × 842 pt)' }]}
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <FileImage className="h-4 w-4 text-primary" /> Fundo (PNG, JPEG ou PDF)
              <input type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={(e) => void enviarFundo(e.target.files?.[0], false)} />
            </label>
            <div className="flex items-center gap-2 pt-1">
              <Switch id="verso-ativo" checked={versoAtivo} onCheckedChange={(v) => { setVersoAtivo(v); setSujo(true); }} label="Imprimir verso" />
              <label htmlFor="verso-ativo" className="text-sm">Verso com o conteúdo programático</label>
            </div>
            {versoAtivo && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <FileImage className="h-4 w-4" /> {versoFundoUrl ? 'Trocar fundo do verso' : 'Fundo do verso (opcional)'}
                <input type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={(e) => void enviarFundo(e.target.files?.[0], true)} />
              </label>
            )}
          </Card>

          {atual && (
            <PropriedadesElemento
              elemento={atual}
              assinaturas={assinaturaPorId}
              onChange={(m) => alterar(atual.id, (el) => ({ ...el, ...m }) as ElementoLeiaute)}
              onRemover={() => remover(atual.id)}
              campos={catalogo.campos}
              camposLivres={catalogo.campos_texto_livre}
              tamanhoMin={catalogo.tamanho_min}
              tamanhoMax={catalogo.tamanho_max}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ConstrutorCertificado;
