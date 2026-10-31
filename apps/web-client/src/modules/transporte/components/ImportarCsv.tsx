import React, { useEffect, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Badge, Button, Modal } from '@sysgov/ui';
import { mensagemDeErro, transporteApi, type ImportacaoCsv, type TipoImportacao } from '../api';

const ROTULO_TIPO: Record<TipoImportacao, string> = { veiculos: 'veículos', motoristas: 'motoristas', paradas: 'paradas' };

const AJUDA: Record<TipoImportacao, string> = {
  veiculos: 'Colunas obrigatórias: origem, placa, descricao, capacidade, tipo_rede e tipologia_inep. Para veículo locado ou terceirizado, informe o cnpj_empresa de uma empresa já cadastrada.',
  motoristas: 'Colunas obrigatórias: cpf, cnh_numero, cnh_categoria (D ou E) e cnh_validade. O motorista é ligado, pelo CPF, a uma pessoa que já está no Cadastro de Pessoas: a importação não cria pessoas.',
  paradas: 'Coluna obrigatória: nome. Latitude e longitude (com vírgula ou ponto) devem vir juntas. Paradas repetidas (mesmo nome, logradouro e número) são ignoradas.',
};

function entregar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Importação por CSV: envio → prévia (nada é gravado) → confirmação → processamento em fila → relatório. */
export const ImportarCsv: React.FC<{ tipo: TipoImportacao; aoFechar: () => void; aoConcluir: () => void }> = ({ tipo, aoFechar, aoConcluir }) => {
  const [importacao, setImportacao] = useState<ImportacaoCsv | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const concluiu = useRef(false);

  // Depois de confirmada, a importação roda em fila: consulta o andamento até terminar.
  useEffect(() => {
    if (!importacao || (importacao.status !== 'na_fila' && importacao.status !== 'processando')) return undefined;
    const id = window.setInterval(() => {
      void transporteApi.importacao(importacao.id).then(setImportacao).catch((e) => setErro(mensagemDeErro(e)));
    }, 1500);
    return () => window.clearInterval(id);
  }, [importacao]);

  useEffect(() => {
    if (importacao?.status === 'concluida' && !concluiu.current) {
      concluiu.current = true;
      aoConcluir();
    }
  }, [importacao, aoConcluir]);

  const executar = async (acao: () => Promise<void>) => {
    setErro(null);
    setOcupado(true);
    try { await acao(); } catch (e) { setErro(mensagemDeErro(e)); } finally { setOcupado(false); }
  };

  const enviar = (arquivo: File | undefined) => {
    if (!arquivo) return;
    void executar(async () => { setImportacao(await transporteApi.previaImportacao(tipo, arquivo)); });
  };

  const fechar = () => {
    // Prévia não confirmada não deve deixar o arquivo guardado no servidor.
    if (importacao?.status === 'previa') void transporteApi.cancelarImportacao(importacao.id).catch(() => undefined);
    aoFechar();
  };

  const i = importacao;
  const emAndamento = i !== null && (i.status === 'na_fila' || i.status === 'processando');

  return (
    <Modal open onClose={fechar} title={`Importar ${ROTULO_TIPO[tipo]} por CSV`} size="xl" footer={<Button variant="outline" onClick={fechar}>{i?.status === 'concluida' ? 'Fechar' : 'Cancelar'}</Button>}>
      <div className="space-y-4">
        {!i && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{AJUDA[tipo]}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void executar(async () => { const m = await transporteApi.modeloImportacao(tipo); entregar(m.blob, m.nome); })} disabled={ocupado}>
                <Download className="mr-1 h-4 w-4" />Baixar modelo
              </Button>
              <Button onClick={() => entrada.current?.click()} disabled={ocupado}><Upload className="mr-1 h-4 w-4" />Escolher arquivo CSV</Button>
              <input ref={entrada} type="file" accept=".csv,.txt,text/csv" className="sr-only" aria-label="Arquivo CSV" onChange={(e) => enviar(e.target.files?.[0])} />
            </div>
            <p className="text-xs text-muted-foreground">Até 5.000 linhas e 2 MB. Separador ponto e vírgula ou vírgula. Nada é gravado até você confirmar.</p>
          </div>
        )}

        {i && (
          <div className="space-y-3" role="region" aria-label="Resultado da importação">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <strong>{i.arquivo}</strong>
              {i.status === 'previa' && <Badge variant="outline">Prévia</Badge>}
              {emAndamento && <Badge variant="secondary">Processando…</Badge>}
              {i.status === 'concluida' && <Badge variant="outline">Concluída</Badge>}
              {i.status === 'falha' && <Badge variant="destructive">Falhou</Badge>}
              {i.status === 'cancelada' && <Badge variant="secondary">Cancelada</Badge>}
            </p>
            <ul className="grid gap-2 sm:grid-cols-4">
              <li className="rounded border border-border p-2 text-sm">Linhas lidas<strong className="block font-mono text-lg tabular-nums">{i.total}</strong></li>
              <li className="rounded border border-border p-2 text-sm">{i.status === 'concluida' ? 'Criadas' : 'Válidas'}<strong className="block font-mono text-lg tabular-nums">{i.status === 'concluida' ? i.criadas : i.validas}</strong></li>
              <li className="rounded border border-border p-2 text-sm">Ignoradas<strong className="block font-mono text-lg tabular-nums">{i.ignoradas}</strong></li>
              <li className="rounded border border-border p-2 text-sm">Com divergência<strong className="block font-mono text-lg tabular-nums">{i.com_erro}</strong></li>
            </ul>
            {i.mensagem && <p role="alert" className="text-sm text-destructive">{i.mensagem}</p>}
            {i.divergencias.length > 0 && (
              <div className="max-h-56 overflow-auto rounded border border-border">
                <table className="w-full text-sm">
                  <caption className="sr-only">Divergências por linha</caption>
                  <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="px-2 py-1">Linha</th><th className="px-2 py-1">Motivo</th></tr></thead>
                  <tbody>
                    {i.divergencias.map((d) => <tr key={`${d.linha}-${d.codigo}`} className="border-t border-border"><td className="px-2 py-1 font-mono tabular-nums">{d.linha}</td><td className="px-2 py-1">{d.mensagem}</td></tr>)}
                  </tbody>
                </table>
              </div>
            )}
            {i.truncado && <p className="text-xs text-muted-foreground">Há mais divergências além das exibidas.</p>}
            {i.avisos.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {i.avisos.map((a) => <li key={`${a.linha}-${a.mensagem}`}>Linha {a.linha}: {a.mensagem}</li>)}
              </ul>
            )}
            {i.status === 'previa' && (
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => void executar(async () => { setImportacao(await transporteApi.confirmarImportacao(i.id)); })} isLoading={ocupado} disabled={i.validas === 0}>
                  Confirmar importação de {i.validas} linha(s)
                </Button>
                {i.validas === 0 && <span className="text-sm text-muted-foreground">Nenhuma linha válida para importar.</span>}
              </div>
            )}
          </div>
        )}
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
