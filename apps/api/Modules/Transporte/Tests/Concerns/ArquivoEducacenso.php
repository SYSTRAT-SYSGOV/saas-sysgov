<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Concerns;

use Illuminate\Http\UploadedFile;

/** Monta arquivos sintéticos do Educacenso (leiaute 2023, ISO-8859-1, separador `|`) com dados fictícios. */
trait ArquivoEducacenso
{
    /** @param array<int, string> $colunas posição → valor */
    protected function registro(string $tipo, array $colunas, int $total = 90): string
    {
        $cols = array_fill(0, $total, '');
        $cols[0] = $tipo;
        foreach ($colunas as $posicao => $valor) {
            $cols[$posicao] = $valor;
        }

        return implode('|', $cols);
    }

    protected function registroEscola(string $inep, string $cep = '80000000'): string
    {
        return $this->registro('00', [1 => $inep, 5 => 'ESCOLA TESTE', 6 => $cep, 9 => 'Estrada Velha', 18 => '2', 19 => '0', 20 => '3']);
    }

    protected function registroTurma(string $escola, string $turma): string
    {
        return $this->registro('20', [1 => $escola, 2 => $turma, 4 => 'TURMA 1']);
    }

    protected function registroPessoa(string $escola, string $inep, string $nome, string $nascimento, string $cpf = '', string $cep = '81000000', string $cor = '3'): string
    {
        return $this->registro('30', [1 => $escola, 2 => $inep, 4 => $cpf, 5 => $nome, 6 => $nascimento, 10 => '1', 11 => $cor, 41 => $cep, 43 => '2']);
    }

    protected function registroMatricula(string $escola, string $inep, string $turma, string $transporte = '1'): string
    {
        return $this->registro('60', [1 => $escola, 2 => $inep, 4 => $turma, 20 => $transporte]);
    }

    /** @param list<string> $linhas */
    protected function arquivoCenso(array $linhas, string $nome = 'educacenso.txt'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($nome, mb_convert_encoding(implode("\r\n", $linhas) . "\r\n", 'ISO-8859-1', 'UTF-8'));
    }
}
