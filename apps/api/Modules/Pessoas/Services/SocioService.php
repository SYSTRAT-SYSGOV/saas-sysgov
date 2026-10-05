<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaSocio;
use Modules\Pessoas\Support\RegraNegocioException;

/** Quadro societário de pessoa jurídica (spec: Quadro societário de pessoa jurídica). */
final readonly class SocioService
{
    public function __construct(private AuditLogger $audit) {}

    /** @param array<string, mixed> $dados */
    public function adicionar(Pessoa $pessoa, array $dados): PessoaSocio
    {
        return DB::transaction(function () use ($pessoa, $dados): PessoaSocio {
            $socio = Pessoa::findOrFail($dados['socio_pessoa_id']);
            $this->validarSocio($pessoa, $socio);

            $vinculo = $pessoa->socios()->create($dados);

            $this->audit->record('pessoas', 'pessoa.socio_adicionado', "Pessoa #{$pessoa->id}", null, $vinculo->toArray());

            return $vinculo;
        });
    }

    /** @param array<string, mixed> $dados */
    public function atualizar(PessoaSocio $socio, array $dados): PessoaSocio
    {
        $antes = $socio->toArray();
        $socio->update($dados);
        $this->audit->record('pessoas', 'pessoa.socio_atualizado', "Sócio #{$socio->id}", $antes, $socio->toArray());

        return $socio;
    }

    public function encerrar(PessoaSocio $socio, ?string $fim = null): PessoaSocio
    {
        $antes = $socio->toArray();
        $socio->update(['data_saida' => $fim ?? today()->toDateString()]);
        $this->audit->record('pessoas', 'pessoa.socio_encerrado', "Sócio #{$socio->id}", $antes, $socio->toArray());

        return $socio;
    }

    private function validarSocio(Pessoa $pessoa, Pessoa $socio): void
    {
        if ($socio->id === $pessoa->id) {
            throw new RegraNegocioException('socio.autorreferencia', 'Uma pessoa jurídica não pode ser sócia de si mesma.');
        }

        if ($socio->tipo !== 'fisica') {
            throw new RegraNegocioException('socio.deve_ser_fisica', 'Apenas pessoas físicas podem compor o quadro societário.');
        }

        $vinculoAtivoExistente = PessoaSocio::where('pessoa_id', $pessoa->id)
            ->where('socio_pessoa_id', $socio->id)
            ->whereNull('data_saida')
            ->exists();

        if ($vinculoAtivoExistente) {
            throw new RegraNegocioException('socio.ja_vinculado', 'Esta pessoa já é sócia ativa do quadro societário.');
        }
    }
}
