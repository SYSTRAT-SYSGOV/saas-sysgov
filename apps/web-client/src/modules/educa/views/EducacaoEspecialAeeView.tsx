import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Checkbox,
  Textarea,
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
  Modal,
  KpiCard,
} from '@sysgov/ui';
import {
  HeartHandshake,
  FileText,
  Building2,
  Users,
  ShieldCheck,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Accessibility,
} from 'lucide-react';

export interface EstudantePaee {
  id: string;
  enrollment_id: string;
  aluno_nome: string;
  aluno_cpf: string;
  escola_nome: string;
  turma_regular_nome: string;
  turno_regular: string;
  tipo_condicao: string;
  tipo_condicao_rotulo: string;
  cid10_codigo: string;
  laudo_medico_emitido_em: string;
  profissional_emissor: string;
  precisa_cuidador: boolean;
  precisa_interprete_libras: boolean;
  precisa_transporte_adaptado: boolean;
  status: 'ativo' | 'em_avaliacao' | 'inativo';
}

export interface PeiRegistro {
  id: string;
  student_profile_id: string;
  aluno_nome: string;
  escola_nome: string;
  ano_letivo: number;
  semestre: number;
  habilidades_atuais: string;
  necessidades_especificas: string;
  adequacoes_curriculares: string;
  parecer_descritivo?: string;
  status: 'rascunho' | 'ativo' | 'revisado' | 'concluido';
  metas_total: number;
  metas_atingidas: number;
}

export interface SalaRecursos {
  id: string;
  escola_nome: string;
  nome: string;
  tipo_sala: string;
  tipo_sala_rotulo: string;
  capacidade_atendimento: number;
  atendimentos_ativos: number;
  is_polo: boolean;
  is_active: boolean;
}

export interface AlocacaoApoio {
  id: string;
  aluno_nome: string;
  escola_nome: string;
  profissional_nome: string;
  tipo_apoio: string;
  tipo_apoio_rotulo: string;
  turno: string;
  carga_horaria_semanal: number;
  status: 'ativo' | 'suspenso' | 'finalizado';
}

