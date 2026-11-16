<?php

declare(strict_types=1);

namespace Modules\Parecer\Services;

use DomainException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Consulta de leitura à API https://bncc.api.br (projeto independente, não oficial do MEC), como no PHP:
 * chave só no servidor (BNCC_API_KEY), respostas 24 h em cache para poupar o limite de 60 req/min.
 * Não grava nada fora: a inclusão das habilidades escolhidas é feita pelo HabilidadeService.
 */
final class BnccService
{
    private const COMPONENTE = [
        'LP' => 'lingua_portuguesa', 'MAT' => 'matematica', 'CIE' => 'ciencias', 'HIS' => 'historia',
        'GEO' => 'geografia', 'EF' => 'educacao_fisica', 'ART' => 'arte', 'ER' => 'ensino_religioso',
    ];

    public function configurada(): bool
    {
        return (string) config('services.bncc.key', '') !== '';
    }

    /**
     * Habilidades oficiais da série (1–5) e matéria, ordenadas por código.
     *
     * @return list<array{codigo: string, descricao: string, unidade_tematica: string|null, objeto_conhecimento: string|null}>
     */
    public function habilidades(int $serie, string $materia): array
    {
        if (!$this->configurada()) {
            throw new DomainException('A chave da API BNCC não está configurada (BNCC_API_KEY).');
        }
        $itens = [];
        $pagina = 1;
        do {
            $d = $this->get('habilidades', ['etapa' => 'ensino_fundamental', 'ano' => (string) $serie, 'componente' => self::COMPONENTE[$materia], 'page' => $pagina, 'size' => 100]);
            array_push($itens, ...($d['items'] ?? []));
            $pagina++;
        } while ($pagina <= (int) ($d['pages'] ?? 1) && $pagina <= 10);
        usort($itens, fn ($a, $b): int => strcmp((string) $a['codigo'], (string) $b['codigo']));

        return array_map(fn (array $i): array => [
            'codigo' => (string) $i['codigo'],
            'descricao' => (string) ($i['descricao'] ?? ''),
            'unidade_tematica' => $i['unidade_tematica'] ?? null,
            'objeto_conhecimento' => $i['objeto_conhecimento'] ?? null,
        ], $itens);
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    private function get(string $caminho, array $params): array
    {
        $url = 'https://bncc.api.br/api/v1/' . $caminho;

        return Cache::remember('parecer:bncc:' . sha1($url . '?' . http_build_query($params)), 86400, function () use ($url, $params): array {
            try {
                $resp = Http::withToken((string) config('services.bncc.key'))->acceptJson()->timeout(20)->get($url, $params);
            } catch (\Throwable $e) {
                throw new DomainException('Não foi possível falar com a API da BNCC.');
            }
            $d = $resp->json();
            if ($resp->status() !== 200 || !is_array($d)) {
                throw new DomainException('API da BNCC: ' . match ($resp->status()) {
                    401 => 'a chave da API BNCC é inválida ou expirou',
                    404 => 'registro não encontrado na BNCC',
                    429 => 'limite de consultas atingido; aguarde um minuto e tente de novo',
                    default => 'erro ' . $resp->status(),
                } . '.');
            }

            return $d;
        });
    }
}
