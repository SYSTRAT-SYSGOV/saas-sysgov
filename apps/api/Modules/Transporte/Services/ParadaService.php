<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Transporte\Models\Parada;
use Modules\Transporte\Models\RotaParada;
use Modules\Transporte\Support\ConflitoException;

final class ParadaService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** @param array<string, mixed> $dados */
    public function salvar(?Parada $parada, array $dados): Parada
    {
        $lat = $dados['latitude'] ?? null;
        $lng = $dados['longitude'] ?? null;
        if (($lat === null) !== ($lng === null)) {
            throw new DomainException('Informe latitude e longitude juntas, ou deixe as duas vazias.');
        }
        if ($lat !== null && (abs((float) $lat) > 90 || abs((float) $lng) > 180)) {
            throw new DomainException('Coordenadas fora da faixa: latitude de -90 a 90 e longitude de -180 a 180.');
        }

        return DB::transaction(function () use ($parada, $dados, $lat, $lng): Parada {
            $antes = $parada?->toArray();
            $campos = [
                'nome' => $dados['nome'],
                'descricao' => $dados['descricao'] ?? null,
                'latitude' => $lat,
                'longitude' => $lng,
                'cep' => isset($dados['cep']) ? preg_replace('/\D/', '', (string) $dados['cep']) ?: null : null,
                'logradouro' => $dados['logradouro'] ?? null,
                'numero' => $dados['numero'] ?? null,
                'complemento' => $dados['complemento'] ?? null,
                'bairro' => $dados['bairro'] ?? null,
                'cidade' => $dados['cidade'] ?? null,
                'uf' => isset($dados['uf']) ? strtoupper((string) $dados['uf']) : null,
                'referencia' => $dados['referencia'] ?? null,
                'ativa' => $dados['ativa'] ?? true,
            ];
            $parada = $parada === null ? Parada::create($campos) : tap($parada)->update($campos);
            $this->audit->record('transporte', $antes === null ? 'parada.criada' : 'parada.alterada', "parada:{$parada->id}", $antes, $parada->toArray());

            return $parada;
        });
    }

    public function excluir(Parada $parada): void
    {
        if (RotaParada::query()->where('parada_id', $parada->id)->exists()) {
            throw new ConflitoException('A parada está em um itinerário; inative-a em vez de excluir.');
        }
        $antes = $parada->toArray();
        $parada->delete();
        $this->audit->record('transporte', 'parada.excluida', "parada:{$parada->id}", $antes, null);
    }
}
