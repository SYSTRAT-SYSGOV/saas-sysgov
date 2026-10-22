import type { ApiRequester } from '../base';
import type {
  Andamento,
  Atributo,
  CreateAtributoInput,
  CreateProcessoInput,
  CreateTipoTramitacaoInput,
  CreateVinculoInput,
  DashboardData,
  DashboardFiltros,
  Documento,
  ListProcessosParams,
  Paginado,
  PrazoExcedidoItem,
  Processo,
  ProcessoLocalizacao,
  ProcessoPermanenciaItem,
  PromoverRequerimentoInput,
  ReceberProcessoInput,
  TipoTramitacao,
  TramitarProcessoInput,
  UpdateProcessoInput,
  UpdateTipoTramitacaoInput,
  Vinculo,
} from './types';

function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      clean[key] = String(value);
    }
  }
  const qs = new URLSearchParams(clean).toString();
  return qs ? `?${qs}` : '';
}

export class ProtocoloModuleClient {
  readonly moduleName = 'protocolo';

  constructor(private readonly api: ApiRequester) {}

  // ── Processos ─────────────────────────────────────────────────────────────

  async list(params: ListProcessosParams = {}): Promise<Paginado<Processo>> {
    const qs = buildQueryString(params as Record<string, unknown>);
    return this.api.request(`/${this.moduleName}/processos${qs}`);
  }

  async get(id: number): Promise<Processo> {
    return this.api.request(`/${this.moduleName}/processos/${id}`);
  }

