import React, { useEffect, useRef, useState } from 'react';
import { FileSearch, Upload } from 'lucide-react';
import { Badge, Button, Card, CardContent, Select, Switch } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { mensagemDeErro, transporteApi, type ImportacaoCsv, type TesteLeiaute } from '../api';

const ROTULO_CODIGO: Record<string, string> = {
  aluno_nao_cadastrado: 'Aluno não cadastrado',
  aluno_ambiguo: 'Mais de um aluno combina',
  escola_divergente: 'Aluno em outra escola',
  inep_divergente: 'Código Inep diferente do cadastrado',
  cpf_divergente: 'Código Inep de aluno com outro CPF',
  matricula_sem_identificador: 'Matrícula sem código',
  erro: 'Erro na linha',
};

const ROTULO_RESUMO: [string, string][] = [
  ['casados_inep', 'Reconhecidos pelo código Inep'],
  ['casados_cpf', 'Reconhecidos pelo CPF'],
  ['casados_nome', 'Reconhecidos por nome e nascimento'],
  ['inep_preenchido', 'Códigos Inep a preencher'],
  ['alunos_nao_cadastrados', 'Alunos não cadastrados'],
  ['alunos_ambiguos', 'Casamentos ambíguos'],
  ['alunos_em_escola_nao_cadastrada', 'Alunos em escola não cadastrada'],
  ['divergencias', 'Divergências'],
];

/**
 * Importação do arquivo do Educacenso: a escola e o aluno precisam estar cadastrados, nada é criado. Envio → prévia
 * (nada é gravado) → confirmação → relatório. O "Testar leiaute" confere as colunas antes de importar.
 */
