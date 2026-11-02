<?php

declare(strict_types=1);

namespace Modules\Transporte\Censo\Importacao;

use DomainException;
use Generator;

/**
 * Lê o arquivo do Educacenso linha a linha (nunca inteiro na memória), converte a codificação e impõe limites contra
 * arquivo hostil (design D-I5, D-I8): tamanho da linha, colunas, tamanho do campo e total de linhas.
 */
final class LeitorEducacenso
{
    public const MAX_LINHAS = 1_000_000;

    public const MAX_BYTES_LINHA = 65536;

    public const MAX_COLUNAS = 400;

    public const MAX_CAMPO = 1000;

    public function __construct(
        private readonly string $caminho,
        private readonly string $delimitador = '|',
        private readonly string $codificacao = 'ISO-8859-1',
    ) {}

    /**
     * @return Generator<int, list<string>> número da linha no arquivo → colunas (a 0 é o tipo do registro)
     */
    public function linhas(): Generator
    {
        $arquivo = @fopen($this->caminho, 'rb');
        if ($arquivo === false) {
            throw new DomainException('Não foi possível abrir o arquivo enviado.');
        }

        try {
            $numero = 0;
            while (($bruta = fgets($arquivo, self::MAX_BYTES_LINHA + 2)) !== false) {
                $numero++;
                if ($numero > self::MAX_LINHAS) {
                    throw new DomainException('O arquivo excede o limite de ' . number_format(self::MAX_LINHAS, 0, ',', '.') . ' linhas.');
                }
                if (strlen($bruta) > self::MAX_BYTES_LINHA && !str_ends_with($bruta, "\n")) {
                    throw new DomainException("A linha {$numero} é longa demais para ser um registro do Educacenso.");
                }
                if (str_contains($bruta, "\0")) {
                    throw new DomainException('O arquivo não é um arquivo de texto do Educacenso.');
                }
                if ($numero === 1) {
                    $bruta = preg_replace('/^\xEF\xBB\xBF/', '', $bruta) ?? $bruta;
                }

                $linha = $this->paraUtf8(rtrim($bruta, "\r\n"), $numero);
                if (trim($linha) === '') {
                    continue;
                }

                $colunas = explode($this->delimitador, $linha);
                if (count($colunas) > self::MAX_COLUNAS) {
                    throw new DomainException("A linha {$numero} tem colunas demais (máximo " . self::MAX_COLUNAS . ').');
                }
                foreach ($colunas as $i => $coluna) {
                    if (mb_strlen($coluna) > self::MAX_CAMPO) {
                        throw new DomainException("A coluna " . $i . " da linha {$numero} é longa demais.");
                    }
                    $colunas[$i] = trim($coluna);
                }

                yield $numero => $colunas;
            }
        } finally {
            fclose($arquivo);
        }
    }

    private function paraUtf8(string $linha, int $numero): string
    {
        if ($this->codificacao === 'UTF-8') {
            if (!mb_check_encoding($linha, 'UTF-8')) {
                throw new DomainException("A linha {$numero} não está em UTF-8. Ajuste a codificação do leiaute.");
            }

            return $linha;
        }

        return mb_convert_encoding($linha, 'UTF-8', $this->codificacao);
    }
}