  async create(input: CreateProcessoInput | FormData): Promise<Processo> {
    if (input instanceof FormData) {
      return this.api.request(`/${this.moduleName}/processos`, {
        method: 'POST',
        body: input as unknown as string,
      });
    }

    return this.api.request(`/${this.moduleName}/processos`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async update(id: number, input: UpdateProcessoInput): Promise<Processo> {
    return this.api.request(`/${this.moduleName}/processos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async delete(id: number): Promise<{ message: string }> {
    return this.api.request(`/${this.moduleName}/processos/${id}`, {
      method: 'DELETE',
    });
  }

  async filhos(id: number): Promise<Processo[]> {
    return this.api.request(`/${this.moduleName}/processos/${id}/filhos`);
  }

  async concluir(id: number, input: { despacho?: string } = {}): Promise<Processo> {
    return this.api.request(`/${this.moduleName}/processos/${id}/concluir`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async arquivar(id: number, input: { tipo_arquivamento: 'corrente' | 'intermediario' | 'permanente'; despacho?: string }): Promise<Processo> {
    return this.api.request(`/${this.moduleName}/processos/${id}/arquivar`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async desarquivar(id: number, input: { motivo?: string } = {}): Promise<Processo> {
    return this.api.request(`/${this.moduleName}/processos/${id}/desarquivar`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async reabrir(id: number, input: { motivo?: string } = {}): Promise<Processo> {
    return this.api.request(`/${this.moduleName}/processos/${id}/reabrir`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async rastrearPublico(numero: number, ano: number, documento?: string): Promise<Record<string, unknown>> {
    const qs = buildQueryString({ numero, ano, documento });
    return this.api.request(`/${this.moduleName}/processos/consulta-publica${qs}`);
  }

  // ── Tramitação, Localização e Prazos ──────────────────────────────────────

  async andamentos(processoId: number): Promise<Andamento[]> {
    return this.api.request(`/${this.moduleName}/processos/${processoId}/andamentos`);
  }

  async tramitar(processoId: number, input: TramitarProcessoInput): Promise<Andamento> {
    return this.api.request(`/${this.moduleName}/processos/${processoId}/andamentos`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async receber(processoId: number, input: ReceberProcessoInput = {}): Promise<Andamento> {
    return this.api.request(`/${this.moduleName}/processos/${processoId}/andamentos/atual/receber`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async localizacao(processoId: number): Promise<ProcessoLocalizacao> {
    return this.api.request(`/${this.moduleName}/processos/${processoId}/localizacao`);
  }

  async permanencia(processoId: number): Promise<ProcessoPermanenciaItem[]> {
    return this.api.request(`/${this.moduleName}/processos/${processoId}/permanencia`);
  }

  async prazosExcedidos(): Promise<PrazoExcedidoItem[]> {
    return this.api.request(`/${this.moduleName}/prazos/excedidos`);
  }

  // ── Documentos ────────────────────────────────────────────────────────────

  async documentos(processoId: number): Promise<Documento[]> {
    return this.api.request(`/${this.moduleName}/processos/${processoId}/documentos`);
  }

  async anexarDocumento(processoId: number, formData: FormData): Promise<Documento> {
    return this.api.request(`/${this.moduleName}/processos/${processoId}/documentos`, {
      method: 'POST',
      body: formData as unknown as string,
    });
  }

  async removerDocumento(processoId: number, documentoId: number): Promise<{ message: string }> {
    return this.api.request(`/${this.moduleName}/processos/${processoId}/documentos/${documentoId}`, {
      method: 'DELETE',
    });
  }

  // ── Atributos ─────────────────────────────────────────────────────────────

  async atributos(processoId: number): Promise<Atributo[]> {
    return this.api.request(`/${this.moduleName}/processos/${processoId}/atributos`);
  }

  async salvarAtributo(processoId: number, input: CreateAtributoInput): Promise<Atributo> {
    return this.api.request(`/${this.moduleName}/processos/${processoId}/atributos`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async removerAtributo(processoId: number, chave: string): Promise<{ message: string }> {
    return this.api.request(`/${this.moduleName}/processos/${processoId}/atributos/${chave}`, {
      method: 'DELETE',
    });
  }

  // ── Vínculos e Promoção ───────────────────────────────────────────────────

  async vinculos(processoId: number): Promise<Vinculo[]> {
    return this.api.request(`/${this.moduleName}/processos/${processoId}/vinculos`);
  }

  async criarVinculo(processoId: number, input: CreateVinculoInput): Promise<Vinculo> {
    return this.api.request(`/${this.moduleName}/processos/${processoId}/vinculos`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async removerVinculo(processoId: number, vinculoId: number): Promise<{ message: string }> {
    return this.api.request(`/${this.moduleName}/processos/${processoId}/vinculos/${vinculoId}`, {
      method: 'DELETE',
    });
  }

  async consultaReversaVinculos(entidadeTipo: string, entidadeId: number): Promise<Vinculo[]> {
    return this.api.request(
      `/${this.moduleName}/vinculos?entidade_tipo=${encodeURIComponent(entidadeTipo)}&entidade_id=${entidadeId}`,
    );
  }

  async promoverRequerimento(input: PromoverRequerimentoInput): Promise<Processo> {
    return this.api.request(`/${this.moduleName}/processos/promover-requerimento`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  async dashboard(filtros: DashboardFiltros = {}): Promise<DashboardData> {
    const qs = buildQueryString(filtros as Record<string, unknown>);
    return this.api.request(`/${this.moduleName}/dashboard${qs}`);
  }

  // ── Tipos de Tramitação ───────────────────────────────────────────────────

  async tiposTramitacao(): Promise<TipoTramitacao[]> {
    return this.api.request(`/${this.moduleName}/tipos-tramitacao`);
  }

  async criarTipoTramitacao(input: CreateTipoTramitacaoInput): Promise<TipoTramitacao> {
    return this.api.request(`/${this.moduleName}/tipos-tramitacao`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async atualizarTipoTramitacao(id: number, input: UpdateTipoTramitacaoInput): Promise<TipoTramitacao> {
    return this.api.request(`/${this.moduleName}/tipos-tramitacao/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async removerTipoTramitacao(id: number): Promise<{ message: string }> {
    return this.api.request(`/${this.moduleName}/tipos-tramitacao/${id}`, {
      method: 'DELETE',
    });
  }
}
