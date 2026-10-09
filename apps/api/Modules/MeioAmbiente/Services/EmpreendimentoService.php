<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Services;

use App\Support\AuditLogger;
use Illuminate\Pagination\LengthAwarePaginator;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\ResponsavelTecnico;
use Modules\MeioAmbiente\Support\RegraNegocioException;

/** Cadastro de empreendimentos e seus responsáveis técnicos (cadastro mestre do módulo de Meio Ambiente). */
final readonly class EmpreendimentoService
{
    public function __construct(private AuditLogger $audit) {}

    /** @param array<string, mixed> $dados */
    public function criarEmpreendimento(array $dados): Empreendimento
    {
        $temTitularPessoaFisica = ! empty($dados['titular_pessoa_id']);
        $temCnpj = ! empty($dados['cnpj']);

        if (! $temTitularPessoaFisica && ! $temCnpj) {
            throw new RegraNegocioException(
                'titular_obrigatorio',
                'Empreendimento precisa de um titular pessoa física ou jurídica.',
            );
        }

        $empreendimento = Empreendimento::create($dados);
        $this->audit->record('meio_ambiente', 'empreendimento.criado', "Empreendimento #{$empreendimento->id}", null, $empreendimento->toArray());

        return $empreendimento;
    }

    /** @param array<string, mixed> $dados */
    public function vincularResponsavelTecnico(Empreendimento $empreendimento, array $dados): ResponsavelTecnico
    {
        $antes = $empreendimento->responsavelTecnico()->first()?->toArray();

        $responsavel = ResponsavelTecnico::updateOrCreate(
            ['empreendimento_id' => $empreendimento->id],
            $dados + ['empreendimento_id' => $empreendimento->id],
        );
        $this->audit->record('meio_ambiente', 'empreendimento.responsavel_tecnico_vinculado', "Empreendimento #{$empreendimento->id}", $antes, $responsavel->toArray());

        return $responsavel;
    }

    /**
     * Usada pelo processo de licenciamento (Fase 3) antes de abrir ou avançar um
     * processo — ver spec `meio-ambiente/empreendimentos`, cenário "Empreendimento
     * sem responsável técnico não pode iniciar licenciamento".
     */
    public function garantirResponsavelTecnico(Empreendimento $empreendimento): void
    {
        if ($empreendimento->responsavelTecnico()->doesntExist()) {
            throw new RegraNegocioException(
                'responsavel_tecnico_obrigatorio',
                'Responsável técnico obrigatório para licenciamento.',
            );
        }
    }

    /**
     * @param array{q?: string, per_page?: int} $filtros
     * @return LengthAwarePaginator<int, Empreendimento>
     */
    public function listar(array $filtros = []): LengthAwarePaginator
    {
        return Empreendimento::query()
            ->with(['titular', 'responsavelTecnico'])
            ->when($filtros['q'] ?? null, fn ($query, string $q) => $query->where('razao_social', 'like', "%{$q}%")
                ->orWhere('atividade', 'like', "%{$q}%"))
            ->latest()
            ->paginate((int) ($filtros['per_page'] ?? 25));
    }

    /**
     * Listagem georreferenciada para mapa interativo, com filtro por atividade e porte
     * — ver spec `meio-ambiente/empreendimentos`, cenário "Consulta em mapa filtrando por atividade".
     *
     * @param array{atividade?: string, porte?: string} $filtros
     * @return array<int, array<string, mixed>>
     */
    public function listarParaMapa(array $filtros = []): array
    {
        return Empreendimento::query()
            ->when($filtros['atividade'] ?? null, fn ($query, string $atividade) => $query->where('atividade', $atividade))
            ->when($filtros['porte'] ?? null, fn ($query, string $porte) => $query->where('porte', $porte))
            ->get()
            ->map(fn (Empreendimento $empreendimento): array => [
                'type' => 'Feature',
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => [(float) $empreendimento->longitude, (float) $empreendimento->latitude],
                ],
                'properties' => [
                    'id' => $empreendimento->id,
                    'atividade' => $empreendimento->atividade,
                    'porte' => $empreendimento->porte,
                    'razao_social' => $empreendimento->razao_social,
                ],
            ])
            ->all();
    }
}
