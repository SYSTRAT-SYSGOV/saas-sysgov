<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use DomainException;
use Modules\Transporte\Censo\Importacao\LeitorEducacenso;
use Modules\Transporte\Tests\TestCase;

/** Limites do leitor contra arquivo hostil e conversão de codificação. */
final class LeitorEducacensoTest extends TestCase
{
    /** @var list<string> */
    private array $temporarios = [];

    protected function tearDown(): void
    {
        foreach ($this->temporarios as $arquivo) {
            @unlink($arquivo);
        }
        parent::tearDown();
    }

    private function arquivo(string $conteudo): string
    {
        $caminho = (string) tempnam(sys_get_temp_dir(), 'edu');
        file_put_contents($caminho, $conteudo);
        $this->temporarios[] = $caminho;

        return $caminho;
    }

    /** @return array<int, list<string>> */
    private function ler(string $conteudo, string $codificacao = 'ISO-8859-1'): array
    {
        return iterator_to_array((new LeitorEducacenso($this->arquivo($conteudo), '|', $codificacao))->linhas());
    }

    public function test_converte_a_codificacao_tira_o_bom_pula_linhas_vazias_e_numera_as_linhas(): void
    {
        $linhas = $this->ler("\xEF\xBB\xBF00|ESCOLA JOS\xC9 |x\r\n\r\n60|1|2\r\n");

        $this->assertSame([1 => ['00', 'ESCOLA JOSÉ', 'x'], 3 => ['60', '1', '2']], $linhas);
    }

    public function test_utf8_invalido_e_recusado_quando_o_leiaute_diz_utf8(): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('não está em UTF-8');

        $this->ler("00|JOS\xC9\n", 'UTF-8');
    }

    public function test_arquivo_binario_e_recusado(): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('não é um arquivo de texto');

        $this->ler("00|a\0b\n");
    }

    public function test_linha_com_colunas_demais_e_recusada(): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('colunas demais');

        $this->ler(str_repeat('a|', LeitorEducacenso::MAX_COLUNAS + 5) . "\n");
    }

    public function test_campo_gigante_e_recusado(): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('longa demais');

        $this->ler('00|' . str_repeat('x', LeitorEducacenso::MAX_CAMPO + 1) . "\n");
    }

    public function test_linha_maior_que_o_limite_de_bytes_e_recusada(): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('longa demais');

        $this->ler(str_repeat('x', LeitorEducacenso::MAX_BYTES_LINHA + 100));
    }

    public function test_arquivo_inexistente_e_recusado(): void
    {
        $this->expectException(DomainException::class);

        iterator_to_array((new LeitorEducacenso('/nao/existe/arquivo.txt'))->linhas());
    }
}
