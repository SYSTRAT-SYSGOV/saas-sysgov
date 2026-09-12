<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use Illuminate\Support\Collection;
use Modules\Licita\Models\LegalDocumento;

/**
 * Seleciona, entre os documentos legais ATIVOS visíveis ao tenant (globais
 * da SYSTRAT + próprios — ver escopo em LegalDocumento), os mais relevantes
 * para um texto de referência qualquer. Extraído de DfdIaService para ser
 * compartilhado por TODA funcionalidade de IA do Licita (DfdIaService,
 * LicitaTextoIaService) — qualquer sugestão de texto do módulo deve se
 * fundamentar na legislação real cadastrada na plataforma, nunca "inventar"
 * embasamento legal sem contexto.
 *
 * Sem infraestrutura de busca vetorial: usa uma pontuação simples de
 * sobreposição de palavras entre o texto de entrada e título/ementa/tags de
 * cada documento — suficiente para o volume de legislação cadastrado
 * (dezenas, não milhares, de documentos por tenant) e evita mandar TODO o
 * acervo como contexto pra IA a cada chamada.
 */
final class LegislacaoContextoService
{
    /** Máximo de documentos legais enviados como contexto — mantém o prompt dentro de um tamanho razoável de tokens. */
    private const MAX_DOCUMENTOS_CONTEXTO = 5;

    /**
     * @return Collection<int, LegalDocumento>
     */
    public function buscarRelevante(string $textoReferencia): Collection
    {
        $palavrasChave = $this->extrairPalavrasChave($textoReferencia);

        $documentos = LegalDocumento::query()->where('ativo', true)->get();

        if ($palavrasChave === [] || $documentos->isEmpty()) {
            // Sem palavras-chave úteis (texto muito curto/genérico) ou nenhum
            // documento cadastrado: cai para os mais recentes em vez de nada,
            // ainda dando alguma base legal geral (ex.: a própria Lei 14.133).
            return $documentos->sortByDesc('created_at')->take(self::MAX_DOCUMENTOS_CONTEXTO)->values();
        }

        $relevantes = $documentos
            ->map(function (LegalDocumento $doc) use ($palavrasChave): array {
                $textoDoc = mb_strtolower($doc->titulo . ' ' . ($doc->ementa ?? '') . ' ' . implode(' ', $doc->tags ?? []));
                $pontuacao = 0;
                foreach ($palavrasChave as $palavra) {
                    if (str_contains($textoDoc, $palavra)) {
                        $pontuacao++;
                    }
                }

                return ['doc' => $doc, 'pontuacao' => $pontuacao];
            })
            // Descarta quem não bateu nenhuma palavra-chave — sem isso, com
            // poucos documentos cadastrados (menos que MAX_DOCUMENTOS_CONTEXTO),
            // `take()` incluiria documentos totalmente irrelevantes só para
            // completar a cota, confundindo o embasamento legal da resposta.
            ->filter(fn (array $item): bool => $item['pontuacao'] > 0)
            ->sortByDesc('pontuacao')
            ->take(self::MAX_DOCUMENTOS_CONTEXTO)
            ->pluck('doc')
            ->values();

        if ($relevantes->isEmpty()) {
            // Nenhum documento cadastrado bateu com as palavras-chave do
            // texto de referência: cai para os mais recentes em vez de
            // deixar a IA sem nenhuma base legal.
            return $documentos->sortByDesc('created_at')->take(self::MAX_DOCUMENTOS_CONTEXTO)->values();
        }

        return $relevantes;
    }

    /** @return string[] */
    private function extrairPalavrasChave(string $texto): array
    {
        $palavras = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower(strip_tags($texto))) ?: [];

        // Descarta palavras muito curtas (artigos, preposições) — pouco
        // discriminantes para pontuar relevância.
        return array_values(array_unique(array_filter($palavras, static fn (string $p): bool => mb_strlen($p) >= 4)));
    }
}
