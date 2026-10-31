<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Collection;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Models\Vistoria;

final class VistoriaService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** @return Collection<int, Vistoria> mais recentes primeiro */
    public function historico(Veiculo $veiculo): Collection
    {
        return $veiculo->vistorias()->orderByDesc('validade')->orderByDesc('id')->get();
    }

    /** @param array{data_vistoria: string, certificado: string, validade: string, observacoes?: string|null} $dados */
    public function registrar(Veiculo $veiculo, array $dados): Vistoria
    {
        $vistoria = $veiculo->vistorias()->create([
            'tenant_id' => $veiculo->tenant_id,
            'data_vistoria' => $dados['data_vistoria'],
            'certificado' => $dados['certificado'],
            'validade' => $dados['validade'],
            'observacoes' => $dados['observacoes'] ?? null,
        ]);
        $this->audit->record('transporte', 'vistoria.registrada', "veiculo:{$veiculo->id}", null, $vistoria->toArray());

        return $vistoria;
    }
}
