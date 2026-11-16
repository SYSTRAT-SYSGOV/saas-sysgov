<?php

declare(strict_types=1);

namespace Modules\Parecer\Support;

/**
 * Constantes do parecer descritivo, iguais às do sistema PHP de referência (inc/bootstrap.php).
 */
final class Catalogo
{
    /** @var array<string, string> */
    public const MATERIAS = [
        'LP' => 'Língua Portuguesa',
        'MAT' => 'Matemática',
        'CIE' => 'Ciências',
        'HIS' => 'História',
        'GEO' => 'Geografia',
        'EF' => 'Educação Física',
        'ART' => 'Arte',
        'ER' => 'Ensino Religioso',
    ];

    /** @var array<int, string> */
    public const SERIES = [1 => '1º ano', 2 => '2º ano', 3 => '3º ano', 4 => '4º ano', 5 => '5º ano'];

    /** @var array<string, string> */
    public const CONCEITOS = ['A' => 'Atingiu', 'EP' => 'Em processo', 'NA' => 'Não atingiu'];

    /**
     * Funções da turma: rótulo e matérias que avalia. O regente avalia LP, MAT e CIE e também cobre
     * as matérias que não têm professor próprio na turma.
     *
     * @var array<string, array{0: string, 1: list<string>}>
     */
    public const FUNCOES = [
        'professor_regente' => ['Professor(a) regente', ['LP', 'MAT', 'CIE']],
        'professor_historia_geografia' => ['Professor(a) de História e Geografia', ['HIS', 'GEO']],
        'professor_educacao_fisica' => ['Professor(a) de Educação Física', ['EF']],
        'professor_arte' => ['Professor(a) de Arte', ['ART']],
        'professor_ensino_religioso' => ['Professor(a) de Ensino Religioso', ['ER']],
        'pedagogo' => ['Pedagogo(a)', []],
        'pedagogo_rmd' => ['Pedagogo(a) RMD', []],
        'diretor' => ['Diretor(a)', []],
    ];

    public const MEDIA_APROVACAO = 6.0;

    public const AULAS_POR_DIA = 5;

    /**
     * Trimestres com nota por série: 1º ano só parecer; 2º ano só o 3º trimestre; demais os três.
     *
     * @return list<int>
     */
    public static function trimestresComNota(int $serie): array
    {
        return match ($serie) {
            1 => [],
            2 => [3],
            default => [1, 2, 3],
        };
    }

    /**
     * Períodos padrão dos trimestres quando o cadastro escolar não tem datas.
     *
     * @return array<int, array{0: string, 1: string}>
     */
    public static function periodosPadrao(int $ano): array
    {
        return [1 => ["{$ano}-02-01", "{$ano}-05-15"], 2 => ["{$ano}-05-16", "{$ano}-08-31"], 3 => ["{$ano}-09-01", "{$ano}-12-31"]];
    }

    /** "ótimo aluno" → "Ótimo aluno". */
    public static function primeiraMaiuscula(string $texto): string
    {
        $texto = trim($texto);

        return $texto === '' ? '' : mb_strtoupper(mb_substr($texto, 0, 1)) . mb_substr($texto, 1);
    }

    /** "Articula corretamente as palavras." → "articula corretamente as palavras" (mantém siglas). */
    public static function trechoHabilidade(string $descricao): string
    {
        $d = rtrim(trim($descricao), ' .;');
        $segunda = mb_substr($d, 1, 1);
        if ($segunda !== '' && $segunda === mb_strtolower($segunda)) {
            $d = mb_strtolower(mb_substr($d, 0, 1)) . mb_substr($d, 1);
        }

        return $d;
    }
}
