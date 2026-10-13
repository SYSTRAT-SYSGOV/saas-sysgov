import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { Button, Card, CardContent, Select } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { formatarCentavos, formatarData } from '@/lib/formatacao';
import type { Inscricao, Passeio } from '../api';
import { demonstrativo, emPares, periodoDoPasseio, semAssento } from '../formato';
import type { PropsAba } from '../ModuloPasseioMain';

export type Relatorio = 'termos' | 'manifesto' | 'demonstrativo';

const OPCOES: { value: Relatorio; label: string }[] = [
  { value: 'termos', label: 'Termos de autorização (2 por folha)' },
  { value: 'manifesto', label: 'Lista de embarque por ônibus' },
  { value: 'demonstrativo', label: 'Demonstrativo de arrecadação' },
];

const Linha: React.FC<{ largura: string }> = ({ largura }) => <span className={`inline-block border-b border-black align-bottom ${largura}`}>&nbsp;</span>;

/** Relatório já escolhido ao abrir a aba (ex.: "Imprimir lista" de um ônibus). */
export interface InicialRelatorio { relatorio: Relatorio; veiculoId: number | 'todos' }

/** Impressões do passeio ativo, só com dados da API (D20). */
export const RelatoriosPasseio: React.FC<PropsAba & { inicial?: InicialRelatorio }> = ({ ativo, dados, escola, inicial }) => {
  const [relatorio, setRelatorio] = useState<Relatorio>(inicial?.relatorio ?? 'termos');
  const [veiculoId, setVeiculoId] = useState<number | 'todos'>(inicial && dados.veiculos.some((v) => v.id === inicial.veiculoId) ? inicial.veiculoId : 'todos');
  const queVao = dados.inscricoes.filter((i) => i.vai);

  return (
    <div className="space-y-4">
      <Card className="print:hidden">
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-end">
          <Select label="Relatório" value={relatorio} onChange={(v) => setRelatorio(v as Relatorio)} options={OPCOES} className="md:w-80" />
          {relatorio === 'manifesto' && dados.veiculos.length > 0 && (
            <Select
              label="Ônibus"
              value={veiculoId}
              onChange={(v) => setVeiculoId(v === 'todos' ? 'todos' : Number(v))}
              options={[{ value: 'todos', label: 'Todos os ônibus' }, ...dados.veiculos.map((v) => ({ value: v.id, label: v.identificacao }))]}
              className="md:w-64"
            />
          )}
          <Button className="md:ml-auto" leftIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()} disabled={queVao.length === 0}>Imprimir</Button>
        </CardContent>
      </Card>

      {queVao.length === 0 ? (
        <EmptyState title="Nenhum aluno vai a este passeio" description="Os relatórios usam os alunos inscritos com a chave “Vai” marcada." />
      ) : (
        <div className="rounded-md border border-border bg-white p-6 font-normal text-black print:border-0 print:p-0">
          {relatorio === 'termos' && <Termos passeio={ativo} escola={escola} inscricoes={queVao} />}
          {relatorio === 'manifesto' && <Manifesto {...{ ativo, dados, escola, veiculoId }} />}
          {relatorio === 'demonstrativo' && <Demonstrativo passeio={ativo} escola={escola} inscricoes={dados.inscricoes} />}
        </div>
      )}
    </div>
  );
};

const Cabecalho: React.FC<{ escola: string; titulo: string }> = ({ escola, titulo }) => (
  <div className="text-center">
    {escola && <p className="text-sm font-extrabold uppercase">{escola}</p>}
    <p className="text-sm font-extrabold uppercase">{titulo}</p>
    <div className="mt-1 border-b border-black" />
  </div>
);