export const EducacaoEspecialAeeView: React.FC = () => {
  // Estados dos dados simulados / carregados
  const [activeTab, setActiveTab] = useState<'estudantes' | 'peis' | 'srm' | 'apoio'>('estudantes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCondicao, setFiltroCondicao] = useState('todos');

  // Modais
  const [isModalNovoPerfilOpen, setIsModalNovoPerfilOpen] = useState(false);
  const [isModalNovoPeiOpen, setIsModalNovoPeiOpen] = useState(false);
  const [isModalNovaSrmOpen, setIsModalNovaSrmOpen] = useState(false);
  const [isModalAlocarApoioOpen, setIsModalAlocarApoioOpen] = useState(false);

  // Formulários de Modais
  const [novoPerfilCondicao, setNovoPerfilCondicao] = useState('tea');
  const [novoPeiAluno, setNovoPeiAluno] = useState('aee-1');
  const [novoPeiSemestre, setNovoPeiSemestre] = useState('1');
  const [novaSrmTipo, setNovaSrmTipo] = useState('tipo_1_generica');
  const [novoApoioAluno, setNovoApoioAluno] = useState('aee-1');
  const [novoApoioTipo, setNovoApoioTipo] = useState('cuidador_alimentacao_higiene');
  const [novoApoioTurno, setNovoApoioTurno] = useState('manha');

  // Mock inicial de Estudantes PAEE
  const [estudantes] = useState<EstudantePaee[]>([
    {
      id: 'aee-1',
      enrollment_id: 'enr-101',
      aluno_nome: 'Guilherme dos Santos Silva',
      aluno_cpf: '123.456.789-01',
      escola_nome: 'EMEF Paulo Freire',
      turma_regular_nome: '3º Ano B - Fundamental',
      turno_regular: 'Manhã',
      tipo_condicao: 'tea',
      tipo_condicao_rotulo: 'Transtorno do Espectro Autista (TEA)',
      cid10_codigo: 'F84.0',
      laudo_medico_emitido_em: '2025-08-15',
      profissional_emissor: 'Dr. Renato Alencar (CRM/SP 98214)',
      precisa_cuidador: true,
      precisa_interprete_libras: false,
      precisa_transporte_adaptado: false,
      status: 'ativo',
    },
    {
      id: 'aee-2',
      enrollment_id: 'enr-102',
      aluno_nome: 'Beatriz Lima Souza',
      aluno_cpf: '987.654.321-02',
      escola_nome: 'EMEF Vinicius de Moraes',
      turma_regular_nome: '5º Ano A - Fundamental',
      turno_regular: 'Tarde',
      tipo_condicao: 'deficiencia_auditiva',
      tipo_condicao_rotulo: 'Deficiência Auditiva / Surdez',
      cid10_codigo: 'H90.3',
      laudo_medico_emitido_em: '2025-03-10',
      profissional_emissor: 'Dra. Camila Ramos (CRM/SP 114522)',
      precisa_cuidador: false,
      precisa_interprete_libras: true,
      precisa_transporte_adaptado: false,
      status: 'ativo',
    },
    {
      id: 'aee-3',
      enrollment_id: 'enr-103',
      aluno_nome: 'Lucas Gabriel Moreira',
      aluno_cpf: '456.789.012-03',
      escola_nome: 'EMEI Sol Nascente',
      turma_regular_nome: 'Maternal II',
      turno_regular: 'Manhã',
      tipo_condicao: 'deficiencia_fisica',
      tipo_condicao_rotulo: 'Deficiência Física e Paralisia Cerebral',
      cid10_codigo: 'G80.0',
      laudo_medico_emitido_em: '2025-01-20',
      profissional_emissor: 'Dr. Marcos Valente (CRM/SP 87123)',
      precisa_cuidador: true,
      precisa_interprete_libras: false,
      precisa_transporte_adaptado: true,
      status: 'ativo',
    },
  ]);

  // Mock inicial de PEIs
  const [peis] = useState<PeiRegistro[]>([
    {
      id: 'pei-1',
      student_profile_id: 'aee-1',
      aluno_nome: 'Guilherme dos Santos Silva',
      escola_nome: 'EMEF Paulo Freire',
      ano_letivo: 2026,
      semestre: 1,
      habilidades_atuais: 'Reconhece formas e cores, comunicação verbal restrita a palavras-chave.',
      necessidades_especificas: 'Comunicação aumentativa (PECS), rotina estruturada e redução de estímulos sonoros.',
      adequacoes_curriculares: 'Provas com suporte visual, tempo estendido e mediação pedagógica individualizada.',
      parecer_descritivo: 'O aluno apresentou avanços expressivos no engajamento com os pares e no uso das fichas visuais.',
      status: 'ativo',
      metas_total: 4,
      metas_atingidas: 3,
    },
    {
      id: 'pei-2',
      student_profile_id: 'aee-2',
      aluno_nome: 'Beatriz Lima Souza',
      escola_nome: 'EMEF Vinicius de Moraes',
      ano_letivo: 2026,
      semestre: 1,
      habilidades_atuais: 'Fluente em Libras, boa capacidade leitora em Língua Portuguesa como L2.',
      necessidades_especificas: 'Presença integral de tradutor/intérprete de Libras nas disciplinas curriculares.',
      adequacoes_curriculares: 'Material didático prioritariamente imagético e legendado em vídeo.',
      status: 'ativo',
      metas_total: 3,
      metas_atingidas: 2,
    },
  ]);

  // Mock de Salas de Recursos Multifuncionais
  const [salas] = useState<SalaRecursos[]>([
    {
      id: 'srm-1',
      escola_nome: 'EMEF Paulo Freire',
      nome: 'Sala de Recursos Multifuncionais - Unidade Central',
      tipo_sala: 'tipo_1_generica',
      tipo_sala_rotulo: 'Tipo I (Generalista / Deficiências Múltiplas)',
      capacidade_atendimento: 15,
      atendimentos_ativos: 8,
      is_polo: true,
      is_active: true,
    },
    {
      id: 'srm-2',
      escola_nome: 'EMEF Vinicius de Moraes',
      nome: 'Sala de Recursos - Polo Bilingue e Surdez',
      tipo_sala: 'tipo_2_surdez_cegueira',
      tipo_sala_rotulo: 'Tipo II (Surdez, Libras e Baixa Visão)',
      capacidade_atendimento: 12,
      atendimentos_ativos: 6,
      is_polo: true,
      is_active: true,
    },
  ]);

  // Mock de Alocações de Apoio
  const [alocacoes] = useState<AlocacaoApoio[]>([
    {
      id: 'aloc-1',
      aluno_nome: 'Guilherme dos Santos Silva',
      escola_nome: 'EMEF Paulo Freire',
      profissional_nome: 'Carla Silveira Dias (Cuidadora Escolar)',
      tipo_apoio: 'cuidador_alimentacao_higiene',
      tipo_apoio_rotulo: 'Apoio à Higiene, Alimentação e Locomoção',
      turno: 'Manhã',
      carga_horaria_semanal: 20,
      status: 'ativo',
    },
    {
      id: 'aloc-2',
      aluno_nome: 'Beatriz Lima Souza',
      escola_nome: 'EMEF Vinicius de Moraes',
      profissional_nome: 'Rodrigo Antunes (Intérprete de Libras)',
      tipo_apoio: 'interprete_libras',
      tipo_apoio_rotulo: 'Tradutor / Intérprete de Libras',
      turno: 'Tarde',
      carga_horaria_semanal: 25,
      status: 'ativo',
    },
  ]);

  // Filtros
  const estudantesFiltrados = useMemo(() => {
    return estudantes.filter((est) => {
      const matchSearch =
        est.aluno_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.cid10_codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.escola_nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCondicao = filtroCondicao === 'todos' || est.tipo_condicao === filtroCondicao;
      return matchSearch && matchCondicao;
    });
  }, [estudantes, searchTerm, filtroCondicao]);

  // Cálculos de KPI
  const totalEstudantes = estudantes.length;
  const totalComLaudo = estudantes.filter((e) => e.cid10_codigo !== '').length;
  const totalCuidador = estudantes.filter((e) => e.precisa_cuidador).length;
  const totalPeisAtivos = peis.filter((p) => p.status === 'ativo').length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Accessibility className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Educação Especial & AEE
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão do Atendimento Educacional Especializado, Planos de AEE (PEI), Laudos CID e Profissionais de Apoio.
          </p>
        </div>
      </div>

      {/* KPI Cards com JetBrains Mono */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Estudantes PAEE"
          value={totalEstudantes}
          subtitle="Alunos cadastrados na rede"
          valueClassName="text-blue-700 font-mono tabular-nums"
          accentClassName="border-l-blue-600"
        />
        <KpiCard
          title="Laudos Homologados"
          value={totalComLaudo}
          subtitle="Com comprovação médica CID"
          valueClassName="text-emerald-700 font-mono tabular-nums"
          accentClassName="border-l-emerald-600"
        />
        <KpiCard
          title="Demandam Cuidador"
          value={totalCuidador}
          subtitle="Apoio higiene / locomoção"
          valueClassName="text-amber-700 font-mono tabular-nums"
          accentClassName="border-l-amber-600"
        />
        <KpiCard
          title="Planos de AEE (PEI)"
          value={totalPeisAtivos}
          subtitle="PEIs ativos neste semestre"
          valueClassName="text-indigo-700 font-mono tabular-nums"
          accentClassName="border-l-indigo-600"
        />
      </div>

      {/* Abas Principais */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="estudantes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Prontuários PAEE
          </TabsTrigger>
          <TabsTrigger value="peis" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Planos de AEE (PEI)
          </TabsTrigger>
          <TabsTrigger value="srm" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Salas de Recursos (SRM)
          </TabsTrigger>
          <TabsTrigger value="apoio" className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4" />
            Profissionais de Apoio
          </TabsTrigger>
        </TabsList>

        {/* ── ABA 1: PRONTUÁRIOS PAEE ── */}
        <TabsContent value="estudantes" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Prontuário Individual do Aluno PAEE</CardTitle>
                <CardDescription>
                  Registro confidencial com controle de laudos médicos (Art. 11 LGPD) e barreiras identificadas.
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsModalNovoPerfilOpen(true)}
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Novo Perfil PAEE
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por estudante, CID-10 ou escola..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="w-full sm:w-72">
                  <Select
                    value={filtroCondicao}
                    onChange={(val) => setFiltroCondicao(val)}
                    options={[
                      { value: 'todos', label: 'Todas as Condições' },
                      { value: 'tea', label: 'Transtorno do Espectro Autista (TEA)' },
                      { value: 'deficiencia_fisica', label: 'Deficiência Física' },
                      { value: 'deficiencia_auditiva', label: 'Deficiência Auditiva / Surdez' },
                      { value: 'deficiencia_visual', label: 'Deficiência Visual / Baixa Visão' },
                      { value: 'deficiencia_intelectual', label: 'Deficiência Intelectual' },
                      { value: 'altas_habilidades_superdotacao', label: 'Altas Habilidades / Superdotação' },
                    ]}
                  />
                </div>
              </div>

              {/* Tabela de Alunos */}
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estudante / CPF</TableHead>
                      <TableHead>Escola & Turma</TableHead>
                      <TableHead>Condição / Deficiência</TableHead>
                      <TableHead>CID-10</TableHead>
                      <TableHead>Apoios Requeridos</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estudantesFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum estudante PAEE encontrado com os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      estudantesFiltrados.map((est) => (
                        <TableRow key={est.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{est.aluno_nome}</div>
                            <div className="text-xs text-muted-foreground font-mono tabular-nums">{est.aluno_cpf}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{est.escola_nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {est.turma_regular_nome} ({est.turno_regular})
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{est.tipo_condicao_rotulo}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono tabular-nums font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
                              {est.cid10_codigo}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {est.precisa_cuidador && (
                                <Badge variant="secondary" className="text-xs">Cuidador</Badge>
                              )}
                              {est.precisa_interprete_libras && (
                                <Badge variant="secondary" className="text-xs">Libras</Badge>
                              )}
                              {est.precisa_transporte_adaptado && (
                                <Badge variant="secondary" className="text-xs">Transp. Adaptado</Badge>
                              )}
                              {!est.precisa_cuidador && !est.precisa_interprete_libras && !est.precisa_transporte_adaptado && (
                                <span className="text-xs text-muted-foreground">Adaptação Curricular</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={est.status === 'ativo' ? 'default' : 'secondary'}>
                              {est.status === 'ativo' ? 'Ativo' : 'Em Avaliação'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA 2: PLANOS DE AEE (PEI) ── */}
        <TabsContent value="peis" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Planos Educacionais Individualizados (PEI)</CardTitle>
                <CardDescription>
                  Instrumento colaborativo semestral com metas de desenvolvimento e pareceres descritivos.
                </CardDescription>
              </div>
              <Button onClick={() => setIsModalNovoPeiOpen(true)} className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Elaborar Novo PEI
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {peis.map((p) => (
                  <Card key={p.id} className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{p.aluno_nome}</CardTitle>
                          <CardDescription>{p.escola_nome}</CardDescription>
                        </div>
                        <Badge variant="outline" className="font-mono tabular-nums">
                          {p.ano_letivo} - {p.semestre}º Semestre
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <span className="font-semibold text-foreground">Habilidades / Potencialidades:</span>
                        <p className="text-muted-foreground text-xs mt-0.5">{p.habilidades_atuais}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Adequações Curriculares:</span>
                        <p className="text-muted-foreground text-xs mt-0.5">{p.adequacoes_curriculares}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Metas: <strong className="font-mono tabular-nums">{p.metas_atingidas}/{p.metas_total}</strong> atingidas</span>
                        </div>
                        <Badge variant={p.status === 'ativo' ? 'default' : 'secondary'}>
                          {p.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA 3: SALAS DE RECURSOS (SRM) ── */}
        <TabsContent value="srm" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Salas de Recursos Multifuncionais (SRM)</CardTitle>
                <CardDescription>
                  Espaços equipados para o Atendimento Educacional Especializado no contraturno escolar.
                </CardDescription>
              </div>
              <Button onClick={() => setIsModalNovaSrmOpen(true)} className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Cadastrar Sala de Recursos
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Escola / Espaço</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Capacidade & Ocupação</TableHead>
                      <TableHead>Polo Municipal</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salas.map((sala) => (
                      <TableRow key={sala.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{sala.nome}</div>
                          <div className="text-xs text-muted-foreground">{sala.escola_nome}</div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{sala.tipo_sala_rotulo}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono tabular-nums text-sm">
                            <strong>{sala.atendimentos_ativos}</strong> / {sala.capacidade_atendimento} atendimentos
                          </div>
                          <div className="w-24 bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full"
                              style={{ width: `${(sala.atendimentos_ativos / sala.capacidade_atendimento) * 100}%` }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {sala.is_polo ? (
                            <Badge variant="default" className="bg-indigo-600 text-white">Escola Polo</Badge>
                          ) : (
                            <Badge variant="outline">Unidade Local</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sala.is_active ? 'default' : 'secondary'}>
                            {sala.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA 4: PROFISSIONAIS DE APOIO ── */}
        <TabsContent value="apoio" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Alocação de Cuidadores e Intérpretes</CardTitle>
                <CardDescription>
                  Acompanhamento com trava de sobrecarga regulamentar (máximo 3 alunos por cuidador).
                </CardDescription>
              </div>
              <Button onClick={() => setIsModalAlocarApoioOpen(true)} className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Alocar Profissional
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estudante Atendido</TableHead>
                      <TableHead>Profissional Designado</TableHead>
                      <TableHead>Tipo de Apoio</TableHead>
                      <TableHead>Turno & Carga Horária</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alocacoes.map((aloc) => (
                      <TableRow key={aloc.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{aloc.aluno_nome}</div>
                          <div className="text-xs text-muted-foreground">{aloc.escola_nome}</div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{aloc.profissional_nome}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{aloc.tipo_apoio_rotulo}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{aloc.turno}</div>
                          <div className="text-xs text-muted-foreground font-mono tabular-nums">{aloc.carga_horaria_semanal}h / semana</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={aloc.status === 'ativo' ? 'default' : 'secondary'}>
                            {aloc.status === 'ativo' ? 'Ativo' : 'Encerrado'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal 1: Cadastro de Novo Perfil PAEE */}
      <Modal
        open={isModalNovoPerfilOpen}
        onClose={() => setIsModalNovoPerfilOpen(false)}
        title="Novo Prontuário de Educação Especial"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsModalNovoPerfilOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsModalNovoPerfilOpen(false)}>Salvar Prontuário</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome do Aluno Matriculado</label>
            <Input placeholder="Ex.: Lucas Gabriel Moreira" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Condição / Deficiência</label>
              <Select
                value={novoPerfilCondicao}
                onChange={(val) => setNovoPerfilCondicao(val)}
                options={[
                  { value: 'tea', label: 'TEA (Autismo)' },
                  { value: 'deficiencia_fisica', label: 'Deficiência Física' },
                  { value: 'deficiencia_auditiva', label: 'Deficiência Auditiva' },
                  { value: 'deficiencia_visual', label: 'Deficiência Visual' },
                  { value: 'deficiencia_intelectual', label: 'Deficiência Intelectual' },
                ]}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Código CID-10</label>
              <Input placeholder="Ex.: F84.0" className="font-mono tabular-nums" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Profissional Emissor (CRM / CRP)</label>
            <Input placeholder="Ex.: Dr. Roberto Silva - CRM 12345" />
          </div>
          <div className="space-y-2 pt-2">
            <span className="text-sm font-medium">Necessidades de Apoio Específico:</span>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox defaultChecked />
                <span>Demanda Profissional de Apoio Escolar (Cuidador de Higiene/Alimentação)</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox />
                <span>Demanda Tradutor / Intérprete de Libras</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox />
                <span>Demanda Transporte Escolar Acessível / Adaptado</span>
              </label>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Elaboração de Novo PEI */}
      <Modal
        open={isModalNovoPeiOpen}
        onClose={() => setIsModalNovoPeiOpen(false)}
        title="Elaboração do Plano Educacional Individualizado (PEI)"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsModalNovoPeiOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsModalNovoPeiOpen(false)}>Salvar PEI</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Estudante PAEE</label>
            <Select
              value={novoPeiAluno}
              onChange={(val) => setNovoPeiAluno(val)}
              options={estudantes.map((e) => ({
                value: e.id,
                label: `${e.aluno_nome} (${e.tipo_condicao_rotulo})`,
              }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Ano Letivo</label>
              <Input defaultValue="2026" className="font-mono tabular-nums" />
            </div>
            <div>
              <label className="text-sm font-medium">Semestre</label>
              <Select
                value={novoPeiSemestre}
                onChange={(val) => setNovoPeiSemestre(val)}
                options={[
                  { value: '1', label: '1º Semestre' },
                  { value: '2', label: '2º Semestre' },
                ]}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Potencialidades e Habilidades Iniciais</label>
            <Textarea placeholder="Descreva o ponto de partida do estudante..." rows={2} />
          </div>
          <div>
            <label className="text-sm font-medium">Adequações Curriculares e Metodologias</label>
            <Textarea placeholder="Ex.: Provas com apoio visual, enunciados simplificados, mediação..." rows={2} />
          </div>
        </div>
      </Modal>

      {/* Modal 3: Cadastro de SRM */}
      <Modal
        open={isModalNovaSrmOpen}
        onClose={() => setIsModalNovaSrmOpen(false)}
        title="Cadastrar Sala de Recursos Multifuncionais (SRM)"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsModalNovaSrmOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsModalNovaSrmOpen(false)}>Salvar Sala</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome Identificador da Sala</label>
            <Input placeholder="Ex.: Sala de Recursos Multifuncionais - Bloco B" />
          </div>
          <div>
            <label className="text-sm font-medium">Tipo de Sala</label>
            <Select
              value={novaSrmTipo}
              onChange={(val) => setNovaSrmTipo(val)}
              options={[
                { value: 'tipo_1_generica', label: 'Tipo I (Generalista / Deficiências Físicas e Intelectuais)' },
                { value: 'tipo_2_surdez_cegueira', label: 'Tipo II (Surdez, Cegueira e Altas Habilidades)' },
                { value: 'polo_municipal', label: 'Polo Central Municipal' },
              ]}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Capacidade de Atendimento Semanal</label>
            <Input type="number" defaultValue="15" className="font-mono tabular-nums" />
          </div>
        </div>
      </Modal>

      {/* Modal 4: Alocação de Profissional de Apoio */}
      <Modal
        open={isModalAlocarApoioOpen}
        onClose={() => setIsModalAlocarApoioOpen(false)}
        title="Alocação de Profissional de Apoio Escolar"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsModalAlocarApoioOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsModalAlocarApoioOpen(false)}>Confirmar Alocação</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Estudante Demandante</label>
            <Select
              value={novoApoioAluno}
              onChange={(val) => setNovoApoioAluno(val)}
              options={estudantes.filter(e => e.precisa_cuidador || e.precisa_interprete_libras).map((e) => ({
                value: e.id,
                label: `${e.aluno_nome} - ${e.tipo_condicao_rotulo}`,
              }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Profissional Cuidador / Intérprete</label>
            <Input placeholder="Ex.: Carla Silveira Dias" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Tipo de Apoio</label>
              <Select
                value={novoApoioTipo}
                onChange={(val) => setNovoApoioTipo(val)}
                options={[
                  { value: 'cuidador_alimentacao_higiene', label: 'Cuidador de Higiene/Alimentação' },
                  { value: 'interprete_libras', label: 'Intérprete de Libras' },
                  { value: 'guia_interprete', label: 'Guia-Intérprete (Surdocegueira)' },
                ]}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Turno</label>
              <Select
                value={novoApoioTurno}
                onChange={(val) => setNovoApoioTurno(val)}
                options={[
                  { value: 'manha', label: 'Manhã' },
                  { value: 'tarde', label: 'Tarde' },
                  { value: 'integral', label: 'Integral' },
                ]}
              />
            </div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Trava de Sobrecarga Anti-Leniência:</strong> O regulamento municipal restringe cada cuidador ao atendimento máximo de 3 educandos dependentes por turno.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
