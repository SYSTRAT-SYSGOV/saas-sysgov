<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Support\CsvSeguro;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Relatórios do Cursos, tarefa 1.4 — CSV protegido contra injeção de fórmula (design D6).
 */
final class CsvSeguroTest extends TestCase
{
    /** @return iterable<string, array{mixed, mixed}> */
    public static function celulas(): iterable
    {
        // Cenário "Nome que começa com fórmula".
        yield 'começa com =' => ['=HYPERLINK("http://x")', "'=HYPERLINK(\"http://x\")"];
        yield 'começa com +' => ['+1234', "'+1234"];
        yield 'começa com -' => ['-1234', "'-1234"];
        yield 'começa com @' => ['@mencao', "'@mencao"];
        yield 'começa com tabulação' => ["\tsim", "'\tsim"];
        yield 'começa com retorno de carro' => ["\rsim", "'\rsim"];
        yield 'texto comum não muda' => ['Ana Souza', 'Ana Souza'];
        yield 'sinal no meio do texto não muda' => ['Empresa = Boa', 'Empresa = Boa'];
        yield 'número não muda' => [1234, 1234];
        yield 'nulo não muda' => [null, null];
        yield 'string vazia não muda' => ['', ''];
    }

    #[DataProvider('celulas')]
    public function test_neutraliza(mixed $entrada, mixed $esperado): void
    {
        $this->assertSame($esperado, (new CsvSeguro())->neutralizar($entrada));
    }

    public function test_linha_neutralizada_e_separada_por_ponto_e_virgula(): void
    {
        $handle = fopen('php://memory', 'w+');
        (new CsvSeguro())->escreverLinha($handle, ['=SOMA(A1)', 'AnaSouza', 'Confirmada']);
        rewind($handle);
        $linha = fgets($handle);
        fclose($handle);

        // fputcsv só envolve em aspas quem precisa (aqui, nenhum campo tem espaço, ";" ou aspas);
        // a proteção contra fórmula é só o apóstrofo à frente, que fputcsv não considera especial.
        $this->assertSame("'=SOMA(A1);AnaSouza;Confirmada\n", $linha);
    }

    public function test_cabecalho_leva_o_bom_utf8(): void
    {
        $handle = fopen('php://memory', 'w+');
        (new CsvSeguro())->escreverCabecalho($handle, ['Nome', 'E-mail']);
        rewind($handle);
        $conteudo = stream_get_contents($handle);
        fclose($handle);

        $this->assertStringStartsWith("\xEF\xBB\xBFNome;E-mail", $conteudo);
    }
}
