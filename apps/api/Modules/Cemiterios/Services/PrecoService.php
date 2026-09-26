<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use App\Support\Money;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\Preco;
use Modules\Cemiterios\Models\Reajuste;
use Modules\Cemiterios\Support\RegraNegocioException;

/**
 * Tabela de preços com vigências, em centavos inteiros (RF-20, RF-21).
 * A tabela do tenant fica em cache e é invalidada a cada alteração (RNF-07).
 */
final readonly class PrecoService
{
    public function __construct(private TenantContext $tenant) {}

    /** @return Collection<int, Preco> */
    public function tabela(): Collection
    {
        return Cache::remember($this->chave(), 3600, fn () => Preco::query()->orderBy('servico')->orderBy('vigencia_inicio')->get());
    }

    public function vigente(string $servico, ?CarbonImmutable $data = null): ?Preco
    {
        $dia = ($data ?? CarbonImmutable::today())->toDateString();

        return $this->tabela()
            ->filter(fn (Preco $p) => $p->servico === $servico
                && $p->vigencia_inicio->toDateString() <= $dia
                && ($p->vigencia_fim === null || $p->vigencia_fim->toDateString() >= $dia))
            ->sortByDesc(fn (Preco $p) => $p->vigencia_inicio->toDateString())
            ->first();
    }

    public function valorVigente(string $servico, ?CarbonImmutable $data = null): int
    {
        $preco = $this->vigente($servico, $data)
            ?? throw new RegraNegocioException('preco.inexistente', "Não há preço vigente para o serviço {$servico}.");

        return $preco->valor_centavos;
    }

    /** Nova vigência; a anterior do mesmo serviço é encerrada na véspera. */
    public function novaVigencia(string $servico, int $centavos, CarbonImmutable $inicio): Preco
    {
        return DB::transaction(function () use ($servico, $centavos, $inicio): Preco {
            if (Preco::where('servico', $servico)->whereDate('vigencia_inicio', $inicio->toDateString())->exists()) {
                throw new RegraNegocioException('preco.vigencia_duplicada', 'Já existe preço deste serviço com a mesma data de início.');
            }

            Preco::where('servico', $servico)
                ->whereDate('vigencia_inicio', '<', $inicio->toDateString())
                ->where(fn ($q) => $q->whereNull('vigencia_fim')->orWhereDate('vigencia_fim', '>=', $inicio->toDateString()))
                ->update(['vigencia_fim' => $inicio->subDay()->toDateString()]);

            $preco = Preco::create(['servico' => $servico, 'valor_centavos' => $centavos, 'vigencia_inicio' => $inicio->toDateString()]);
            Cache::forget($this->chave());

            return $preco;
        });
    }

    /**
     * Reajuste de toda a tabela a partir de 1º/jan da competência, idempotente
     * por competência, com arredondamento meio-para-cima (RF-21).
     */
    public function reajustar(int $competencia, string $percentual, string $origem, ?int $autorId): Reajuste
    {
        if (Reajuste::where('competencia', $competencia)->exists()) {
            throw new RegraNegocioException('reajuste.competencia_repetida', "A competência {$competencia} já foi reajustada.");
        }

        $inicio = CarbonImmutable::create($competencia, 1, 1);

        return DB::transaction(function () use ($competencia, $percentual, $origem, $autorId, $inicio): Reajuste {
            foreach (Preco::SERVICOS as $servico) {
                $atual = $this->vigente($servico, $inicio->subDay());
                if ($atual !== null) {
                    $this->novaVigencia($servico, self::aplicarPercentual($atual->valor_centavos, $percentual), $inicio);
                }
            }

            return Reajuste::create([
                'indice' => 'IPCA', 'competencia' => $competencia, 'percentual' => $percentual,
                'origem' => $origem, 'autor_id' => $autorId,
            ]);
        });
    }

    /** Percentual com até 4 casas; aritmética inteira (sem float) e meio-para-cima. */
    public static function aplicarPercentual(int $centavos, string $percentual): int
    {
        [$inteiro, $fracao] = array_pad(explode('.', ltrim($percentual, '+')), 2, '');
        $negativo = str_starts_with($inteiro, '-');
        $unidades = (int) ltrim($inteiro, '-') * 10_000 + (int) str_pad(substr($fracao, 0, 4), 4, '0');
        $fator = 1_000_000 + ($negativo ? -$unidades : $unidades); // 1_000_000 = 100,0000%

        return intdiv($centavos * $fator + 500_000, 1_000_000);
    }

    /** "104,50" | "104.50" | "104" → 10450. Mais de 2 casas decimais é recusado. */
    public static function centavos(string $valor): int
    {
        $valor = str_replace(',', '.', trim($valor));
        if (preg_match('/^\d{1,10}(\.\d{1,2})?$/', $valor) !== 1) {
            throw new RegraNegocioException('preco.valor_invalido', 'Valor monetário inválido: use no máximo 2 casas decimais.');
        }
        [$reais, $cents] = array_pad(explode('.', $valor), 2, '0');

        return (int) $reais * 100 + (int) str_pad($cents, 2, '0');
    }

    public static function brl(int $centavos): string
    {
        [$reais, $cents] = explode('.', (new Money($centavos))->toDecimal());

        return 'R$ ' . number_format((int) $reais, 0, ',', '.') . ',' . $cents;
    }

    private function chave(): string
    {
        return 'cemiterios:precos:' . $this->tenant->id();
    }
}
