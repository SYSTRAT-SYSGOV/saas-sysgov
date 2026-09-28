import React, { useState } from 'react';
import { Modal, Button, Badge } from '@sysgov/ui';
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { cemiteriosApi, type Parque, type Setor, type Jazigo } from '../api';
import { Mono } from './comum';

export interface ModalImportadorJazigosProps {
  aberto: boolean;
  parques: Parque[];
  setores: Setor[];
  onFechar: () => void;
  onSucesso: () => void;
}

interface LinhaImportada {
  indice: number;
  codigo: string;
  setorCodigo: string;
  tipo: string;
  capacidade: number;
  comprimento?: number;
  largura?: number;
  valido: boolean;
  erro?: string;
  sectorId?: number;
}

const TIPOS_VALIDOS = ['jazigo', 'gaveta', 'ossuario', 'cova_publica'];

export const ModalImportadorJazigos: React.FC<ModalImportadorJazigosProps> = ({
  aberto,
  parques,
  setores,
  onFechar,
  onSucesso,
}) => {
  const [parqueSelecionadoId, setParqueSelecionadoId] = useState<string>(
    parques[0]?.id ? String(parques[0].id) : ''
  );
  const [linhas, setLinhas] = useState<LinhaImportada[]>([]);
  const [arquivoNome, setArquivoNome] = useState<string>('');
  const [executando, setExecutando] = useState(false);
  const [progresso, setProgresso] = useState({ processados: 0, sucesso: 0, falha: 0 });
  const [finalizado, setFinalizado] = useState(false);

  // Setores do parque ativo
  const setoresAtivos = setores.filter(
    (s) => !parqueSelecionadoId || String(s.park_id) === parqueSelecionadoId
  );

  const baixarModeloCsv = () => {
    const cabecalho = 'codigo,setor_codigo,tipo,capacidade,comprimento_m,largura_m\n';
    const exemplo =
      'JAZ-EXP-01,Q-01,jazigo,3,2.20,1.00\nJAZ-EXP-02,Q-01,gaveta,2,2.00,0.80\n';
    const blob = new Blob([cabecalho + exemplo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_importacao_jazigos_sysgov.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const processarTextoCsv = (texto: string) => {
    const rawLinhas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (rawLinhas.length <= 1) {
      setLinhas([]);
      return;
    }

    const codigosVistos = new Set<string>();
    const parsed: LinhaImportada[] = [];

    // Ignora a primeira linha (cabeçalho)
    for (let i = 1; i < rawLinhas.length; i++) {
      const linha = rawLinhas[i].trim();
      const colunas = linha.includes(';') ? linha.split(';') : linha.split(',');
      const [rawCod, rawSetor, rawTipo, rawCap, rawComp, rawLarg] = colunas.map((c) =>
        c?.trim().replace(/^"|"$/g, '') ?? ''
      );

      const codigo = rawCod.toUpperCase();
      const setorCodigo = rawSetor.toUpperCase();
      const tipo = rawTipo.toLowerCase() || 'jazigo';
      const capacidade = Number(rawCap) || 0;
      const comprimento = rawComp ? Number(rawComp.replace(',', '.')) : undefined;
      const largura = rawLarg ? Number(rawLarg.replace(',', '.')) : undefined;

      let valido = true;
      let erro: string | undefined;

      // Validações
      if (!codigo) {
        valido = false;
        erro = 'Código é obrigatório';
      } else if (codigosVistos.has(codigo)) {
        valido = false;
        erro = 'Código duplicado no arquivo';
      } else if (!setorCodigo) {
        valido = false;
        erro = 'Setor/Quadra é obrigatório';
      } else {
        const setorEncontrado = setoresAtivos.find(
          (s) => s.codigo.toUpperCase() === setorCodigo
        );
        if (!setorEncontrado) {
          valido = false;
          erro = `Setor "${setorCodigo}" não encontrado neste cemitério`;
        } else if (!TIPOS_VALIDOS.includes(tipo)) {
          valido = false;
          erro = `Tipo "${tipo}" inválido (use jazigo, gaveta, ossuario, cova_publica)`;
        } else if (capacidade <= 0) {
          valido = false;
          erro = 'Capacidade deve ser maior que zero';
        }
      }

      if (valido) {
        codigosVistos.add(codigo);
      }

      const setorObj = setoresAtivos.find((s) => s.codigo.toUpperCase() === setorCodigo);

      parsed.push({
        indice: i,
        codigo,
        setorCodigo,
        tipo,
        capacidade,
        comprimento,
        largura,
        valido,
        erro,
        sectorId: setorObj?.id,
      });
    }

    setLinhas(parsed);
    setFinalizado(false);
  };

  const handleArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivoNome(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const conteudo = evt.target?.result as string;
      processarTextoCsv(conteudo);
    };
    reader.readAsText(file);
  };

  const linhasValidas = linhas.filter((l) => l.valido);
  const linhasInvalidas = linhas.filter((l) => !l.valido);

  const executarImportacao = async () => {
    if (linhasValidas.length === 0) return;
    setExecutando(true);
    setFinalizado(false);
    let sucesso = 0;
    let falha = 0;

    for (let i = 0; i < linhasValidas.length; i++) {
      const item = linhasValidas[i];
      try {
        await cemiteriosApi.criarJazigo({
          codigo: item.codigo,
          sector_id: item.sectorId!,
          tipo: item.tipo,
          capacidade: item.capacidade,
          comprimento_m: item.comprimento,
          largura_m: item.largura,
        } as Partial<Jazigo>);
        sucesso++;
      } catch (err) {
        console.error(`Erro ao criar ${item.codigo}:`, err);
        falha++;
      }
      setProgresso({ processados: i + 1, sucesso, falha });
    }

    setExecutando(false);
    setFinalizado(true);
    onSucesso();
  };

  const fecharLimpo = () => {
    if (executando) return;
    setLinhas([]);
    setArquivoNome('');
    setProgresso({ processados: 0, sucesso: 0, falha: 0 });
    setFinalizado(false);
    onFechar();
  };

  return (
    <Modal
      open={aberto}
      onClose={fecharLimpo}
      title="Importador Assistido de Unidades de Sepultamento"
      description="Carga em lote de jazigos e gavetas a partir de arquivo estruturado CSV."
      className="max-w-3xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4 py-2 text-xs">
        {/* Seletor do Cemitério Alvo e Download do Modelo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/20 border border-border rounded-lg">
          <div className="space-y-1">
            <label className="font-semibold text-foreground block">Cemitério de Destino:</label>
            <select
              value={parqueSelecionadoId}
              disabled={executando}
              onChange={(e) => {
                setParqueSelecionadoId(e.target.value);
                setLinhas([]);
              }}
              className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground font-medium"
            >
              {parques.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nome} ({p.codigo})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={baixarModeloCsv}
              className="gap-1.5 h-8 text-xs font-medium self-start sm:self-auto"
            >
              <Download className="h-3.5 w-3.5" /> Baixar Planilha Modelo (CSV)
            </Button>
          </div>
        </div>

        {/* Upload do Arquivo CSV */}
        <div className="border-2 border-dashed border-border rounded-lg p-5 text-center space-y-2 hover:border-primary/50 transition-colors">
          <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
          <div className="space-y-0.5">
            <span className="font-semibold text-foreground block">
              {arquivoNome ? arquivoNome : 'Selecione ou arraste o arquivo CSV'}
            </span>
            <span className="text-[11px] text-muted-foreground block">
              Formato esperado: colunas separadas por vírgula ou ponto-e-vírgula
            </span>
          </div>
          <label className="inline-block cursor-pointer">
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={executando}
              onChange={handleArquivo}
              className="hidden"
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Escolher Arquivo CSV
            </span>
          </label>
        </div>

        {/* Pré-visualização de Dados e Validação */}
        {linhas.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                Registros Analisados ({linhas.length}):
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-emerald-500 font-mono text-[10px]">
                  ✓ {linhasValidas.length} Válido(s)
                </Badge>
                {linhasInvalidas.length > 0 && (
                  <Badge variant="destructive" className="font-mono text-[10px]">
                    ⚠ {linhasInvalidas.length} com Erro
                  </Badge>
                )}
              </div>
            </div>

            <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground sticky top-0">
                  <tr>
                    <th className="p-2">Status</th>
                    <th className="p-2">Código</th>
                    <th className="p-2">Setor</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Capacidade</th>
                    <th className="p-2">Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {linhas.map((l) => (
                    <tr
                      key={l.indice}
                      className={l.valido ? 'hover:bg-muted/20' : 'bg-destructive/5 text-destructive'}
                    >
                      <td className="p-2">
                        {l.valido ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </td>
                      <td className="p-2 font-mono font-bold">{l.codigo}</td>
                      <td className="p-2 font-mono">{l.setorCodigo}</td>
                      <td className="p-2 capitalize">{l.tipo}</td>
                      <td className="p-2 font-mono">{l.capacidade}</td>
                      <td className="p-2 text-[10px]">
                        {l.valido ? <span className="text-emerald-500">Pronto para cadastro</span> : l.erro}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Barra de Progresso e Resultado */}
        {(executando || finalizado) && (
          <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                {executando && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                {executando ? 'Cadastrando unidades de sepultamento...' : 'Importação concluída!'}
              </span>
              <Mono className="tabular-nums">
                {progresso.processados} / {linhasValidas.length}
              </Mono>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{
                  width: `${
                    linhasValidas.length > 0 ? (progresso.processados / linhasValidas.length) * 100 : 0
                  }%`,
                }}
              />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="text-emerald-500 font-medium">✓ Sucesso: {progresso.sucesso}</span>
              {progresso.falha > 0 && (
                <span className="text-rose-500 font-medium">Erros: {progresso.falha}</span>
              )}
            </div>
          </div>
        )}

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" disabled={executando} onClick={fecharLimpo}>
            {finalizado ? 'Concluir' : 'Cancelar'}
          </Button>
          {!finalizado && (
            <Button
              size="sm"
              disabled={executando || linhasValidas.length === 0}
              onClick={executarImportacao}
              className="gap-1.5 font-medium"
            >
              {executando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {executando
                ? 'Importando...'
                : `Importar ${linhasValidas.length} Unidade(s) Válida(s)`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
