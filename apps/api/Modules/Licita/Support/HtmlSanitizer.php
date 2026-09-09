<?php

declare(strict_types=1);

namespace Modules\Licita\Support;

use DOMDocument;
use DOMElement;
use DOMNode;

/**
 * Sanitização de HTML gerado pelo usuário no TinyMCE (justificativa, texto
 * de documentos legais, campos extras do tipo texto_longo) antes de
 * persistir — esse conteúdo é re-renderizado para OUTROS usuários (quem
 * aprova o DFD, por exemplo), então é um vetor real de XSS armazenado se
 * não for tratado. Implementação própria por allowlist (sem dependência
 * externa) em vez de mews/purifier: escopo pequeno e controlado (apenas as
 * tags que o RichTextEditor realmente produz), sem exigir passo extra de
 * `composer require`/publish de config.
 *
 * O frontend também sanitiza com dompurify antes de renderizar — defesa em
 * profundidade, nunca confiar em sanitização feita só de um lado.
 */
final class HtmlSanitizer
{
    /** @var array<string, array<int, string>> tag => atributos permitidos */
    private const ALLOWED_TAGS = [
        'p' => [],
        'br' => [],
        'strong' => [],
        'b' => [],
        'em' => [],
        'i' => [],
        'u' => [],
        's' => [],
        'ul' => [],
        'ol' => [],
        'li' => [],
        'h1' => [],
        'h2' => [],
        'h3' => [],
        'h4' => [],
        'blockquote' => [],
        'a' => ['href', 'title', 'target', 'rel'],
        'table' => [],
        'thead' => [],
        'tbody' => [],
        'tr' => [],
        'th' => [],
        'td' => [],
        'code' => [],
        'pre' => [],
        'span' => [],
    ];

    public function sanitize(string $html): string
    {
        if (trim($html) === '') {
            return '';
        }

        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML(
            '<?xml encoding="utf-8" ?><div id="sysgov-root">' . $html . '</div>',
            LIBXML_NOERROR | LIBXML_NOWARNING
        );
        libxml_clear_errors();

        $root = $dom->getElementById('sysgov-root');
        if ($root === null) {
            return '';
        }

        $this->cleanNode($dom, $root);

        $result = '';
        foreach (iterator_to_array($root->childNodes) as $child) {
            $result .= $dom->saveHTML($child);
        }

        return trim($result);
    }

    private function cleanNode(DOMDocument $dom, DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof DOMElement) {
                $tag = strtolower($child->tagName);

                if (!array_key_exists($tag, self::ALLOWED_TAGS)) {
                    // Tag não permitida: preserva o texto/filhos, remove só a tag.
                    while ($child->firstChild !== null) {
                        $node->insertBefore($child->firstChild, $child);
                    }
                    $node->removeChild($child);
                    continue;
                }

                $allowedAttrs = self::ALLOWED_TAGS[$tag];
                foreach (iterator_to_array($child->attributes ?? []) as $attr) {
                    if (!in_array(strtolower($attr->nodeName), $allowedAttrs, true)) {
                        $child->removeAttribute($attr->nodeName);
                        continue;
                    }

                    if ($attr->nodeName === 'href' && !$this->isSafeUrl($attr->nodeValue ?? '')) {
                        $child->removeAttribute('href');
                    }
                }

                $this->cleanNode($dom, $child);
            } elseif (!$this->isTextOrCdata($child)) {
                $node->removeChild($child);
            }
        }
    }

    private function isTextOrCdata(DOMNode $node): bool
    {
        return $node->nodeType === XML_TEXT_NODE || $node->nodeType === XML_CDATA_SECTION_NODE;
    }

    private function isSafeUrl(string $url): bool
    {
        $url = trim($url);

        return $url === ''
            || str_starts_with($url, 'http://')
            || str_starts_with($url, 'https://')
            || str_starts_with($url, '/')
            || str_starts_with($url, '#')
            || str_starts_with($url, 'mailto:');
    }
}
