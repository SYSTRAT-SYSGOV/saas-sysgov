<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaIncidentAction;
use Modules\Educa\Models\EducaStudentIncident;
use Modules\Pessoas\Models\Pessoa;

/**
 * Gestão de Ocorrências Pedagógicas, Disciplinares e Ciência dos Responsáveis.
 */
final class IncidentService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /**
     * @param array{
     *     school_id?: string|null,
     *     enrollment_id?: string|null,
     *     tipo?: string|null,
     *     gravidade?: string|null,
     *     status?: string|null,
     *     busca?: string|null
     * } $filtros
     * @return Collection<int, EducaStudentIncident>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaStudentIncident::query()
            ->with(['school.orgUnit', 'enrollment.alunoPessoa', 'alunoPessoa', 'actions', 'responsavelCiencia']);

        if (! empty($filtros['school_id'])) {
            $query->where('school_id', $filtros['school_id']);
        }

        if (! empty($filtros['enrollment_id'])) {
            $query->where('enrollment_id', $filtros['enrollment_id']);
        }

        if (! empty($filtros['tipo'])) {
            $query->where('tipo', $filtros['tipo']);
        }

        if (! empty($filtros['gravidade'])) {
            $query->where('gravidade', $filtros['gravidade']);
        }

        if (! empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        if (! empty($filtros['busca'])) {
            $busca = (string) $filtros['busca'];
            $query->where(function ($q) use ($busca): void {
                $q->where('numero_sequencial', 'like', "%{$busca}%")
                    ->orWhere('relato', 'like', "%{$busca}%");
            });
        }

        return $query->orderByDesc('data_ocorrencia')->get();
    }

    public function obter(string $ocorrenciaId): EducaStudentIncident
    {
        return EducaStudentIncident::query()
            ->with(['school.orgUnit', 'enrollment.alunoPessoa', 'alunoPessoa', 'actions.operador', 'author', 'responsavelCiencia'])
            ->findOrFail($ocorrenciaId);
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     enrollment_id: string,
     *     tipo: string,
     *     gravidade: string,
     *     relato: string,
     *     data_ocorrencia: string,
     *     autor_user_id?: int|null,
     *     school_id?: string|null
     * } $dados
     */
    public function criar(array $dados): EducaStudentIncident
    {
        $matricula = EducaEnrollment::findOrFail($dados['enrollment_id']);

        if ($matricula->status !== EducaEnrollment::STATUS_ATIVA) {
            throw new LogicException('Ocorrências disciplinares e pedagógicas somente podem ser registradas para estudantes com matrícula ativa.');
        }

        return DB::transaction(function () use ($dados, $matricula): EducaStudentIncident {
            $ano = Carbon::parse($dados['data_ocorrencia'])->year;
            $count = EducaStudentIncident::query()
                ->whereYear('data_ocorrencia', $ano)
                ->count();
            $sequencial = sprintf('OC-%d-%06d', $ano, $count + 1);

            $dados['numero_sequencial'] = $sequencial;
            $dados['school_id'] = $matricula->school_id;
            $dados['aluno_pessoa_id'] = $matricula->aluno_pessoa_id;
            $dados['status'] = EducaStudentIncident::STATUS_ABERTA;

            $ocorrencia = EducaStudentIncident::create($dados);
            $ocorrencia->load(['school', 'enrollment.alunoPessoa', 'alunoPessoa']);

            $this->audit->record('educa', 'incident.created', "EducaStudentIncident #{$ocorrencia->id}", null, $ocorrencia->toArray());

            return $ocorrencia;
        });
    }

    /**
     * @param array{
     *     relato?: string|null,
     *     tipo?: string|null,
     *     gravidade?: string|null,
     *     status?: string|null
     * } $dados
     */
    public function atualizar(string $ocorrenciaId, array $dados): EducaStudentIncident
    {
        $ocorrencia = $this->obter($ocorrenciaId);
        $antes = $ocorrencia->toArray();

        return DB::transaction(function () use ($ocorrencia, $dados, $antes): EducaStudentIncident {
            $ocorrencia->update(array_filter($dados, fn ($val) => $val !== null));
            $ocorrencia->load(['school', 'enrollment.alunoPessoa', 'alunoPessoa', 'actions']);

            $this->audit->record('educa', 'incident.updated', "EducaStudentIncident #{$ocorrencia->id}", $antes, $ocorrencia->toArray());

            return $ocorrencia;
        });
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     tipo_acao: string,
     *     descricao: string,
     *     exige_comparecimento?: bool|null,
     *     operador_user_id?: int|null,
     *     data_acao?: string|null
     * } $dados
     */
    public function adicionarAcao(string $ocorrenciaId, array $dados): EducaIncidentAction
    {
        $ocorrencia = $this->obter($ocorrenciaId);

        return DB::transaction(function () use ($ocorrencia, $dados): EducaIncidentAction {
            $dados['incident_id'] = $ocorrencia->id;
            $dados['data_acao'] = $dados['data_acao'] ?? Carbon::now()->toDateString();
            $dados['exige_comparecimento'] = (bool) ($dados['exige_comparecimento'] ?? false);

            $acao = EducaIncidentAction::create($dados);

            if ($dados['exige_comparecimento']) {
                $ocorrencia->update(['status' => EducaStudentIncident::STATUS_EM_ANALISE]);

                // Dispara evento no Outbox para notificação prioritária aos responsáveis
                $this->outbox->publish('educa.comunicacao.convocacao_responsaveis', [
                    'tenant_id' => $ocorrencia->tenant_id,
                    'incident_id' => $ocorrencia->id,
                    'numero_sequencial' => $ocorrencia->numero_sequencial,
                    'aluno_pessoa_id' => $ocorrencia->aluno_pessoa_id,
                    'tipo' => $ocorrencia->tipo,
                    'gravidade' => $ocorrencia->gravidade,
                    'motivo' => $acao->descricao,
                ], $ocorrencia->tenant_id);
            }

            $this->audit->record('educa', 'incident_action.created', "EducaIncidentAction #{$acao->id}", null, $acao->toArray());

            return $acao;
        });
    }

    public function registrarCiencia(string $ocorrenciaId, int $responsavelPessoaId, ?string $observacao = null): EducaStudentIncident
    {
        $ocorrencia = $this->obter($ocorrenciaId);
        Pessoa::findOrFail($responsavelPessoaId);

        return DB::transaction(function () use ($ocorrencia, $responsavelPessoaId, $observacao): EducaStudentIncident {
            $ocorrencia->update([
                'status' => EducaStudentIncident::STATUS_CIENTIFICADA,
                'data_ciencia' => Carbon::now(),
                'responsavel_ciencia_id' => $responsavelPessoaId,
            ]);

            if ($observacao) {
                EducaIncidentAction::create([
                    'tenant_id' => $ocorrencia->tenant_id,
                    'incident_id' => $ocorrencia->id,
                    'tipo_acao' => 'Registro de Ciência do Responsável',
                    'descricao' => $observacao,
                    'exige_comparecimento' => false,
                    'data_acao' => Carbon::now()->toDateString(),
                ]);
            }

            $ocorrencia->load(['school', 'enrollment.alunoPessoa', 'alunoPessoa', 'actions', 'responsavelCiencia']);

            $this->audit->record('educa', 'incident.acknowledged', "EducaStudentIncident #{$ocorrencia->id}", null, $ocorrencia->toArray());

            return $ocorrencia;
        });
    }
}
