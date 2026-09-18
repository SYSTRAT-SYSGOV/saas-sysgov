import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Drawer,
  Modal,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@sysgov/ui';
import { AlertTriangle, ArrowLeft, BookOpen, Calendar, CheckCircle2, FileText, Info, Link2, Paperclip, Plus, Save, Send, ShieldAlert, Upload } from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiAvaliacao, ApiDiarioBordo, ApiFator, RespostaFator } from '@sysgov/sdk';
import { ScreenState } from '@/components/ui/ScreenState';
import { GRAU_TONE } from './graduTone';
import { MatrizEscalaGrafica, FATORES_CANONICOS } from './components/MatrizEscalaGrafica';
import type { FatorItem } from './components/MatrizEscalaGrafica';
import { TopoAvaliacaoServidor } from './components/TopoAvaliacaoServidor';

const api = new SysgovApi();

// Escala Gráfica em ordem crescente (1 a 5), como colunas da matriz de avaliação.
const GRAUS = [
  { valor: 1, label: 'Insatisfatório', tone: GRAU_TONE[1] },
  { valor: 2, label: 'Regular', tone: GRAU_TONE[2] },
  { valor: 3, label: 'Bom', tone: GRAU_TONE[3] },
  { valor: 4, label: 'Ótimo', tone: GRAU_TONE[4] },
  { valor: 5, label: 'Excelente', tone: GRAU_TONE[5] },
];

const GRAUS_EXTREMOS = [1, 2, 5];

const NOTA_CORTE_PADRAO = 3;

const JUSTIFICATIVA_MIN = 50;

const REGIME_LABELS: Record<string, string> = {
  estatutario: 'Quadro Geral',
  clt: 'CLT',
  comissionado: 'Comissionado',
  temporario: 'Temporário',
  estagiario: 'Estagiário',
};

const toneClasses: Record<string, string> = {
  success: 'bg-status-success text-white border-status-success',
  warning: 'bg-status-warning text-white border-status-warning',
  danger: 'bg-status-danger text-white border-status-danger',
};

interface Props {
  avaliacaoId: number | null;
  onClose: () => void;
  onSubmitted?: () => void;
  onNovoIncidente?: () => void;
  onRascunhoSalvo?: (avaliacaoAtualizada: any) => void;
}

/**
 * Tela de preenchimento da Avaliação de Desempenho pela Chefia Imediata:
 * matriz de Escala Gráfica (grau 1-5 por fator) ao lado do Diário de Bordo
 * (CIT) do avaliado. Graus 1, 2 e 5 abrem um modal de justificativa
 * obrigatória (mínimo 50 caracteres e/ou vínculo de incidente do CIT) antes
 * de gravar a nota; a submissão final aplica a Trava Anti-Leniência no
 * backend. F1/F2 (Assiduidade/Disciplina) são calculados automaticamente
 * pela integração de RH e não aparecem para edição.
 */
