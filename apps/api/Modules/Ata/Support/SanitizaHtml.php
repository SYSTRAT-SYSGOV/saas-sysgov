<?php

declare(strict_types=1);

namespace Modules\Ata\Support;

use DOMDocument;
use DOMElement;
use DOMNode;

/**
 * Lista branca do HTML do texto da ata (editor, digitação por voz e Assistente IA): só a formatação que o editor
 * oferece e que o dompdf renderiza. Tag desconhecida é desembrulhada (fica o texto); script, style e afins somem
 * com o conteúdo; o único atributo aceito é style com cor e alinhamento.
 */
final class SanitizaHtml
{
    private const TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ul', 'ol', 'li', 'div', 'span', 'blockquote'];

    private const REMOVER_COM_CONTEUDO = ['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'svg', 'math', 'head', 'title', 'meta', 'link', 'form', 'input', 'button', 'select', 'textarea'];

    public static function limpar(?string $html): string
    {
        $html = trim((string) $html);
        if ($html === '') {
            return '';
        }

        $doc = new DOMDocument('1.0', 'UTF-8');
        $anterior = libxml_use_internal_errors(true);
        $doc->loadHTML('<?xml encoding="UTF-8"><div id="raiz-ata">' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($anterior);

        $raiz = $doc->getElementById('raiz-ata');
        if (!$raiz instanceof DOMElement) {
            return '';
        }
        self::limparFilhos($raiz);

        $saida = '';
        foreach (iterator_to_array($raiz->childNodes) as $filho) {
            $saida .= $doc->saveHTML($filho);
        }

        return trim($saida);
    }

    private static function limparFilhos(DOMNode $no): void
    {
        foreach (iterator_to_array($no->childNodes) as $filho) {
            if ($filho->nodeType === XML_COMMENT_NODE || $filho->nodeType === XML_PI_NODE) {
                $no->removeChild($filho);

                continue;
            }
            if (!$filho instanceof DOMElement) {
                continue;
            }
            $tag = strtolower($filho->tagName);
            if (in_array($tag, self::REMOVER_COM_CONTEUDO, true)) {
                $no->removeChild($filho);

                continue;
            }
            self::limparFilhos($filho);
            if (!in_array($tag, self::TAGS, true)) {
                while ($filho->firstChild !== null) {
                    $no->insertBefore($filho->firstChild, $filho);
                }
                $no->removeChild($filho);

                continue;
            }
            self::limparAtributos($filho);
        }
    }

    private static function limparAtributos(DOMElement $el): void
    {
        $estilo = self::estiloPermitido($el->getAttribute('style'));
        foreach (iterator_to_array($el->attributes) as $atributo) {
            $el->removeAttribute($atributo->nodeName);
        }
        if ($estilo !== '') {
            $el->setAttribute('style', $estilo);
        }
    }

    private static function estiloPermitido(string $estilo): string
    {
        $aceitos = [];
        foreach (explode(';', $estilo) as $declaracao) {
            [$prop, $valor] = array_map('trim', explode(':', $declaracao, 2) + [1 => '']);
            $prop = strtolower($prop);
            $valor = strtolower($valor);
            if ($prop === 'color' && preg_match('/^(#[0-9a-f]{3,6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/', $valor)) {
                $aceitos[] = "color: {$valor}";
            } elseif ($prop === 'text-align' && in_array($valor, ['left', 'center', 'right', 'justify'], true)) {
                $aceitos[] = "text-align: {$valor}";
            }
        }

        return implode('; ', $aceitos);
    }
}
