<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Escrita de CSV protegida contra injeção de fórmula (Relatórios do Cursos, design D6): toda
 * célula de texto que comece com `=`, `+`, `-`, `@`, tabulação ou retorno de carro recebe um
 * apóstrofo à frente, para que planilhas (Excel, LibreOffice, Google Sheets) nunca a
 * interpretem como fórmula. Separador `;` e BOM UTF-8 (o Excel abre acentos corretamente).
 */
final class CsvSeguro
{
    private const array CARACTERES_PERIGOSOS = ['=', '+', '-', '@', "\t", "\r"];

    /**
     * Neutraliza um valor para uma célula: só mexe em string não vazia cujo primeiro caractere
     * seria interpretado como início de fórmula. Números, nulos e o restante do texto saem
     * intactos.
     */
    public function neutralizar(mixed $valor): mixed
    {
        if (!is_string($valor) || $valor === '') {
            return $valor;
        }

        return in_array($valor[0], self::CARACTERES_PERIGOSOS, true) ? "'" . $valor : $valor;
    }

    /**
     * Escreve o BOM UTF-8 e a linha de cabeçalho.
     *
     * @param resource $handle
     * @param list<string> $colunas
     */
    public function escreverCabecalho($handle, array $colunas): void
    {
        fwrite($handle, "\xEF\xBB\xBF");
        $this->escreverLinha($handle, $colunas);
    }

    /**
     * Escreve uma linha, neutralizando cada célula.
     *
     * @param resource $handle
     * @param list<mixed> $colunas
     */
    public function escreverLinha($handle, array $colunas): void
    {
        fputcsv($handle, array_map($this->neutralizar(...), $colunas), ';', escape: '');
    }
}
