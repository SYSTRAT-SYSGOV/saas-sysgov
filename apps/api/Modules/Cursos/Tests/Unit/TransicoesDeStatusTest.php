<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Unit;

use Modules\Cursos\Enums\Modalidade;
use Modules\Cursos\Enums\StatusCurso;
use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Enums\StatusTurma;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class TransicoesDeStatusTest extends TestCase
{
    /** @return iterable<string, array{StatusCurso, StatusCurso, bool}> */
    public static function transicoesCurso(): iterable
    {
        yield 'rascunho → publicado' => [StatusCurso::Rascunho, StatusCurso::Publicado, true];
        yield 'publicado → encerrado' => [StatusCurso::Publicado, StatusCurso::Encerrado, true];
        yield 'rascunho → encerrado' => [StatusCurso::Rascunho, StatusCurso::Encerrado, false];
        yield 'encerrado → publicado' => [StatusCurso::Encerrado, StatusCurso::Publicado, false];
        yield 'publicado → rascunho' => [StatusCurso::Publicado, StatusCurso::Rascunho, false];
    }

    #[DataProvider('transicoesCurso')]
    public function test_transicoes_do_curso(StatusCurso $de, StatusCurso $para, bool $permitida): void
    {
        $this->assertSame($permitida, $de->podeTransicionarPara($para));
    }

    /** @return iterable<string, array{StatusTurma, StatusTurma, bool}> */
    public static function transicoesTurma(): iterable
    {
        yield 'aberta → encerrada' => [StatusTurma::Aberta, StatusTurma::Encerrada, true];
        yield 'aberta → cancelada' => [StatusTurma::Aberta, StatusTurma::Cancelada, true];
        yield 'encerrada → aberta' => [StatusTurma::Encerrada, StatusTurma::Aberta, false];
        yield 'cancelada → encerrada' => [StatusTurma::Cancelada, StatusTurma::Encerrada, false];
    }

    #[DataProvider('transicoesTurma')]
    public function test_transicoes_da_turma(StatusTurma $de, StatusTurma $para, bool $permitida): void
    {
        $this->assertSame($permitida, $de->podeTransicionarPara($para));
    }

    /** @return iterable<string, array{StatusInscricao, StatusInscricao, bool}> */
    public static function transicoesInscricao(): iterable
    {
        yield 'pendente → confirmada (aprovação)' => [StatusInscricao::Pendente, StatusInscricao::Confirmada, true];
        yield 'pendente → cancelada (recusa)' => [StatusInscricao::Pendente, StatusInscricao::Cancelada, true];
        yield 'lista_espera → confirmada (promoção)' => [StatusInscricao::ListaEspera, StatusInscricao::Confirmada, true];
        yield 'lista_espera → pendente (promoção com aprovação)' => [StatusInscricao::ListaEspera, StatusInscricao::Pendente, true];
        yield 'confirmada → concluida' => [StatusInscricao::Confirmada, StatusInscricao::Concluida, true];
        yield 'confirmada → nao_concluida' => [StatusInscricao::Confirmada, StatusInscricao::NaoConcluida, true];
        yield 'pendente → concluida' => [StatusInscricao::Pendente, StatusInscricao::Concluida, false];
        yield 'lista_espera → concluida' => [StatusInscricao::ListaEspera, StatusInscricao::Concluida, false];
        yield 'cancelada → confirmada' => [StatusInscricao::Cancelada, StatusInscricao::Confirmada, false];
        yield 'concluida → cancelada' => [StatusInscricao::Concluida, StatusInscricao::Cancelada, false];
        yield 'nao_concluida → concluida' => [StatusInscricao::NaoConcluida, StatusInscricao::Concluida, false];
    }

    #[DataProvider('transicoesInscricao')]
    public function test_transicoes_da_inscricao(StatusInscricao $de, StatusInscricao $para, bool $permitida): void
    {
        $this->assertSame($permitida, $de->podeTransicionarPara($para));
    }

    public function test_vaga_e_atividade_da_inscricao(): void
    {
        $this->assertTrue(StatusInscricao::Pendente->ocupaVaga());
        $this->assertTrue(StatusInscricao::Confirmada->ocupaVaga());
        $this->assertFalse(StatusInscricao::ListaEspera->ocupaVaga());
        $this->assertTrue(StatusInscricao::ListaEspera->ativa());
        $this->assertFalse(StatusInscricao::Cancelada->ativa());
    }

    public function test_modalidade_define_local_e_link(): void
    {
        $this->assertTrue(Modalidade::Presencial->exigeLocal());
        $this->assertFalse(Modalidade::Presencial->exigeLink());
        $this->assertFalse(Modalidade::Online->exigeLocal());
        $this->assertTrue(Modalidade::Online->exigeLink());
        $this->assertTrue(Modalidade::Hibrido->exigeLocal());
        $this->assertTrue(Modalidade::Hibrido->exigeLink());
    }
}