/** Termo de autorização, um por aluno, dois por folha A4 com linha de corte. */
const Termos: React.FC<{ passeio: Passeio; escola: string; inscricoes: Inscricao[] }> = ({ passeio, escola, inscricoes }) => (
  <div className="space-y-6 print:space-y-0">
    {emPares(inscricoes).map((par, k) => (
      <div key={k} className="space-y-4 print:break-after-page">
        {par.map((i, j) => (
          <React.Fragment key={i.id}>
            <div className="space-y-3 rounded-lg border-2 border-black p-4 text-[13px] leading-relaxed">
              <Cabecalho escola={escola} titulo="Termo de autorização" />
              <p>
                Eu, <Linha largura="w-56" />, portador(a) da cédula de identidade RG nº <Linha largura="w-32" />, na qualidade de <Linha largura="w-32" />,
                representante legal do(a) menor <strong className="uppercase underline">{i.aluno?.nome}</strong>, da turma <strong className="underline">{i.aluno?.turma?.nome ?? '—'}</strong>,
              </p>
              <p>
                autorizo o(a) mesmo(a) a participar da <strong>ATIVIDADE EXTRACLASSE {passeio.nome.toUpperCase()}</strong> no dia <strong>{formatarData(passeio.data_passeio)}</strong>,
                {' '}<strong>{periodoDoPasseio(passeio)}</strong>, com saída de <strong>{passeio.local_saida}</strong>, em <strong>{passeio.destino}</strong> — <strong>{passeio.cidade}</strong>.
                {passeio.observacoes && <> Atividade: <strong>{passeio.observacoes}</strong>.</>}
                {' '}Os alunos serão acompanhados por <strong>{passeio.responsavel}</strong>, pela direção, professores e funcionários.
                {passeio.valor_centavos > 0 && <> Valor por aluno: <strong className="font-mono tabular-nums">{formatarCentavos(passeio.valor_centavos)}</strong>.</>}
                {passeio.data_limite_autorizacao && <> Devolver este termo assinado até <strong>{formatarData(passeio.data_limite_autorizacao)}</strong>.</>}
              </p>
              <div className="flex items-end justify-between pt-2 font-semibold">
                <span>Data: <Linha largura="w-8" /> / <Linha largura="w-8" /> / <Linha largura="w-12" /></span>
                <span>A Direção</span>
              </div>
              <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs font-bold">
                <div className="border-t border-black pt-1">Assinatura do responsável</div>
                <div className="border-t border-black pt-1">Telefone para contato</div>
              </div>
            </div>
            {j === 0 && par.length > 1 && <p className="border-b border-dashed border-black text-center text-[10px] tracking-widest">corte aqui</p>}
          </React.Fragment>
        ))}
      </div>
    ))}
  </div>
);

const InfoPasseio: React.FC<{ passeio: Passeio }> = ({ passeio }) => (
  <div className="my-3 grid grid-cols-2 gap-2 rounded border border-black p-2 text-xs sm:grid-cols-3">
    <p><span className="block font-bold uppercase">Passeio</span>{passeio.nome}</p>
    <p><span className="block font-bold uppercase">Data</span><span className="font-mono tabular-nums">{formatarData(passeio.data_passeio)}</span></p>
    <p><span className="block font-bold uppercase">Horário</span><span className="font-mono tabular-nums">{periodoDoPasseio(passeio)}</span></p>
    <p><span className="block font-bold uppercase">Destino</span>{passeio.destino} — {passeio.cidade}</p>
    <p><span className="block font-bold uppercase">Saída</span>{passeio.local_saida}</p>
    <p><span className="block font-bold uppercase">Responsável</span>{passeio.responsavel}</p>
  </div>
);

const celula = 'border border-black px-2 py-1';

