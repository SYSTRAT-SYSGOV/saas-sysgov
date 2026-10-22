<?php

declare(strict_types=1);

namespace Modules\Pessoas\Support;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Modules\Pessoas\Contracts\ConciliacaoModuloInterface;

/**
 * Adaptador de conciliação para módulos cuja tabela já é um model Eloquent com coluna `pessoa_id`: o módulo só
 * diz como ler documento e dado civil de cada registro (`$mapa`), sem escrever uma classe por tabela.
 *
 * @template TModel of Model
 */
final class ConciliacaoPorModelo implements ConciliacaoModuloInterface
{
    /**
     * @param class-string<TModel> $modelo
     * @param Closure(TModel): RegistroConciliacao $mapa
     * @param list<string> $escoposIgnorados escopos globais do módulo que filtram por contexto de requisição
     */
    public function __construct(
        private readonly string $alias,
        private readonly string $modelo,
        private readonly Closure $mapa,
        private readonly array $escoposIgnorados = [],
    ) {}

    public function modulo(): string
    {
        return $this->alias;
    }

    public function tabela(): string
    {
        return (new $this->modelo())->getTable();
    }

    public function registros(): iterable
    {
        foreach ($this->consulta()->orderBy('id')->cursor() as $registro) {
            yield ($this->mapa)($registro);
        }
    }

    public function vincular(int $registroId, int $pessoaId): void
    {
        $this->consulta()->whereKey($registroId)->update(['pessoa_id' => $pessoaId]);
    }

    /** @return \Illuminate\Database\Eloquent\Builder<TModel> */
    private function consulta(): \Illuminate\Database\Eloquent\Builder
    {
        /** @var \Illuminate\Database\Eloquent\Builder<TModel> $consulta */
        $consulta = $this->modelo::query()->withoutGlobalScopes($this->escoposIgnorados);

        return $consulta;
    }
}
