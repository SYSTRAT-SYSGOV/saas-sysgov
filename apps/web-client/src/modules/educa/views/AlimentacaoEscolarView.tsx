import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@sysgov/ui';
import {
  UtensilsCrossed,
  AlertTriangle,
  FileCheck2,
  Plus,
  ShieldAlert,
  Flame,
  Scale,
  Award,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useEduca } from '../context/EducaContext';

interface CardapioItem {
  id: string;
  dia_semana: number;
  nome_preparacao: string;
  porcao_gramas: number;
  calorias_kcal: number;
  carboidratos_g: number;
  proteinas_g: number;
  lipidios_g: number;
  alergenos: string[];
}

interface Cardapio {
  id: string;
  nome: string;
  etapa_ensino: string;
  tipo_refeicao: string;
  periodo: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  status: 'rascunho' | 'homologado' | 'rejeitado';
  responsavel_tecnico_nome?: string;
  responsavel_tecnico_crn?: string;
  homologado_em?: string;
  itens: CardapioItem[];
  calorias_totais: number;
  carboidratos_totais: number;
  proteinas_totais: number;
  lipidios_totais: number;
}

interface RestricaoAlimentar {
  id: string;
  aluno_nome: string;
  aluno_matricula: string;
  turma: string;
  tipo_restricao: string;
  alimento_alergeno: string;
  severidade: 'leve' | 'moderada' | 'grave_anafilaxia';
  requer_substituicao: boolean;
  substituto_recomendado?: string;
  laudo_crm?: string;
  laudo_medico_emissor?: string;
  status: 'ativa' | 'inativa';
}

interface RefeicaoDiaria {
  id: string;
  data: string;
  tipo_refeicao: string;
  escola_nome: string;
  total_previsto: number;
  total_servido: number;
  taxa_adesao: number;
  sobra_limpa_kg: number;
  resto_ingesta_kg: number;
  temperatura_celsius?: number;
}

