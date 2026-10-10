import React, { useEffect, useState } from 'react';
import {
  Award,
  Plus,
  Printer,
  Search,
  X,
  FileText,
  Sun,
  CloudSun,
  Moon,
  ChevronRight,
  ChevronLeft,
  Users,
  FolderOpen,
  ArrowLeft,
  FileSignature,
  ClipboardList,
  Star,
  Lightbulb,
  AlertTriangle,
  GraduationCap,
  CheckCircle,
  ExternalLink,
  Edit,
  TrendingUp,
  PieChart,
  Upload,
  Download,
  Trash2,
  Folder,
  Calendar,
  User
} from 'lucide-react';
import {
  AtaConselho,
  TurmaPedagogica,
  AlunoPedagogico,
  PreConselho,
  OcorrenciaPedagogica,
  Materia
} from '../types/pedagogico';
import { anoLetivoAtual, pedagogicoService } from '../services/pedagogicoService';
import { boletimPorMateria } from '../services/adaptadores';
import { equipeDaAta, introducaoAta, juntarNomes } from '../services/ata';
import { pedagogicoApi } from '../api';

interface ConselhoClasseManagerProps {
  atas: AtaConselho[];
  turmas: TurmaPedagogica[];
  alunos: AlunoPedagogico[];
  preConselhos?: PreConselho[];
  ocorrencias?: OcorrenciaPedagogica[];
  onSaveAta: (data: Partial<AtaConselho>) => void;
  onToast: (toast: { type: string; title: string; message: string }) => void;
  onNavigateToPreConselho?: () => void;
}