/** Lista de embarque: por ônibus (assento a assento) e, ao final, quem vai e ainda não tem assento. */
const Manifesto: React.FC<Pick<PropsAba, 'ativo' | 'dados' | 'escola'> & { veiculoId: number | 'todos' }> = ({ ativo, dados, escola, veiculoId }) => {
  const porAluno = new Map(dados.inscricoes.map((i) => [i.aluno_id, i]));
  const veiculos = dados.veiculos.filter((v) => veiculoId === 'todos' || v.id === veiculoId);
  const pendentes = veiculoId === 'todos' ? semAssento(dados.inscricoes, dados.mapas) : [];
  const tabela = (linhas: { assento: string; i: Inscricao | undefined; nome: string | null; turma: string | null }[]) => (
    <table className="w-full border-collapse text-xs">
      <thead><tr className="bg-gray-200 uppercase"><th className={`${celula} w-12`}>Lugar</th><th className={celula}>Aluno</th><th className={celula}>Turma</th><th className={celula}>Telefone</th><th className={`${celula} w-16`}>Termo</th><th className={`${celula} w-16`}>Pago</th><th className={`${celula} w-24`}>Chamada</th></tr></thead>
      <tbody>
        {linhas.map((l, k) => (
          <tr key={k}>
            <td className={`${celula} text-center font-mono tabular-nums`}>{l.assento}</td>
            <td className={`${celula} font-semibold uppercase`}>{l.nome}</td>
            <td className={celula}>{l.turma ?? '—'}</td>
            <td className={`${celula} font-mono tabular-nums`}>{l.i?.aluno?.telefone ?? ''}</td>
            <td className={`${celula} text-center`}>{l.i?.autorizacao_entregue ? 'Sim' : 'Não'}</td>
            <td className={`${celula} text-center`}>{l.i?.pago ? 'Sim' : 'Não'}</td>
            <td className={`${celula} whitespace-nowrap text-center font-mono`}>[&nbsp;&nbsp;&nbsp;] OK</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <div className="space-y-8">
      {veiculos.map((v) => {
        const mapa = dados.mapas.find((m) => m.veiculo_id === v.id);
        const ocupados = mapa?.ocupados ?? [];
        return (
          <section key={v.id} className="print:break-after-page">
            <Cabecalho escola={escola} titulo={`Lista de embarque — ${v.identificacao}`} />
            <InfoPasseio passeio={ativo} />
            <p className="mb-2 text-xs"><strong>Placa:</strong> <span className="font-mono">{v.placa ?? '—'}</span> · <strong>Motorista:</strong> {v.motorista ?? '—'}{v.telefone ? ` (${v.telefone})` : ''} · <strong>Lotação:</strong> <span className="font-mono tabular-nums">{ocupados.length}/{v.capacidade}</span></p>
            {ocupados.length === 0 ? <p className="text-xs">Nenhum assento marcado neste ônibus.</p> : tabela(ocupados.map((o) => ({ assento: String(o.numero).padStart(2, '0'), i: porAluno.get(o.aluno_id), nome: o.aluno, turma: o.turma })))}
            <div className="grid grid-cols-2 gap-8 pt-10 text-center text-xs font-bold">
              <div className="border-t border-black pt-1">Responsável pelo ônibus</div>
              <div className="border-t border-black pt-1">Motorista</div>
            </div>
          </section>
        );
      })}
      {(veiculos.length === 0 || pendentes.length > 0) && (
        <section>
          <Cabecalho escola={escola} titulo={veiculos.length === 0 ? 'Lista de embarque' : 'Alunos que vão sem assento marcado'} />
          <InfoPasseio passeio={ativo} />
          {tabela((veiculos.length === 0 ? dados.inscricoes.filter((i) => i.vai) : pendentes).map((i) => ({ assento: '—', i, nome: i.aluno?.nome ?? null, turma: i.aluno?.turma?.nome ?? null })))}
        </section>
      )}
    </div>
  );
};

/** Demonstrativo por turma: quem vai, pagos, pendentes, arrecadado e a receber. */
const Demonstrativo: React.FC<{ passeio: Passeio; escola: string; inscricoes: Inscricao[] }> = ({ passeio, escola, inscricoes }) => {
  const { linhas, total } = demonstrativo(inscricoes, passeio.valor_centavos);
  const linha = (l: typeof total, negrito = false) => (
    <tr key={l.turma} className={negrito ? 'bg-gray-200 font-bold' : ''}>
      <td className={celula}>{l.turma}</td>
      {[l.vao, l.pagos, l.pendentes].map((n, k) => <td key={k} className={`${celula} text-right font-mono tabular-nums`}>{n}</td>)}
      <td className={`${celula} text-right font-mono tabular-nums`}>{formatarCentavos(l.arrecadadoCentavos)}</td>
      <td className={`${celula} text-right font-mono tabular-nums`}>{formatarCentavos(l.aReceberCentavos)}</td>
    </tr>
  );
  return (
    <div>
      <Cabecalho escola={escola} titulo="Demonstrativo de arrecadação do passeio" />
      <InfoPasseio passeio={passeio} />
      <p className="mb-2 text-xs"><strong>Valor por aluno:</strong> <span className="font-mono tabular-nums">{formatarCentavos(passeio.valor_centavos)}</span> · conta só quem vai ao passeio.</p>
      <table className="w-full border-collapse text-xs">
        <thead><tr className="bg-gray-200 uppercase"><th className={celula}>Turma</th><th className={celula}>Vão</th><th className={celula}>Pagos</th><th className={celula}>Pendentes</th><th className={celula}>Arrecadado</th><th className={celula}>A receber</th></tr></thead>
        <tbody>{linhas.map((l) => linha(l))}{linha(total, true)}</tbody>
      </table>
    </div>
  );
};
