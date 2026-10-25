<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;
use Modules\Educa\Models\EducaTransportDriver;
use Modules\Pessoas\Models\Pessoa;

/**
 * Gestão de Credenciamento de Motoristas e Monitores com MDM Pessoas e Validação CTB.
 */
final class TransportDriverService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     tipo_funcao?: string|null,
     *     ativo?: bool|null,
     *     busca?: string|null
     * } $filtros
     * @return Collection<int, EducaTransportDriver>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaTransportDriver::query()
            ->with(['pessoa']);

        if (! empty($filtros['tipo_funcao'])) {
            $query->where('tipo_funcao', $filtros['tipo_funcao']);
        }

        if (isset($filtros['ativo']) && $filtros['ativo'] !== null) {
            $query->where('ativo', (bool) $filtros['ativo']);
        }

        if (! empty($filtros['busca'])) {
            $busca = (string) $filtros['busca'];
            $query->where(function ($q) use ($busca): void {
                $q->where('cnh_numero', 'like', "%{$busca}%")
                    ->orWhereHas('pessoa', function ($pq) use ($busca): void {
                        $pq->where('nome', 'like', "%{$busca}%")
                            ->orWhere('cpf', 'like', "%{$busca}%");
                    });
            });
        }

        return $query->orderBy('tipo_funcao')->get();
    }

    public function obter(string $condutorId): EducaTransportDriver
    {
        return EducaTransportDriver::query()
            ->with(['pessoa'])
            ->findOrFail($condutorId);
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     pessoa_id: int,
     *     tipo_funcao: string,
     *     cnh_numero?: string|null,
     *     cnh_categoria?: string|null,
     *     cnh_validade?: string|null,
     *     curso_transporte_escolar?: bool|null,
     *     validade_curso?: string|null,
     *     ativo?: bool|null
     * } $dados
     */
    public function criar(array $dados): EducaTransportDriver
    {
        Pessoa::findOrFail($dados['pessoa_id']);

        $tipoFuncao = $dados['tipo_funcao'] ?? EducaTransportDriver::FUNCAO_MOTORISTA;

        if ($tipoFuncao === EducaTransportDriver::FUNCAO_MOTORISTA) {
            $categoria = strtoupper((string) ($dados['cnh_categoria'] ?? ''));
            if (! in_array($categoria, ['D', 'E'], true)) {
                throw new LogicException('Motoristas de transporte escolar exigem CNH categoria D ou E, conforme o Código de Trânsito Brasileiro.');
            }

            if (empty($dados['cnh_validade'])) {
                throw new LogicException('A data de validade da CNH é obrigatória para o credenciamento de motoristas.');
            }

            if (Carbon::parse($dados['cnh_validade'])->isPast()) {
                throw new LogicException('Não é permitido cadastrar condutor com CNH vencida.');
            }
        }

        $jaExiste = EducaTransportDriver::query()
            ->where('pessoa_id', $dados['pessoa_id'])
            ->where('tipo_funcao', $tipoFuncao)
            ->exists();

        if ($jaExiste) {
            throw new LogicException("Esta pessoa já está credenciada como {$tipoFuncao} neste município.");
        }

        return DB::transaction(function () use ($dados): EducaTransportDriver {
            $condutor = EducaTransportDriver::create($dados);
            $condutor->load(['pessoa']);

            $this->audit->record('educa', 'transport_driver.created', "EducaTransportDriver #{$condutor->id}", null, $condutor->toArray());

            return $condutor;
        });
    }

    /**
     * @param array{
     *     cnh_numero?: string|null,
     *     cnh_categoria?: string|null,
     *     cnh_validade?: string|null,
     *     curso_transporte_escolar?: bool|null,
     *     validade_curso?: string|null,
     *     ativo?: bool|null
     * } $dados
     */
    public function atualizar(string $condutorId, array $dados): EducaTransportDriver
    {
        $condutor = $this->obter($condutorId);
        $antes = $condutor->toArray();

        if ($condutor->tipo_funcao === EducaTransportDriver::FUNCAO_MOTORISTA) {
            if (isset($dados['cnh_categoria'])) {
                $categoria = strtoupper((string) $dados['cnh_categoria']);
                if (! in_array($categoria, ['D', 'E'], true)) {
                    throw new LogicException('Motoristas de transporte escolar exigem CNH categoria D ou E.');
                }
            }

            if (isset($dados['cnh_validade']) && Carbon::parse($dados['cnh_validade'])->isPast()) {
                throw new LogicException('A CNH informada está vencida.');
            }
        }

        return DB::transaction(function () use ($condutor, $dados, $antes): EducaTransportDriver {
            $condutor->update(array_filter($dados, fn ($val) => $val !== null));
            $condutor->load(['pessoa']);

            $this->audit->record('educa', 'transport_driver.updated', "EducaTransportDriver #{$condutor->id}", $antes, $condutor->toArray());

            return $condutor;
        });
    }
}