export const AlimentacaoEscolarView: React.FC = () => {
  const { escolaAtiva } = useEduca();

  const [subTab, setSubTab] = useState<'cardapios' | 'restricoes' | 'refeicoes'>('cardapios');

  // Modal states
  const [modalNovoCardapioAberto, setModalNovoCardapioAberto] = useState(false);
  const [modalNovaRestricaoAberta, setModalNovaRestricaoAberta] = useState(false);
  const [modalHomologacaoAberto, setModalHomologacaoAberto] = useState(false);
  const [cardapioSelecionado, setCardapioSelecionado] = useState<Cardapio | null>(null);
  const [crnInput, setCrnInput] = useState('');
  const [nutricionistaNomeInput, setNutricionistaNomeInput] = useState('');

  // Formulário Novo Cardápio
  const [novoCardapioNome, setNovoCardapioNome] = useState('');
  const [novoCardapioEtapa, setNovoCardapioEtapa] = useState('fundamental');
  const [novoCardapioTipoRefeicao, setNovoCardapioTipoRefeicao] = useState('almoco');
  const [novoCardapioPreparacao, setNovoCardapioPreparacao] = useState('');
  const [novoCardapioCalorias, setNovoCardapioCalorias] = useState(480);
  const [novoCardapioCarboidratos, setNovoCardapioCarboidratos] = useState(72);
  const [novoCardapioProteinas, setNovoCardapioProteinas] = useState(18);
  const [novoCardapioLipidios, setNovoCardapioLipidios] = useState(12);

  // Formulário Nova Restrição
  const [novaRestricaoAluno, setNovaRestricaoAluno] = useState('');
  const [novaRestricaoAlergeno, setNovaRestricaoAlergeno] = useState('');
  const [novaRestricaoSeveridade, setNovaRestricaoSeveridade] = useState<'leve' | 'moderada' | 'grave_anafilaxia'>('grave_anafilaxia');
  const [novaRestricaoSubstituto, setNovaRestricaoSubstituto] = useState('');
  const [novaRestricaoCrm, setNovaRestricaoCrm] = useState('');
  const [novaRestricaoMedico, setNovaRestricaoMedico] = useState('');

  // Mock dados iniciais realistas
  const [cardapios, setCardapios] = useState<Cardapio[]>([
    {
      id: '1',
      nome: 'Cardápio Fundamental I & II - Ciclo Primavera',
      etapa_ensino: 'Ensino Fundamental',
      tipo_refeicao: 'Almoço Completo',
      periodo: 'Semanal',
      vigencia_inicio: '2026-10-19',
      vigencia_fim: '2026-10-30',
      status: 'homologado',
      responsavel_tecnico_nome: 'Dra. Mariana S. Alencar',
      responsavel_tecnico_crn: 'CRN-3/49201',
      homologado_em: '2026-10-18 14:30',
      calorias_totais: 565,
      carboidratos_totais: 82,
      proteinas_totais: 24,
      lipidios_totais: 14,
      itens: [
        {
          id: 'i1',
          dia_semana: 2,
          nome_preparacao: 'Arroz Integral, Feijão Carioca, Frango Grelhado em Tiras e Salada de Alface e Tomate',
          porcao_gramas: 350,
          calorias_kcal: 565,
          carboidratos_g: 82,
          proteinas_g: 24,
          lipidios_g: 14,
          alergenos: [],
        },
      ],
    },
    {
      id: '2',
      nome: 'Cardápio Educação Infantil - Creche Parcial',
      etapa_ensino: 'Educação Infantil (Creche)',
      tipo_refeicao: 'Lanche da Manhã e Almoço',
      periodo: 'Semanal',
      vigencia_inicio: '2026-10-26',
      vigencia_fim: '2026-11-06',
      status: 'rascunho',
      calorias_totais: 420,
      carboidratos_totais: 62,
      proteinas_totais: 16,
      lipidios_totais: 11,
      itens: [
        {
          id: 'i2',
          dia_semana: 2,
          nome_preparacao: 'Purê de Abóbora Cabotiá, Carne Moída Magra e Arroz Polido + Maçã Fatiada',
          porcao_gramas: 280,
          calorias_kcal: 420,
          carboidratos_g: 62,
          proteinas_g: 16,
          lipidios_g: 11,
          alergenos: [],
        },
      ],
    },
  ]);

  const [restricoes, setRestricoes] = useState<RestricaoAlimentar[]>([
    {
      id: 'r1',
      aluno_nome: 'Gabriel Mendes Santana',
      aluno_matricula: '2026-EF-0089',
      turma: '4º Ano B (Matutino)',
      tipo_restricao: 'Alergia Alimentar Grave',
      alimento_alergeno: 'Amendoim e Castanhas',
      severidade: 'grave_anafilaxia',
      requer_substituicao: true,
      substituto_recomendado: 'Sobremesa de fruta in natura fresca',
      laudo_crm: 'CRM-SP 188.924',
      laudo_medico_emissor: 'Dr. Roberto Meireles (Alergista)',
      status: 'ativa',
    },
    {
      id: 'r2',
      aluno_nome: 'Lara Beatriz Carvalho',
      aluno_matricula: '2026-EF-0144',
      turma: '2º Ano A (Vespertino)',
      tipo_restricao: 'Intolerância Severa',
      alimento_alergeno: 'Lactose / Leite de Vaca',
      severidade: 'moderada',
      requer_substituicao: true,
      substituto_recomendado: 'Bebida vegetal enriquecida ou suco natural',
      laudo_crm: 'CRM-SP 210.455',
      laudo_medico_emissor: 'Dra. Claudia Nogueira',
      status: 'ativa',
    },
  ]);

  const [refeicoes] = useState<RefeicaoDiaria[]>([
    {
      id: 'ref1',
      data: '2026-10-23',
      tipo_refeicao: 'Almoço',
      escola_nome: escolaAtiva?.nome ?? 'EMEF Monteiro Lobato',
      total_previsto: 420,
      total_servido: 398,
      taxa_adesao: 94.76,
      sobra_limpa_kg: 3.2,
      resto_ingesta_kg: 4.8,
      temperatura_celsius: 68.5,
    },
    {
      id: 'ref2',
      data: '2026-10-22',
      tipo_refeicao: 'Almoço',
      escola_nome: escolaAtiva?.nome ?? 'EMEF Monteiro Lobato',
      total_previsto: 420,
      total_servido: 405,
      taxa_adesao: 96.43,
      sobra_limpa_kg: 2.5,
      resto_ingesta_kg: 3.9,
      temperatura_celsius: 70.0,
    },
  ]);

  const handleHomologar = (cardapio: Cardapio) => {
    setCardapioSelecionado(cardapio);
    setNutricionistaNomeInput(cardapio.responsavel_tecnico_nome ?? 'Dra. Mariana S. Alencar');
    setCrnInput(cardapio.responsavel_tecnico_crn ?? 'CRN-3/49201');
    setModalHomologacaoAberto(true);
  };

  const confirmarHomologacao = () => {
    if (!cardapioSelecionado || !crnInput.trim() || !nutricionistaNomeInput.trim()) {
      return;
    }

    setCardapios((prev) =>
      prev.map((c) =>
        c.id === cardapioSelecionado.id
          ? {
              ...c,
              status: 'homologado',
              responsavel_tecnico_nome: nutricionistaNomeInput.trim(),
              responsavel_tecnico_crn: crnInput.trim(),
              homologado_em: '2026-10-25 11:30',
            }
          : c
      )
    );

    setModalHomologacaoAberto(false);
  };

  const salvarNovoCardapio = () => {
    if (!novoCardapioNome.trim()) return;

    const novo: Cardapio = {
      id: String(Date.now()),
      nome: novoCardapioNome.trim(),
      etapa_ensino: novoCardapioEtapa,
      tipo_refeicao: novoCardapioTipoRefeicao,
      periodo: 'Semanal',
      vigencia_inicio: '2026-11-03',
      vigencia_fim: '2026-11-14',
      status: 'rascunho',
      calorias_totais: novoCardapioCalorias,
      carboidratos_totais: novoCardapioCarboidratos,
      proteinas_totais: novoCardapioProteinas,
      lipidios_totais: novoCardapioLipidios,
      itens: [
        {
          id: String(Date.now() + 1),
          dia_semana: 2,
          nome_preparacao: novoCardapioPreparacao || 'Preparação Padrão PNAE',
          porcao_gramas: 300,
          calorias_kcal: novoCardapioCalorias,
          carboidratos_g: novoCardapioCarboidratos,
          proteinas_g: novoCardapioProteinas,
          lipidios_g: novoCardapioLipidios,
          alergenos: [],
        },
      ],
    };

    setCardapios([novo, ...cardapios]);
    setModalNovoCardapioAberto(false);
    setNovoCardapioNome('');
    setNovoCardapioPreparacao('');
  };

  const salvarNovaRestricao = () => {
    if (!novaRestricaoAluno.trim() || !novaRestricaoAlergeno.trim()) return;

    const nova: RestricaoAlimentar = {
      id: String(Date.now()),
      aluno_nome: novaRestricaoAluno.trim(),
      aluno_matricula: `2026-AL-${Math.floor(1000 + Math.random() * 9000)}`,
      turma: 'Turma Regular',
      tipo_restricao: 'Alergia Alimentar',
      alimento_alergeno: novaRestricaoAlergeno.trim(),
      severidade: novaRestricaoSeveridade,
      requer_substituicao: Boolean(novaRestricaoSubstituto),
      substituto_recomendado: novaRestricaoSubstituto.trim() || undefined,
      laudo_crm: novaRestricaoCrm.trim() || undefined,
      laudo_medico_emissor: novaRestricaoMedico.trim() || undefined,
      status: 'ativa',
    };

    setRestricoes([nova, ...restricoes]);
    setModalNovaRestricaoAberta(false);
    setNovaRestricaoAluno('');
    setNovaRestricaoAlergeno('');
    setNovaRestricaoSubstituto('');
    setNovaRestricaoCrm('');
    setNovaRestricaoMedico('');
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas e KPIs Nutricionais PNAE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-600 shadow-xs">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cardápios Ativos</span>
                <p className="text-2xl font-bold font-mono tabular-nums text-gray-900 mt-0.5">
                  {cardapios.filter((c) => c.status === 'homologado').length} / {cardapios.length}
                </p>
                <span className="text-[11px] text-emerald-700 font-medium">Homologados por CRN</span>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
                <FileCheck2 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-xs">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Alergias & Restrições</span>
                <p className="text-2xl font-bold font-mono tabular-nums text-red-600 mt-0.5">
                  {restricoes.filter((r) => r.status === 'ativa').length}
                </p>
                <span className="text-[11px] text-red-700 font-medium">
                  {restricoes.filter((r) => r.severidade === 'grave_anafilaxia').length} caso(s) de anafilaxia
                </span>
              </div>
              <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 shadow-xs">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Taxa Média Adesão</span>
                <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-0.5">95.6%</p>
                <span className="text-[11px] text-gray-500">Média últimos 5 dias</span>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Índice Desperdício</span>
                <p className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-0.5">18.2 g/aluno</p>
                <span className="text-[11px] text-gray-500">Dentro da meta CAE &lt; 25g</span>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg">
                <Scale className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Navegação */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as any)} className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <TabsList className="bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="cardapios" className="text-xs font-medium py-1.5 px-3">
              <UtensilsCrossed className="w-3.5 h-3.5 mr-1.5" />
              Cardápios da Semana (PNAE)
            </TabsTrigger>
            <TabsTrigger value="restricoes" className="text-xs font-medium py-1.5 px-3">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-red-500" />
              Prontuário de Alergias & Restrições
            </TabsTrigger>
            <TabsTrigger value="refeicoes" className="text-xs font-medium py-1.5 px-3">
              <Scale className="w-3.5 h-3.5 mr-1.5" />
              Refeições Servidas & Desperdício
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {subTab === 'cardapios' && (
              <Button size="sm" onClick={() => setModalNovoCardapioAberto(true)} className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Elaborar Cardápio
              </Button>
            )}
            {subTab === 'restricoes' && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setModalNovaRestricaoAberta(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Laudo Médico
              </Button>
            )}
          </div>
        </div>

        {/* Aba 1: Cardápios */}
        <TabsContent value="cardapios" className="space-y-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Planejamento e Homologação Técnica de Cardápios</span>
                <span className="text-xs font-mono text-gray-500">Diretrizes FNDE/PNAE 2026</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cardápio / Identificação</TableHead>
                    <TableHead>Etapa & Refeição</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead>Macronutrientes (Média)</TableHead>
                    <TableHead>Status / Homologação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cardapios.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-semibold text-gray-900">{c.nome}</div>
                        <div className="text-xs text-gray-500">
                          {c.itens[0]?.nome_preparacao || 'Preparações balanceadas'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium text-gray-800">{c.etapa_ensino}</div>
                        <Badge variant="outline" className="text-[10px] mt-0.5">
                          {c.tipo_refeicao}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono tabular-nums text-gray-600">
                        {c.vigencia_inicio} a {c.vigencia_fim}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                          <span className="flex items-center text-amber-700 font-semibold">
                            <Flame className="w-3 h-3 mr-0.5" /> {c.calorias_totais} kcal
                          </span>
                          <span className="text-gray-400">|</span>
                          <span title="Carboidratos" className="text-blue-700">C: {c.carboidratos_totais}g</span>
                          <span title="Proteínas" className="text-emerald-700">P: {c.proteinas_totais}g</span>
                          <span title="Lipídios" className="text-purple-700">L: {c.lipidios_totais}g</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.status === 'homologado' ? (
                          <div>
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-[11px]">
                              <CheckCircle className="w-3 h-3" /> Homologado
                            </Badge>
                            <div className="text-[11px] text-gray-600 mt-1 font-mono">
                              {c.responsavel_tecnico_crn}
                            </div>
                            <div className="text-[10px] text-gray-500">{c.responsavel_tecnico_nome}</div>
                          </div>
                        ) : (
                          <div>
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1 text-[11px]">
                              <AlertTriangle className="w-3 h-3" /> Rascunho Técnico
                            </Badge>
                            <div className="text-[10px] text-gray-500 mt-0.5">Aguardando homologação de CRN</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status !== 'homologado' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleHomologar(c)}
                            className="text-xs gap-1 border-blue-600 text-blue-700 hover:bg-blue-50"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            Homologar (CRN)
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Aprovado
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 2: Restrições & Alergias */}
        <TabsContent value="restricoes" className="space-y-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Prontuário de Alergias e Cuidados Especiais de Alimentação</span>
                <Badge variant="destructive" className="text-[11px] gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Alerta Obrigatório na Cozinha
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudante / Matrícula</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Alérgeno / Restrição</TableHead>
                    <TableHead>Gravidade / Severidade</TableHead>
                    <TableHead>Substituição Indicada</TableHead>
                    <TableHead>Laudo Médico (CRM)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restricoes.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-semibold text-gray-900">{r.aluno_nome}</div>
                        <div className="text-xs font-mono text-gray-500">{r.aluno_matricula}</div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-700">{r.turma}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-red-700">{r.alimento_alergeno}</span>
                        <div className="text-[11px] text-gray-500">{r.tipo_restricao}</div>
                      </TableCell>
                      <TableCell>
                        {r.severidade === 'grave_anafilaxia' ? (
                          <Badge className="bg-red-600 text-white gap-1 text-[10px] font-bold tracking-wide animate-pulse">
                            <ShieldAlert className="w-3 h-3" /> Anafilaxia Grave
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                            Moderada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-800">
                        {r.substituto_recomendado ? (
                          <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm">
                            {r.substituto_recomendado}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono font-medium text-gray-800">{r.laudo_crm || '—'}</div>
                        <div className="text-[10px] text-gray-500">{r.laudo_medico_emissor || 'Autodeclaração'}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 3: Refeições Servidas e Desperdício */}
        <TabsContent value="refeicoes" className="space-y-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Apuração de Refeições Diárias e Desperdício (Sobra & Resto)</span>
                <span className="text-xs font-mono text-gray-500">Conselho de Alimentação Escolar (CAE)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Unidade Escolar</TableHead>
                    <TableHead>Refeição</TableHead>
                    <TableHead className="text-right">Previsto vs Servido</TableHead>
                    <TableHead className="text-right">Taxa de Adesão</TableHead>
                    <TableHead className="text-right">Sobra Limpa (kg)</TableHead>
                    <TableHead className="text-right">Resto Ingesta (kg)</TableHead>
                    <TableHead className="text-center">Temperatura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refeicoes.map((ref) => (
                    <TableRow key={ref.id}>
                      <TableCell className="font-mono text-xs">{ref.data}</TableCell>
                      <TableCell className="text-xs font-medium text-gray-900">{ref.escola_nome}</TableCell>
                      <TableCell className="text-xs text-gray-700">{ref.tipo_refeicao}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs">
                        <span className="text-gray-500">{ref.total_previsto}</span>
                        <span className="mx-1">→</span>
                        <span className="font-bold text-gray-900">{ref.total_servido}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-emerald-700">
                        {ref.taxa_adesao}%
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs text-blue-700">
                        {ref.sobra_limpa_kg} kg
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs text-amber-700">
                        {ref.resto_ingesta_kg} kg
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums text-xs text-gray-700">
                        {ref.temperatura_celsius ? `${ref.temperatura_celsius} °C` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Homologação Técnica (CRN) */}
      {modalHomologacaoAberto && cardapioSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <FileCheck2 className="w-5 h-5 text-blue-700" />
              <h3 className="font-semibold text-gray-900">Homologação Técnica do Cardápio</h3>
            </div>
            <p className="text-xs text-gray-600">
              Conforme exigência do PNAE/FNDE, a homologação oficial requer a assinatura técnica de nutricionista
              com registro ativo no CRN.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Cardápio:</label>
                <div className="text-xs font-semibold text-gray-900 bg-gray-50 p-2 rounded-sm border">
                  {cardapioSelecionado.nome}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Nome do Nutricionista Responsável:</label>
                <input
                  type="text"
                  className="w-full text-xs border rounded-md px-2.5 py-1.5 focus:outline-blue-600"
                  value={nutricionistaNomeInput}
                  onChange={(e) => setNutricionistaNomeInput(e.target.value)}
                  placeholder="Ex: Dra. Mariana S. Alencar"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Registro no CRN:</label>
                <input
                  type="text"
                  className="w-full text-xs font-mono border rounded-md px-2.5 py-1.5 focus:outline-blue-600"
                  value={crnInput}
                  onChange={(e) => setCrnInput(e.target.value)}
                  placeholder="Ex: CRN-3/49201"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button size="sm" variant="ghost" onClick={() => setModalHomologacaoAberto(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={confirmarHomologacao}
                disabled={!crnInput.trim() || !nutricionistaNomeInput.trim()}
                className="bg-blue-700 hover:bg-blue-800 text-white"
              >
                Confirmar Homologação
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Cardápio */}
      {modalNovoCardapioAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <UtensilsCrossed className="w-5 h-5 text-blue-700" />
              <h3 className="font-semibold text-gray-900">Novo Cardápio Escolar (PNAE)</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Identificação do Cardápio:</label>
                <input
                  type="text"
                  className="w-full text-xs border rounded-md px-2.5 py-1.5"
                  value={novoCardapioNome}
                  onChange={(e) => setNovoCardapioNome(e.target.value)}
                  placeholder="Ex: Cardápio Fundamental - Semana 4"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Etapa de Ensino:</label>
                  <select
                    className="w-full text-xs border rounded-md px-2.5 py-1.5"
                    value={novoCardapioEtapa}
                    onChange={(e) => setNovoCardapioEtapa(e.target.value)}
                  >
                    <option value="creche">Creche (Berçário/Maternal)</option>
                    <option value="infantil">Educação Infantil</option>
                    <option value="fundamental">Ensino Fundamental</option>
                    <option value="medio">Ensino Médio</option>
                    <option value="eja">EJA</option>
                    <option value="integral">Tempo Integral</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Tipo de Refeição:</label>
                  <select
                    className="w-full text-xs border rounded-md px-2.5 py-1.5"
                    value={novoCardapioTipoRefeicao}
                    onChange={(e) => setNovoCardapioTipoRefeicao(e.target.value)}
                  >
                    <option value="desjejum">Desjejum</option>
                    <option value="lanche_manha">Lanche da Manhã</option>
                    <option value="almoco">Almoço</option>
                    <option value="lanche_tarde">Lanche da Tarde</option>
                    <option value="jantar">Jantar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Preparação Principal:</label>
                <input
                  type="text"
                  className="w-full text-xs border rounded-md px-2.5 py-1.5"
                  value={novoCardapioPreparacao}
                  onChange={(e) => setNovoCardapioPreparacao(e.target.value)}
                  placeholder="Ex: Arroz, feijão carioca, carne de panela com legumes e salada de alface"
                />
              </div>

              <div className="p-3 bg-gray-50 border rounded-md space-y-2">
                <span className="text-xs font-semibold text-gray-700 block">Metas Nutricionais Estimadas:</span>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded-sm border">
                    <span className="text-[10px] text-gray-500 block">Calorias</span>
                    <input
                      type="number"
                      className="w-full text-xs font-mono font-bold text-center border-none p-0 focus:outline-hidden"
                      value={novoCardapioCalorias}
                      onChange={(e) => setNovoCardapioCalorias(Number(e.target.value))}
                    />
                    <span className="text-[9px] text-gray-400">kcal</span>
                  </div>
                  <div className="bg-white p-2 rounded-sm border">
                    <span className="text-[10px] text-blue-600 block">Carboidratos</span>
                    <input
                      type="number"
                      className="w-full text-xs font-mono font-bold text-center border-none p-0 focus:outline-hidden"
                      value={novoCardapioCarboidratos}
                      onChange={(e) => setNovoCardapioCarboidratos(Number(e.target.value))}
                    />
                    <span className="text-[9px] text-gray-400">g</span>
                  </div>
                  <div className="bg-white p-2 rounded-sm border">
                    <span className="text-[10px] text-emerald-600 block">Proteínas</span>
                    <input
                      type="number"
                      className="w-full text-xs font-mono font-bold text-center border-none p-0 focus:outline-hidden"
                      value={novoCardapioProteinas}
                      onChange={(e) => setNovoCardapioProteinas(Number(e.target.value))}
                    />
                    <span className="text-[9px] text-gray-400">g</span>
                  </div>
                  <div className="bg-white p-2 rounded-sm border">
                    <span className="text-[10px] text-purple-600 block">Lipídios</span>
                    <input
                      type="number"
                      className="w-full text-xs font-mono font-bold text-center border-none p-0 focus:outline-hidden"
                      value={novoCardapioLipidios}
                      onChange={(e) => setNovoCardapioLipidios(Number(e.target.value))}
                    />
                    <span className="text-[9px] text-gray-400">g</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button size="sm" variant="ghost" onClick={() => setModalNovoCardapioAberto(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={salvarNovoCardapio} disabled={!novoCardapioNome.trim()}>
                Criar Rascunho
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Restrição Alimentar */}
      {modalNovaRestricaoAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-gray-900">Novo Laudo de Restrição Alimentar</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Nome do Estudante:</label>
                <input
                  type="text"
                  className="w-full text-xs border rounded-md px-2.5 py-1.5"
                  value={novaRestricaoAluno}
                  onChange={(e) => setNovaRestricaoAluno(e.target.value)}
                  placeholder="Ex: João Lucas de Oliveira"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Alérgeno / Substância:</label>
                  <input
                    type="text"
                    className="w-full text-xs border rounded-md px-2.5 py-1.5"
                    value={novaRestricaoAlergeno}
                    onChange={(e) => setNovaRestricaoAlergeno(e.target.value)}
                    placeholder="Ex: Glúten, Leite, Ovo, Amendoim"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Grau de Severidade:</label>
                  <select
                    className="w-full text-xs border rounded-md px-2.5 py-1.5 font-medium"
                    value={novaRestricaoSeveridade}
                    onChange={(e) => setNovaRestricaoSeveridade(e.target.value as any)}
                  >
                    <option value="grave_anafilaxia">Grave / Risco de Anafilaxia</option>
                    <option value="moderada">Moderada (Reação Tardia)</option>
                    <option value="leve">Leve</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Alimento Substituto Recomendado:</label>
                <input
                  type="text"
                  className="w-full text-xs border rounded-md px-2.5 py-1.5"
                  value={novaRestricaoSubstituto}
                  onChange={(e) => setNovaRestricaoSubstituto(e.target.value)}
                  placeholder="Ex: Preparação isenta de glúten (arroz e mandioca)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Médico Emissor do Laudo:</label>
                  <input
                    type="text"
                    className="w-full text-xs border rounded-md px-2.5 py-1.5"
                    value={novaRestricaoMedico}
                    onChange={(e) => setNovaRestricaoMedico(e.target.value)}
                    placeholder="Ex: Dra. Ana Beatriz"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">CRM do Médico:</label>
                  <input
                    type="text"
                    className="w-full text-xs font-mono border rounded-md px-2.5 py-1.5"
                    value={novaRestricaoCrm}
                    onChange={(e) => setNovaRestricaoCrm(e.target.value)}
                    placeholder="Ex: CRM-SP 149.332"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button size="sm" variant="ghost" onClick={() => setModalNovaRestricaoAberta(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={salvarNovaRestricao}
                disabled={!novaRestricaoAluno.trim() || !novaRestricaoAlergeno.trim()}
              >
                Salvar Restrição no Prontuário
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