export const ConselhoClasseManager: React.FC<ConselhoClasseManagerProps> = ({
  atas,
  turmas,
  alunos,
  preConselhos: propPreConselhos,
  ocorrencias: propOcorrencias,
  onSaveAta,
  onToast,
  onNavigateToPreConselho
}) => {
  // Navigation steps: 'turnos' -> 'turmas' -> 'resumo_turma' -> 'analise_aluno' | 'atas'
  const [step, setStep] = useState<'turnos' | 'turmas' | 'resumo_turma' | 'analise_aluno' | 'atas'>('turnos');
  const [selectedTurnoNome, setSelectedTurnoNome] = useState<'Manhã' | 'Tarde' | 'Noite' | null>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState<number | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('3º Trimestre');
  const [selectedAlunoIndex, setSelectedAlunoIndex] = useState<number>(0);

  // Modal Atas State
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAtaForPrint, setSelectedAtaForPrint] = useState<AtaConselho | null>(null);
  const [filterAtasTurmaId, setFilterAtasTurmaId] = useState<number | 'todas'>('todas');

  // Form State Nova Ata
  const [formTurmaId, setFormTurmaId] = useState<number>(turmas[0]?.id || 1);
  const [periodoForm, setPeriodoForm] = useState('3º Trimestre');
  // Equipe da ata vinda dos perfis de Usuários e Acessos (vazio quando não há ninguém no perfil).
  const equipeOrgao = equipeDaAta(pedagogicoService.getEquipe(), pedagogicoService.getProfessores(), '');
  const [diretor, setDiretor] = useState(equipeOrgao.diretor);
  // Pedagoga escolhida entre as cadastradas no Corpo Docente; com uma só, já vem selecionada.
  const [pedagoga, setPedagoga] = useState(equipeOrgao.pedagogas.length === 1 ? equipeOrgao.pedagogas[0] : '');
  const [secretario, setSecretario] = useState(juntarNomes(equipeOrgao.secretaria));
  const [deliberacoes, setDeliberacoes] = useState('');

  // Interactive Ata Document & Signature State
  const [isAtaDocModalOpen, setIsAtaDocModalOpen] = useState(false);
  const [isSignPadOpen, setIsSignPadOpen] = useState(false);
  const [ataSignatures, setAtaSignatures] = useState<Record<string, string>>({});
  const [ataIntroText, setAtaIntroText] = useState<string>('');
  const [ataConclusaoText, setAtaConclusaoText] = useState<string>('');
  const [isAtaFinalized, setIsAtaFinalized] = useState<boolean>(false);
  const [selectedSignerId, setSelectedSignerId] = useState<string>('');
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // State for "Arquivar Atas" (Manual Upload & Saved Documents)
  const [savedAtas, setSavedAtas] = useState<Array<{
    id: number | string;
    titulo: string;
    nomeArquivo: string;
    dataUpload: string;
    usuario: string;
    extensao: string;
    blobUrl?: string;
  }>>([]);

  const [uploadTitulo, setUploadTitulo] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const handleSalvarNovaAta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitulo.trim()) {
      onToast({
        type: 'warning',
        title: 'Campo obrigatório',
        message: 'Por favor, informe o título do documento.'
      });
      return;
    }
    if (!uploadFile) {
      onToast({
        type: 'warning',
        title: 'Arquivo obrigatório',
        message: 'Por favor, selecione um arquivo (PDF, DOC, DOCX, XLS).'
      });
      return;
    }

    const ext = uploadFile.name.split('.').pop()?.toLowerCase() || 'pdf';
    const now = new Date();
    const dataStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const blobUrl = URL.createObjectURL(uploadFile);

    const novaAta = {
      id: Date.now(),
      titulo: uploadTitulo.trim(),
      nomeArquivo: uploadFile.name,
      dataUpload: dataStr,
      usuario: 'Direção',
      extensao: ext,
      blobUrl
    };

    setSavedAtas(prev => [novaAta, ...prev]);
    setUploadTitulo('');
    setUploadFile(null);
    onToast({
      type: 'success',
      title: 'Ata Arquivada',
      message: 'A ata foi salva com sucesso nos Documentos Salvos.'
    });
  };

  const handleBaixarAtaSalva = (ataItem: typeof savedAtas[0]) => {
    if (ataItem.blobUrl) {
      const a = document.createElement('a');
      a.href = ataItem.blobUrl;
      a.download = ataItem.nomeArquivo || `${ataItem.titulo}.${ataItem.extensao}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const sampleText = `Documento: ${ataItem.titulo}\nData de Upload: ${ataItem.dataUpload}\nEnviado por: ${ataItem.usuario}\n\nAta oficial arquivada no sistema SysGov.`;
      const blob = new Blob([sampleText], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ataItem.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.${ataItem.extensao}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    onToast({
      type: 'info',
      title: 'Download iniciado',
      message: `Baixando "${ataItem.titulo}"...`
    });
  };

  const handleDeletarAtaSalva = (id: number | string) => {
    setSavedAtas(prev => prev.filter(a => a.id !== id));
    onToast({
      type: 'success',
      title: 'Ata Excluída',
      message: 'O documento foi removido dos Documentos Salvos.'
    });
  };

  // Fallbacks to service if optional props aren't provided directly
  const allPreConselhos = propPreConselhos || pedagogicoService.getPreConselhos();
  const allOcorrencias = propOcorrencias || pedagogicoService.getOcorrencias();
  const allMaterias: Materia[] = pedagogicoService.getMaterias();

  // Helper getters
  const selectedTurma = turmas.find(t => t.id === selectedTurmaId) || null;
  const availableTurmasForAta = selectedTurma
    ? [selectedTurma]
    : selectedTurnoNome
    ? turmas.filter(t => t.turno_nome === selectedTurnoNome)
    : turmas;

  useEffect(() => {
    if (selectedTurmaId) {
      setFormTurmaId(selectedTurmaId);
    } else if (selectedTurnoNome) {
      const firstInTurno = turmas.find(t => t.turno_nome === selectedTurnoNome);
      if (firstInTurno) setFormTurmaId(firstInTurno.id);
    }
  }, [selectedTurmaId, selectedTurnoNome, turmas]);

  const alunosDaTurma = selectedTurma
    ? alunos.filter(a => a.turma_id === selectedTurma.id)
    : [];
  // Só as matérias vinculadas à turma (cadastro da turma).
  const idsMateriasTurma = new Set((selectedTurma?.materias ?? []).map(v => v.materia_id));
  const materiasDaTurma = allMaterias.filter(m => idsMateriasTurma.has(m.id));
  const currentAluno = alunosDaTurma[selectedAlunoIndex] || null;

  // Boletim real do aluno na ficha (notas por matéria e trimestre, média como em GET /notas/medias).
  const [boletim, setBoletim] = useState<ReturnType<typeof boletimPorMateria>>(new Map());
  const [erroBoletim, setErroBoletim] = useState<string | null>(null);
  useEffect(() => {
    if (!currentAluno) return;
    let ativo = true;
    setBoletim(new Map());
    setErroBoletim(null);
    pedagogicoApi.boletim(currentAluno.id, anoLetivoAtual())
      .then((notas) => { if (ativo) setBoletim(boletimPorMateria(notas)); })
      .catch(() => { if (ativo) setErroBoletim('Não foi possível carregar as notas do aluno.'); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAluno?.id]);
  const fmtNota = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toFixed(1).replace('.', ','));

  // Ata Document Helpers & Functions
  const gerarIntroducao = (nomePedagoga: string) => {
    const equipeTurma = equipeDaAta(pedagogicoService.getEquipe(), pedagogicoService.getProfessores(), selectedTurma?.nome ?? '');
    return introducaoAta({
      data: new Date(),
      escola: pedagogicoService.getEscola().nome,
      turma: selectedTurma?.nome ?? '',
      turno: selectedTurma?.turno_nome,
      periodo: selectedPeriodo,
      ano: anoLetivoAtual(),
      diretor: equipeTurma.diretor,
      auxiliares: equipeTurma.auxiliares,
      pedagoga: nomePedagoga,
      docentes: equipeTurma.docentes,
    });
  };
  const getInitialIntroText = () => gerarIntroducao(pedagoga);
  /** Troca a pedagoga; o texto de abertura acompanha se ainda não foi editado à mão. */
  const escolherPedagoga = (nome: string) => {
    if (ataIntroText === gerarIntroducao(pedagoga)) setAtaIntroText(gerarIntroducao(nome));
    setPedagoga(nome);
  };
  // Ao trocar de turma, a ata já vem com a pedagoga cadastrada na turma.
  useEffect(() => {
    const daTurma = selectedTurma?.pedagoga_nome;
    if (daTurma && equipeOrgao.pedagogas.includes(daTurma)) escolherPedagoga(daTurma);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTurma?.id]);

  const seletorPedagoga = (classe: string) => (
    <select value={pedagoga} onChange={e => escolherPedagoga(e.target.value)} className={classe} aria-label="Pedagoga da ata" required>
      <option value="">{equipeOrgao.pedagogas.length ? 'Selecione a pedagoga' : 'Cadastre pedagogas no Corpo Docente'}</option>
      {equipeOrgao.pedagogas.map(nome => <option key={nome} value={nome}>{nome}</option>)}
    </select>
  );

  const getInitialConclusaoText = () => {
    return `A equipe pedagógica e os professores deliberaram pelo acompanhamento contínuo destes estudantes, intensificando ações de recuperação paralela, orientações individuais, contato com as famílias quando necessário e demais estratégias pedagógicas que contribuam para a melhoria do desempenho acadêmico e da participação escolar. Também foram definidas ações pedagógicas a serem desenvolvidas no próximo trimestre, tais como: organização de combinados com as turmas; reorganização do layout da sala de aula conforme a necessidade pedagógica; ampliação do uso de metodologias ativas; compartilhamento de metodologias assertivas entre os docentes; planejamento de atividades diversificadas voltadas aos diferentes níveis de aprendizagem; acompanhamento específico dos estudantes apontados no Conselho de Classe; fortalecimento do trabalho colaborativo com as docentes da SRM, PAEE e PAC; além da realização das adaptações curriculares necessárias para garantir a inclusão e o desenvolvimento integral dos estudantes. Os demais estudantes da turma atingiram a média mínima trimestral ou apresentaram rendimento acima da média estabelecida. Nada mais havendo a tratar, encerrou-se a presente reunião, sendo esta ata lavrada e assinada pelos presentes.`;
  };

  const openAtaDocModal = () => {
    const ataExistente = atas.find(a => a.turma_id === (selectedTurmaId || 1) && a.periodo === selectedPeriodo);
    if (ataExistente) {
      setAtaIntroText((ataExistente as any).texto_introducao || getInitialIntroText());
      setAtaConclusaoText((ataExistente as any).texto_conclusao || getInitialConclusaoText());
      setAtaSignatures((ataExistente as any).assinaturas || {});
      setIsAtaFinalized(ataExistente.status === 'Finalizada');
    } else {
      setAtaIntroText(getInitialIntroText());
      setAtaConclusaoText(getInitialConclusaoText());
      setAtaSignatures({});
      setIsAtaFinalized(false);
    }
    setIsAtaDocModalOpen(true);
  };

  const handleSaveDraft = async () => {
    if (isAtaFinalized) {
      onToast({ type: 'info', title: 'Ata Finalizada', message: 'Esta ata está finalizada e não aceita edições.' });
      return;
    }
    const ataExistente = atas.find(a => a.turma_id === (selectedTurmaId || 1) && a.periodo === selectedPeriodo);
    await onSaveAta({
      id: ataExistente?.id,
      turma_id: selectedTurmaId || 1,
      periodo: selectedPeriodo,
      ano_letivo: String(anoLetivoAtual()),
      data_reuniao: new Date().toISOString().split('T')[0],
      diretor,
      pedagoga,
      secretario,
      deliberacoes,
      texto_introducao: ataIntroText,
      texto_conclusao: ataConclusaoText,
      assinaturas: ataSignatures,
      status: 'Rascunho'
    } as any);

    onToast({
      type: 'success',
      title: 'Rascunho Salvo!',
      message: 'As assinaturas e alterações do texto foram salvas no servidor.'
    });
  };

  // Helper to print Ata do Conselho in dedicated clean A4 format
  const handlePrintDocumentoAta = () => {
    const reportNode = document.getElementById('report-container');
    if (!reportNode) {
      window.print();
      return;
    }

    // Clone report node to transform textareas into clean text paragraphs
    const clone = reportNode.cloneNode(true) as HTMLElement;
    const textareas = clone.querySelectorAll('textarea');
    textareas.forEach(ta => {
      const val = (ta as HTMLTextAreaElement).value || '';
      const p = document.createElement('p');
      p.className = 'whitespace-pre-line text-justify leading-relaxed indent-8 font-serif';
      p.textContent = val;
      ta.parentNode?.replaceChild(p, ta);
    });

    const contentHtml = clone.innerHTML;

    // Create hidden iframe to render ONLY the A4 document
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Ata de Conselho de Classe - ${(selectedTurma as any)?.nome || 'Turma'}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 18mm 15mm 18mm 15mm;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: "Times New Roman", Times, Georgia, serif;
            color: #000000;
            background: #ffffff;
            font-size: 11pt;
            line-height: 1.6;
          }
          .text-center { text-align: center; }
          .text-justify { text-align: justify; }
          .uppercase { text-transform: uppercase; }
          .font-bold { font-weight: bold; }
          .text-lg { font-size: 14pt; }
          .text-base { font-size: 12pt; }
          .text-sm { font-size: 11pt; }
          .text-xs { font-size: 9.5pt; }
          .tracking-wider { letter-spacing: 0.05em; }
          .leading-relaxed { line-height: 1.6; }
          .indent-8 { text-indent: 2rem; }
          .whitespace-pre-line { white-space: pre-line; }
          
          .border-b-2 { border-bottom: 2px solid #000000; }
          .border-b { border-bottom: 1px solid #000000; }
          .border-t { border-top: 1px solid #000000; }
          
          .pb-4 { padding-bottom: 1rem; }
          .pt-4 { padding-top: 1rem; }
          .pt-6 { padding-top: 1.5rem; }
          .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
          .mt-8 { margin-top: 2rem; }
          .mt-12 { margin-top: 3rem; }
          .ml-8 { margin-left: 2rem; }
          .ml-5 { margin-left: 1.25rem; }
          .space-y-6 > * + * { margin-top: 1.5rem; }
          .space-y-8 > * + * { margin-top: 2rem; }
          .space-y-1 > * + * { margin-top: 0.25rem; }
          
          .list-disc { list-style-type: disc; }
          .page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .flex { display: flex; }
          .flex-col { flex-direction: column; }
          .items-center { align-items: center; }
          .items-start { align-items: flex-start; }
          .justify-end { justify-content: flex-end; }
          
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; }
          
          .relative { position: relative; }
          .z-10 { z-index: 10; }
          .-mb-2 { margin-bottom: -0.5rem; }
          .ml-4 { margin-left: 1rem; }
          .w-\\[300px\\] { width: 300px; }
          .min-h-\\[70px\\] { min-height: 70px; }
          .min-h-\\[45px\\] { min-height: 45px; }
          .max-h-\\[55px\\] { max-height: 55px; }
          .max-h-\\[45px\\] { max-height: 45px; }
          .max-w-\\[180px\\] { max-width: 180px; }
          .max-w-\\[150px\\] { max-width: 150px; }
          
          img { object-fit: contain; }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 350);
  };

  const handleFinalizeAta = async () => {
    if (isAtaFinalized) {
      onToast({ type: 'info', title: 'Ata Finalizada', message: 'Esta ata já foi finalizada.' });
      return;
    }
    if (window.confirm('Deseja finalizar e gerar a Ata? Após finalizar, não serão mais permitidas alterações ou novas assinaturas.')) {
      setIsAtaFinalized(true);
      const ataExistente = atas.find(a => a.turma_id === (selectedTurmaId || 1) && a.periodo === selectedPeriodo);
      await onSaveAta({
        id: ataExistente?.id,
        turma_id: selectedTurmaId || 1,
        periodo: selectedPeriodo,
        ano_letivo: String(anoLetivoAtual()),
        data_reuniao: new Date().toISOString().split('T')[0],
        diretor,
        pedagoga,
        secretario,
        deliberacoes,
        texto_introducao: ataIntroText,
        texto_conclusao: ataConclusaoText,
        assinaturas: ataSignatures,
        status: 'Finalizada'
      } as any);

      onToast({
        type: 'success',
        title: 'Ata Finalizada!',
        message: 'A ata foi gravada e o documento final foi gerado.'
      });
      setTimeout(() => {
        handlePrintDocumentoAta();
      }, 300);
    }
  };

  const getAvailableSigners = () => {
    const list: { id: string; label: string }[] = [];
    if (!ataSignatures['secretaria']) list.push({ id: 'secretaria', label: 'Assinar como Secretária' });
    if (!ataSignatures['direcao']) list.push({ id: 'direcao', label: 'Assinar como Direção' });
    if (!ataSignatures['pedagogica']) list.push({ id: 'pedagogica', label: 'Assinar como Equipe Pedagógica' });

    materiasDaTurma.forEach(m => {
      const key = `materia_${m.id}`;
      if (!ataSignatures[key]) {
        list.push({ id: key, label: `Assinar: ${m.nome}` });
      }
    });
    return list;
  };

  const handleOpenSignPad = () => {
    if (isAtaFinalized) {
      onToast({ type: 'info', title: 'Ata Finalizada', message: 'Esta ata não aceita mais novas assinaturas.' });
      return;
    }
    const available = getAvailableSigners();
    if (available.length === 0) {
      onToast({
        type: 'info',
        title: 'Todas as Assinaturas Coletadas',
        message: 'Todas as pessoas e professores já assinaram esta ata.'
      });
      return;
    }
    setSelectedSignerId(available[0].id);
    setIsSignPadOpen(true);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#000080';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleApplySignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedSignerId) return;
    const dataUrl = canvas.toDataURL('image/png');
    setAtaSignatures(prev => ({
      ...prev,
      [selectedSignerId]: dataUrl
    }));
    setIsSignPadOpen(false);
    onToast({
      type: 'success',
      title: 'Assinatura Aplicada!',
      message: 'A assinatura foi registrada logo acima da linha correspondente.'
    });
  };

  // Turnos Data Aggregation
  const getTurnoStats = (turnoNome: 'Manhã' | 'Tarde' | 'Noite') => {
    const turmasDoTurno = turmas.filter(t => t.turno_nome === turnoNome);
    const turmaIds = turmasDoTurno.map(t => t.id);
    const alunosDoTurno = alunos.filter(a => turmaIds.includes(a.turma_id));
    const ocorrenciasDoTurno = allOcorrencias.filter(o =>
      alunosDoTurno.some(a => a.id === o.aluno_id)
    );
    return {
      turmasCount: turmasDoTurno.length,
      alunosCount: alunosDoTurno.length,
      ocorrenciasCount: ocorrenciasDoTurno.length
    };
  };

  const turnosList: Array<{
    nome: 'Manhã' | 'Tarde' | 'Noite';
    gradient: string;
    textColor: string;
    pillBg: string;
    icon: React.ReactNode;
  }> = [
    {
      nome: 'Manhã',
      gradient: 'from-[#FACC15] to-[#EAB308]',
      textColor: 'text-slate-900',
      pillBg: 'bg-white/40 text-slate-900',
      icon: <Sun className="w-24 h-24 opacity-30 absolute -right-2 -bottom-2 text-slate-900" />
    },
    {
      nome: 'Tarde',
      gradient: 'from-[#F97316] to-[#EA580C]',
      textColor: 'text-white',
      pillBg: 'bg-white/20 text-white',
      icon: <CloudSun className="w-24 h-24 opacity-30 absolute -right-2 -bottom-2 text-white" />
    },
    {
      nome: 'Noite',
      gradient: 'from-[#7C3AED] to-[#6D28D9]',
      textColor: 'text-white',
      pillBg: 'bg-white/20 text-white',
      icon: <Moon className="w-24 h-24 opacity-30 absolute -right-2 -bottom-2 text-white" />
    }
  ];

  // Filtered turmas for Step 2
  const turmasDoTurnoSelecionado = selectedTurnoNome
    ? turmas.filter(t => t.turno_nome === selectedTurnoNome)
    : [];

  // Pre-conselho fichas for selected turma & period (Step 3)
  const fichasDaTurma = selectedTurma
    ? allPreConselhos.filter(
        p => p.turma_id === selectedTurma.id && p.periodo === selectedPeriodo
      )
    : [];

  // Alunos em Alerta for selected turma & period
  const alunosAlerta = selectedTurma
    ? alunosDaTurma.filter(
        a => a.nivel_atencao === 'alto' || a.nivel_atencao === 'medio'
      )
    : [];

  // Top 3 Alunos Destaque
  const top3Destaque = alunosDaTurma.slice(0, 3);

  // Atas Filtering
  const filteredAtas = atas.filter(a => {
    const matchesTurma = filterAtasTurmaId === 'todas' || a.turma_id === filterAtasTurmaId;
    const matchesSearch =
      a.turma_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.periodo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTurma && matchesSearch;
  });

  const handleCreateAta = (e: React.FormEvent) => {
    e.preventDefault();
    const turmaObj = turmas.find(t => t.id === Number(formTurmaId));
    const alunosDaTurmaForm = alunos.filter(a => a.turma_id === Number(formTurmaId));
    const aprovados = alunosDaTurmaForm.filter(a => (a.media_geral || 0) >= 6.0).length;
    const recuperacao = alunosDaTurmaForm.filter(a => (a.media_geral || 0) < 6.0).length;

    onSaveAta({
      turma_id: Number(formTurmaId),
      turma_nome: turmaObj?.nome ?? '',
      periodo: periodoForm,
      ano_letivo: String(anoLetivoAtual()),
      data_reuniao: new Date().toISOString().split('T')[0],
      diretor,
      pedagoga,
      secretario,
      deliberacoes,
      aprovados_count: aprovados,
      recuperacao_count: recuperacao,
      retidos_count: 0,
      status: 'Finalizada'
    });

    onToast({
      type: 'success',
      title: 'Ata de Conselho Gerada!',
      message: `Ata do ${periodoForm} para ${turmaObj?.nome} emitida com sucesso.`
    });

    setIsModalOpen(false);
  };

  const handlePrint = (ata: AtaConselho) => {
    setSelectedAtaForPrint(ata);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="space-y-6 min-h-[600px] relative pb-20">
      {/* Printable Area - Rendered when printing */}
      {selectedAtaForPrint && (
        <div className="hidden print:block p-8 bg-white text-black font-serif space-y-6">
          <div className="text-center border-b-2 border-black pb-4">
            <h1 className="text-xl font-bold uppercase tracking-wider">{pedagogicoService.getEscola().nome || 'Secretaria de Educação'}</h1>
            <h2 className="text-lg font-semibold mt-1">ATA OFICIAL DO CONSELHO DE CLASSE</h2>
            <p className="text-sm italic">Ano Letivo {selectedAtaForPrint.ano_letivo} — SysGov Pedagógico</p>
          </div>

          <div className="space-y-2 text-sm">
            <p><strong>Turma:</strong> {selectedAtaForPrint.turma_nome} | <strong>Período:</strong> {selectedAtaForPrint.periodo}</p>
            <p><strong>Data da Reunião:</strong> {selectedAtaForPrint.data_reuniao}</p>
            <p><strong>Equipe Presente:</strong> Direção: {selectedAtaForPrint.diretor} | Pedagoga: {selectedAtaForPrint.pedagoga} | Secretário: {selectedAtaForPrint.secretario}</p>
          </div>

          <div className="border-t border-b border-black py-4 my-4 space-y-2 text-sm">
            <h3 className="font-bold uppercase">Resumo da Deliberação</h3>
            <p><strong>Alunos Aprovados / Regulares:</strong> {selectedAtaForPrint.aprovados_count}</p>
            <p><strong>Alunos Encaminhados para Recuperação Paralela:</strong> {selectedAtaForPrint.recuperacao_count}</p>
            <p><strong>Alunos Retidos:</strong> {selectedAtaForPrint.retidos_count}</p>
          </div>

          <div className="space-y-2 text-sm">
            <h3 className="font-bold uppercase">Parecer e Deliberações Finais</h3>
            <p className="text-justify leading-relaxed">{selectedAtaForPrint.deliberacoes}</p>
          </div>

          <div className="pt-16 grid grid-cols-3 gap-4 text-center text-xs">
            <div className="border-t border-black pt-2">
              <p className="font-bold">{selectedAtaForPrint.diretor}</p>
              <p>Direção Escolar</p>
            </div>
            <div className="border-t border-black pt-2">
              <p className="font-bold">{selectedAtaForPrint.pedagoga}</p>
              <p>Equipe Pedagógica</p>
            </div>
            <div className="border-t border-black pt-2">
              <p className="font-bold">{selectedAtaForPrint.secretario}</p>
              <p>Secretaria Acadêmica</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Screen Content */}
      <div className="print:hidden space-y-6">

        {/* STEP 1: Seleção de Turno */}
        {step === 'turnos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  Conselho de Classe
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Selecione um turno para ver as turmas.
                </p>
              </div>

              <button
                onClick={() => setStep('atas')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shrink-0"
              >
                <FolderOpen className="w-4 h-4" />
                Arquivar Atas
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {turnosList.map(t => {
                const stats = getTurnoStats(t.nome);
                return (
                  <div
                    key={t.nome}
                    onClick={() => {
                      setSelectedTurnoNome(t.nome);
                      setStep('turmas');
                    }}
                    className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden flex flex-col h-[240px] transform hover:-translate-y-1.5"
                  >
                    <div className={`bg-gradient-to-r ${t.gradient} p-6 ${t.textColor} relative flex-1 flex flex-col justify-between overflow-hidden`}>
                      {t.icon}
                      <div>
                        <h2 className={`text-3xl font-extrabold tracking-tight mb-3 ${t.textColor}`}>{t.nome}</h2>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`${t.pillBg} backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold`}>
                            {stats.turmasCount} Turmas
                          </span>
                          <span className={`${t.pillBg} backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold`}>
                            {stats.alunosCount} Alunos
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-900 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                          Ocorrências Totais
                        </span>
                        <strong className={`text-xl font-black ${stats.ocorrenciasCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {stats.ocorrenciasCount}
                        </strong>
                      </div>

                      <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all shadow-sm">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Seleção de Turma do Turno */}
        {step === 'turmas' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Conselho de Classe</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Turmas do turno <strong className="text-indigo-600 dark:text-indigo-400">{selectedTurnoNome}</strong>
                </p>
              </div>

              <button
                onClick={() => setStep('turnos')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar aos Turnos
              </button>
            </div>

            {turmasDoTurnoSelecionado.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Nenhuma turma neste turno</h3>
                <p className="text-xs text-slate-500 mt-1">Não há turmas vinculadas ao turno {selectedTurnoNome}.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {turmasDoTurnoSelecionado.map(t => {
                  const alunosTurmaCount = alunos.filter(a => a.turma_id === t.id).length;
                  const ocCount = allOcorrencias.filter(o =>
                    alunos.some(a => a.turma_id === t.id && a.id === o.aluno_id)
                  ).length;

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTurmaId(t.id);
                        setStep('resumo_turma');
                      }}
                      className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden flex flex-col transform hover:-translate-y-1"
                    >
                      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-6 text-white relative">
                        <Users className="w-16 h-16 opacity-15 absolute right-3 bottom-3" />
                        <h2 className="text-2xl font-black">{t.nome}</h2>
                        <p className="text-xs text-white/90 mt-1 font-medium">
                          {alunosTurmaCount || t.total_alunos} Alunos matriculados
                        </p>
                      </div>

                      <div className="p-4 bg-white dark:bg-slate-900 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            Total Ocorrências
                          </span>
                          <strong className="text-lg font-black text-rose-500">
                            {ocCount}
                          </strong>
                        </div>

                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-all shadow-sm">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Resumo Pré-Conselho da Turma */}
        {step === 'resumo_turma' && selectedTurma && (
          <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Resumo Pré-Conselho</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  <span>Turma: <strong className="text-indigo-600 dark:text-indigo-400">{selectedTurma.nome}</strong></span>
                  <span>| Turno: <strong>{selectedTurma.turno_nome}</strong></span>
                  <span>| Ano: <strong>{anoLetivoAtual()}</strong></span>
                </p>

                <div className="mt-3">
                  <select
                    value={selectedPeriodo}
                    onChange={e => setSelectedPeriodo(e.target.value)}
                    className="px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 focus:outline-none"
                  >
                    <option value="1º Trimestre">1º Trimestre</option>
                    <option value="2º Trimestre">2º Trimestre</option>
                    <option value="3º Trimestre">3º Trimestre</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setStep('atas')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all"
                >
                  <FolderOpen className="w-4 h-4" />
                  Arquivar Atas
                </button>

                <button
                  onClick={() => setStep('turmas')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>

                <button
                  onClick={openAtaDocModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
                >
                  <FileSignature className="w-4 h-4" />
                  Ata do Conselho
                </button>

                <button
                  onClick={() => {
                    setSelectedAlunoIndex(0);
                    setStep('analise_aluno');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  Iniciar Análise
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Option 3a: Nenhum pré-conselho feito */}
            {fichasDaTurma.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center max-w-3xl mx-auto shadow-sm space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                  <ClipboardList className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Nenhum Pré-Conselho registrado
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Para visualizar o resumo panorâmico, os professores precisam primeiro preencher as fichas de Pré-Conselho para esta turma.
                </p>

                <button
                  onClick={() => {
                    if (onNavigateToPreConselho) {
                      onNavigateToPreConselho();
                    } else {
                      onToast({
                        type: 'info',
                        title: 'Pré-Conselho',
                        message: 'Redirecionando para o módulo de Pré-Conselho.'
                      });
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 text-sm transition-all"
                >
                  Acessar Módulo de Pré-Conselho
                </button>
              </div>
            ) : (
              /* Option 3b: Resumo Panorâmico com Gráficos */
              <div className="space-y-6">
                {/* Top KPI Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 border-b-4 border-b-emerald-500 shadow-sm space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Fichas Enviadas
                    </span>
                    <div className="flex items-baseline gap-2">
                      <strong className="text-3xl font-black text-slate-900 dark:text-white">
                        {fichasDaTurma.length}
                      </strong>
                      <span className="text-xs text-slate-500">disciplinas</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 border-b-4 border-b-blue-500 shadow-sm space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Desempenho Positivo
                    </span>
                    <div className="flex items-baseline gap-2">
                      <strong className="text-3xl font-black text-slate-900 dark:text-white">
                        {Math.round((alunosDaTurma.filter(a => (a.media_geral || 0) >= 6.0).length / Math.max(1, alunosDaTurma.length)) * 100)}%
                      </strong>
                      <span className="text-xs text-slate-500">média geral</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 border-b-4 border-b-rose-500 shadow-sm space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Alunos em Alerta
                    </span>
                    <div className="flex items-baseline gap-2">
                      <strong className="text-3xl font-black text-rose-600">
                        {alunosAlerta.length}
                      </strong>
                      <span className="text-xs text-slate-500">casos críticos</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 border-b-4 border-b-amber-500 shadow-sm space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Engajamento Alto
                    </span>
                    <div className="flex items-baseline gap-2">
                      <strong className="text-3xl font-black text-slate-900 dark:text-white">
                        100%
                      </strong>
                      <span className="text-xs text-slate-500">participação</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - 2 Cols span */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Charts Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <PieChart className="w-4 h-4 text-indigo-500" />
                          Desempenho por Disciplina
                        </h3>
                        <div className="h-44 flex items-center justify-center">
                          <div className="relative w-36 h-36 rounded-full border-[14px] border-amber-400 border-t-emerald-500 border-r-blue-500 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-500">Gráfico</span>
                          </div>
                        </div>
                        <div className="flex justify-center gap-3 text-[11px] flex-wrap text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Excelente</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Bom</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Regular</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Insatisfatório</span>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-indigo-500" />
                          Atingimento de Objetivos
                        </h3>
                        <div className="h-44 flex items-end justify-center gap-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-12 bg-emerald-500 rounded-t-md h-32"></div>
                            <span className="text-[10px] text-slate-500 font-medium">Totalmente</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-12 bg-amber-400 rounded-t-md h-8"></div>
                            <span className="text-[10px] text-slate-500 font-medium">Parcialmente</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-12 bg-rose-500 rounded-t-md h-2"></div>
                            <span className="text-[10px] text-slate-500 font-medium">Não atingidos</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Foco de Atenção Table */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Foco de Atenção (Sinalizados no Pré-Conselho)
                        </h3>
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          Nível de Atenção: MÉDIO e ALTO
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="p-3">Nº</th>
                              <th className="p-3">Aluno</th>
                              <th className="p-3 text-center">Apontamentos</th>
                              <th className="p-3 text-center">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {alunosAlerta.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="p-6 text-center text-slate-400">
                                  Nenhum aluno sinalizado com atenção alta ou média.
                                </td>
                              </tr>
                            ) : (
                              alunosAlerta.map(a => {
                                const idxInTurma = alunosDaTurma.findIndex(al => al.id === a.id);
                                const isAlto = a.nivel_atencao === 'alto';
                                return (
                                  <tr key={a.id} className={isAlto ? 'bg-rose-50/50 dark:bg-rose-950/20' : 'bg-amber-50/50 dark:bg-amber-950/20'}>
                                    <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                                      {String(a.numero || 0).padStart(2, '0')}
                                    </td>
                                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                                      {a.nome}
                                    </td>
                                    <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">
                                      1 ({a.nivel_atencao === 'alto' ? 'Alto' : 'Médio'})
                                    </td>
                                    <td className="p-3 text-center">
                                      <button
                                        onClick={() => {
                                          setSelectedAlunoIndex(idxInTurma >= 0 ? idxInTurma : 0);
                                          setStep('analise_aluno');
                                        }}
                                        className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 font-bold text-[11px] text-slate-700 dark:text-slate-300 shadow-sm"
                                      >
                                        Ver Ficha
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Top 3 Alunos Destaque */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 border-t-4 border-t-amber-400 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-amber-600 flex items-center gap-2">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        Top 3 Alunos Destaque
                      </h3>

                      <div className="space-y-2.5">
                        {top3Destaque.map((al, idx) => (
                          <div key={al.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-xs text-slate-400">0{idx + 4}.</span>
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate uppercase">
                                {al.nome}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white dark:bg-slate-800 text-amber-600 border border-amber-300 shadow-sm shrink-0">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              1
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metodologias de Sucesso */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-indigo-500" />
                        Metodologias de Sucesso
                      </h3>

                      <div className="space-y-3 text-xs">
                        <div>
                          <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            <span>Resolução de exercícios</span>
                            <span>100%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full w-[100%] rounded-full"></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            <span>Tecnologias digitais</span>
                            <span>100%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full w-[100%] rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Panorama Socioemocional */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-indigo-500" />
                        Panorama Socioemocional
                      </h3>

                      <div className="h-44 flex items-center justify-center">
                        <div className="w-32 h-32 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-900 shadow-inner flex items-center justify-center text-white font-bold text-xs">
                          100% Adequado
                        </div>
                      </div>

                      <div className="flex justify-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Adequado</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Necessita atenção</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Crítico</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Análise Aluno por Aluno */}
        {step === 'analise_aluno' && currentAluno && selectedTurma && (
          <div className="space-y-6">
            {/* Student Header Banner */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-l-8 border-l-indigo-600 p-6 relative shadow-sm space-y-4">
              <button
                onClick={() => setStep('resumo_turma')}
                className="absolute top-4 right-4 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Voltar ao Resumo
              </button>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Avatar Box with badge overlay */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-2xl flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-md">
                    {currentAluno.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="absolute -bottom-2 -left-2 bg-indigo-600 text-white text-xs font-black w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md">
                    {String(currentAluno.numero || selectedAlunoIndex + 1).padStart(2, '0')}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 flex-1">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {currentAluno.nome}
                  </h1>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-3 py-1 rounded-full font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                      {selectedTurma.nome}
                    </span>
                    <span className="text-slate-500 font-semibold">
                      ALUNO {selectedAlunoIndex + 1} DE {alunosDaTurma.length}
                    </span>
                    {currentAluno.status === 'Transferido' && (
                      <span className="px-3 py-1 rounded-full font-bold bg-rose-100 text-rose-800">
                        TRANSFERIDO
                      </span>
                    )}
                  </div>
                </div>

                {/* KPI metrics box & Actions */}
                <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-4 sm:pt-0 sm:pl-6 shrink-0">
                  <div className="text-center">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Ocorrências</span>
                    <strong className="text-xl font-black text-rose-600">
                      {currentAluno.total_ocorrencias || 0}
                    </strong>
                  </div>

                  <div className="text-center bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="block text-[10px] font-extrabold text-slate-400 uppercase">Número</span>
                    <strong className="text-xl font-black text-indigo-900 dark:text-white">
                      {String(currentAluno.numero || selectedAlunoIndex + 1).padStart(2, '0')}
                    </strong>
                  </div>

                  <div className="flex flex-col gap-1">
                    <button className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <Edit className="w-3.5 h-3.5 inline mr-1" /> Editar
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-indigo-900 text-white text-xs font-semibold">
                      <FileText className="w-3.5 h-3.5 inline mr-1" /> Relatório
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Desempenho por Disciplina (Table) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                  Desempenho por Disciplina
                </h3>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                  SISTEMA TRIMESTRAL
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Disciplina</th>
                      <th className="p-3 text-center">1º TRI</th>
                      <th className="p-3 text-center">2º TRI</th>
                      <th className="p-3 text-center">3º TRI</th>
                      <th className="p-3 text-center bg-slate-100 dark:bg-slate-800">Média Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {erroBoletim && (
                      <tr><td colSpan={5} className="p-3 text-center text-rose-500">{erroBoletim}</td></tr>
                    )}
                    {materiasDaTurma.map(m => {
                      const linha = boletim.get(m.id);
                      const media = linha?.media ?? null;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">{m.nome}</td>
                          {[0, 1, 2].map(i => (
                            <td key={i} className={`p-3 text-center font-mono tabular-nums ${linha?.trimestres[i] == null ? 'text-slate-400' : ''}`}>
                              {fmtNota(linha?.trimestres[i])}
                            </td>
                          ))}
                          <td className={`p-3 text-center font-black font-mono tabular-nums bg-slate-50 dark:bg-slate-800/60 text-sm ${media === null ? 'text-slate-400' : media >= 6 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {fmtNota(media)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Observações do Pré-Conselho */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Observações do Pré-Conselho
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1 rounded-full font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    0 Alertas (Alto)
                  </span>
                  <span className="px-3 py-1 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    0 Atenção (Médio)
                  </span>
                </div>
              </div>

              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                Nenhuma observação pedagógica registrada no Pré-Conselho para este ano.
              </div>
            </div>

            {/* Média por Disciplina (Chart) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                Média por Disciplina
              </h3>

              <div className="h-48 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800 px-4">
                {materiasDaTurma.map((m, i) => {
                  const h = i % 2 === 0 ? 'h-36 bg-emerald-500' : 'h-28 bg-amber-400';
                  return (
                    <div key={m.id} className="flex flex-col items-center gap-2 flex-1">
                      <div className={`w-full max-w-[32px] ${h} rounded-t-md`}></div>
                      <span className="text-[9px] text-slate-400 font-bold truncate max-w-[50px]">{m.codigo || m.nome}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Row Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-500" />
                  Ocorrências por Categoria
                </h3>
                <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                  Sem dados para o gráfico.
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  Tendência Mensal de Ocorrências
                </h3>
                <div className="h-44 flex items-end justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  {['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'].map((m, idx) => (
                    <div key={m} className="flex flex-col items-center gap-1 flex-1">
                      <div className={`w-2 bg-indigo-500 rounded-t-full ${idx === 7 ? 'h-28' : 'h-2'}`}></div>
                      <span className="text-[9px] text-slate-400">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FIXED FLOATING BOTTOM NAVIGATION BAR */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-3 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xl flex items-center gap-5 z-40">
              <button
                disabled={selectedAlunoIndex === 0}
                onClick={() => setSelectedAlunoIndex(prev => Math.max(0, prev - 1))}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Aluno Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="font-extrabold text-xs tracking-wider text-slate-800 dark:text-slate-200 px-4 border-x border-slate-200 dark:border-slate-700">
                ALUNO {selectedAlunoIndex + 1} DE {alunosDaTurma.length}
              </div>

              <button
                disabled={selectedAlunoIndex >= alunosDaTurma.length - 1}
                onClick={() => setSelectedAlunoIndex(prev => Math.min(alunosDaTurma.length - 1, prev + 1))}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Próximo Aluno"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP "ATAS": Arquivar Atas Page (Upload Nova Ata + Documentos Salvos) */}
        {step === 'atas' && (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Arquivar Atas
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Gerenciamento de atas e documentos do Conselho de Classe.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep('turnos')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao Conselho
                </button>
              </div>
            </div>

            {/* Main Content Grid: Nova Ata (Left) & Documentos Salvos (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Form Nova Ata */}
              <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-base">
                  <Upload className="w-5 h-5" />
                  <span className="text-slate-900 dark:text-white">Nova Ata</span>
                </div>

                <form onSubmit={handleSalvarNovaAta} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Título do Documento
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Ata 1º Trimestre - Turma 9A"
                      value={uploadTitulo}
                      onChange={e => setUploadTitulo(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Arquivo (PDF, DOC, DOCX, XLS)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={e => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 active:scale-98 mt-2"
                  >
                    <Upload className="w-4 h-4" />
                    Salvar Documento
                  </button>
                </form>
              </div>

              {/* Right Column: Documentos Salvos */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-base">
                  <Folder className="w-5 h-5 fill-amber-500 text-amber-500" />
                  <span className="text-slate-900 dark:text-white">Documentos Salvos</span>
                </div>

                {savedAtas.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Folder className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Nenhum documento arquivado ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedAtas.map(doc => {
                      const isPdf = doc.extensao === 'pdf';
                      const isDoc = ['doc', 'docx'].includes(doc.extensao);
                      const isXls = ['xls', 'xlsx'].includes(doc.extensao);

                      return (
                        <div
                          key={doc.id}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-xs"
                        >
                          <div className="flex items-center gap-3.5">
                            {/* Document Type Badge */}
                            {isPdf && (
                              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 flex flex-col items-center justify-center font-black text-[10px] shrink-0 border border-red-200/60 dark:border-red-900/40 shadow-xs">
                                <FileText className="w-4 h-4 text-red-600" />
                                <span className="-mt-1 text-[8px] tracking-tight">PDF</span>
                              </div>
                            )}
                            {isDoc && (
                              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex flex-col items-center justify-center font-black text-[10px] shrink-0 border border-blue-200/60 dark:border-blue-900/40 shadow-xs">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="-mt-1 text-[8px] tracking-tight">W</span>
                              </div>
                            )}
                            {isXls && (
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex flex-col items-center justify-center font-black text-[10px] shrink-0 border border-emerald-200/60 dark:border-emerald-900/40 shadow-xs">
                                <FileText className="w-4 h-4 text-emerald-600" />
                                <span className="-mt-1 text-[8px] tracking-tight">XLS</span>
                              </div>
                            )}
                            {!isPdf && !isDoc && !isXls && (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 flex flex-col items-center justify-center font-black text-[10px] shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs">
                                <FileText className="w-4 h-4 text-slate-600" />
                                <span className="-mt-1 text-[8px] tracking-tight">{doc.extensao.toUpperCase()}</span>
                              </div>
                            )}

                            <div>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                                {doc.titulo}
                              </h4>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {doc.dataUpload}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  {doc.usuario}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => handleBaixarAtaSalva(doc)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Baixar
                            </button>
                            <button
                              onClick={() => handleDeletarAtaSalva(doc.id)}
                              className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 hover:bg-red-200 dark:hover:bg-red-900 text-red-600 dark:text-red-400 font-bold text-xs transition-colors"
                              title="Excluir Documento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Nova Ata */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Emitir Nova Ata de Conselho
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAta} className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">Turma</label>
                    <select
                      value={formTurmaId}
                      onChange={e => setFormTurmaId(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    >
                      {availableTurmasForAta.map(t => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">Período</label>
                    <select
                      value={periodoForm}
                      onChange={e => setPeriodoForm(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="1º Trimestre">1º Trimestre</option>
                      <option value="2º Trimestre">2º Trimestre</option>
                      <option value="3º Trimestre">3º Trimestre</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">Diretor(a)</label>
                    <input
                      type="text"
                      value={diretor}
                      onChange={e => setDiretor(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">Pedagoga(o)</label>
                    {seletorPedagoga('w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none text-xs')}
                  </div>
                  <div>
                    <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">Secretário(a)</label>
                    <input
                      type="text"
                      value={secretario}
                      onChange={e => setSecretario(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">Deliberações do Conselho</label>
                  <textarea
                    rows={4}
                    value={deliberacoes}
                    onChange={e => setDeliberacoes(e.target.value)}
                    placeholder="Descreva as deliberações oficiais tomadas durante a reunião..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-sm text-xs"
                  >
                    Gerar e Assinar Ata
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL INTERATIVO DA ATA DO CONSELHO */}
        {isAtaDocModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
            <div className="bg-white text-black font-serif rounded-2xl max-w-4xl w-full p-6 sm:p-12 shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto print:max-h-none print:shadow-none print:p-0 print:my-0">
              
              {/* Toolbar Superior */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 print:hidden font-sans">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ata de Conselho de Classe</span>
                  {isAtaFinalized ? (
                    <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200">🔒 Ata Finalizada</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">📝 Rascunho em Edição</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAtaDocModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                  >
                    ✖ Fechar
                  </button>
                  <button
                    onClick={handlePrintDocumentoAta}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimir
                  </button>
                  {!isAtaFinalized && (
                    <>
                      {seletorPedagoga('px-2 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold')}
                      <button
                        onClick={handleOpenSignPad}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <FileSignature className="w-3.5 h-3.5" /> Assinar
                      </button>
                      <button
                        onClick={handleSaveDraft}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all"
                      >
                        💾 Salvar Rascunho
                      </button>
                      <button
                        onClick={handleFinalizeAta}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all"
                      >
                        📤 Finalizar & Salvar PDF
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Conteúdo do Relatório / Ata Oficial */}
              <div id="report-container" className="space-y-6">
                <div className="text-center border-b-2 border-black pb-4">
                  <h1 className="text-lg font-bold uppercase tracking-wider">{pedagogicoService.getEscola().nome}</h1>
                  <p className="text-xs">Telefone: (41) 3604-6118 | Email: escola@escola.pr.gov.br</p>
                </div>

                <div className="text-center font-bold text-base my-4 uppercase">
                  ATA DO CONSELHO DE CLASSE ({selectedPeriodo.toUpperCase()})
                </div>

                {/* Texto de Introdução */}
                <div className="text-justify text-sm leading-relaxed indent-8">
                  {isAtaFinalized ? (
                    <p className="whitespace-pre-line">{ataIntroText}</p>
                  ) : (
                    <textarea
                      rows={8}
                      value={ataIntroText}
                      onChange={e => setAtaIntroText(e.target.value)}
                      className="w-full p-3 font-serif text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-justify leading-relaxed print:border-none print:p-0 print:resize-none"
                    />
                  )}
                </div>

                {/* Alunos em Foco de Atenção */}
                <div className="my-4 ml-8 text-sm">
                  <p className="font-bold mb-2">Estudantes destacados como pontos de atenção:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    {alunosDaTurma.filter(a => (a.media_geral || 0) < 6.0).length === 0 ? (
                      <li>Nenhum estudante foi destacado como ponto de atenção.</li>
                    ) : (
                      alunosDaTurma
                        .filter(a => (a.media_geral || 0) < 6.0)
                        .map(aluno => (
                          <li key={aluno.id}>
                            Nº {String(aluno.numero || 0).padStart(2, '0')} - {aluno.nome.toUpperCase()}
                          </li>
                        ))
                    )}
                  </ul>
                </div>

                {/* Texto de Conclusão */}
                <div className="text-justify text-sm leading-relaxed indent-8">
                  {isAtaFinalized ? (
                    <p className="whitespace-pre-line">{ataConclusaoText}</p>
                  ) : (
                    <textarea
                      rows={8}
                      value={ataConclusaoText}
                      onChange={e => setAtaConclusaoText(e.target.value)}
                      className="w-full p-3 font-serif text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-justify leading-relaxed print:border-none print:p-0 print:resize-none"
                    />
                  )}
                </div>

                {/* Seção de Assinaturas Principais */}
                <div className="mt-12 pt-6 space-y-8 page-break-inside-avoid">
                  <div className="flex flex-col items-center justify-end min-h-[70px] relative">
                    {ataSignatures['secretaria'] && (
                      <img src={ataSignatures['secretaria']} alt="Assinatura Secretária" className="max-h-[55px] max-w-[180px] -mb-2 z-10" />
                    )}
                    <div className="w-[300px] border-t border-black pt-1 font-bold text-center text-xs">
                      {secretario ? `${secretario} — Secretaria` : 'Secretaria'}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-end min-h-[70px] relative">
                    {ataSignatures['direcao'] && (
                      <img src={ataSignatures['direcao']} alt="Assinatura Direção" className="max-h-[55px] max-w-[180px] -mb-2 z-10" />
                    )}
                    <div className="w-[300px] border-t border-black pt-1 font-bold text-center text-xs">
                      {diretor ? `${diretor} — Direção` : 'Direção'}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-end min-h-[70px] relative">
                    {ataSignatures['pedagogica'] && (
                      <img src={ataSignatures['pedagogica']} alt="Assinatura Equipe Pedagógica" className="max-h-[55px] max-w-[180px] -mb-2 z-10" />
                    )}
                    <div className="w-[300px] border-t border-black pt-1 font-bold text-center text-xs">
                      {pedagoga ? `${pedagoga} — Equipe Pedagógica` : 'Equipe Pedagógica'}
                    </div>
                  </div>
                </div>

                {/* Tabela de Assinaturas de Professores de Disciplinas */}
                <div className="mt-8 pt-4 page-break-inside-avoid">
                  <h4 className="font-bold text-xs uppercase mb-4 border-b border-black pb-1">Professores das Disciplinas:</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    {materiasDaTurma.map(m => (
                      <div key={m.id} className="text-xs space-y-1">
                        <span className="font-bold">{m.nome}:</span>
                        <div className="flex flex-col items-start justify-end min-h-[45px] relative mt-1">
                          {ataSignatures[`materia_${m.id}`] && (
                            <img src={ataSignatures[`materia_${m.id}`]} alt={`Assinatura ${m.nome}`} className="max-h-[45px] max-w-[150px] -mb-2 ml-4 z-10" />
                          )}
                          <div className="w-full border-b border-black"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* MODAL CANVAS PARA DESENHAR ASSINATURA */}
        {isSignPadOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-emerald-500" />
                  Assinatura Digital
                </h3>
                <button
                  onClick={() => setIsSignPadOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">Desenhe sua assinatura no campo abaixo:</p>
                <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    width={380}
                    height={160}
                    className="w-full h-[160px] touch-none cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Limpar
                  </button>

                  <select
                    value={selectedSignerId}
                    onChange={e => setSelectedSignerId(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none"
                  >
                    {getAvailableSigners().map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSignPadOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplySignature}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-sm text-xs"
                >
                  Aplicar Assinatura
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConselhoClasseManager;