export const AvaliacaoFormView: React.FC<Props> = ({
  avaliacaoId,
  onClose,
  onSubmitted,
  onNovoIncidente,
  onRascunhoSalvo,
}) => {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avaliacao, setAvaliacao] = useState<ApiAvaliacao | null>(null);
  const [fatores, setFatores] = useState<ApiFator[]>(FATORES_CANONICOS as any);
  const [respostas, setRespostas] = useState<Record<string, RespostaFator>>({});
  const [anotacoesCit, setAnotacoesCit] = useState<ApiDiarioBordo[]>([]);
  const [anexandoEvidencia, setAnexandoEvidencia] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [submetendo, setSubmetendo] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Cortina lateral: Incidentes Registrados (Diário de Bordo/CIT) — sempre inicia fechada
  const [drawerCitAberto, setDrawerCitAberto] = useState(false);

  // Modal: incidentes já registrados para um fator (consulta)
  const [modalFatorIncidentes, setModalFatorIncidentes] = useState<ApiFator | null>(null);

  // Modal unificado: Todos os registros de incidentes e vínculos do fator
  const [modalFatorDetalhes, setModalFatorDetalhes] = useState<FatorItem | null>(null);

  // Modal: justificativa obrigatória ao atribuir grau 1, 2 ou 5 (Opção 1 — Registro no Ato)
  const [modalGrau, setModalGrau] = useState<{ fator: ApiFator; grau: number } | null>(null);
  const [modalModo, setModalModo] = useState<'novo' | 'vincular'>('novo');
  const [modalDataOcorrencia, setModalDataOcorrencia] = useState<string>(new Date().toISOString().split('T')[0]);
  const [modalIncidenteId, setModalIncidenteId] = useState<string>('');
  const [modalTexto, setModalTexto] = useState('');
  const [modalArquivo, setModalArquivo] = useState<File | null>(null);
  const [modalConfirmando, setModalConfirmando] = useState(false);
  const [modalSomenteLeitura, setModalSomenteLeitura] = useState(false);

  const recarregarCit = (cicloId: number, servidorId: number) => {
    api.capd
      .listDiarioBordo({ ciclo_id: cicloId, servidor_id: servidorId })
      .then((res) => setAnotacoesCit(res.data || []))
      .catch(() => setAnotacoesCit([]));
  };

  useEffect(() => {
    if (!avaliacaoId) {
      setAvaliacao(null);
      setRespostas({});
      setAnotacoesCit([]);
      setErro(null);
      setSucesso(null);
      return;
    }

    setLoading(true);
    setErro(null);
    setSucesso(null);

    Promise.all([
      api.capd.getAvaliacao(avaliacaoId),
      api.capd.listFatores().catch(() => []),
    ])
      .then(async ([av, todosFatores]) => {
        setAvaliacao(av);

        const ativos = (todosFatores || []).filter((f: any) => f.ativo);
        if (ativos.length > 0) {
          setFatores(ativos);
        }

        // Incidentes do Diário de Bordo: já pré-carregados na avaliação pelo backend
        let citList: ApiDiarioBordo[] = av.incidentes_cit || [];

        // Fallback rápido apenas se o backend não enviou incidentes_cit
        if (!av.incidentes_cit && av.ciclo_id && av.servidor_id) {
          try {
            const resCit = await api.capd.listDiarioBordo({ ciclo_id: av.ciclo_id, servidor_id: av.servidor_id });
            citList = resCit.data || [];
          } catch (citErr) {
            console.warn('Erro ao carregar Diário de Bordo complementar:', citErr);
          }
        }

        // Garante carregamento do modelo de formulário e grupo funcional do servidor
        if (!(av as any).modelo_formulario && av.servidor_id) {
          try {
            const srvData = (av as any).servidorData;
            const mod = await api.capd.getModeloFormularioVigente(undefined, srvData?.cargo_efetivo, { servidor_id: av.servidor_id });
            const grp = await api.capd.identificarGrupoFuncional({ servidor_id: av.servidor_id, cargo: srvData?.cargo_efetivo });
            (av as any).modelo_formulario = mod;
            (av as any).grupo_funcional = grp;
            setAvaliacao({ ...av, modelo_formulario: mod, grupo_funcional: grp } as any);
          } catch (modErr) {
            console.warn('Erro ao resolver modelo do grupo funcional:', modErr);
          }
        }

        setAnotacoesCit(citList);

        // Carrega as respostas salvas no rascunho da avaliação
        const respostasCarregadas = { ...(av.respostas_fatores || {}) };

        // Recupera o texto da justificativa se houver incidente já vinculado pelo avaliador
        const listaFatoresRef = (av as any)?.modelo_formulario?.perguntas_ativas?.length
          ? (av as any).modelo_formulario.perguntas_ativas
          : FATORES_CANONICOS;

        for (const fItem of listaFatoresRef) {
          const cod = fItem.codigo;
          const resp = respostasCarregadas[cod];
          if (resp?.diario_bordo_id && !resp.justificativa) {
            const inc = citList.find((a) => a.id === resp.diario_bordo_id);
            if (inc) {
              respostasCarregadas[cod] = {
                ...resp,
                justificativa: inc.descricao_fato,
                incidente_tipo: inc.tipo,
              };
            }
          }
        }

        setRespostas(respostasCarregadas);
      })
      .catch(() => setErro('Não foi possível carregar os dados desta avaliação.'))
      .finally(() => setLoading(false));
  }, [avaliacaoId]);

  const anotacoesPorFator = useMemo(() => {
    const mapa: Record<string | number, ApiDiarioBordo[]> = {};
    for (const a of anotacoesCit) {
      const fatorCod = a.fator?.codigo || fatores.find((f) => f.id === a.fator_id)?.codigo;
      const fatorNome = a.fator?.nome || fatores.find((f) => f.id === a.fator_id)?.nome;

      if (a.fator_id) {
        if (!mapa[a.fator_id]) mapa[a.fator_id] = [];
        if (!mapa[a.fator_id].includes(a)) mapa[a.fator_id].push(a);

        const strId = String(a.fator_id);
        if (!mapa[strId]) mapa[strId] = mapa[a.fator_id];
      }

      if (fatorCod) {
        if (!mapa[fatorCod]) mapa[fatorCod] = [];
        if (!mapa[fatorCod].includes(a)) mapa[fatorCod].push(a);
      }

      if (fatorNome) {
        if (!mapa[fatorNome]) mapa[fatorNome] = [];
        if (!mapa[fatorNome].includes(a)) mapa[fatorNome].push(a);
      }
    }
    return mapa;
  }, [anotacoesCit, fatores]);

  const fatoresExibidos: FatorItem[] = useMemo(() => {
    const modeloPerguntas = (avaliacao as any)?.modelo_formulario?.perguntas_ativas;
    if (modeloPerguntas && Array.isArray(modeloPerguntas) && modeloPerguntas.length > 0) {
      return modeloPerguntas.map((p: any) => {
        const opcoesDesc = p.opcoes && Array.isArray(p.opcoes) ? p.opcoes.map((o: any) => o.descricao || o.rotulo) : undefined;
        return {
          id: p.id,
          codigo: p.codigo,
          nome: p.enunciado,
          descricao: p.enunciado,
          criterios: opcoesDesc,
        };
      });
    }

    return FATORES_CANONICOS.map((fCanonico) => {
      const dbFator = fatores.find((f) => f.codigo === fCanonico.codigo);
      return {
        ...fCanonico,
        id: dbFator?.id,
        nome: dbFator?.nome || fCanonico.nome,
        descricao: dbFator?.descricao || fCanonico.descricao,
      };
    });
  }, [avaliacao, fatores]);

  const fatoresPendentes = useMemo(
    () => fatoresExibidos.filter((f) => !respostas[f.codigo]?.grau).length,
    [fatoresExibidos, respostas]
  );

  const fatoresSemJustificativa = useMemo(
    () =>
      fatoresExibidos.filter(
        (f) =>
          GRAUS_EXTREMOS.includes(respostas[f.codigo]?.grau) &&
          (respostas[f.codigo]?.justificativa || '').trim().length < JUSTIFICATIVA_MIN
      ),
    [fatoresExibidos, respostas]
  );

  const totalFatores = fatoresExibidos.length;
  const progresso = totalFatores > 0 ? Math.round(((totalFatores - fatoresPendentes) / totalFatores) * 100) : 0;

  const GRAU_PONTOS: Record<number, number> = {
    1: 20,
    2: 50,
    3: 70,
    4: 85,
    5: 100,
  };

  const mediaParcial = useMemo(() => {
    // Se a avaliação já foi homologada definitiva
    if (avaliacao?.homologada && avaliacao?.nota_final) {
      const n = Number(avaliacao.nota_final);
      return n <= 10 ? n * 10 : n;
    }

    const fatoresRespondidos = fatoresExibidos.filter(
      (f) => typeof respostas[f.codigo]?.grau === 'number' && (respostas[f.codigo]?.grau ?? 0) > 0
    );

    if (fatoresRespondidos.length > 0) {
      let somaPonderada = 0;
      let somaPesos = 0;
      for (const f of fatoresRespondidos) {
        const g = respostas[f.codigo]!.grau!;
        const pontos = GRAU_PONTOS[g] ?? (g * 20);
        const peso = Number((f as any).peso ?? 0);
        if (peso > 0) {
          somaPonderada += pontos * peso;
          somaPesos += peso;
        } else {
          somaPonderada += pontos;
          somaPesos += 1;
        }
      }
      return somaPesos > 0 ? somaPonderada / somaPesos : null;
    }

    if (avaliacao?.nota_final) {
      const n = Number(avaliacao.nota_final);
      if (!isNaN(n) && n > 0) {
        return n <= 10 ? n * 10 : n;
      }
    }

    return null;
  }, [avaliacao?.homologada, avaliacao?.nota_final, fatoresExibidos, respostas]);

  const notaCorte = Number(
    (avaliacao?.ciclo as any)?.nota_corte_nfc ??
    avaliacao?.ciclo?.regras_config?.nota_corte_progressao ??
    70
  );
  const apto = mediaParcial !== null && mediaParcial >= notaCorte;

  const atualizarGrau = async (codigo: string, grau: number) => {
    // Notas 3 e 4 dispensam qualquer justificativa ou apontamento CIT (desempenho no padrão regulamentar)
    const novasRespostas = {
      ...respostas,
      [codigo]: {
        grau,
        justificativa: undefined,
        diario_bordo_id: undefined,
        incidente_tipo: undefined,
      },
    };

    setRespostas(novasRespostas);
    setErro(null);
    setSucesso(`Grau ${grau} atribuído ao fator ${codigo} (desempenho no padrão, sem necessidade de justificativa).`);

    // Auto-salva imediatamente no backend para persistir a nota e atualizar a nota parcial
    if (avaliacaoId) {
      try {
        const res = await api.capd.salvarRascunho(avaliacaoId, novasRespostas);
        if (res) setAvaliacao(res);
        onRascunhoSalvo?.({ ...(avaliacao || {}), ...(res || {}), id: avaliacaoId, respostas_fatores: novasRespostas });
      } catch (saveErr) {
        console.warn('Erro ao auto-salvar grau 3/4:', saveErr);
        onRascunhoSalvo?.({ ...(avaliacao || {}), id: avaliacaoId, respostas_fatores: novasRespostas });
      }
    }
  };

  const vincularIncidente = (codigo: string, incidente: ApiDiarioBordo) => {
    const atual = respostas[codigo];
    const jaVinculado = atual?.diario_bordo_id === incidente.id;

    const novasRespostas = {
      ...respostas,
      [codigo]: {
        ...atual,
        grau: jaVinculado ? atual?.grau : (atual?.grau ?? (incidente.tipo === 'negativo' ? 2 : 5)),
        diario_bordo_id: jaVinculado ? undefined : incidente.id,
        incidente_tipo: jaVinculado ? undefined : incidente.tipo,
        justificativa: jaVinculado ? atual?.justificativa : incidente.descricao_fato,
      },
    };

    setRespostas(novasRespostas);
    setSucesso(
      jaVinculado
        ? `Incidente desvinculado do fator ${codigo}.`
        : `Incidente vinculado ao fator ${codigo}. Clique em "Salvar Rascunho" para persistir.`
    );
  };

  const anexarEvidencia = async (incidente: ApiDiarioBordo, file: File) => {
    if (!avaliacao) return;
    setAnexandoEvidencia(incidente.id);
    try {
      await api.capd.uploadEvidencia(incidente.id, file);
      recarregarCit(avaliacao.ciclo_id, avaliacao.servidor_id);
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao anexar evidência ao incidente CIT.');
    } finally {
      setAnexandoEvidencia(null);
    }
  };

  const abrirModalVisualizacao = (fator: FatorItem, diarioBordoId?: number) => {
    const dbFator = fatores.find((f) => f.codigo === fator.codigo);
    const fatorId = dbFator?.id || fator.id;
    const resp = respostas[fator.codigo];

    const incidentesDoFator: ApiDiarioBordo[] = (
      (anotacoesPorFator[fator.codigo] as ApiDiarioBordo[]) ||
      (fatorId ? (anotacoesPorFator[fatorId] as ApiDiarioBordo[]) : undefined) ||
      (anotacoesPorFator[fator.nome] as ApiDiarioBordo[]) ||
      []
    );
    const incidente = diarioBordoId
      ? incidentesDoFator.find((a) => a.id === diarioBordoId) ||
        anotacoesCit.find((a) => a.id === diarioBordoId)
      : incidentesDoFator[0];

    const grau = resp?.grau ?? (incidente?.tipo === 'negativo' ? 2 : 5);

    setModalGrau({ fator: { ...fator, id: fatorId ?? 0 } as any, grau });
    setModalSomenteLeitura(true);
    setModalModo('novo');
    setModalDataOcorrencia(
      incidente?.data_ocorrencia
        ? incidente.data_ocorrencia.split('T')[0]
        : new Date().toISOString().split('T')[0]
    );
    setModalTexto(incidente?.descricao_fato || resp?.justificativa || '');
    setModalIncidenteId(incidente ? String(incidente.id) : '');
    setModalArquivo(null);
  };

  const abrirModalGrau = (fator: ApiFator, grau: number) => {
    const numGrau = Number(grau);

    // Ao aplicar as notas 3 e 4 não precisa preencher justificativa (desempenho no padrão regulamentar)
    if (!GRAUS_EXTREMOS.includes(numGrau) || numGrau === 3 || numGrau === 4) {
      atualizarGrau(fator.codigo, numGrau);
      return;
    }

    const dbFator = fatores.find((f) => f.codigo === fator.codigo);
    const fatorId = dbFator?.id || fator.id;

    setModalGrau({ fator: { ...fator, id: fatorId ?? 0 }, grau: numGrau });
    setModalSomenteLeitura(false);
    setModalDataOcorrencia(new Date().toISOString().split('T')[0]);

    // O campo de relato circunstanciado SEMPRE inicia em branco (0/50) no ato da avaliação
    setModalModo('novo');
    setModalIncidenteId('');
    setModalTexto('');
    setModalArquivo(null);
  };

  const fecharModalGrau = () => {
    setModalGrau(null);
    setModalSomenteLeitura(false);
    setModalModo('novo');
    setModalDataOcorrencia(new Date().toISOString().split('T')[0]);
    setModalIncidenteId('');
    setModalTexto('');
    setModalArquivo(null);
  };

  const incidentesDoModalGrau: ApiDiarioBordo[] = modalGrau
    ? ((anotacoesPorFator[modalGrau.fator.codigo] as ApiDiarioBordo[]) ||
       (modalGrau.fator.id ? (anotacoesPorFator[modalGrau.fator.id] as ApiDiarioBordo[]) : undefined) ||
       (anotacoesPorFator[modalGrau.fator.nome] as ApiDiarioBordo[]) ||
       [])
    : [];

  const selecionarIncidenteModal = (id: string) => {
    setModalIncidenteId(id);
    if (id && id !== 'novo' && id !== 'avulso') {
      const incidente = incidentesDoModalGrau.find((a) => String(a.id) === id);
      if (incidente) {
        setModalTexto(incidente.descricao_fato);
      }
    }
  };

  const confirmarModalGrau = async () => {
    if (!modalGrau) return;
    const texto = modalTexto.trim();
    if (texto.length < JUSTIFICATIVA_MIN) return;

    setModalConfirmando(true);
    setErro(null);
    try {
      let incidenteId: number | undefined;
      let incidenteTipo: 'positivo' | 'negativo' = modalGrau.grau <= 2 ? 'negativo' : 'positivo';

      const dbFator = fatores.find((f) => f.codigo === modalGrau.fator.codigo || f.id === modalGrau.fator.id);
      const fatorId = dbFator?.id || modalGrau.fator.id;

      // 1. Opção 1: Registro concomitante estruturado no ato (quando novo ou sem incidentes prévios)
      if (modalModo === 'novo' || (!modalIncidenteId && incidentesDoModalGrau.length === 0)) {
        if (avaliacao && fatorId) {
          try {
            const novoIncidente = await api.capd.createDiarioBordo({
              ciclo_id: avaliacao.ciclo_id,
              servidor_id: avaliacao.servidor_id,
              fator_id: fatorId,
              tipo: incidenteTipo,
              data_ocorrencia: modalDataOcorrencia || new Date().toISOString().split('T')[0],
              descricao_fato: texto,
            });

            incidenteId = novoIncidente.id;
            incidenteTipo = novoIncidente.tipo;

            if (modalArquivo) {
              await api.capd.uploadEvidencia(novoIncidente.id, modalArquivo).catch((uploadErr) => {
                console.warn('Evidência não pôde ser enviada ao novo incidente:', uploadErr);
              });
            }

            // Recarrega lista do Diário de Bordo localmente
            recarregarCit(avaliacao.ciclo_id, avaliacao.servidor_id);
          } catch (createErr: any) {
            console.error('Erro ao criar incidente automático no Diário de Bordo:', createErr);
          }
        }
      } else if (modalModo === 'vincular' && modalIncidenteId && modalIncidenteId !== 'avulso') {
        // 2. Vincula incidente pré-existente selecionado no dropdown
        const inc = incidentesDoModalGrau.find((a) => String(a.id) === modalIncidenteId);
        if (inc) {
          incidenteId = inc.id;
          incidenteTipo = inc.tipo;
          if (modalArquivo) {
            await anexarEvidencia(inc, modalArquivo).catch((uploadErr) => {
              console.warn('Erro ao anexar arquivo ao incidente existente:', uploadErr);
            });
          }
        }
      }

      const novasRespostas = {
        ...respostas,
        [modalGrau.fator.codigo]: {
          ...respostas[modalGrau.fator.codigo],
          grau: modalGrau.grau,
          justificativa: texto,
          diario_bordo_id: incidenteId,
          incidente_tipo: incidenteTipo,
        },
      };

      setRespostas(novasRespostas);

      // Auto-salva imediatamente no backend para persistir a nota caso a tela seja recarregada
      if (avaliacaoId) {
        try {
          const res = await api.capd.salvarRascunho(avaliacaoId, novasRespostas);
          if (res) setAvaliacao(res);
          onRascunhoSalvo?.({ ...(avaliacao || {}), ...(res || {}), id: avaliacaoId, respostas_fatores: novasRespostas });
        } catch (saveErr) {
          console.warn('Erro ao auto-salvar rascunho:', saveErr);
          onRascunhoSalvo?.({ ...(avaliacao || {}), id: avaliacaoId, respostas_fatores: novasRespostas });
        }
      }

      setSucesso(
        incidenteId
          ? `Nota ${modalGrau.grau} salva e Incidente Crítico registrado no Diário de Bordo com sucesso.`
          : `Nota ${modalGrau.grau} salva com fundamentação.`
      );
      fecharModalGrau();
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao gravar justificativa e nota.');
    } finally {
      setModalConfirmando(false);
    }
  };

  const salvarRascunho = async () => {
    if (!avaliacaoId) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await api.capd.salvarRascunho(avaliacaoId, respostas);
      if (res) setAvaliacao(res);
      onRascunhoSalvo?.({ ...(avaliacao || {}), ...(res || {}), id: avaliacaoId, respostas_fatores: respostas });
      setSucesso('Rascunho salvo com sucesso.');
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao salvar rascunho.');
    } finally {
      setSalvando(false);
    }
  };

  const submeter = async () => {
    if (!avaliacaoId) return;
    if (fatoresSemJustificativa.length > 0) {
      setErro(
        `Notas 1, 2 ou 5 exigem justificativa (mínimo ${JUSTIFICATIVA_MIN} caracteres): pendente em ${fatoresSemJustificativa
          .map((f) => f.codigo)
          .join(', ')}.`
      );
      return;
    }
    setSubmetendo(true);
    setErro(null);
    try {
      // Garante que o rascunho está persistido antes de submeter.
      await api.capd.salvarRascunho(avaliacaoId, respostas);
      await api.capd.submeterAvaliacao(avaliacaoId);
      setSucesso('Avaliação submetida com sucesso.');
      onSubmitted?.();
      onClose();
    } catch (e: any) {
      setErro(
        e?.response?.data?.message ||
          'Erro ao submeter avaliação. Notas extremas (graus 1, 2 ou 5) exigem um apontamento prévio no Diário de Bordo (CIT).'
      );
    } finally {
      setSubmetendo(false);
    }
  };

  const srvData = (avaliacao as any)?.servidorData || (avaliacao as any)?.servidor_data;
  const userServidor = avaliacao?.servidor;
  const nomeServidor =
    srvData?.nome_completo ||
    userServidor?.name ||
    (userServidor as any)?.nome_completo ||
    undefined;
  const matricula = srvData?.matricula || (userServidor as any)?.matricula;
  const cargo = srvData?.cargo_efetivo || (userServidor as any)?.cargo_efetivo || (userServidor as any)?.cargo;
  const grupoFuncional = srvData?.regime_juridico
    ? (REGIME_LABELS[srvData.regime_juridico] ?? srvData.regime_juridico)
    : undefined;
  const lotacao = srvData?.orgao_lotacao || srvData?.lotacao_fisica || (userServidor as any)?.lotacao;
  const grauModalInfo = modalGrau ? GRAUS.find((g) => g.valor === modalGrau.grau) : undefined;

  const infoClassificacao = useMemo(() => {
    if (!modalGrau) return null;
    const g = modalGrau.grau;
    if (g === 1) {
      return {
        tipo: 'negativo' as const,
        titulo: 'Incidente Crítico Desabonador',
        polaridade: 'Polaridade: Negativa',
        badgeVariant: 'danger' as const,
        grauExtenso: 'Grau 1 — Insatisfatório / Não Atende',
        enquadramento: 'Fato com impacto grave no serviço público ou descumprimento injustificado de dever funcional.',
        diretriz: 'Exige comprovação documental rigorosa e ciência expressa para a Comissão CAPD.',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
        bgClass: 'border-rose-300/80 bg-rose-50/60 dark:bg-rose-950/20 text-rose-950 dark:text-rose-100',
      };
    }
    if (g === 2) {
      return {
        tipo: 'negativo' as const,
        titulo: 'Incidente Desfavorável (Abaixo do Padrão)',
        polaridade: 'Polaridade: Negativa',
        badgeVariant: 'warning' as const,
        grauExtenso: 'Grau 2 — Regular / Abaixo da Média',
        enquadramento: 'Fato evidenciando entrega parcial, retrabalho ou inconformidade operacional durante o ciclo.',
        diretriz: 'Exige apontamento circunstanciado no CIT para fundamentar a atribuição da nota 2.',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        bgClass: 'border-amber-300/80 bg-amber-50/60 dark:bg-amber-950/20 text-amber-950 dark:text-amber-100',
      };
    }
    return {
      tipo: 'positivo' as const,
      titulo: 'Incidente Crítico Meritório (Destaque)',
      polaridade: 'Polaridade: Positiva',
      badgeVariant: 'success' as const,
      grauExtenso: 'Grau 5 — Excelente / Supera Expectativas',
      enquadramento: 'Fato de iniciativa destacada, superação de metas funcionais ou contribuição extraordinária.',
      diretriz: 'Exige comprovação documental de mérito para validar a nota máxima perante a Comissão.',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      bgClass: 'border-emerald-300/80 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100',
    };
  }, [modalGrau]);

  const renderIncidenteCard = (a: ApiDiarioBordo, fatorAlvo?: ApiFator) => {
    const fatorCodigo = a.fator?.codigo ?? fatores.find((f) => f.id === a.fator_id)?.codigo ?? fatorAlvo?.codigo;
    const vinculado = !!fatorCodigo && respostas[fatorCodigo]?.diario_bordo_id === a.id;
    const isNegativo = a.tipo === 'negativo';
    const temEvidencias = (a.evidencias?.length ?? 0) > 0;

    return (
      <div
        key={a.id}
        className={`rounded-lg border p-3.5 text-xs transition-all border-l-4 shadow-xs hover:shadow-sm ${
          isNegativo
            ? 'border-border bg-card border-l-rose-500'
            : 'border-border bg-card border-l-emerald-500'
        } ${vinculado ? 'ring-2 ring-emerald-500/50 bg-emerald-50/15 dark:bg-emerald-950/20' : ''}`}
      >
        {/* Linha 1: Metadados (Data, Polaridade e ID) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-mono tabular-nums text-xs font-semibold text-foreground">
              {new Date(a.data_ocorrencia).toLocaleDateString('pt-BR')}
            </span>
            <Badge
              variant={isNegativo ? 'danger' : 'success'}
              className="text-[10px] font-mono px-1.5 py-0 uppercase tracking-wider"
            >
              {isNegativo ? 'Negativo' : 'Positivo'}
            </Badge>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            ID #{a.id}
          </span>
        </div>

        {/* Linha 2: Fator Associado */}
        <div className="mt-2 flex items-center gap-1.5">
          {fatorCodigo && (
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px] font-bold shrink-0">
              {fatorCodigo}
            </span>
          )}
          <span className="font-semibold text-xs text-foreground truncate" title={a.fator?.nome || `Fator #${a.fator_id}`}>
            {a.fator?.nome || `Fator #${a.fator_id}`}
          </span>
        </div>

        {/* Linha 3: Relato / Descrição do Fato observável */}
        <div className="mt-2 rounded-md bg-muted/40 dark:bg-slate-900/60 p-2.5 border border-border/60">
          <p className="text-xs text-foreground/90 leading-relaxed break-words break-all whitespace-pre-wrap font-sans">
            {a.descricao_fato}
          </p>
        </div>

        {/* Linha 4: Evidências Documentais */}
        {temEvidencias && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-primary">
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Evidência:{' '}
              {a.evidencias?.map((ev) => (
                <a
                  key={ev.id}
                  href={ev.url_armazenamento || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-80 ml-1 font-medium"
                >
                  {ev.nome_arquivo}
                </a>
              ))}
            </span>
          </div>
        )}

        {/* Linha 5: Barra de Ações (Vínculo e Upload de Evidência) */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/50">
          <div>
            {!temEvidencias && (
              <label
                title="Anexar evidência documental"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>{anexandoEvidencia === a.id ? 'Enviando...' : 'Anexar evidência'}</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  disabled={anexandoEvidencia === a.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) anexarEvidencia(a, file);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>

          {fatorCodigo && (
            <Button
              type="button"
              size="sm"
              variant={vinculado ? 'outline' : 'default'}
              className={`h-7 px-3 text-[11px] font-mono font-semibold transition-all ${
                vinculado
                  ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:text-white dark:bg-emerald-700'
                  : ''
              }`}
              onClick={() => vincularIncidente(fatorCodigo, a)}
            >
              {vinculado ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Vinculado ({fatorCodigo}) ✓
                </>
              ) : (
                <>
                  <Link2 className="h-3.5 w-3.5 mr-1" />
                  Vincular a {fatorCodigo}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onClose} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Voltar para Avaliações de Subordinados
      </Button>

      {loading && <ScreenState type="loading" title="Carregando formulário de avaliação..." />}

      {!loading && erro && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {!loading && sucesso && (
        <div className="rounded-lg border border-status-success-border bg-status-success-bg px-4 py-3 text-xs text-status-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{sucesso}</span>
        </div>
      )}

      {!loading && avaliacao && (
        <>
          {/* Topo da Tela de Avaliação: Identificação, Média Parcial e Cards Integrados */}
          <TopoAvaliacaoServidor
            nomeServidor={nomeServidor || `Servidor #${avaliacao.servidor_id}`}
            matricula={matricula}
            cargo={cargo}
            grupoFuncional={grupoFuncional}
            lotacao={lotacao}
            statusTexto={
              avaliacao.homologada
                ? 'AVALIAÇÃO HOMOLOGADA'
                : avaliacao.data_conclusao
                ? 'AVALIAÇÃO CONCLUÍDA'
                : 'RASCUNHO EM EDIÇÃO'
            }
            mediaParcial={mediaParcial}
            notaCorte={notaCorte}
            progresso={progresso}
          />

          {/* Banner do Grupo Funcional Carregado Conforme Carreira do Servidor */}
          {((avaliacao as any)?.grupo_funcional || (avaliacao as any)?.modelo_formulario) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-primary/25 bg-primary/5 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-semibold text-xs bg-primary/10 text-primary border-primary/30">
                  {((avaliacao as any)?.grupo_funcional?.nome) || 'Grupo Funcional'}
                </Badge>
                <span className="font-semibold text-foreground">
                  {(avaliacao as any)?.modelo_formulario?.nome || 'Instrumento de Avaliação de Desempenho'}
                </span>
                <span className="font-mono text-muted-foreground text-[11px]">
                  [{(avaliacao as any)?.modelo_formulario?.codigo || 'FORM_VIGENTE'}]
                </span>
              </div>
              <span className="text-muted-foreground text-[11px]">
                {((avaliacao as any)?.grupo_funcional?.descricao) || 'Formulário carregado conforme a carreira do servidor'}
              </span>
            </div>
          )}

          <div className="rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-xs text-status-warning flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Trava Anti-Leniência:</strong> Ao aplicar as notas 3 e 4 <strong>não precisa preencher justificativa</strong> (desempenho dentro do padrão regulamentar). Somente notas extremas (graus 1, 2 ou 5) exigem justificativa fundamentada (mínimo {JUSTIFICATIVA_MIN}{' '}
              caracteres) e/ou um apontamento prévio no Diário de Bordo (CIT), senão a submissão será bloqueada.
            </span>
          </div>

          {/* Matriz de Escala Gráfica — largura cheia */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Escala Gráfica Canônica (Graus 1 a 5) • Fatores Obrigatórios F1 a F8
              </span>
              <Button variant="outline" size="sm" onClick={() => setDrawerCitAberto(true)} className="shrink-0">
                <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                Incidentes Registrados (CIT)
                <Badge variant="outline" className="ml-1.5 font-mono text-[10px]">{anotacoesCit.length}</Badge>
              </Button>
            </div>

            {/* Matriz Canônica idêntica ao protótipo oficial */}
            <MatrizEscalaGrafica
              fatores={fatoresExibidos}
              respostas={respostas}
              disabled={!!avaliacao?.homologada}
              onSelectGrau={(fator, grau) => {
                const numGrau = Number(grau);

                // 1. Se a avaliação já foi homologada (definitiva e imutável), não permite alteração
                if (avaliacao?.homologada) {
                  if (GRAUS_EXTREMOS.includes(numGrau)) {
                    setModalFatorDetalhes(fator);
                  }
                  return;
                }

                // 2. REGRA FUNDAMENTAL E OBRIGATÓRIA:
                // Ao clicar nas notas 3 e 4, NUNCA abrir modal de justificativa!
                // Desempenho no padrão regulamentar (Chiavenato / Art. 24 da Lei nº 1.704/2006).
                if (numGrau === 3 || numGrau === 4) {
                  atualizarGrau(fator.codigo, numGrau);
                  return;
                }

                // 3. Somente as notas extremas 1, 2 e 5 exigem fundamentação no CIT (Trava Anti-Leniência)
                if (!GRAUS_EXTREMOS.includes(numGrau)) {
                  atualizarGrau(fator.codigo, numGrau);
                  return;
                }

                const respAtual = respostas[fator.codigo];
                // Se clicou na nota extrema atual que já possui justificativa ou incidente vinculado,
                // abre os detalhes para consulta ou edição do apontamento:
                if (
                  respAtual?.grau === numGrau &&
                  (respAtual.diario_bordo_id || (respAtual.justificativa && respAtual.justificativa.trim().length >= JUSTIFICATIVA_MIN))
                ) {
                  setModalFatorDetalhes(fator);
                  return;
                }

                // Caso contrário, abre o modal de justificativa obrigatória da nota (graus 1, 2 ou 5)
                abrirModalGrau(fator as any, numGrau);
              }}
              onVisualizarIncidente={(fator) => {
                setModalFatorDetalhes(fator);
              }}
              anotacoesPorFator={anotacoesPorFator}
              onVerIncidentes={(fator) => {
                setModalFatorDetalhes(fator);
              }}
            />

            <div className="rounded-lg border border-border bg-muted/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                Matriz de Escala Gráfica com 8 Fatores Obrigatórios (F1 a F8).
                {avaliacao?.homologada ? (
                  <span className="text-status-success font-medium">
                    {' '}
                    Espelho oficial da avaliação homologada. Nota Final:{' '}
                    <strong className="font-mono">{mediaParcial !== null ? mediaParcial.toFixed(2).replace('.', ',') : '0,00'}</strong>.
                  </span>
                ) : fatoresPendentes > 0 ? (
                  <span className="text-status-warning font-medium">
                    {' '}
                    {fatoresPendentes} fator(es) ainda sem grau atribuído.
                  </span>
                ) : (
                  <span className="text-status-success font-medium">
                    {' '}
                    Todos os 8 fatores avaliados. Média parcial:{' '}
                    <strong className="font-mono">{mediaParcial !== null ? mediaParcial.toFixed(2).replace('.', ',') : '0,00'}</strong>.
                  </span>
                )}
              </p>

              <div className="flex items-center gap-2 shrink-0">
                {avaliacao?.homologada ? (
                  <Badge variant="success" className="text-xs py-1.5 px-3 uppercase tracking-wider font-mono">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Homologada • Espelho Oficial
                  </Badge>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={salvarRascunho} disabled={salvando || submetendo}>
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      {salvando ? 'Salvando...' : 'Salvar Rascunho'}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={submeter}
                      disabled={submetendo || salvando || fatoresPendentes > 0}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      {submetendo ? 'Submetendo...' : 'Submeter Avaliação'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cortina lateral: todos os incidentes registrados no Diário de Bordo (CIT) do servidor */}
      {/* Cortina lateral: todos os incidentes registrados no Diário de Bordo (CIT) do servidor */}
      <Drawer
        open={drawerCitAberto}
        onClose={() => setDrawerCitAberto(false)}
        title="Incidentes Registrados (CIT)"
        icon={<BookOpen className="h-4 w-4 text-primary" />}
        className="sm:max-w-lg md:max-w-xl w-full"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="font-mono text-xs text-muted-foreground">
              {anotacoesCit.length} registro{anotacoesCit.length !== 1 ? 's' : ''} no ciclo
            </span>
            <Button variant="default" size="sm" onClick={onNovoIncidente}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Cadastrar Novo Incidente
            </Button>
          </div>
        }
      >
        <div className="space-y-3 pb-2">
          {/* Banner orientador da Técnica do Incidente Crítico */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="text-foreground font-semibold">Técnica do Incidente Crítico (CIT)</strong>
              <p className="text-muted-foreground mt-0.5">
                Utilize estes apontamentos prévios do Diário de Bordo para fundamentar notas 1, 2 ou 5 nos fatores correspondentes.
              </p>
            </div>
          </div>

          {anotacoesCit.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/10 p-6 text-center text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs font-semibold">Nenhum incidente registrado</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Não há apontamentos no Diário de Bordo para este servidor no ciclo atual.
              </p>
            </div>
          )}

          {anotacoesCit.map((a) => {
            const fatorCodigo = a.fator?.codigo ?? fatores.find((f) => f.id === a.fator_id)?.codigo;
            const fatorAlvo = fatorCodigo ? fatores.find((f) => f.codigo === fatorCodigo) : undefined;
            return renderIncidenteCard(a, fatorAlvo);
          })}
        </div>
      </Drawer>

      {/* Modal Unificado: Registros de Incidentes e Vínculos do Fator */}
      <Modal
        open={!!modalFatorDetalhes}
        onClose={() => setModalFatorDetalhes(null)}
        title={
          modalFatorDetalhes
            ? `Incidentes e Vínculos — ${modalFatorDetalhes.codigo}. ${modalFatorDetalhes.nome}`
            : 'Incidentes e Vínculos'
        }
        size="xl"
        className="sm:max-w-3xl md:max-w-4xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (modalFatorDetalhes) {
                  const fator = modalFatorDetalhes;
                  const resp = respostas[fator.codigo];
                  setModalFatorDetalhes(null);
                  abrirModalGrau(fator as any, resp?.grau ?? 2);
                }
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Cadastrar Novo Incidente para {modalFatorDetalhes?.codigo}
            </Button>
            <Button variant="default" size="sm" onClick={() => setModalFatorDetalhes(null)}>
              Fechar
            </Button>
          </div>
        }
      >
        {modalFatorDetalhes && (() => {
          const fator = modalFatorDetalhes;
          const dbFator = fatores.find((f) => f.codigo === fator.codigo);
          const fatorId = dbFator?.id || fator.id;
          const respAtual = respostas[fator.codigo];
          const grauAtual = respAtual?.grau;
          const grauInfo = grauAtual ? GRAUS.find((g) => g.valor === grauAtual) : undefined;

          // Lista de todos os incidentes deste fator no Diário de Bordo (CIT)
          const incidentesDoFator: ApiDiarioBordo[] = (
            (anotacoesPorFator[fator.codigo] as ApiDiarioBordo[]) ||
            (fatorId ? (anotacoesPorFator[fatorId] as ApiDiarioBordo[]) : undefined) ||
            (anotacoesPorFator[fator.nome] as ApiDiarioBordo[]) ||
            []
          );

          // Incidente atualmente vinculado à nota da avaliação
          const incidenteVinculado = respAtual?.diario_bordo_id
            ? incidentesDoFator.find((a) => a.id === respAtual.diario_bordo_id) ||
              anotacoesCit.find((a) => a.id === respAtual.diario_bordo_id)
            : undefined;

          const temVinculo = !!incidenteVinculado || (!!respAtual?.justificativa && respAtual.justificativa.trim().length > 0);
          const isNegativo = incidenteVinculado?.tipo === 'negativo' || respAtual?.incidente_tipo === 'negativo' || (grauAtual ? grauAtual <= 2 : true);

          return (
            <div className="space-y-4 text-xs">
              {/* 1. Card de Identificação e Resumo do Fator */}
              <div className="rounded-lg border border-border bg-muted/20 p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {fator.codigo}. {fator.nome}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{fator.descricao}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {grauAtual ? (
                      <Badge
                        variant="outline"
                        className={`font-mono text-[11px] font-bold px-2.5 py-1 ${
                          grauAtual <= 2
                            ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300'
                            : grauAtual === 5
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                            : 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-300'
                        }`}
                      >
                        Nota Atribuída: Grau {grauAtual} ({grauInfo?.label})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground">
                        Avaliação Pendente
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Seção: Incidente Vinculado à Avaliação Atual */}
              <div className="rounded-lg border border-border bg-card p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${temVinculo ? (isNegativo ? 'bg-rose-600' : 'bg-emerald-600') : 'bg-slate-400'}`} />
                      Incidente Vinculado à Avaliação (Nota {grauAtual ?? '—'})
                    </span>
                  </div>
                  {temVinculo && (
                    <Badge
                      variant={isNegativo ? 'danger' : 'success'}
                      className="text-[10px] font-mono font-semibold"
                    >
                      {isNegativo ? 'Polaridade: Negativa' : 'Polaridade: Positiva'}
                    </Badge>
                  )}
                </div>

                {temVinculo ? (
                  <div
                    className={`rounded-md border p-3 border-l-4 ${
                      isNegativo
                        ? 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 text-rose-950 dark:text-rose-100 border-l-rose-500'
                        : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100 border-l-emerald-500'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[11px]">
                          {incidenteVinculado?.data_ocorrencia
                            ? `Data do Fato: ${new Date(incidenteVinculado.data_ocorrencia).toLocaleDateString('pt-BR')}`
                            : 'Registro Concomitante na Avaliação'}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          (ID #{incidenteVinculado?.id || respAtual?.diario_bordo_id || 'Manual'})
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] font-mono text-rose-700 hover:text-rose-800 hover:bg-rose-100 dark:text-rose-300"
                        onClick={() => {
                          if (incidenteVinculado) {
                            vincularIncidente(fator.codigo, incidenteVinculado);
                          } else {
                            setRespostas((prev) => ({
                              ...prev,
                              [fator.codigo]: {
                                ...prev[fator.codigo],
                                diario_bordo_id: undefined,
                                incidente_tipo: undefined,
                              },
                            }));
                          }
                        }}
                      >
                        Desvincular deste Incidente
                      </Button>
                    </div>

                    <p className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans bg-background/80 p-2.5 rounded border border-border/60">
                      {incidenteVinculado?.descricao_fato || respAtual?.justificativa}
                    </p>

                    {/* Evidências anexadas */}
                    {(incidenteVinculado?.evidencias?.length ?? 0) > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-2">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Evidência:{' '}
                          {incidenteVinculado?.evidencias?.map((ev) => (
                            <a
                              key={ev.id}
                              href={ev.url_armazenamento || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline hover:opacity-80 ml-1"
                            >
                              {ev.nome_arquivo}
                            </a>
                          ))}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border bg-muted/10 p-3 text-center text-muted-foreground text-[11px]">
                    <p>Nenhum incidente do Diário de Bordo está atualmente vinculado à nota deste fator.</p>
                    <p className="text-[10px] mt-0.5">
                      Selecione um dos registros abaixo para vincular, ou cadastre um novo apontamento.
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Seção: Todos os Registros do Diário de Bordo para este Fator */}
              <div className="rounded-lg border border-border bg-card p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    Todos os Registros de Incidente no Diário de Bordo ({incidentesDoFator.length})
                  </h5>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {incidentesDoFator.length} registro(s) encontrado(s)
                  </span>
                </div>

                {incidentesDoFator.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-muted/10 p-4 text-center text-muted-foreground text-[11px]">
                    <p>Nenhum incidente registrado no Diário de Bordo para {fator.codigo} neste ciclo.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 text-[10px]"
                      onClick={() => {
                        setModalFatorDetalhes(null);
                        abrirModalGrau(fator as any, respAtual?.grau ?? 2);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Cadastrar Primeiro Incidente para {fator.codigo}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {incidentesDoFator.map((inc) => {
                      const isEsteVinculado = respAtual?.diario_bordo_id === inc.id;
                      const isIncNegativo = inc.tipo === 'negativo';

                      return (
                        <div
                          key={inc.id}
                          className={`rounded-md border p-2.5 text-[11px] border-l-4 transition-all ${
                            isIncNegativo
                              ? 'border-border bg-card border-l-status-danger'
                              : 'border-border bg-card border-l-status-success'
                          } ${isEsteVinculado ? 'ring-2 ring-primary/40 bg-primary/5' : ''}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-muted-foreground">
                                {new Date(inc.data_ocorrencia).toLocaleDateString('pt-BR')}
                              </span>
                              <Badge
                                variant={isIncNegativo ? 'danger' : 'success'}
                                className="text-[9px] px-1.5 py-0"
                              >
                                {isIncNegativo ? 'Negativo' : 'Positivo'}
                              </Badge>
                              {isEsteVinculado && (
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Vinculado à Avaliação (Nota {grauAtual ?? '—'})
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              ID #{inc.id}
                            </span>
                          </div>

                          <p className="text-foreground mt-1.5 leading-relaxed font-sans">
                            {inc.descricao_fato}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-1.5 border-t border-border/50">
                            <div className="flex items-center gap-2">
                              {(inc.evidencias?.length ?? 0) > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-primary font-mono">
                                  <Paperclip className="h-3 w-3" />
                                  {inc.evidencias?.[0]?.nome_arquivo || 'Evidência anexada'}
                                </span>
                              ) : (
                                <label
                                  title="Anexar evidência documental"
                                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  <span>{anexandoEvidencia === inc.id ? 'Enviando...' : 'Anexar evidência'}</span>
                                  <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    className="hidden"
                                    disabled={anexandoEvidencia === inc.id}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) anexarEvidencia(inc, file);
                                      e.target.value = '';
                                    }}
                                  />
                                </label>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant={isEsteVinculado ? 'outline' : 'default'}
                                className={`h-7 px-2.5 text-[10px] font-mono font-semibold ${
                                  isEsteVinculado
                                    ? 'text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200'
                                    : ''
                                }`}
                                onClick={() => vincularIncidente(fator.codigo, inc)}
                              >
                                {isEsteVinculado ? 'Desvincular' : `Vincular a ${fator.codigo}`}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal: justificativa obrigatória ao atribuir grau 1, 2 ou 5 */}
      {/* Modal: justificativa obrigatória / visualização de incidente (Opção 1) */}
      <Modal
        open={!!modalGrau}
        onClose={fecharModalGrau}
        title={
          modalGrau
            ? modalSomenteLeitura
              ? `Visualização do Incidente Vinculado — ${modalGrau.fator.codigo} (${modalGrau.fator.nome}) [Somente Leitura]`
              : `Nota ${modalGrau.grau} (${grauModalInfo?.label}) — Justificativa do Fator: ${modalGrau.fator.codigo} — ${modalGrau.fator.nome}`
            : 'Justificativa Obrigatória'
        }
        size="xl"
        className="sm:max-w-3xl md:max-w-4xl"
        footer={
          modalSomenteLeitura ? (
            <Button variant="default" size="sm" onClick={fecharModalGrau}>
              Fechar / Voltar
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={fecharModalGrau}>
                Cancelar / Voltar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={confirmarModalGrau}
                disabled={modalTexto.trim().length < JUSTIFICATIVA_MIN || modalConfirmando}
              >
                {modalConfirmando ? 'Gravando Apontamento...' : 'Confirmar e Gravar Nota'}
              </Button>
            </>
          )
        }
      >
        {modalGrau && (
          <div className="space-y-4 text-xs">
            {/* Banner Informativo quando em modo Somente Leitura */}
            {modalSomenteLeitura ? (
              <div className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 px-3.5 py-2.5 text-sky-800 dark:text-sky-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                  <span className="font-semibold text-xs">
                    Registro Oficial no Diário de Bordo — Modo Consulta (Somente Leitura)
                  </span>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] bg-white/80 dark:bg-slate-900/80">
                  🔒 Bloqueado para Edição
                </Badge>
              </div>
            ) : (
              /* Alerta de Diretriz Legal e Trava Anti-Leniência */
              <div className="rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2.5 text-status-warning flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Trava Anti-Leniência e Antiprecipitação (Art. 24 da Lei nº 1.704/2006)</p>
                  <p className="text-[11px] opacity-90">
                    Notas 1, 2 ou 5 exigem fundamentação detalhada (mínimo de {JUSTIFICATIVA_MIN} caracteres) e registro comprobatório no Diário de Bordo (CIT).
                  </p>
                </div>
              </div>
            )}

            {/* Alternância de Modo: Registro no Ato vs. Vínculo de Incidente Existente */}
            <div className="space-y-2">
              {!modalSomenteLeitura && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-foreground">
                    1. Método de Comprovação no Diário de Bordo:
                  </span>
                  {incidentesDoModalGrau.length > 0 && (
                    <div className="inline-flex rounded-lg p-0.5 bg-muted border border-border">
                      <button
                        type="button"
                        onClick={() => {
                          setModalModo('novo');
                          setModalIncidenteId('');
                          setModalTexto('');
                          setModalArquivo(null);
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          modalModo === 'novo'
                            ? 'bg-card text-foreground shadow-xs font-bold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        + Registrar no Ato
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalModo('vincular');
                          if (!modalIncidenteId && incidentesDoModalGrau[0]) {
                            setModalIncidenteId(String(incidentesDoModalGrau[0].id));
                            setModalTexto(incidentesDoModalGrau[0].descricao_fato);
                          }
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          modalModo === 'vincular'
                            ? 'bg-card text-foreground shadow-xs font-bold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Vincular Existente ({incidentesDoModalGrau.length})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Modo: Registro Concomitante no Ato (Opção 1) / Visualização */}
              {(modalModo === 'novo' || modalSomenteLeitura) && infoClassificacao && (
                <div className={`space-y-3 p-3.5 rounded-lg border ${infoClassificacao.bgClass}`}>
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-current/15">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>
                        {modalSomenteLeitura
                          ? `Incidente Vinculado à Nota ${modalGrau.grau}`
                          : `Registro Concomitante de Incidente no Diário de Bordo (no ato)`}
                      </span>
                    </div>
                    <Badge variant={infoClassificacao.badgeVariant} className={`text-[10px] font-mono tabular-nums ${infoClassificacao.badgeClass}`}>
                      {infoClassificacao.polaridade}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
                    {/* Coluna 1: Data do Fato Observado com visual equalizado */}
                    <div className="flex flex-col justify-between h-full p-3 rounded-lg border border-border/80 bg-card/95 shadow-xs space-y-2">
                      <div>
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/50">
                          <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                            Data do Fato Observado:
                          </label>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted font-medium text-muted-foreground">
                            Ocorrência no Ciclo
                          </span>
                        </div>
                        <div className="pt-2">
                          <input
                            type="date"
                            disabled={modalSomenteLeitura}
                            readOnly={modalSomenteLeitura}
                            value={modalDataOcorrencia}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setModalDataOcorrencia(e.target.value)}
                            className={`w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono tabular-nums focus:ring-2 focus:ring-primary focus:outline-hidden ${
                              modalSomenteLeitura ? 'cursor-not-allowed opacity-85 bg-muted/40' : ''
                            }`}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground pt-1.5 leading-relaxed">
                          Data em que o fato/conduta ocorreu durante o período do ciclo avaliativo.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground">
                          Lançamento com rubrica digital e controle de tempestividade.
                        </p>
                      </div>
                    </div>

                    {/* Coluna 2: Classificação Automática com visual equalizado */}
                    <div className="flex flex-col justify-between h-full p-3 rounded-lg border border-border/80 bg-card/95 shadow-xs space-y-2">
                      <div>
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/50">
                          <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                            <ShieldAlert className="h-3.5 w-3.5 text-status-warning shrink-0" />
                            Classificação Automática:
                          </label>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted font-bold text-foreground">
                            Nota {modalGrau.grau}
                          </span>
                        </div>
                        <div className="pt-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground text-xs">{infoClassificacao.titulo}</span>
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            Fator: <strong className="text-foreground">{modalGrau.fator.codigo} — {modalGrau.fator.nome}</strong>
                          </div>
                          <div className="text-[10.5px] text-muted-foreground pt-1 border-t border-border/50 space-y-0.5 leading-relaxed">
                            <p>
                              <span className="font-semibold text-foreground">Enquadramento:</span> {infoClassificacao.enquadramento}
                            </p>
                            <p className="opacity-90">
                              <span className="font-semibold text-foreground">Diretriz:</span> {infoClassificacao.diretriz}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground">
                          Lançamento formal no Diário de Bordo para validação da Comissão CAPD.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modo: Vincular Incidente Existente */}
              {!modalSomenteLeitura && modalModo === 'vincular' && (
                <div className="space-y-3 p-3 rounded-lg border border-border bg-card">
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Selecione o Incidente Registrado no Diário de Bordo:
                    </label>
                    <Select
                      value={modalIncidenteId}
                      onChange={selecionarIncidenteModal}
                      options={incidentesDoModalGrau.map((a) => ({
                        value: String(a.id),
                        label: `[${a.tipo === 'positivo' ? 'Positivo' : 'Negativo'} • ${new Date(a.data_ocorrencia).toLocaleDateString('pt-BR')}] ${a.descricao_fato.slice(0, 70)}${
                          a.descricao_fato.length > 70 ? '…' : ''
                        }`,
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Relato Circunstanciado dos Fatos */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-foreground">
                  2. Relato Circunstanciado dos Fatos / Fundamentação:
                </label>
                {!modalSomenteLeitura && (
                  <span
                    className={`font-mono font-bold ${
                      modalTexto.trim().length >= JUSTIFICATIVA_MIN ? 'text-status-success' : 'text-destructive'
                    }`}
                  >
                    {modalTexto.trim().length}/{JUSTIFICATIVA_MIN}
                  </span>
                )}
              </div>
              <textarea
                rows={5}
                disabled={modalSomenteLeitura}
                readOnly={modalSomenteLeitura}
                value={modalTexto}
                onChange={(e) => setModalTexto(e.target.value)}
                placeholder="Descreva com clareza os fatos objetivos observados, as circunstâncias em que ocorreram e a conduta funcional que motiva a concessão deste grau..."
                className={`w-full rounded-md border border-input bg-background p-2.5 text-xs leading-relaxed focus:ring-2 focus:ring-primary focus:outline-hidden ${
                  modalSomenteLeitura ? 'cursor-not-allowed opacity-90 bg-muted/30' : ''
                }`}
              />
              {!modalSomenteLeitura && modalTexto.trim().length < JUSTIFICATIVA_MIN && (
                <p className="text-[10px] text-destructive font-semibold mt-1">
                  Justificativa insuficiente: mínimo {JUSTIFICATIVA_MIN} caracteres obrigatórios para validação perante a Comissão CAPD.
                </p>
              )}
            </div>

            {/* Upload ou Visualização de Evidência Digital */}
            <div>
              <label className="block font-semibold text-foreground mb-1">
                3. Evidência Documental Digital (PDF / Imagem):
              </label>
              {modalSomenteLeitura ? (
                <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Paperclip className="h-4 w-4 text-primary shrink-0" />
                    <span>Evidência Documental Digital Registrada</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Documento comprobatório arquivado com rubrica digital e hash SHA-256 no repositório de segurança do tenant.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setModalArquivo(e.target.files?.[0] ?? null)}
                    className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border file:border-border file:bg-muted/40 file:px-2.5 file:py-1 file:text-xs file:font-semibold hover:file:bg-muted file:cursor-pointer"
                  />
                  {modalArquivo && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                      ✓ Arquivo selecionado: <strong>{modalArquivo.name}</strong> ({(modalArquivo.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Arquivos aceitos: PDF, PNG, JPG (tamanho máximo de 10 MB). Comprovante será rubricado digitalmente com hash criptográfico SHA-256.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AvaliacaoFormView;
