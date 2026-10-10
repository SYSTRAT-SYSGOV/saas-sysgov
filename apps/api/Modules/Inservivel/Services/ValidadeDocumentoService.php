<?php

declare(strict_types=1);

namespace Modules\Inservivel\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Modules\Inservivel\Models\Entidade;
use Modules\Inservivel\Models\EntidadeDocumento;

/**
 * Validade dos documentos da entidade (D15; spec: Validade dos documentos da entidade).
 *
 * O bloqueio é calculado, não gravado: a entidade fica bloqueada quando o envio mais recente de algum documento
 * obrigatório tem validade anterior a hoje. Considera só a validade (um documento novo ainda Pendente, com
 * validade futura, já tira o bloqueio). Um único "hoje" por chamada mantém o sorteio coerente com o retrato.
 */
final class ValidadeDocumentoService
{
    public const DIAS_ALERTA = 30;

    public function __construct(
        private readonly ConfiguracaoService $configuracao,
    ) {}

    /** @return list<array{tipo: string, nome: string, validade: string}> documentos obrigatórios vencidos */
    public function bloqueios(Entidade $entidade, ?Carbon $hoje = null): array
    {
        return $this->bloqueiosPorEntidade([$entidade->id], $hoje)[$entidade->id] ?? [];
    }

    /**
     * @param list<int> $entidadeIds
     * @return array<int, list<array{tipo: string, nome: string, validade: string}>> só as entidades bloqueadas
     */
    public function bloqueiosPorEntidade(array $entidadeIds, ?Carbon $hoje = null): array
    {
        $hoje = ($hoje ?? now())->copy()->startOfDay();
        $resultado = [];
        foreach ($this->maisRecentesObrigatorios($entidadeIds) as $entidadeId => $docs) {
            foreach ($docs as $doc) {
                if ($doc->validade !== null && $doc->validade->lt($hoje)) {
                    $resultado[$entidadeId][] = $this->item($doc);
                }
            }
        }

        return $resultado;
    }

    /**
     * Alertas do tenant: documentos obrigatórios vencidos ou vencendo nos próximos 30 dias.
     *
     * @return list<array{entidade_id: int, razao_social: string, tipo: string, nome: string, validade: string, vencido: bool}>
     */
    public function alertas(?Carbon $hoje = null): array
    {
        $hoje = ($hoje ?? now())->copy()->startOfDay();
        $limite = $hoje->copy()->addDays(self::DIAS_ALERTA);
        $entidades = Entidade::query()->pluck('razao_social', 'id');
        $alertas = [];
        foreach ($this->maisRecentesObrigatorios($entidades->keys()->map(fn ($id): int => (int) $id)->all()) as $entidadeId => $docs) {
            foreach ($docs as $doc) {
                if ($doc->validade !== null && $doc->validade->lte($limite)) {
                    $alertas[] = [
                        'entidade_id' => $entidadeId,
                        'razao_social' => (string) $entidades[$entidadeId],
                        ...$this->item($doc),
                        'vencido' => $doc->validade->lt($hoje),
                    ];
                }
            }
        }
        usort($alertas, fn (array $a, array $b): int => strcmp($a['validade'], $b['validade']));

        return $alertas;
    }

    /**
     * Alertas de uma entidade só (portal e ficha).
     *
     * @return list<array{tipo: string, nome: string, validade: string, vencido: bool}>
     */
    public function alertasDa(Entidade $entidade, ?Carbon $hoje = null): array
    {
        $hoje = ($hoje ?? now())->copy()->startOfDay();
        $limite = $hoje->copy()->addDays(self::DIAS_ALERTA);
        $alertas = [];
        foreach ($this->maisRecentesObrigatorios([$entidade->id])[$entidade->id] ?? [] as $doc) {
            if ($doc->validade !== null && $doc->validade->lte($limite)) {
                $alertas[] = [...$this->item($doc), 'vencido' => $doc->validade->lt($hoje)];
            }
        }

        return $alertas;
    }

    /**
     * @param list<int> $entidadeIds
     * @return array<int, Collection<int, EntidadeDocumento>> entidade => envio mais recente de cada tipo obrigatório
     */
    private function maisRecentesObrigatorios(array $entidadeIds): array
    {
        $obrigatorios = $this->configuracao->chavesObrigatorias();
        if ($entidadeIds === [] || $obrigatorios === []) {
            return [];
        }
        $porEntidade = [];
        EntidadeDocumento::query()->whereIn('entidade_id', $entidadeIds)->whereIn('tipo', $obrigatorios)->orderByDesc('id')->get()
            ->each(function (EntidadeDocumento $d) use (&$porEntidade): void {
                $porEntidade[$d->entidade_id][$d->tipo] ??= $d;
            });

        return array_map(fn (array $docs): Collection => collect(array_values($docs)), $porEntidade);
    }

    /** @return array{tipo: string, nome: string, validade: string} */
    private function item(EntidadeDocumento $doc): array
    {
        $nomes = array_column($this->configuracao->documentosExigidos(), 'nome', 'chave');

        return ['tipo' => $doc->tipo, 'nome' => $nomes[$doc->tipo] ?? $doc->tipo, 'validade' => (string) $doc->validade?->format('Y-m-d')];
    }
}