export const CensoImportar: React.FC<{ avisar: Toast }> = ({ avisar }) => {
  const leiautes = useCarga(() => transporteApi.leiautesImportacao(), []);
  const [leiauteId, setLeiauteId] = useState<string>('');
  const [importacao, setImportacao] = useState<ImportacaoCsv | null>(null);
  const [teste, setTeste] = useState<TesteLeiaute | null>(null);
  const [casarPorNome, setCasarPorNome] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const entradaPrevia = useRef<HTMLInputElement>(null);
  const entradaTeste = useRef<HTMLInputElement>(null);
  const avisou = useRef(false);

  const padrao = leiautes.dados?.find((l) => l.padrao) ?? leiautes.dados?.[0];
  const escolhido = leiauteId !== '' ? Number(leiauteId) : padrao?.id;

  // Depois de confirmada, a importação roda em fila: consulta o andamento até terminar.
  useEffect(() => {
    if (!importacao || (importacao.status !== 'na_fila' && importacao.status !== 'processando')) return undefined;
    const id = window.setInterval(() => {
      void transporteApi.importacao(importacao.id).then(setImportacao).catch((e) => setErro(mensagemDeErro(e)));
    }, 1500);
    return () => window.clearInterval(id);
  }, [importacao]);

  useEffect(() => {
    if (importacao?.status === 'concluida' && !avisou.current) {
      avisou.current = true;
      avisar({ type: 'success', title: 'Educacenso', message: 'Importação concluída.' });
    }
  }, [importacao, avisar]);

  const executar = async (acao: () => Promise<void>) => {
    setErro(null);
    setOcupado(true);
    try { await acao(); } catch (e) { setErro(mensagemDeErro(e)); } finally { setOcupado(false); }
  };

  const descartar = () => {
    // Prévia não confirmada não deve deixar o arquivo guardado no servidor.
    if (importacao?.status === 'previa') void transporteApi.cancelarImportacao(importacao.id).catch(() => undefined);
    setImportacao(null);
    avisou.current = false;
  };

  const i = importacao;
  const emAndamento = i !== null && (i.status === 'na_fila' || i.status === 'processando');
  const resumo = i?.resumo ?? {};

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Importar arquivo do Educacenso</h2>
          <p className="text-sm text-muted-foreground">
            Lê o arquivo do Censo Escolar e reconhece, entre os alunos <strong>já cadastrados no Escola</strong>, os que declaram transporte escolar público.
            A escola e o aluno precisam estar cadastrados: a importação não cria cadastro. Ela preenche o código Inep que faltar e guarda os demais dados lidos.
          </p>
          <EstadoCarga carregando={leiautes.carregando && !leiautes.dados} erro={leiautes.erro} onTentar={() => void leiautes.recarregar()} />
          {leiautes.dados && !i && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-72">
                <Select label="Leiaute do arquivo" value={String(escolhido ?? '')} onChange={setLeiauteId}
                  options={leiautes.dados.map((l) => ({ value: String(l.id), label: `${l.nome}${l.padrao ? ' (padrão)' : ''}` }))} />
              </div>
              <Button variant="outline" onClick={() => entradaTeste.current?.click()} disabled={ocupado}><FileSearch className="mr-1 h-4 w-4" />Testar leiaute</Button>
              <Button onClick={() => entradaPrevia.current?.click()} disabled={ocupado}><Upload className="mr-1 h-4 w-4" />Escolher arquivo do Educacenso</Button>
              <input ref={entradaTeste} type="file" className="sr-only" aria-label="Arquivo para testar o leiaute"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void executar(async () => { setTeste(await transporteApi.testarLeiaute(f, escolhido)); }); }} />
              <input ref={entradaPrevia} type="file" className="sr-only" aria-label="Arquivo do Educacenso"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void executar(async () => { setTeste(null); setImportacao(await transporteApi.previaCenso(f, escolhido)); }); }} />
            </div>
          )}
          <p className="text-xs text-muted-foreground">Até 50 MB. Nada é gravado até você confirmar. O arquivo não fica guardado no servidor depois da importação.</p>
          {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        </CardContent>
      </Card>

      {teste && !i && <ResultadoTeste teste={teste} />}

      {i && (
        <Card>
          <CardContent className="space-y-4 p-4" role="region" aria-label="Resultado da importação do Educacenso">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <strong>{i.arquivo}</strong>
              {i.leiaute && <span className="text-muted-foreground">Leiaute: {i.leiaute.nome}</span>}
              {i.status === 'previa' && <Badge variant="outline">Prévia</Badge>}
              {emAndamento && <Badge variant="secondary">Processando…</Badge>}
              {i.status === 'concluida' && <Badge variant="outline">Concluída</Badge>}
              {i.status === 'falha' && <Badge variant="destructive">Falhou</Badge>}
              {i.status === 'cancelada' && <Badge variant="secondary">Cancelada</Badge>}
            </p>
            <ul className="grid gap-2 sm:grid-cols-4">
              <li className="rounded border border-border p-2 text-sm">Matrículas com transporte<strong className="block font-mono text-lg tabular-nums">{i.total}</strong></li>
              <li className="rounded border border-border p-2 text-sm">Alunos reconhecidos<strong className="block font-mono text-lg tabular-nums">{i.validas}</strong></li>
              <li className="rounded border border-border p-2 text-sm">Pendentes de cadastro<strong className="block font-mono text-lg tabular-nums">{i.ignoradas}</strong></li>
              <li className="rounded border border-border p-2 text-sm">Sem alocação em rota<strong className="block font-mono text-lg tabular-nums">{resumo.sem_alocacao ?? 0}</strong></li>
            </ul>
            <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {ROTULO_RESUMO.filter(([k]) => (resumo[k] ?? 0) > 0).map(([k, rotulo]) => (
                <li key={k} className="flex justify-between border-b border-border/60 py-0.5"><span>{rotulo}</span><span className="font-mono tabular-nums">{resumo[k]}</span></li>
              ))}
            </ul>
            {i.mensagem && <p role="alert" className="text-sm text-destructive">{i.mensagem}</p>}

            {(i.escolas_pendentes?.length ?? 0) > 0 && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Escolas do arquivo que não estão cadastradas</h3>
                <p className="text-xs text-muted-foreground">Cadastre a escola (com o código Inep) no Escola e importe de novo. Escolas estaduais e privadas também aparecem aqui.</p>
                <ul className="max-h-40 overflow-auto rounded border border-border text-sm">
                  {i.escolas_pendentes?.map((e) => (
                    <li key={e.inep} className="flex justify-between border-b border-border/60 px-2 py-1 last:border-b-0"><span className="font-mono tabular-nums">Inep {e.inep}</span><span>{e.alunos} aluno(s)</span></li>
                  ))}
                </ul>
              </div>
            )}

            {i.divergencias.length > 0 && (
              <div className="max-h-56 overflow-auto rounded border border-border">
                <table className="w-full text-sm">
                  <caption className="sr-only">Pendências e divergências por linha</caption>
                  <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="px-2 py-1">Linha</th><th className="px-2 py-1">Situação</th><th className="px-2 py-1">Detalhe</th></tr></thead>
                  <tbody>
                    {i.divergencias.map((d, n) => (
                      <tr key={`${d.linha}-${d.codigo}-${n}`} className="border-t border-border">
                        <td className="px-2 py-1 font-mono tabular-nums">{d.linha}</td><td className="px-2 py-1">{ROTULO_CODIGO[d.codigo] ?? d.codigo}</td><td className="px-2 py-1">{d.mensagem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {i.truncado && <p className="text-xs text-muted-foreground">Há mais ocorrências além das exibidas.</p>}
            {i.avisos.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">{i.avisos.map((a, n) => <li key={`${a.linha}-${n}`}>Linha {a.linha}: {a.mensagem}</li>)}</ul>
            )}

            {i.status === 'previa' && (
              <div className="space-y-3">
                <label className="flex items-start gap-2 text-sm">
                  <Switch checked={casarPorNome} onCheckedChange={setCasarPorNome} aria-label="Reconhecer por nome e data de nascimento" />
                  <span>Reconhecer também por nome e data de nascimento quando o aluno não tem código Inep nem CPF (só vale se houver um único aluno igual na escola)</span>
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => void executar(async () => { setImportacao(await transporteApi.confirmarImportacao(i.id, { casar_por_nome: casarPorNome })); })} isLoading={ocupado} disabled={i.validas === 0}>
                    Confirmar: atualizar {i.validas} aluno(s)
                  </Button>
                  <Button variant="outline" onClick={descartar}>Cancelar</Button>
                  {i.validas === 0 && <span className="text-sm text-muted-foreground">Nenhum aluno cadastrado foi reconhecido.</span>}
                </div>
              </div>
            )}
            {i.status !== 'previa' && !emAndamento && <Button variant="outline" onClick={descartar}>Nova importação</Button>}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ResultadoTeste: React.FC<{ teste: TesteLeiaute }> = ({ teste }) => (
  <Card>
    <CardContent className="space-y-4 p-4" role="region" aria-label="Resultado do teste do leiaute">
      <p className="text-sm">
        <strong>{teste.linhas_lidas}</strong> linha(s) lidas
        {teste.desconhecidos > 0 && <span className="text-muted-foreground">, {teste.desconhecidos} de tipo de registro desconhecido (ignoradas)</span>}.
        Nada foi gravado. CPF, nome, nascimento e e-mail aparecem mascarados.
      </p>
      {teste.alertas.length > 0 && (
        <ul className="space-y-1 text-sm">
          {teste.alertas.map((a) => (
            <li key={`${a.registro}-${a.chave}-${a.codigo}`} className="rounded border border-destructive/30 bg-destructive/10 px-3 py-1.5">
              <strong>Registro {a.registro}, coluna {a.posicao} — {a.rotulo}:</strong> {a.mensagem} ({a.ocorrencias} linha(s))
            </li>
          ))}
        </ul>
      )}
      {teste.alertas.length === 0 && <Badge variant="outline">Nenhuma incoerência encontrada na amostra</Badge>}
      {teste.registros.filter((r) => r.linhas > 0).map((r) => (
        <div key={r.registro} className="space-y-1">
          <h3 className="text-sm font-semibold">Registro {r.registro} — {r.nome} ({r.linhas} linha(s))</h3>
          {r.amostras.slice(0, 1).map((linha, n) => (
            <div key={n} className="overflow-auto rounded border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Amostra do registro {r.registro}</caption>
                <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="px-2 py-1">Coluna</th><th className="px-2 py-1">Campo</th><th className="px-2 py-1">Valor lido</th></tr></thead>
                <tbody>
                  {linha.map((c) => (
                    <tr key={c.chave} className="border-t border-border">
                      <td className="px-2 py-1 font-mono tabular-nums">{c.posicao}</td><td className="px-2 py-1">{c.rotulo}</td>
                      <td className="px-2 py-1 font-mono">{c.valor || <span className="text-muted-foreground">vazio</span>}{c.alerta && <span className="ml-2 text-xs text-destructive">{c.alerta}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}
    </CardContent>
  </Card>
);
