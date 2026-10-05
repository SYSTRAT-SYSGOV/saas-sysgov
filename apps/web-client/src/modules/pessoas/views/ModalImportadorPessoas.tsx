import React, { useState } from 'react';
import { Modal, Button, Badge } from '@/components/ui';
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { pessoasApi, erroApi } from '../api';
import { Mono } from './comum';

export interface ModalImportadorPessoasProps {
  aberto: boolean;
  onFechar: () => void;
  onSucesso: () => void;
}

interface LinhaImportada {
  indice: number;
  nome: string;
  cpf: string;
  nomeSocial?: string;
  dataNascimento?: string;
  sexo?: string;
  nis?: string;
  valido: boolean;
  erro?: string;
}

export const ModalImportadorPessoas: React.FC<ModalImportadorPessoasProps> = ({ aberto, onFechar, onSucesso }) => {
  const [linhas, setLinhas] = useState<LinhaImportada[]>([]);
  const [arquivoNome, setArquivoNome] = useState<string>('');
  const [executando, setExecutando] = useState(false);
  const [progresso, setProgresso] = useState({ processados: 0, sucesso: 0, falha: 0 });
  const [finalizado, setFinalizado] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  const baixarModeloCsv = () => {
    const cabecalho = 'nome,cpf,nome_social,data_nascimento,sexo,nis\n';
    const exemplo = 'Maria da Silva,12345678900,,1990-05-15,F,12345678901\nJoão Pereira,98765432100,,,,\n';
    const blob = new Blob([cabecalho + exemplo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_importacao_pessoas_sysgov.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const processarTextoCsv = (texto: string) => {
    const rawLinhas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (rawLinhas.length <= 1) {
      setLinhas([]);
      return;
    }

    const cpfsVistos = new Set<string>();
    const parsed: LinhaImportada[] = [];

    for (let i = 1; i < rawLinhas.length; i++) {
      const linha = rawLinhas[i].trim();
      const colunas = linha.includes(';') ? linha.split(';') : linha.split(',');
      const [rawNome, rawCpf, rawNomeSocial, rawDataNascimento, rawSexo, rawNis] = colunas.map((c) =>
        c?.trim().replace(/^"|"$/g, '') ?? ''
      );

      const nome = rawNome;
      const cpfDigitos = rawCpf.replace(/\D/g, '');

      let valido = true;
      let erro: string | undefined;

      if (!nome) {
        valido = false;
        erro = 'Nome é obrigatório';
      } else if (!cpfDigitos) {
        valido = false;
        erro = 'CPF é obrigatório';
      } else if (cpfsVistos.has(cpfDigitos)) {
        valido = false;
        erro = 'CPF duplicado no arquivo';
      }

      if (valido) {
        cpfsVistos.add(cpfDigitos);
      }

      parsed.push({
        indice: i,
        nome,
        cpf: cpfDigitos,
        nomeSocial: rawNomeSocial || undefined,
        dataNascimento: rawDataNascimento || undefined,
        sexo: rawSexo || undefined,
        nis: rawNis || undefined,
        valido,
        erro,
      });
    }

    setLinhas(parsed);
    setFinalizado(false);
    setErros([]);
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
    const falhas: string[] = [];

    for (let i = 0; i < linhasValidas.length; i++) {
      const item = linhasValidas[i];
      try {
        await pessoasApi.criar({
          nome: item.nome,
          cpf: item.cpf,
          nome_social: item.nomeSocial,
          data_nascimento: item.dataNascimento,
          sexo: item.sexo,
          nis: item.nis,
        });
        sucesso++;
      } catch (err) {
        falha++;
        falhas.push(`${item.nome} (${item.cpf}): ${erroApi(err).mensagem}`);
      }
      setProgresso({ processados: i + 1, sucesso, falha });
    }

    setErros(falhas);
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
    setErros([]);
    onFechar();
  };

  return (
    <Modal
      open={aberto}
      onClose={fecharLimpo}
      title="Importação Manual em Massa de Pessoas"
      description="Cadastro em lote de pessoas a partir de uma planilha CSV."
      size="2xl"
    >
      <div className="space-y-4 py-2 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-muted/20 border border-border rounded-lg">
          <span className="text-muted-foreground">
            Baixe o modelo, preencha com os dados das pessoas e envie o arquivo preenchido.
          </span>
          <Button variant="outline" size="sm" onClick={baixarModeloCsv} className="gap-1.5 h-8 text-xs font-medium self-start sm:self-auto">
            <Download className="h-3.5 w-3.5" /> Baixar Planilha Modelo (CSV)
          </Button>
        </div>

        <div className="border-2 border-dashed border-border rounded-lg p-5 text-center space-y-2 hover:border-primary/50 transition-colors">
          <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
          <div className="space-y-0.5">
            <span className="font-semibold text-foreground block">
              {arquivoNome ? arquivoNome : 'Selecione ou arraste o arquivo CSV'}
            </span>
            <span className="text-[11px] text-muted-foreground block">
              Colunas: nome, cpf, nome_social, data_nascimento, sexo, nis (separadas por vírgula ou ponto-e-vírgula)
            </span>
          </div>
          <label className="inline-block cursor-pointer">
            <input type="file" accept=".csv,text/csv" disabled={executando} onChange={handleArquivo} className="hidden" />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Escolher Arquivo CSV
            </span>
          </label>
        </div>

        {linhas.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Registros Analisados ({linhas.length}):</span>
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
                    <th className="p-2">Nome</th>
                    <th className="p-2">CPF</th>
                    <th className="p-2">Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {linhas.map((l) => (
                    <tr key={l.indice} className={l.valido ? 'hover:bg-muted/20' : 'bg-destructive/5 text-destructive'}>
                      <td className="p-2">
                        {l.valido ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </td>
                      <td className="p-2 font-semibold">{l.nome || '—'}</td>
                      <td className="p-2">
                        <Mono>{l.cpf || '—'}</Mono>
                      </td>
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

        {(executando || finalizado) && (
          <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                {executando && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                {executando ? 'Cadastrando pessoas...' : 'Importação concluída!'}
              </span>
              <Mono className="tabular-nums">
                {progresso.processados} / {linhasValidas.length}
              </Mono>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${linhasValidas.length > 0 ? (progresso.processados / linhasValidas.length) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="text-emerald-500 font-medium">✓ Sucesso: {progresso.sucesso}</span>
              {progresso.falha > 0 && <span className="text-rose-500 font-medium">Erros: {progresso.falha}</span>}
            </div>
            {erros.length > 0 && (
              <ul className="text-[10px] text-rose-500 list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto">
                {erros.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" disabled={executando} onClick={fecharLimpo}>
            {finalizado ? 'Concluir' : 'Cancelar'}
          </Button>
          {!finalizado && (
            <Button size="sm" disabled={executando || linhasValidas.length === 0} onClick={executarImportacao} className="gap-1.5 font-medium">
              {executando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {executando ? 'Importando...' : `Importar ${linhasValidas.length} Pessoa(s) Válida(s)`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
