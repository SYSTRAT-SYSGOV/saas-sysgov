<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Support;

use Illuminate\Http\Response;

/**
 * PDF de texto simples (A4, Helvetica) para ordens de serviço e guias.
 * ponytail: sem layout/tabelas; trocar por dompdf se o município exigir modelo gráfico.
 */
final class Pdf
{
    private const LINHAS_POR_PAGINA = 52;

    /** @param list<string> $linhas */
    public static function gerar(string $titulo, array $linhas): string
    {
        $paginas = array_chunk(array_merge([$titulo, str_repeat('=', 60), ''], $linhas), self::LINHAS_POR_PAGINA);
        $objetos = [
            1 => '<< /Type /Catalog /Pages 2 0 R >>',
            3 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        ];
        $kids = [];

        foreach ($paginas as $i => $pagina) {
            $conteudo = "BT /F1 11 Tf 14 TL 50 800 Td\n";
            foreach ($pagina as $linha) {
                $conteudo .= '(' . self::escapar($linha) . ") '\n";
            }
            $conteudo .= 'ET';

            $idPagina = 4 + $i * 2;
            $objetos[$idPagina] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] '
                . '/Resources << /Font << /F1 3 0 R >> >> /Contents ' . ($idPagina + 1) . ' 0 R >>';
            $objetos[$idPagina + 1] = '<< /Length ' . strlen($conteudo) . " >>\nstream\n{$conteudo}\nendstream";
            $kids[] = "{$idPagina} 0 R";
        }

        $objetos[2] = '<< /Type /Pages /Kids [' . implode(' ', $kids) . '] /Count ' . count($kids) . ' >>';
        ksort($objetos);

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objetos as $id => $corpo) {
            $offsets[$id] = strlen($pdf);
            $pdf .= "{$id} 0 obj\n{$corpo}\nendobj\n";
        }

        $xref = strlen($pdf);
        $pdf .= 'xref' . "\n0 " . (count($objetos) + 1) . "\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }

        return $pdf . 'trailer << /Size ' . (count($objetos) + 1) . " /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";
    }

    /** @param list<string> $linhas */
    public static function download(string $arquivo, string $titulo, array $linhas): Response
    {
        return response(self::gerar($titulo, $linhas), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$arquivo}\"",
        ]);
    }

    private static function escapar(string $texto): string
    {
        $ansi = (string) mb_convert_encoding($texto, 'Windows-1252', 'UTF-8');

        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $ansi);
    }
}
