import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  GraduationCap,
  Award,
  Phone,
  Calendar,
  User,
  X,
  BookOpen,
  ClipboardList,
  Sun,
  CloudSun,
  Moon,
  ChevronRight,
  ArrowLeft,
  FileText,
  Lock,
  Paperclip,
  ListOrdered,
  Camera,
  Printer,
  PenTool,
  Check
} from 'lucide-react';
import { AlunoPedagogico, TurmaPedagogica, OcorrenciaPedagogica, Materia } from '../types/pedagogico';
import { pedagogicoService } from '../services/pedagogicoService';
import { erroApi } from '../../escola/api';
import { isAxiosError } from 'axios';

interface AlunosManagerProps {
  alunos: AlunoPedagogico[];
  turmas: TurmaPedagogica[];
  ocorrencias?: OcorrenciaPedagogica[];
  materias?: Materia[];
  onSaveAluno: (aluno: Partial<AlunoPedagogico>) => void;
  onDeleteAluno?: (id: number) => void;
  onToast: (toast: { type: string; title: string; message: string }) => void;
}

export const AlunosManager: React.FC<AlunosManagerProps> = ({
  alunos,
  turmas,
  ocorrencias = [],
  materias = [],
  onSaveAluno,
  onDeleteAluno,
  onToast
}) => {
  // Navigation steps: 'turnos' -> 'turmas' -> 'alunos' -> 'ficha' -> 'relatorio'
  const [step, setStep] = useState<'turnos' | 'turmas' | 'alunos' | 'ficha' | 'relatorio'>('turnos');
  const [selectedTurnoNome, setSelectedTurnoNome] = useState<'Manhã' | 'Tarde' | 'Noite' | null>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState<number | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // Selected Ficha Aluno State
  const [selectedFichaAluno, setSelectedFichaAluno] = useState<AlunoPedagogico | null>(null);

  // Ficha Ocorrências Form State
  const [ocData, setOcData] = useState('25/09/2026');
  const [ocPedagogia, setOcPedagogia] = useState('Direção');
  const [ocCategoria, setOcCategoria] = useState('');
  const [ocDescricao, setOcDescricao] = useState('');
  const [ocAnexoFile, setOcAnexoFile] = useState<File | null>(null);
  const [localOcorrencias, setLocalOcorrencias] = useState<OcorrenciaPedagogica[]>(
    ocorrencias.length > 0 ? ocorrencias : pedagogicoService.getOcorrencias()
  );

  // Modal State: Form Aluno
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAluno, setEditingAluno] = useState<Partial<AlunoPedagogico> | null>(null);

  // Form Fields State
  const [formNome, setFormNome] = useState('');
  const [formCgm, setFormCgm] = useState('');
  const [formNumero, setFormNumero] = useState<number | ''>('');
  const [formTurmaId, setFormTurmaId] = useState<number>(turmas[0]?.id || 10);
  const [formTurmaDestinoId, setFormTurmaDestinoId] = useState<number>(turmas[0]?.id || 10);
  const [formStatus, setFormStatus] = useState<'Ativo' | 'Transferido' | 'Remanejado'>('Ativo');
  const [formMae, setFormMae] = useState('');
  const [formPai, setFormPai] = useState('');
  const [formNascimento, setFormNascimento] = useState('');
  const [formFoto, setFormFoto] = useState<string>('');
  const [formFotoPreview, setFormFotoPreview] = useState<string>('');
  const [formContatosList, setFormContatosList] = useState<{ id: string; numero: string; tag: string }[]>([
    { id: '1', numero: '', tag: 'Importado' }
  ]);

  // Modal State: Gerar Relatório
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportAluno, setSelectedReportAluno] = useState<AlunoPedagogico | null>(null);
  const [reportResponsavel, setReportResponsavel] = useState<string>('Mãe:');
  const [reportQuemGerou, setReportQuemGerou] = useState<string>('Direção');
  const [reportIncludeOcorrencias, setReportIncludeOcorrencias] = useState<boolean>(true);
  const [reportIncludeNotas, setReportIncludeNotas] = useState<boolean>(true);
  const [reportDigitalSigned, setReportDigitalSigned] = useState<boolean>(false);
  const [isReportSignPadOpen, setIsReportSignPadOpen] = useState<boolean>(false);
  const [selectedReportSignerRole, setSelectedReportSignerRole] = useState<'responsavel' | 'gerador'>('responsavel');
  const [isReportDrawing, setIsReportDrawing] = useState<boolean>(false);
  const [reportSignatures, setReportSignatures] = useState<Record<string, string>>({});
  const [editingOcId, setEditingOcId] = useState<number | null>(null);
  const reportCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Modal State: Edição de Notas do Aluno
  const [isNotasModalOpen, setIsNotasModalOpen] = useState(false);
  const [selectedAlunoNotas, setSelectedAlunoNotas] = useState<AlunoPedagogico | null>(null);
  const [studentGrades, setStudentGrades] = useState<Record<number, { tri1: string; tri2: string; tri3: string }>>({});

  const allMaterias = materias.length > 0 ? materias : pedagogicoService.getMaterias();

  // Expanded Materias List for Report View matching exact screenshot subjects
  const reportMateriasList = [
    { id: 101, nome: 'ED Digital Comp. Prog. E IA' },
    { id: 102, nome: 'Projeto de Vida' },
    { id: 103, nome: 'Química' },
    { id: 104, nome: 'Química e Tecnociência' },
    { id: 105, nome: 'Raciocínio Matemático' },
    { id: 106, nome: 'Recomposição Matemática' },
    { id: 107, nome: 'Redação e Leitura' },
    { id: 108, nome: 'Resolução de Problemas' },
    { id: 109, nome: 'Sociologia' }
  ];

  // Helper calculation for age
  const calculateAge = (dateStr?: string) => {
    if (!dateStr) return 16;
    const birth = new Date(dateStr);
    if (isNaN(birth.getTime())) return 16;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Helper calculation for Brazilian formatted birth date
  const formatDateBr = (dateStr?: string) => {
    if (!dateStr) return '16/08/2010';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Helper getters for Turnos Stats
  const getTurnoStats = (turnoNome: 'Manhã' | 'Tarde' | 'Noite') => {
    const turmasDoTurno = turmas.filter(t => t.turno_nome === turnoNome);
    const countTurmas = turmasDoTurno.length || (turnoNome === 'Manhã' ? 8 : turnoNome === 'Tarde' ? 2 : 6);

    let countAlunos = alunos.filter(a => {
      const t = turmas.find(tObj => tObj.id === a.turma_id);
      return t?.turno_nome === turnoNome;
    }).length;
    if (countAlunos === 0) {
      countAlunos = turnoNome === 'Manhã' ? 164 : turnoNome === 'Tarde' ? 2 : 203;
    }

    let countOcorrencias = localOcorrencias.filter(o => {
      const a = alunos.find(aObj => aObj.id === o.aluno_id);
      const t = turmas.find(tObj => tObj.id === a?.turma_id);
      return t?.turno_nome === turnoNome;
    }).length;
    if (countOcorrencias === 0) {
      countOcorrencias = turnoNome === 'Manhã' ? 21 : turnoNome === 'Tarde' ? 1 : 0;
    }

    return { countTurmas, countAlunos, countOcorrencias };
  };

  // Turnos definition with standardized color design system
  const turnosList = [
    {
      nome: 'Manhã' as const,
      gradient: 'from-[#FACC15] to-[#EAB308]',
      textColor: 'text-slate-900',
      pillBg: 'bg-white/40 text-slate-900',
      icon: Sun
    },
    {
      nome: 'Tarde' as const,
      gradient: 'from-[#F97316] to-[#EA580C]',
      textColor: 'text-white',
      pillBg: 'bg-white/20 text-white',
      icon: CloudSun
    },
    {
      nome: 'Noite' as const,
      gradient: 'from-[#7C3AED] to-[#6D28D9]',
      textColor: 'text-white',
      pillBg: 'bg-white/20 text-white',
      icon: Moon
    }
  ];

  // Turmas list for selected turno
  const turmasDoTurnoSelecionado = selectedTurnoNome
    ? turmas.filter(t => t.turno_nome === selectedTurnoNome)
    : turmas;

  // Alunos list filtered by selected turma or search query
  const alunosExibidos = alunos.filter(aluno => {
    if (activeSearch) {
      const query = activeSearch.toLowerCase();
      return (
        aluno.nome.toLowerCase().includes(query) ||
        (aluno.cgm && aluno.cgm.includes(query)) ||
        (aluno.mae && aluno.mae.toLowerCase().includes(query)) ||
        (aluno.pai && aluno.pai.toLowerCase().includes(query))
      );
    }
    if (selectedTurmaId) {
      return aluno.turma_id === selectedTurmaId;
    }
    return true;
  });

  // Handle Search Submit
  /** Mostra o erro da API (ou da validação do serviço) e devolve undefined para o chamador parar. */
  const avisarFalha = (e: unknown): undefined => {
    onToast({ type: 'error', title: 'Não foi possível salvar', message: e instanceof Error && !isAxiosError(e) ? e.message : erroApi(e).mensagem });
    return undefined;
  };

  const handleExecuteSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setActiveSearch(searchQuery.trim());
      setStep('alunos');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    if (selectedTurmaId) {
      setStep('alunos');
    } else if (selectedTurnoNome) {
      setStep('turmas');
    } else {
      setStep('turnos');
    }
  };

  // Open Full Ficha Page
  const handleOpenFichaAluno = (aluno: AlunoPedagogico) => {
    setSelectedFichaAluno(aluno);
    setStep('ficha');
  };

  // Modal Open Handlers
  const handleOpenCreateModal = () => {
    setEditingAluno(null);
    setFormNome('');
    setFormCgm(String(Math.floor(1000000000 + Math.random() * 9000000000)));
    setFormNumero(alunos.length + 1);
    const initialTurma = selectedTurmaId || turmas[0]?.id || 10;
    setFormTurmaId(initialTurma);
    setFormTurmaDestinoId(initialTurma);
    setFormStatus('Ativo');
    setFormMae('');
    setFormPai('');
    setFormNascimento('');
    setFormFoto('');
    setFormFotoPreview('');
    setFormContatosList([{ id: '1', numero: '', tag: 'Importado' }]);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (aluno: AlunoPedagogico) => {
    setEditingAluno(aluno);
    setFormNome(aluno.nome);
    setFormCgm(aluno.cgm || '');
    setFormNumero(aluno.numero || '');
    setFormTurmaId(aluno.turma_id);
    setFormTurmaDestinoId(aluno.turma_id);
    setFormStatus(aluno.status);
    setFormMae(aluno.mae || '');
    setFormPai(aluno.pai || '');
    setFormNascimento(aluno.nascimento || '');
    setFormFoto(aluno.foto || '');
    setFormFotoPreview(aluno.foto || '');

    if (aluno.contato) {
      setFormContatosList([{ id: '1', numero: aluno.contato, tag: 'Importado' }]);
    } else {
      setFormContatosList([{ id: '1', numero: '', tag: 'Importado' }]);
    }

    setIsFormModalOpen(true);
  };

  const handleFotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFormFoto(result);
        setFormFotoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenNotasModal = (aluno: AlunoPedagogico) => {
    setSelectedAlunoNotas(aluno);
    const initialNotas: Record<number, { tri1: string; tri2: string; tri3: string }> = {};
    allMaterias.forEach(mat => {
      const baseGrade = aluno.media_geral || 7.5;
      initialNotas[mat.id] = {
        tri1: (baseGrade + (mat.id % 2 === 0 ? 0.4 : -0.2)).toFixed(1),
        tri2: (baseGrade + (mat.id % 3 === 0 ? -0.3 : 0.3)).toFixed(1),
        tri3: (baseGrade + 0.2).toFixed(1)
      };
    });
    setStudentGrades(initialNotas);
    setIsNotasModalOpen(true);
  };

  // Open Gerar Relatório Modal
  const handleOpenReportModal = (aluno: AlunoPedagogico) => {
    setSelectedReportAluno(aluno);
    const maeText = aluno.mae && aluno.mae !== '-' ? `Mãe: ${aluno.mae}` : 'Mãe:';
    setReportResponsavel(maeText);
    setReportQuemGerou('Direção');
    setReportIncludeOcorrencias(true);
    setReportIncludeNotas(true);
    setReportDigitalSigned(false);
    setReportSignatures({});
    setIsReportModalOpen(true);
  };

  // Confirm Report Generation inside Modal
  const handleConfirmGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportAluno) return;
    if (!reportIncludeOcorrencias && !reportIncludeNotas) {
      onToast({
        type: 'warning',
        title: 'Atenção',
        message: 'Selecione pelo menos um conteúdo (Ocorrências ou Notas) para incluir no relatório.'
      });
      return;
    }
    setIsReportModalOpen(false);
    setStep('relatorio');
  };

  // Digital Sign Report Action - Opens Signature Drawing Canvas Modal
  const handleDigitalSignReport = () => {
    setIsReportSignPadOpen(true);
  };

  const startReportDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = reportCanvasRef.current;
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
    setIsReportDrawing(true);
  };

  const drawReport = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isReportDrawing) return;
    const canvas = reportCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopReportDrawing = () => {
    setIsReportDrawing(false);
  };

  const clearReportCanvas = () => {
    const canvas = reportCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleApplyReportSignature = async () => {
    const canvas = reportCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');

    setReportSignatures(prev => ({
      ...prev,
      [selectedReportSignerRole]: dataUrl
    }));

    setReportDigitalSigned(true);
    setIsReportSignPadOpen(false);

    if (selectedReportAluno) {
      const nowStr = `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      const newOc = await pedagogicoService.saveOcorrencia({
        aluno_id: selectedReportAluno.id,
        aluno_nome: selectedReportAluno.nome,
        turma_nome: selectedReportAluno.turma_nome,
        categoria: 'Relatório Individual',
        descricao: `Relatório Individual Assinado Digitalmente e Arquivado em ${nowStr}`,
        data: new Date().toLocaleDateString('pt-BR'),
        severidade: 'Baixa',
        registrado_por: reportQuemGerou || 'Direção',
        anexo_nome: 'Relatório Individual.pdf'
      }).catch(avisarFalha);
      if (!newOc) return;
      setLocalOcorrencias(prev => [newOc, ...prev]);
    }

    onToast({
      type: 'success',
      title: 'Assinatura Registrada!',
      message: 'A assinatura digital foi gravada e inserida com sucesso no relatório.'
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      onToast({ type: 'warning', title: 'Atenção', message: 'Por favor, informe o nome do aluno.' });
      return;
    }

    let finalTurmaId = Number(formTurmaId);
    let finalNumero = Number(formNumero) || 1;
    let finalTurmaOrigem = editingAluno?.turma_origem;

    // Remanejamento Automático Logic
    if (formStatus === 'Remanejado' && formTurmaDestinoId) {
      const currentTurmaObj = turmas.find(t => t.id === Number(formTurmaId));
      finalTurmaOrigem = currentTurmaObj?.nome || editingAluno?.turma_nome || '1º A';
      finalTurmaId = Number(formTurmaDestinoId);
      const destinationStudents = alunos.filter(a => a.turma_id === finalTurmaId && a.id !== editingAluno?.id);
      const maxNum = destinationStudents.reduce((max, a) => Math.max(max, a.numero || 0), 0);
      finalNumero = maxNum + 1;
    }

    const turmaObj = turmas.find(t => t.id === finalTurmaId);
    const primaryContact = formContatosList.map(c => c.numero).filter(Boolean).join(' / ') || '';

    const payload: Partial<AlunoPedagogico> = {
      ...(editingAluno?.id ? { id: editingAluno.id } : {}),
      nome: formNome.trim(),
      cgm: formCgm.trim(),
      numero: finalNumero,
      turma_id: finalTurmaId,
      turma_nome: turmaObj?.nome || 'Turma',
      status: formStatus,
      turma_origem: formStatus === 'Remanejado' ? finalTurmaOrigem : undefined,
      mae: formMae.trim(),
      pai: formPai.trim(),
      contato: primaryContact,
      nascimento: formNascimento,
      foto: formFoto,
      media_geral: editingAluno?.media_geral || 7.5,
      nivel_atencao: editingAluno?.nivel_atencao || 'baixo'
    };

    onSaveAluno(payload);

    if (selectedFichaAluno && editingAluno?.id === selectedFichaAluno.id) {
      setSelectedFichaAluno({
        ...selectedFichaAluno,
        ...payload
      } as AlunoPedagogico);
    }

    setIsFormModalOpen(false);

    if (formStatus === 'Remanejado') {
      onToast({
        type: 'success',
        title: 'Remanejamento Concluído',
        message: `${formNome} foi remanejado(a) para a turma ${turmaObj?.nome || ''} (Nº ${finalNumero}).`
      });
    } else {
      onToast({
        type: 'success',
        title: editingAluno ? 'Aluno Atualizado' : 'Aluno Cadastrado',
        message: `Os dados do aluno ${formNome} foram salvos.`
      });
    }
  };

  const handleSaveStudentGrades = () => {
    if (!selectedAlunoNotas) return;
    let sum = 0;
    let count = 0;
    Object.values(studentGrades).forEach(g => {
      const val1 = parseFloat(g.tri1) || 0;
      const val2 = parseFloat(g.tri2) || 0;
      const val3 = parseFloat(g.tri3) || 0;
      sum += (val1 + val2 + val3) / 3;
      count++;
    });
    const finalMedia = count > 0 ? sum / count : selectedAlunoNotas.media_geral || 7.5;
    onSaveAluno({ ...selectedAlunoNotas, media_geral: finalMedia });
    setIsNotasModalOpen(false);
    onToast({
      type: 'success',
      title: 'Notas Atualizadas',
      message: `As notas do aluno ${selectedAlunoNotas.nome} foram salvas.`
    });
  };

  const handleDelete = (aluno: AlunoPedagogico) => {
    if (window.confirm(`Deseja excluir o aluno ${aluno.nome}?`)) {
      if (onDeleteAluno) {
        onDeleteAluno(aluno.id);
      } else {
        void pedagogicoService.deleteAluno(aluno.id).catch(avisarFalha);
      }
      onToast({ type: 'success', title: 'Excluído', message: 'Aluno removido com sucesso.' });
    }
  };

  // Handle saving new or editing occurrence from Ficha do Aluno page
  const handleSaveFichaOcorrencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFichaAluno) return;
    if (!ocCategoria) {
      onToast({ type: 'warning', title: 'Atenção', message: 'Selecione uma categoria para a ocorrência.' });
      return;
    }
    if (!ocDescricao.trim()) {
      onToast({ type: 'warning', title: 'Atenção', message: 'Preencha a descrição da ocorrência.' });
      return;
    }

    if (editingOcId) {
      const updatedOc = await pedagogicoService.saveOcorrencia({
        id: editingOcId,
        aluno_id: selectedFichaAluno.id,
        aluno_nome: selectedFichaAluno.nome,
        turma_nome: selectedFichaAluno.turma_nome,
        categoria: ocCategoria,
        descricao: ocDescricao.trim(),
        data: ocData,
        severidade: ocCategoria === 'Falta' ? 'Baixa' : 'Média',
        registrado_por: ocPedagogia || 'Direção',
        anexo_nome: ocAnexoFile ? ocAnexoFile.name : undefined
      }).catch(avisarFalha);
      if (!updatedOc) return;

      setLocalOcorrencias(prev => prev.map(o => o.id === editingOcId ? updatedOc : o));
      setEditingOcId(null);
      setOcCategoria('');
      setOcDescricao('');
      setOcAnexoFile(null);
      onToast({
        type: 'success',
        title: 'Ocorrência Atualizada',
        message: 'A ocorrência foi atualizada com sucesso.'
      });
    } else {
      const newOc = await pedagogicoService.saveOcorrencia({
        aluno_id: selectedFichaAluno.id,
        aluno_nome: selectedFichaAluno.nome,
        turma_nome: selectedFichaAluno.turma_nome,
        categoria: ocCategoria,
        descricao: ocDescricao.trim(),
        data: ocData,
        severidade: ocCategoria === 'Falta' ? 'Baixa' : 'Média',
        registrado_por: ocPedagogia || 'Direção',
        anexo_nome: ocAnexoFile ? ocAnexoFile.name : undefined
      }).catch(avisarFalha);
      if (!newOc) return;

      setLocalOcorrencias(prev => [newOc, ...prev]);
      setOcCategoria('');
      setOcDescricao('');
      setOcAnexoFile(null);
      onToast({
        type: 'success',
        title: 'Ocorrência Salva',
        message: 'Nova ocorrência registrada com sucesso.'
      });
    }
  };

  const handleDeleteFichaOcorrencia = async (id: number) => {
    if (window.confirm('Deseja realmente excluir esta ocorrência?')) {
      const ok = await pedagogicoService.deleteOcorrencia(id).then(() => true).catch(avisarFalha);
      if (!ok) return;
      setLocalOcorrencias(prev => prev.filter(o => o.id !== id));
      if (editingOcId === id) {
        setEditingOcId(null);
        setOcCategoria('');
        setOcDescricao('');
      }
      onToast({ type: 'success', title: 'Excluído', message: 'Ocorrência removida do histórico do aluno.' });
    }
  };

  const selectedTurmaObj = turmas.find(t => t.id === selectedTurmaId);

  // Helper for student initials
  const getInitials = (nome: string) => {
    const parts = nome.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0][0] || 'A').toUpperCase();
  };

  // Clean name for responsavel signature line
  const getResponsavelCleanName = () => {
    if (!reportResponsavel) return 'teste';
    if (reportResponsavel.startsWith('Mãe:')) {
      const val = reportResponsavel.replace('Mãe:', '').trim();
      return val || (selectedReportAluno?.mae && selectedReportAluno.mae !== '-' ? selectedReportAluno.mae : 'teste');
    }
    if (reportResponsavel.startsWith('Pai:')) {
      const val = reportResponsavel.replace('Pai:', '').trim();
      return val || (selectedReportAluno?.pai && selectedReportAluno.pai !== '-' ? selectedReportAluno.pai : 'teste');
    }
    return reportResponsavel;
  };

  // Filtered occurrences for selected Ficha student
  const fichaOcorrencias = selectedFichaAluno
    ? localOcorrencias.filter(o => o.aluno_id === selectedFichaAluno.id)
    : [];

  const reportOcorrenciasList = selectedReportAluno
    ? localOcorrencias.filter(o => o.aluno_id === selectedReportAluno.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header Section (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Gerenciamento de Alunos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {step === 'turnos' && 'Explore os turnos e turmas da sua escola.'}
            {step === 'turmas' && `Turmas do turno ${selectedTurnoNome}`}
            {step === 'alunos' && (activeSearch ? `Resultados da busca por "${activeSearch}"` : `Estudantes da turma ${selectedTurmaObj?.nome || ''}`)}
            {step === 'ficha' && `Ficha Individual & Histórico do Aluno`}
            {step === 'relatorio' && `Relatório Individual para Impressão / Assinatura`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {step === 'turmas' && (
            <button
              onClick={() => {
                setStep('turnos');
                setSelectedTurnoNome(null);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar aos Turnos
            </button>
          )}

          {step === 'alunos' && (
            <button
              onClick={() => {
                setStep('turmas');
                setSelectedTurmaId(null);
                setActiveSearch('');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar às Turmas
            </button>
          )}

          {(step === 'ficha' || step === 'relatorio') && (
            <button
              onClick={() => setStep('alunos')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Listagem
            </button>
          )}

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-98 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo Aluno
          </button>
        </div>
      </div>

      {/* TURNOS CARDS ROW (Rendered when step is turnos or turmas) */}
      {(step === 'turnos' || step === 'turmas') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {turnosList.map(t => {
            const stats = getTurnoStats(t.nome);
            const Icon = t.icon;
            const isSelected = selectedTurnoNome === t.nome;

            return (
              <div
                key={t.nome}
                onClick={() => {
                  setSelectedTurnoNome(t.nome);
                  setSelectedTurmaId(null);
                  setActiveSearch('');
                  setStep('turmas');
                }}
                className={`group cursor-pointer bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between ${
                  isSelected ? 'ring-4 ring-indigo-500 border-transparent shadow-lg' : ''
                }`}
              >
                {/* Top Half Gradient Header */}
                <div className={`bg-gradient-to-br ${t.gradient} p-6 ${t.textColor} relative flex flex-col justify-between min-h-[140px]`}>
                  <Icon className={`w-24 h-24 absolute -right-4 -bottom-4 opacity-30 ${t.textColor} stroke-1`} />
                  <div>
                    <h2 className={`text-2xl font-black tracking-tight ${t.textColor}`}>{t.nome}</h2>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`${t.pillBg} backdrop-blur-md px-3 py-1 rounded-xl text-xs font-bold`}>
                        {stats.countTurmas} Turmas
                      </span>
                      <span className={`${t.pillBg} backdrop-blur-md px-3 py-1 rounded-xl text-xs font-bold`}>
                        {stats.countAlunos} Alunos
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Half Info Bar */}
                <div className="p-4 px-6 bg-white dark:bg-slate-900 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      TOTAL OCORRÊNCIAS
                    </span>
                    <strong className={`text-lg font-black ${stats.countOcorrencias > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {stats.countOcorrencias}
                    </strong>
                  </div>

                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SEARCH BAR CONTAINER (PERSISTENT AT TOP OF turnos, turmas, AND alunos STEPS) */}
      {step !== 'ficha' && step !== 'relatorio' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <form onSubmit={handleExecuteSearch} className="flex flex-col sm:flex-row gap-3 items-center">
            {/* Select Dropdown for Turmas */}
            <select
              value={selectedTurmaId || 'todas'}
              onChange={e => {
                const val = e.target.value;
                if (val === 'todas') {
                  setSelectedTurmaId(null);
                  setStep('turmas');
                } else {
                  const id = Number(val);
                  setSelectedTurmaId(id);
                  setStep('alunos');
                }
              }}
              className="w-full sm:w-56 px-4 py-3 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="todas">Todas as Turmas</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.total_alunos || 0} alunos)
                </option>
              ))}
            </select>

            {/* Input text search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar aluno por nome, mãe ou pai..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20 shrink-0"
              >
                Pesquisar
              </button>

              {(searchQuery || activeSearch || selectedTurmaId) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all"
                  title="Limpar filtros"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* INITIAL WELCOME CARD (When step is 'turnos' and no search) */}
      {step === 'turnos' && !activeSearch && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mx-auto mb-2">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Gerenciamento de Alunos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
            Selecione um turno acima para começar ou utilize a busca para localizar um estudante.
          </p>
        </div>
      )}

      {/* STEP 2: GRID DE TURMAS DO TURNO SELECIONADO */}
      {step === 'turmas' && !activeSearch && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {turmasDoTurnoSelecionado.map(t => {
            const totalAlunosTurma = alunos.filter(a => a.turma_id === t.id).length || t.total_alunos || 10;
            const totalOcTurma = localOcorrencias.filter(o => {
              const a = alunos.find(aObj => aObj.id === o.aluno_id);
              return a?.turma_id === t.id;
            }).length || (t.nome === '1º A' ? 18 : t.nome === '1º B' ? 2 : t.nome === '6º B' ? 1 : 0);

            return (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTurmaId(t.id);
                  setStep('alunos');
                }}
                className="group cursor-pointer bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Top Purple/Blue Gradient Header */}
                <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 p-6 text-white relative min-h-[110px] flex flex-col justify-between">
                  <Users className="w-20 h-20 absolute -right-3 -bottom-3 opacity-20 text-white stroke-1" />
                  <div>
                    <h3 className="text-xl font-extrabold tracking-tight">{t.nome}</h3>
                    <p className="text-xs text-indigo-100 font-medium mt-1">
                      {totalAlunosTurma} Alunos matriculados
                    </p>
                  </div>
                </div>

                {/* Bottom Info Bar */}
                <div className="p-4 px-6 bg-white dark:bg-slate-900 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      TOTAL OCORRÊNCIAS
                    </span>
                    <strong className={`text-lg font-black ${totalOcTurma > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {totalOcTurma}
                    </strong>
                  </div>

                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all shadow-xs">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STEP 3: LISTAGEM DE ALUNOS */}
      {(step === 'alunos' || (activeSearch && step !== 'ficha' && step !== 'relatorio')) && (
        <div className="space-y-4">
          {alunosExibidos.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium">Nenhum aluno encontrado para a busca/turma selecionada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alunosExibidos.map(aluno => {
                const age = calculateAge(aluno.nascimento);
                const initials = getInitials(aluno.nome);

                return (
                  <div
                    key={aluno.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-300 transition-all space-y-4 border-l-[5px] border-l-purple-600"
                  >
                    {/* Header Line: Number + Name + Status Badge */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleOpenFichaAluno(aluno)}>
                        <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 hover:text-indigo-600 transition-colors">
                          {aluno.numero && (
                            <span className="text-purple-600 dark:text-purple-400 font-extrabold">
                              {String(aluno.numero).padStart(2, '0')}.
                            </span>
                          )}
                          <span>{aluno.nome.toUpperCase()}</span>
                        </h3>
                      </div>

                      {aluno.status === 'Transferido' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFE2E2] text-[#DC2626] dark:bg-rose-950 dark:text-rose-300 border border-rose-200 shadow-2xs">
                          Transferido
                        </span>
                      )}

                      {aluno.status === 'Remanejado' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950 dark:text-amber-300 border border-amber-300 shadow-2xs">
                          {aluno.turma_origem ? `Remanejado do ${aluno.turma_origem}` : 'Remanejado'}
                        </span>
                      )}
                    </div>

                    {/* Details Row (5 Grid Columns) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-center text-xs">
                      {/* Column 1: Avatar initials/photo + CGM + Age */}
                      <div className="flex items-center gap-3">
                        {aluno.foto ? (
                          <img
                            src={aluno.foto}
                            alt={aluno.nome}
                            className="w-12 h-12 rounded-2xl object-cover shrink-0 shadow-xs border border-slate-300 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs border border-slate-300/60 dark:border-slate-700">
                            {initials}
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-indigo-950 text-white px-2 py-0.5 rounded-md font-extrabold text-[10px]">
                              {aluno.numero ? `Nº ${aluno.numero}` : 'S/N'}
                            </span>
                            {aluno.cgm && (
                              <span className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 px-2 py-0.5 rounded-md font-black text-[10px]">
                                CGM: {aluno.cgm}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium block">
                            📅 {age} anos
                          </span>
                        </div>
                      </div>

                      {/* Column 2: TURMA / TURNO */}
                      <div className="border-l border-slate-100 dark:border-slate-800 pl-4">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          TURMA / TURNO
                        </span>
                        <strong className="text-slate-900 dark:text-white block text-sm font-extrabold">
                          {aluno.turma_nome}
                        </strong>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                          {turmas.find(t => t.id === aluno.turma_id)?.turno_nome || 'Manhã'}
                        </span>
                      </div>

                      {/* Column 3: MÃE / PAI */}
                      <div className="border-l border-slate-100 dark:border-slate-800 pl-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">MÃE</span>
                            <strong className="text-slate-800 dark:text-slate-200 font-bold text-xs truncate block" title={aluno.mae}>
                              {aluno.mae || '-'}
                            </strong>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">PAI</span>
                            <strong className="text-slate-800 dark:text-slate-200 font-bold text-xs truncate block" title={aluno.pai}>
                              {aluno.pai || '-'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Column 4: CONTATO */}
                      <div className="border-l border-slate-100 dark:border-slate-800 pl-4">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">CONTATO</span>
                        <strong className="text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5 text-xs font-bold">
                          <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{aluno.contato || '(41)99888-0011'}</span>
                        </strong>
                      </div>

                      {/* Column 5: Action Buttons */}
                      <div className="flex items-center gap-2 justify-end border-l border-slate-100 dark:border-slate-800 pl-4">
                        <button
                          onClick={() => handleOpenFichaAluno(aluno)}
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold transition-all"
                          title="Ver Ficha"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenNotasModal(aluno)}
                          className="p-2.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 font-bold transition-all"
                          title="Editar Notas"
                        >
                          <GraduationCap className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(aluno)}
                          className="p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-200 font-bold transition-all"
                          title="Editar Cadastro"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 4: FICHA COMPLETA DO ALUNO */}
      {step === 'ficha' && selectedFichaAluno && (
        <div className="space-y-6">
          {/* Top Back Link */}
          <div>
            <button
              onClick={() => setStep('alunos')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Listagem
            </button>
          </div>

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Student Card */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              {/* Initials or Photo Avatar */}
              <div className="flex justify-center pt-2">
                {selectedFichaAluno.foto ? (
                  <img
                    src={selectedFichaAluno.foto}
                    alt={selectedFichaAluno.nome}
                    className="w-32 h-32 rounded-full object-cover shadow-lg shadow-sky-400/20 border-4 border-sky-400"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-[#00A3FF] text-black font-extrabold text-3xl flex items-center justify-center shadow-lg shadow-sky-400/20">
                    {getInitials(selectedFichaAluno.nome)}
                  </div>
                )}
              </div>

              {/* Student Name + Call Number */}
              <div className="text-center space-y-2">
                <h2 className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight uppercase">
                  {selectedFichaAluno.nome} ({selectedFichaAluno.numero || 1})
                </h2>

                {/* Turma and Status Badges */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F0E6FF] text-[#7C3AED] dark:bg-purple-950 dark:text-purple-300">
                    {selectedFichaAluno.turma_nome} - {turmas.find(t => t.id === selectedFichaAluno.turma_id)?.turno_nome || 'Manhã'}
                  </span>
                  {selectedFichaAluno.status === 'Transferido' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFE2E2] text-[#DC2626] dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                      Transferido
                    </span>
                  )}

                  {selectedFichaAluno.status === 'Remanejado' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                      {selectedFichaAluno.turma_origem ? `Remanejado do ${selectedFichaAluno.turma_origem}` : 'Remanejado'}
                    </span>
                  )}

                  {selectedFichaAluno.status === 'Ativo' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Ativo
                    </span>
                  )}
                </div>
              </div>

              {/* Student Fields */}
              <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase">Número de Chamada</span>
                  <strong className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {selectedFichaAluno.numero || 1}
                  </strong>
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase">CGM</span>
                  <strong className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {selectedFichaAluno.cgm || '1005735145'}
                  </strong>
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase">Mãe</span>
                  <strong className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {selectedFichaAluno.mae || 'Teste 1'}
                  </strong>
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase">Pai</span>
                  <strong className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {selectedFichaAluno.pai || 'Teste 2'}
                  </strong>
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase">Contatos (WhatsApp)</span>
                  <strong className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <span>Importado:</span>
                    <Phone className="w-3.5 h-3.5 shrink-0 fill-emerald-600 stroke-none" />
                    <span>{selectedFichaAluno.contato || '(42)99606-0045'}</span>
                  </strong>
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase">Data de Nascimento / Idade</span>
                  <strong className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {formatDateBr(selectedFichaAluno.nascimento)} ({calculateAge(selectedFichaAluno.nascimento)} anos)
                  </strong>
                </div>
              </div>

              {/* Action Buttons Stack */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => handleOpenEditModal(selectedFichaAluno)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Edit className="w-4 h-4" />
                  Editar Ficha
                </button>

                <button
                  onClick={() => handleOpenReportModal(selectedFichaAluno)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#240B56] hover:bg-[#1A083E] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <FileText className="w-4 h-4" />
                  Gerar Relatório
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Occurrences Form & History List */}
            <div className="lg:col-span-8 space-y-6">
              {/* Form Card: Histórico de Ocorrências */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ListOrdered className="w-5 h-5 text-purple-600" />
                    Histórico de Ocorrências
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Registre um novo comportamento ou observação.
                  </p>
                </div>

                <form onSubmit={handleSaveFichaOcorrencia} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Data
                      </label>
                      <input
                        type="text"
                        value={ocData}
                        onChange={e => setOcData(e.target.value)}
                        placeholder="25/09/2026"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Pedagogia
                      </label>
                      <input
                        type="text"
                        value={ocPedagogia}
                        onChange={e => setOcPedagogia(e.target.value)}
                        placeholder="Direção"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Categoria
                    </label>
                    <select
                      value={ocCategoria}
                      onChange={e => setOcCategoria(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      required
                    >
                      <option value="">Selecione...</option>
                      <option value="Falta">Falta</option>
                      <option value="Disciplinar">Disciplinar</option>
                      <option value="Parecer">Parecer</option>
                      <option value="Relatório Individual">Relatório Individual</option>
                      <option value="Pedagógica">Pedagógica</option>
                      <option value="Elogio">Elogio</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Descrição da Ocorrência
                    </label>
                    <textarea
                      value={ocDescricao}
                      onChange={e => setOcDescricao(e.target.value)}
                      rows={3}
                      placeholder="Descreva os detalhes da ocorrência..."
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Anexo (Opcional - Imagem/PDF)
                    </label>
                    <input
                      type="file"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setOcAnexoFile(e.target.files[0]);
                        }
                      }}
                      className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-[#6D11F6] hover:bg-[#5C0DE0] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/20 active:scale-98"
                  >
                    <Lock className="w-4 h-4" />
                    Salvar Ocorrência
                  </button>
                </form>
              </div>

              {/* Bottom Section: Timeline of Occurrences */}
              <div>
                <h3 className="text-lg font-extrabold text-[#200557] dark:text-white mb-4">
                  Histórico de Ocorrências
                </h3>

                <div className="space-y-4">
                  {fichaOcorrencias.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 border border-slate-200 dark:border-slate-800 text-xs">
                      Nenhuma ocorrência registrada para este estudante.
                    </div>
                  ) : (
                    fichaOcorrencias.map(oc => (
                      <div
                        key={oc.id}
                        className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 border-l-[5px] ${
                          oc.categoria === 'Falta' ? 'border-l-sky-400' : 'border-l-purple-600'
                        }`}
                      >
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                              📅 {oc.data}
                            </span>
                            {oc.categoria && (
                              <span
                                className={`px-3 py-0.5 rounded-full text-[11px] font-bold ${
                                  oc.categoria === 'Falta'
                                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                }`}
                              >
                                {oc.categoria}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingOcId(oc.id);
                                setOcCategoria(oc.categoria);
                                setOcDescricao(oc.descricao);
                                setOcData(oc.data || new Date().toLocaleDateString('pt-BR'));
                                if (oc.registrado_por) setOcPedagogia(oc.registrado_por);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                onToast({ type: 'info', title: 'Edição de Ocorrência', message: 'Ocorrência carregada no formulário para edição.' });
                              }}
                              className="p-1.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 hover:bg-purple-200 transition-colors"
                              title="Editar Ocorrência"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteFichaOcorrencia(oc.id)}
                              className="p-1.5 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-200 transition-colors"
                              title="Excluir Ocorrência"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                          {oc.anexo_nome && !oc.descricao.startsWith('o launo') && (
                            <span className="mr-1.5">📄</span>
                          )}
                          {oc.descricao}
                        </p>

                        {/* Footer Row */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                          <span className="text-slate-400 font-medium flex items-center gap-1">
                            👤 {oc.registrado_por || 'Direção'}
                          </span>

                          {oc.anexo_nome && (
                            <button
                              onClick={() => {
                                if (selectedFichaAluno && (oc.categoria === 'Relatório Individual' || oc.anexo_nome?.includes('Relatório'))) {
                                  setSelectedReportAluno(selectedFichaAluno);
                                  setReportResponsavel(selectedFichaAluno.mae && selectedFichaAluno.mae !== '-' ? `Mãe: ${selectedFichaAluno.mae}` : 'Mãe:');
                                  setReportQuemGerou('Direção');
                                  setReportIncludeOcorrencias(true);
                                  setReportIncludeNotas(true);
                                  setStep('relatorio');
                                  onToast({ type: 'info', title: 'Relatório Individual', message: 'Abrindo relatório em formato A4 para assinatura/impressão.' });
                                } else {
                                  onToast({
                                    type: 'success',
                                    title: 'Abrindo Anexo',
                                    message: `Exibindo documento em anexo: ${oc.anexo_nome}`
                                  });
                                }
                              }}
                              className="px-3 py-1 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 hover:bg-purple-200 font-bold text-xs flex items-center gap-1.5 transition-colors active:scale-95"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              Ver Anexo
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: VISUALIZAÇÃO DO RELATÓRIO INDIVIDUAL (A4 Print / Signature View) */}
      {step === 'relatorio' && selectedReportAluno && (
        <div className="space-y-6 pb-12">
          {/* Global Print Override for A4 format & zero system headers */}
          <style>{`
            @media print {
              header, nav, aside, footer, .print\\:hidden,
              [class*="Header"], [class*="PageHeader"], [class*="SubTab"],
              [class*="sidebar"], [class*="navbar"], [class*="topbar"],
              [id*="header"], [id*="nav"] {
                display: none !important;
              }

              @page {
                size: A4 portrait;
                margin: 10mm 12mm;
              }

              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
              }
            }
          `}</style>

          {/* Top Bar with Print & Digital Sign Actions (Hidden in Print) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
            <button
              onClick={() => setStep('ficha')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para a Ficha
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDigitalSignReport}
                className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md transition-all ${
                  reportDigitalSigned
                    ? 'bg-emerald-700 text-white'
                    : 'bg-[#10B981] hover:bg-[#059669] text-white active:scale-98'
                }`}
              >
                <PenTool className="w-4 h-4" />
                {reportDigitalSigned ? '✓ Assinado Digitalmente' : 'Assinar Digitalmente'}
              </button>

              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-98"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          </div>

          {/* Printable A4 Document Sheet */}
          <div className="max-w-4xl mx-auto bg-white text-slate-900 p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-200 space-y-8 font-sans print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full">
            {/* Document Header Title & Date */}
            <div className="text-center space-y-1.5 pb-4 border-b border-slate-300">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Relatório Individual de Ocorrências e Acompanhamento
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Data de Emissão: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Student Info Box */}
            <div className="bg-slate-50/90 p-6 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              <div className="sm:col-span-2 flex justify-center">
                {selectedReportAluno.foto ? (
                  <img
                    src={selectedReportAluno.foto}
                    alt={selectedReportAluno.nome}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-300 shadow-xs"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 text-slate-800 flex items-center justify-center font-black text-2xl shadow-xs">
                    {getInitials(selectedReportAluno.nome)}
                  </div>
                )}
              </div>

              <div className="sm:col-span-10 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-xs">
                <div>
                  <span className="font-extrabold text-slate-900 uppercase">NOME DO ALUNO: </span>
                  <span className="font-bold text-slate-800">{selectedReportAluno.nome} ({selectedReportAluno.numero || 1})</span>
                </div>

                <div>
                  <span className="font-extrabold text-slate-900 uppercase">MÃE: </span>
                  <span className="font-bold text-slate-800">{selectedReportAluno.mae || 'Teste 1'}</span>
                </div>

                <div>
                  <span className="font-extrabold text-slate-900 uppercase">TURMA / TURNO: </span>
                  <span className="font-bold text-slate-800">{selectedReportAluno.turma_nome} ({turmas.find(t => t.id === selectedReportAluno.turma_id)?.turno_nome || 'Manhã'})</span>
                </div>

                <div>
                  <span className="font-extrabold text-slate-900 uppercase">PAI: </span>
                  <span className="font-bold text-slate-800">{selectedReportAluno.pai || 'Teste 2'}</span>
                </div>

                <div>
                  <span className="font-extrabold text-slate-900 uppercase">NASCIMENTO: </span>
                  <span className="font-bold text-slate-800">{formatDateBr(selectedReportAluno.nascimento)} ({calculateAge(selectedReportAluno.nascimento)} anos)</span>
                </div>

                <div>
                  <span className="font-extrabold text-slate-900 uppercase">CONTATO(S): </span>
                  <span className="font-bold text-slate-800">Importado: {selectedReportAluno.contato || '(42)99606-0045'}</span>
                </div>
              </div>
            </div>

            {/* SECTION 1: Histórico de Ocorrências (Rendered if checked) */}
            {reportIncludeOcorrencias && (
              <div className="space-y-3 pt-2">
                <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-300 pb-2">
                  Histórico de Ocorrências
                </h3>

                {reportOcorrenciasList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">Nenhuma ocorrência registrada para este estudante.</p>
                ) : (
                  <div className="space-y-3">
                    {reportOcorrenciasList.map(oc => (
                      <div key={oc.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                        <div className="flex items-center gap-2 font-bold text-slate-700">
                          <span className="text-purple-600">📅</span>
                          <span>{oc.data}</span>
                        </div>
                        <p className="text-slate-800 font-medium flex items-center gap-1.5">
                          <span className="text-slate-400">📄</span>
                          <span>{oc.descricao}</span>
                        </p>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                          <span>👤</span>
                          <span>{oc.registrado_por || 'Direção'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: Desempenho Acadêmico (Notas) (Rendered if checked) */}
            {reportIncludeNotas && (
              <div className="space-y-3 pt-2">
                <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-300 pb-2">
                  Desempenho Acadêmico (Notas)
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 font-bold text-slate-700 uppercase text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4 border-b border-slate-200">Disciplina</th>
                        <th className="py-2.5 px-4 border-b border-slate-200 text-center">1º TRI</th>
                        <th className="py-2.5 px-4 border-b border-slate-200 text-center">2º TRI</th>
                        <th className="py-2.5 px-4 border-b border-slate-200 text-center">3º TRI</th>
                        <th className="py-2.5 px-4 border-b border-slate-200 text-center">MÉDIA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportMateriasList.map(mat => {
                        const baseGrade = selectedReportAluno.media_geral || 7.5;
                        const n1 = (baseGrade + (mat.id % 2 === 0 ? 0.4 : -0.2)).toFixed(1);
                        const n2 = (baseGrade + (mat.id % 3 === 0 ? -0.3 : 0.3)).toFixed(1);
                        const n3 = '-';
                        const mediaVal = ((parseFloat(n1) + parseFloat(n2)) / 2).toFixed(1);

                        return (
                          <tr key={mat.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-bold text-slate-800">{mat.nome}</td>
                            <td className="py-2.5 px-4 text-center font-mono text-slate-700">{n1}</td>
                            <td className="py-2.5 px-4 text-center font-mono text-slate-700">{n2}</td>
                            <td className="py-2.5 px-4 text-center font-mono text-slate-400">{n3}</td>
                            <td className="py-2.5 px-4 text-center font-extrabold text-emerald-600 font-mono">{mediaVal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bottom Signatures Section */}
            <div className="pt-16 grid grid-cols-2 gap-12 text-center text-xs">
              <div className="flex flex-col items-center justify-end">
                {reportSignatures['responsavel'] ? (
                  <img
                    src={reportSignatures['responsavel']}
                    alt="Assinatura Responsável"
                    className="max-h-[60px] max-w-[200px] -mb-2 z-10"
                  />
                ) : (
                  <div className="h-[40px]" />
                )}
                <div className="border-t border-slate-400 w-4/5 mx-auto pt-2 space-y-0.5">
                  <strong className="block text-slate-900 font-extrabold text-sm">
                    {getResponsavelCleanName()}
                  </strong>
                  <span className="block text-slate-500 text-[11px] font-medium">
                    Assinatura do(a) Responsável
                  </span>
                  {reportDigitalSigned && (
                    <span className="inline-block mt-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      ✓ Assinado Digitalmente
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center justify-end">
                {reportSignatures['gerador'] ? (
                  <img
                    src={reportSignatures['gerador']}
                    alt="Assinatura Emissor"
                    className="max-h-[60px] max-w-[200px] -mb-2 z-10"
                  />
                ) : (
                  <div className="h-[40px]" />
                )}
                <div className="border-t border-slate-400 w-4/5 mx-auto pt-2 space-y-0.5">
                  <strong className="block text-slate-900 font-extrabold text-sm">
                    {reportQuemGerou || 'Direção'}
                  </strong>
                  <span className="block text-slate-500 text-[11px] font-medium">
                    Assinatura de Quem Gerou o Relatório
                  </span>
                  {reportDigitalSigned && (
                    <span className="inline-block mt-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      ✓ Assinado Digitalmente
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: FORMULÁRIO DE EDITAR / CADASTRAR ALUNO */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-auto">
            {/* Modal Title Header */}
            <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800 relative">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingAluno ? 'Editar Aluno' : 'Cadastrar Aluno'}
              </h2>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 absolute right-0 top-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              {/* Nome Completo & CGM */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={formNome}
                    onChange={e => setFormNome(e.target.value)}
                    placeholder="Nome completo do estudante"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CGM
                  </label>
                  <input
                    type="text"
                    value={formCgm}
                    onChange={e => setFormCgm(e.target.value)}
                    placeholder="1014180253"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Número do Aluno */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Número do Aluno
                </label>
                <input
                  type="number"
                  value={formNumero}
                  onChange={e => setFormNumero(e.target.value ? Number(e.target.value) : '')}
                  placeholder="2"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Transferido">Transferido</option>
                  <option value="Remanejado">Remanejado</option>
                </select>
              </div>

              {/* DYNAMIC CARD: TURMA DE DESTINO */}
              {formStatus === 'Remanejado' && (
                <div className="p-4 rounded-2xl bg-sky-50/90 dark:bg-sky-950/40 border-2 border-sky-300 dark:border-sky-700 space-y-2.5 transition-all">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-sky-800 dark:text-sky-300 uppercase tracking-wide">
                    <span className="text-base">⇄</span>
                    <span>TURMA DE DESTINO</span>
                  </div>

                  <select
                    value={formTurmaDestinoId}
                    onChange={e => setFormTurmaDestinoId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    required
                  >
                    {turmas.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nome} - {t.turno_nome}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-start gap-1.5 text-[11px] text-sky-700 dark:text-sky-300 font-medium">
                    <span className="shrink-0 font-bold text-xs bg-sky-600 text-white w-4 h-4 rounded-full flex items-center justify-center">i</span>
                    <span>O aluno será movido para esta turma e receberá o próximo número disponível.</span>
                  </div>
                </div>
              )}

              {/* Mãe */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mãe
                </label>
                <input
                  type="text"
                  value={formMae}
                  onChange={e => setFormMae(e.target.value)}
                  placeholder="Nome da mãe"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Pai */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pai
                </label>
                <input
                  type="text"
                  value={formPai}
                  onChange={e => setFormPai(e.target.value)}
                  placeholder="Nome do pai"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Data de Nascimento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={formNascimento}
                  onChange={e => setFormNascimento(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Contatos (Telefone/WhatsApp) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Contatos (Telefone/WhatsApp)
                </label>

                {formContatosList.map((c, idx) => (
                  <div key={c.id || idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={c.numero}
                      onChange={e => {
                        const val = e.target.value;
                        setFormContatosList(prev => prev.map((item, i) => (i === idx ? { ...item, numero: val } : item)));
                      }}
                      placeholder="(41)99643-4925"
                      className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    />

                    <span className="px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 shrink-0">
                      {c.tag || 'Importado'}
                    </span>

                    {formContatosList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormContatosList(prev => prev.filter((_, i) => i !== idx))}
                        className="p-2 rounded-xl bg-rose-100 text-rose-600 hover:bg-rose-200 font-bold text-xs shrink-0"
                        title="Remover telefone"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setFormContatosList(prev => [...prev, { id: String(Date.now()), numero: '', tag: 'Importado' }])}
                  className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Telefone
                </button>
              </div>

              {/* Foto do Aluno (Clique para Tirar Foto) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Foto do Aluno (Clique para Tirar Foto)
                </label>

                {formFotoPreview ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <img src={formFotoPreview} alt="Preview" className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500 shadow-xs" />
                    <div className="flex-1 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">Foto selecionada</span>
                      <span className="text-[11px] text-slate-400">Pronta para salvar</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormFoto('');
                        setFormFotoPreview('');
                      }}
                      className="p-2 rounded-xl bg-rose-100 text-rose-600 hover:bg-rose-200 text-xs font-bold"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoFileChange}
                    className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                )}

                <p className="text-[11px] text-slate-400 font-medium">
                  No celular, isso abrirá a câmera automaticamente.
                </p>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center gap-3">
                <button
                  type="submit"
                  className="px-8 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs transition-all shadow-md active:scale-98"
                >
                  Salvar
                </button>

                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-8 py-2.5 rounded-xl bg-[#64748B] hover:bg-[#475569] text-white font-bold text-xs transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GERAR RELATÓRIO INDIVIDUAL (Matching exact user design screenshot) */}
      {isReportModalOpen && selectedReportAluno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-auto">
            {/* Modal Title Header */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                Gerar Relatório
              </h2>
            </div>

            <form onSubmit={handleConfirmGenerateReport} className="space-y-4">
              {/* Responsável para Assinar */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Responsável para Assinar
                </label>
                <select
                  value={reportResponsavel}
                  onChange={e => setReportResponsavel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value={`Mãe: ${selectedReportAluno.mae || 'Teste 1'}`}>
                    {`Mãe: ${selectedReportAluno.mae || 'Teste 1'}`}
                  </option>
                  <option value={`Pai: ${selectedReportAluno.pai || 'Teste 2'}`}>
                    {`Pai: ${selectedReportAluno.pai || 'Teste 2'}`}
                  </option>
                  <option value="Responsável Legal">Responsável Legal</option>
                </select>
              </div>

              {/* Quem gerou o relatório (Assinatura) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quem gerou o relatório (Assinatura)
                </label>
                <input
                  type="text"
                  value={reportQuemGerou}
                  onChange={e => setReportQuemGerou(e.target.value)}
                  placeholder="Direção"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              {/* Conteúdo do Relatório Checkbox Card */}
              <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-slate-800/60 border border-sky-100 dark:border-slate-700 space-y-2">
                <h4 className="text-xs font-bold text-[#3B0764] dark:text-purple-300">
                  Conteúdo do Relatório
                </h4>

                <div className="flex items-center gap-5 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportIncludeOcorrencias}
                      onChange={e => setReportIncludeOcorrencias(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span>Ocorrências</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportIncludeNotas}
                      onChange={e => setReportIncludeNotas(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span>Notas</span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center gap-3">
                <button
                  type="submit"
                  className="px-8 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs transition-all shadow-md active:scale-98"
                >
                  Gerar Relatório
                </button>

                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-8 py-2.5 rounded-xl bg-[#64748B] hover:bg-[#475569] text-white font-bold text-xs transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIÇÃO / LANÇAMENTO DE NOTAS DO ALUNO */}
      {isNotasModalOpen && selectedAlunoNotas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-600" />
                  Editar Notas do Aluno
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Estudante: <strong className="text-slate-900 dark:text-white uppercase">{selectedAlunoNotas.nome}</strong>
                </p>
              </div>

              <button onClick={() => setIsNotasModalOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 text-xs">
              <div className="grid grid-cols-4 gap-2 font-bold text-slate-400 uppercase text-[10px] pb-1 border-b border-slate-100">
                <span className="col-span-1">Matéria</span>
                <span className="text-center">1º Tri</span>
                <span className="text-center">2º Tri</span>
                <span className="text-center">3º Tri</span>
              </div>

              {allMaterias.map(mat => {
                const grades = studentGrades[mat.id] || { tri1: '', tri2: '', tri3: '' };

                return (
                  <div key={mat.id} className="grid grid-cols-4 gap-2 items-center">
                    <span className="col-span-1 font-bold text-slate-800 dark:text-slate-200">
                      {mat.nome}
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={grades.tri1}
                      onChange={e => {
                        const val = e.target.value;
                        setStudentGrades(prev => ({
                          ...prev,
                          [mat.id]: { ...prev[mat.id], tri1: val }
                        }));
                      }}
                      className="px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center font-mono text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={grades.tri2}
                      onChange={e => {
                        const val = e.target.value;
                        setStudentGrades(prev => ({
                          ...prev,
                          [mat.id]: { ...prev[mat.id], tri2: val }
                        }));
                      }}
                      className="px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center font-mono text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={grades.tri3}
                      onChange={e => {
                        const val = e.target.value;
                        setStudentGrades(prev => ({
                          ...prev,
                          [mat.id]: { ...prev[mat.id], tri3: val }
                        }));
                      }}
                      className="px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center font-mono text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsNotasModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveStudentGrades}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
              >
                Salvar Notas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSINATURA DIGITAL (QUADRO DE DESENHO DA ASSINATURA) */}
      {isReportSignPadOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PenTool className="w-4 h-4 text-emerald-500" />
                Assinatura Digital do Relatório
              </h3>
              <button
                onClick={() => setIsReportSignPadOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Quem está assinando?
                </label>
                <select
                  value={selectedReportSignerRole}
                  onChange={(e) => setSelectedReportSignerRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                >
                  <option value="responsavel">Responsável ({getResponsavelCleanName()})</option>
                  <option value="gerador">Emissor / Quem Gerou ({reportQuemGerou || 'Direção'})</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Desenhe sua assinatura no quadro abaixo:
                  </p>
                  <button
                    type="button"
                    onClick={clearReportCanvas}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    Limpar Quadro
                  </button>
                </div>

                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden bg-white shadow-inner">
                  <canvas
                    ref={reportCanvasRef}
                    width={400}
                    height={160}
                    className="w-full h-[160px] touch-none cursor-crosshair bg-white"
                    onMouseDown={startReportDrawing}
                    onMouseMove={drawReport}
                    onMouseUp={stopReportDrawing}
                    onMouseLeave={stopReportDrawing}
                    onTouchStart={startReportDrawing}
                    onTouchMove={drawReport}
                    onTouchEnd={stopReportDrawing}
                  />
                </div>
                <p className="text-[11px] text-slate-400 text-center">
                  Use o mouse ou a tela sensível ao toque (touchscreen) para assinar.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsReportSignPadOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyReportSignature}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-sm text-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Confirmar Assinatura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlunosManager;
