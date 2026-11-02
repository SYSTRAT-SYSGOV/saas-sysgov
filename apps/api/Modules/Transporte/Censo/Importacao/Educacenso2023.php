<?php

declare(strict_types=1);

namespace Modules\Transporte\Censo\Importacao;

/**
 * Leiaute de fábrica: arquivo do Educacenso como o SETE (UFG/CECATE, MIT) o lê, versão 2023. As posições vieram da leitura
 * do código do SETE e não de um arquivo real do Inep — por isso o órgão pode corrigi-las (design D-I9). Colunas de
 * deficiência (15 a 24) não vêm ativas: dado de saúde de criança, só entra se o órgão criar o campo.
 */
final class Educacenso2023
{
    public const CHAVE = 'educacenso-2023';

    public const NOME = 'Educacenso 2023';

    public const ANO = 2023;

    public const DELIMITADOR = '|';

    public const CODIFICACAO = 'ISO-8859-1';

    /** @return list<CampoImportacao> */
    public static function campos(): array
    {
        $localizacao = ['1' => 'Urbana', '2' => 'Rural'];

        return [
            // 00 — escola
            new CampoImportacao('escola_inep', '00', 1, 'Código Inep da escola', 'texto', 'escola.inep', travado: true),
            new CampoImportacao('escola_cep', '00', 6, 'CEP da escola', 'texto', 'extra.escola'),
            new CampoImportacao('escola_endereco', '00', 9, 'Endereço da escola', 'texto', 'extra.escola'),
            new CampoImportacao('escola_localizacao', '00', 18, 'Localização da escola', 'codigo', 'extra.escola', mapa: $localizacao),
            new CampoImportacao('escola_localizacao_diferenciada', '00', 19, 'Localização diferenciada da escola', 'codigo', 'extra.escola', mapa: [
                '0' => 'Não se aplica', '1' => 'Área de assentamento', '2' => 'Terra indígena', '3' => 'Comunidade remanescente de quilombos',
            ]),
            new CampoImportacao('escola_dependencia', '00', 20, 'Dependência administrativa', 'codigo', 'extra.escola', mapa: [
                '1' => 'Federal', '2' => 'Estadual', '3' => 'Municipal', '4' => 'Privada',
            ]),
            // 20 — turma (só para casar a turma já cadastrada)
            new CampoImportacao('turma_escola_inep', '20', 1, 'Código Inep da escola', 'texto', 'turma.escola_inep', travado: true),
            new CampoImportacao('turma_inep', '20', 2, 'Código Inep da turma', 'texto', 'turma.inep', travado: true),
            // 30 — pessoa
            new CampoImportacao('pessoa_escola_inep', '30', 1, 'Código Inep da escola', 'texto', 'pessoa.escola_inep', travado: true),
            new CampoImportacao('pessoa_inep', '30', 2, 'Código Inep da pessoa', 'texto', 'pessoa.inep', travado: true),
            new CampoImportacao('pessoa_id_proprio', '30', 3, 'Identificação única na escola', 'texto', 'pessoa.id_proprio', travado: true),
            new CampoImportacao('pessoa_cpf', '30', 4, 'CPF', 'texto', 'aluno.cpf', sensivel: true),
            new CampoImportacao('pessoa_nome', '30', 5, 'Nome', 'texto', 'aluno.nome', sensivel: true),
            new CampoImportacao('pessoa_nascimento', '30', 6, 'Data de nascimento', 'data', 'aluno.nascimento', sensivel: true),
            new CampoImportacao('pessoa_sexo', '30', 10, 'Sexo', 'codigo', 'extra.aluno', mapa: ['1' => 'Masculino', '2' => 'Feminino']),
            new CampoImportacao('pessoa_cor', '30', 11, 'Cor/raça', 'codigo', 'extra.aluno', sensivel: true, mapa: [
                '0' => 'Não declarada', '1' => 'Branca', '2' => 'Preta', '3' => 'Parda', '4' => 'Amarela', '5' => 'Indígena',
            ]),
            new CampoImportacao('pessoa_cep', '30', 41, 'CEP de residência', 'texto', 'extra.aluno', sensivel: true),
            new CampoImportacao('pessoa_localizacao', '30', 43, 'Localização de residência', 'codigo', 'extra.aluno', mapa: $localizacao),
            new CampoImportacao('pessoa_email', '30', 80, 'E-mail', 'texto', 'extra.aluno', sensivel: true),
            // 60 — matrícula
            new CampoImportacao('matricula_escola_inep', '60', 1, 'Código Inep da escola', 'texto', 'matricula.escola_inep', travado: true),
            new CampoImportacao('matricula_aluno_inep', '60', 2, 'Código Inep do aluno', 'texto', 'matricula.aluno_inep', travado: true),
            new CampoImportacao('matricula_id_proprio', '60', 3, 'Identificação única do aluno na escola', 'texto', 'matricula.id_proprio', travado: true),
            new CampoImportacao('matricula_turma_inep', '60', 4, 'Código Inep da turma', 'texto', 'matricula.turma_inep', travado: true),
            new CampoImportacao('transporte_publico', '60', 20, 'Transporte escolar público', 'booleano', 'matricula.transporte', travado: true),
        ];
    }
}
