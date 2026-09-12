<?php

declare(strict_types=1);

namespace Modules\Licita\Support;

/**
 * Converte o texto puro (parágrafos separados por linha em branco) que o
 * provedor de IA devolve em HTML de verdade (`<p>...</p>` por parágrafo),
 * pronto para entrar no RichTextEditor (TinyMCE).
 *
 * Sem isso, uma string como "Parágrafo um.\n\nParágrafo dois." vai direto
 * pro `value` do editor sem nenhuma tag — HTML colapsa quebras de linha
 * soltas, então os "parágrafos" da IA aparecem todos grudados num bloco só
 * de texto (sem separação visual nem na tela nem no PDF gerado depois, cujo
 * CSS `.rich p { margin: ... }` conta com tags `<p>` reais para dar
 * o espaçamento entre parágrafos).
 */
final class TextoParaHtml
{
    public static function converter(string $texto): string
    {
        $paragrafos = preg_split('/\n\s*\n/', trim($texto)) ?: [];

        $html = array_map(
            // nl2br: quebra de linha ISOLADA dentro de um parágrafo (sem
            // linha em branco) vira <br>, não some. htmlspecialchars ANTES
            // do nl2br: o texto da IA é sempre texto puro, nunca deve ser
            // interpretado como HTML (evita tanto markup quebrado quanto
            // injeção, já que o sanitizer allowlist só entra em ação no
            // save, não nesta resposta imediata da sugestão).
            static fn (string $paragrafo): string => '<p>' . nl2br(htmlspecialchars(trim($paragrafo), ENT_QUOTES, 'UTF-8'), false) . '</p>',
            array_values(array_filter($paragrafos, static fn (string $p): bool => trim($p) !== '')),
        );

        return implode('', $html);
    }
}
