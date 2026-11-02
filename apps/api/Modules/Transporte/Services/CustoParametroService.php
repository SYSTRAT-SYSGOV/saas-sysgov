<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Transporte\Custo\Parametros;
use Modules\Transporte\Models\CustoParametro;
use Modules\Transporte\Support\ConflitoException;

/** Parâmetros do cálculo de custo por órgão e ano (design D-C4). O órgão edita valores; não cria chave nova. */
final class CustoParametroService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Catálogo com o valor do ano: `valor` é o do órgão ou, na falta dele, o padrão estrutural; `origem` diz de onde veio.
     *
     * @return list<array<string, mixed>>
     */
    public function listar(int $ano): array
    {
        $guardados = $this->guardados($ano);

        return array_map(static function (array $def) use ($guardados): array {
            $valor = $guardados[$def['chave']] ?? null;
            $origem = $valor !== null ? 'orgao' : ($def['padrao'] !== null ? 'padrao' : null);

            return [...$def, 'valor' => $valor ?? $def['padrao'], 'origem' => $origem];
        }, Parametros::todos());
    }

    /**
     * Valores usados no cálculo: padrões estruturais cobertos pelo que o órgão informou.
     *
     * @return array<string, float>
     */
    public function valores(int $ano): array
    {
        $valores = [];
        foreach (Parametros::todos() as $def) {
            if ($def['padrao'] !== null) {
                $valores[$def['chave']] = $def['padrao'];
            }
        }

        return [...$valores, ...$this->guardados($ano)];
    }

    /**
     * @param array<string, mixed> $valores chave → número; vazio ou nulo apaga o valor do órgão (volta ao padrão)
     */
    public function salvar(int $ano, array $valores, ?int $usuarioId): void
    {
        $catalogo = Parametros::porChave();
        $alterados = [];
        DB::transaction(function () use ($ano, $valores, $usuarioId, $catalogo, &$alterados): void {
            foreach ($valores as $chave => $bruto) {
                $def = $catalogo[$chave] ?? throw new DomainException("Parâmetro desconhecido: {$chave}.");
                if ($bruto === null || $bruto === '') {
                    $apagados = CustoParametro::query()->where('ano', $ano)->where('chave', $chave)->delete();
                    if ($apagados > 0) {
                        $alterados[$chave] = null;
                    }

                    continue;
                }
                $valor = self::numero($bruto, $def['rotulo']);
                if ($valor < $def['min'] || $valor > $def['max']) {
                    throw new DomainException("\"{$def['rotulo']}\" deve ficar entre " . self::fmt($def['min']) . ' e ' . self::fmt($def['max']) . " ({$def['unidade']}).");
                }
                CustoParametro::query()->updateOrCreate(['ano' => $ano, 'chave' => $chave], ['valor' => $valor, 'atualizado_por' => $usuarioId]);
                $alterados[$chave] = $valor;
            }
        });
        $this->audit->record('transporte', 'custos.parametros_salvos', "custos:{$ano}", null, ['ano' => $ano, 'parametros' => $alterados]);
    }

    /** Copia os valores do órgão de um ano para outro. Recusa se o destino já tem valores, a menos que `sobrescrever`. */
    public function copiar(int $de, int $para, bool $sobrescrever = false): int
    {
        if ($de === $para) {
            throw new DomainException('Escolha anos diferentes para copiar.');
        }
        $origem = $this->guardados($de);
        if ($origem === []) {
            throw new DomainException("Não há parâmetros informados em {$de} para copiar.");
        }
        if (!$sobrescrever && CustoParametro::query()->where('ano', $para)->exists()) {
            throw new ConflitoException("{$para} já tem parâmetros. Confirme para sobrescrever.");
        }

        DB::transaction(function () use ($origem, $para, $sobrescrever): void {
            if ($sobrescrever) {
                CustoParametro::query()->where('ano', $para)->delete();
            }
            foreach ($origem as $chave => $valor) {
                CustoParametro::query()->updateOrCreate(['ano' => $para, 'chave' => $chave], ['valor' => $valor]);
            }
        });
        $this->audit->record('transporte', 'custos.parametros_copiados', "custos:{$para}", null, ['de' => $de, 'para' => $para, 'parametros' => count($origem)]);

        return count($origem);
    }

    /** @return array<string, float> */
    private function guardados(int $ano): array
    {
        $mapa = [];
        foreach (CustoParametro::query()->where('ano', $ano)->get() as $p) {
            $mapa[$p->chave] = (float) $p->valor;
        }

        return $mapa;
    }

    private static function numero(mixed $bruto, string $rotulo): float
    {
        $texto = is_string($bruto) ? str_replace(',', '.', trim($bruto)) : $bruto;
        if (!is_numeric($texto)) {
            throw new DomainException("\"{$rotulo}\" deve ser um número.");
        }

        return (float) $texto;
    }

    private static function fmt(float $n): string
    {
        return rtrim(rtrim(number_format($n, 4, ',', '.'), '0'), ',');
    }
}
