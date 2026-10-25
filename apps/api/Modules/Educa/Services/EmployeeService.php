<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Educa\Models\EducaEmployee;
use Modules\Educa\Models\EducaEmployeeRole;
use Modules\Educa\Models\EducaTeacherQualification;
use Modules\Pessoas\Models\Pessoa;

/**
 * Serviço de Gestão Cadastral e Vida Funcional de Servidores Escolares.
 */
final class EmployeeService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Cadastra a extensão funcional de um servidor vinculando a uma pessoa física existente.
     *
     * @param array<string, mixed> $dados
     */
    public function cadastrar(array $dados, int $tenantId): EducaEmployee
    {
        // 1. Validação de Pessoa Física Existente
        $pessoa = Pessoa::query()
            ->where('tenant_id', $tenantId)
            ->where('id', $dados['pessoa_id'])
            ->first();

        if ($pessoa === null) {
            throw ValidationException::withMessages([
                'pessoa_id' => ['A pessoa física informada não foi localizada no cadastro municipal.'],
            ]);
        }

        // 2. Trava de Duplicidade: 1 Servidor por Pessoa no Tenant
        $existente = EducaEmployee::query()
            ->where('tenant_id', $tenantId)
            ->where('pessoa_id', $dados['pessoa_id'])
            ->first();

        if ($existente !== null) {
            throw ValidationException::withMessages([
                'pessoa_id' => ['Esta pessoa física já possui cadastro de servidor ativo neste município.'],
            ]);
        }

        return DB::transaction(function () use ($dados, $tenantId): EducaEmployee {
            /** @var EducaEmployee $servidor */
            $servidor = EducaEmployee::create([
                'tenant_id' => $tenantId,
                'pessoa_id' => $dados['pessoa_id'],
                'carga_horaria_semanal' => $dados['carga_horaria_semanal'] ?? 40.00,
                'escolaridade' => $dados['escolaridade'] ?? null,
                'codigo_inep_docente' => $dados['codigo_inep_docente'] ?? null,
                'ativo' => $dados['ativo'] ?? true,
            ]);

            // Se funções forem informadas no cadastro inicial
            if (!empty($dados['funcoes']) && is_array($dados['funcoes'])) {
                foreach ($dados['funcoes'] as $funcao) {
                    $this->adicionarFuncaoInterno($servidor, $funcao);
                }
            }

            $this->audit->record('educa', 'employee.created', "EducaEmployee #{$servidor->id}", null, $servidor->toArray());

            return $servidor->load(['pessoa', 'funcoes']);
        });
    }

    /**
     * Retorna a ficha funcional completa do servidor escolar.
     */
    public function detalhar(string $servidorId): EducaEmployee
    {
        return EducaEmployee::with([
            'pessoa',
            'funcoes',
            'alocacoes.escola',
            'alocacoes.anoLetivo',
            'afastamentos',
            'habilitacoes.componenteCurricular',
            'faltas.escola',
        ])->where('id', $servidorId)->firstOrFail();
    }

    /**
     * Atualiza dados funcionais do servidor.
     *
     * @param array<string, mixed> $dados
     */
    public function atualizar(string $servidorId, array $dados): EducaEmployee
    {
        /** @var EducaEmployee $servidor */
        $servidor = EducaEmployee::query()->where('id', $servidorId)->firstOrFail();
        $antes = $servidor->toArray();

        $servidor->update(array_filter([
            'carga_horaria_semanal' => $dados['carga_horaria_semanal'] ?? null,
            'escolaridade' => $dados['escolaridade'] ?? null,
            'codigo_inep_docente' => $dados['codigo_inep_docente'] ?? null,
            'ativo' => isset($dados['ativo']) ? (bool) $dados['ativo'] : null,
        ], fn ($val) => $val !== null));

        $this->audit->record('educa', 'employee.updated', "EducaEmployee #{$servidor->id}", $antes, $servidor->toArray());

        return $servidor->fresh(['pessoa', 'funcoes']);
    }

    /**
     * Atribui uma nova função profissional e matrícula ao servidor.
     *
     * @param array<string, mixed> $dados
     */
    public function adicionarFuncao(string $servidorId, array $dados): EducaEmployeeRole
    {
        /** @var EducaEmployee $servidor */
        $servidor = EducaEmployee::query()->where('id', $servidorId)->firstOrFail();

        return $this->adicionarFuncaoInterno($servidor, $dados);
    }

    /**
     * Remove uma função atribuída ao servidor.
     */
    public function removerFuncao(string $servidorId, string $funcaoId): void
    {
        $funcao = EducaEmployeeRole::query()
            ->where('employee_id', $servidorId)
            ->where('id', $funcaoId)
            ->firstOrFail();

        $dados = $funcao->toArray();
        $funcao->delete();

        $this->audit->record('educa', 'employee_role.deleted', "EducaEmployeeRole #{$funcaoId}", $dados, null);
    }

    /**
     * Sincroniza as habilitações curriculares do docente.
     *
     * @param list<string> $componentIds
     * @return Collection<int, EducaTeacherQualification>
     */
    public function sincronizarHabilitacoes(string $servidorId, array $componentIds): Collection
    {
        /** @var EducaEmployee $servidor */
        $servidor = EducaEmployee::query()->where('id', $servidorId)->firstOrFail();

        return DB::transaction(function () use ($servidor, $componentIds): Collection {
            // Remove habilitações não presentes
            EducaTeacherQualification::query()
                ->where('employee_id', $servidor->id)
                ->whereNotIn('curriculum_component_id', $componentIds)
                ->delete();

            // Insere novas
            foreach ($componentIds as $compUuid) {
                EducaTeacherQualification::query()->firstOrCreate([
                    'tenant_id' => $servidor->tenant_id,
                    'employee_id' => $servidor->id,
                    'curriculum_component_id' => $compUuid,
                ]);
            }

            $this->audit->record('educa', 'teacher_qualifications.synced', "EducaEmployee #{$servidor->id}", null, ['components' => $componentIds]);

            return EducaTeacherQualification::with('componenteCurricular')
                ->where('employee_id', $servidor->id)
                ->get();
        });
    }

    /**
     * Lista servidores com filtros.
     *
     * @param array<string, mixed> $filtros
     * @return Collection<int, EducaEmployee>
     */
    public function listar(array $filtros, int $tenantId): Collection
    {
        $query = EducaEmployee::with(['pessoa', 'funcoes'])
            ->where('tenant_id', $tenantId);

        if (isset($filtros['ativo'])) {
            $query->where('ativo', (bool) $filtros['ativo']);
        }

        if (!empty($filtros['school_id'])) {
            $query->whereHas('alocacoes', function ($q) use ($filtros): void {
                $q->where('school_id', $filtros['school_id'])
                  ->where('status', 'ativa');
            });
        }

        if (!empty($filtros['busca'])) {
            $termo = '%' . strtolower(trim((string) $filtros['busca'])) . '%';
            $query->where(function ($q) use ($termo): void {
                $q->where('codigo_inep_docente', 'like', $termo)
                  ->orWhereHas('pessoa', function ($qp) use ($termo): void {
                      $qp->where(DB::raw('LOWER(nome)'), 'like', $termo);
                  })
                  ->orWhereHas('funcoes', function ($qf) use ($termo): void {
                      $qf->where('matricula', 'like', $termo);
                  });
            });
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    /**
     * Helper interno para criação de função.
     *
     * @param array<string, mixed> $dados
     */
    private function adicionarFuncaoInterno(EducaEmployee $servidor, array $dados): EducaEmployeeRole
    {
        // Validação de unicidade de matrícula no tenant
        $matriculaEmUso = EducaEmployeeRole::query()
            ->where('tenant_id', $servidor->tenant_id)
            ->where('matricula', $dados['matricula'])
            ->exists();

        if ($matriculaEmUso) {
            throw ValidationException::withMessages([
                'matricula' => ["A matrícula funcional {$dados['matricula']} já está em uso neste município."],
            ]);
        }

        /** @var EducaEmployeeRole $role */
        $role = EducaEmployeeRole::create([
            'tenant_id' => $servidor->tenant_id,
            'employee_id' => $servidor->id,
            'nome_funcao' => $dados['nome_funcao'],
            'matricula' => $dados['matricula'],
            'is_docente' => $dados['is_docente'] ?? true,
        ]);

        $this->audit->record('educa', 'employee_role.created', "EducaEmployeeRole #{$role->id}", null, $role->toArray());

        return $role;
    }
}
