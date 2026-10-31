<?php

declare(strict_types=1);

namespace Modules\Transporte\Censo;

use Modules\Transporte\Enums\MediacaoDidatica;
use Modules\Transporte\Models\Alocacao;

/**
 * Leiaute básico em CSV, provisório: usado até que o órgão obtenha o documento oficial do Educacenso. Não é o
 * leiaute do Inep. Colunas separadas por `;`, UTF-8 com BOM, cabeçalho com as chaves dos campos.
 */
final class LeiauteBasico implements Leiaute
{
    public const CHAVE = 'basico-1';

    /** Tipologias do Censo (1 a 11), uma coluna cada. */
    private const TIPOLOGIAS = [
        1 => 'Van/Kombi', 2 => 'Microônibus', 3 => 'Ônibus', 4 => 'Bicicleta', 5 => 'Tração animal', 6 => 'Outro',
        7 => 'Aquaviário até 5 passageiros', 8 => 'Aquaviário de 5 a 15', 9 => 'Aquaviário de 15 a 35', 10 => 'Aquaviário acima de 35', 11 => 'Ferroviário',
    ];

    public function chave(): string
    {
        return self::CHAVE;
    }

    public function nome(): string
    {
        return 'Leiaute básico (CSV)';
    }

    public function descricao(): string
    {
        return 'CSV próprio do SysGov, provisório, até a adoção do leiaute oficial do Educacenso. Colunas separadas por ponto e vírgula, UTF-8 com BOM.';
    }

    public function camposDeCodigoInep(): array
    {
        return ['aluno_inep', 'turma_inep'];
    }

    public function campos(): array
    {
        $campos = [
            new Campo('ano_letivo', 'Ano letivo', 'identificacao', 'fixo', fn (Linha $l): int => $l->anoLetivo, obrigatorio: true),
            new Campo('escola_inep', 'Código Inep da escola', 'identificacao', 'Escola', fn (Linha $l): ?string => $l->escolaInep),
            new Campo('escola_nome', 'Escola', 'identificacao', 'Escola', fn (Linha $l): ?string => $l->escolaNome),
            new Campo('aluno_id', 'Código do aluno no SysGov', 'identificacao', 'Escola', fn (Linha $l): int => $l->aluno->id, obrigatorio: true),
            new Campo('aluno_inep', 'Código Inep do aluno', 'identificacao', 'Escola', fn (Linha $l): ?string => $l->aluno->inep_id),
            new Campo('aluno_nome', 'Nome do aluno', 'identificacao', 'Escola', fn (Linha $l): string => $l->aluno->nome, obrigatorio: true),
            new Campo('aluno_nascimento', 'Data de nascimento', 'identificacao', 'Escola', fn (Linha $l): ?string => $l->aluno->nascimentoDaPessoa()?->toDateString()),
            new Campo('aluno_cpf', 'CPF do aluno', 'identificacao', 'Escola', fn (Linha $l): ?string => $l->aluno->pessoa?->documento_pendente ? null : $l->aluno->pessoa?->documento,
                sensivel: true, confere: false),
            new Campo('turma_inep', 'Código Inep da turma', 'matricula', 'Escola', fn (Linha $l): ?string => $l->aluno->turma?->inep),
            new Campo('turma_nome', 'Turma', 'matricula', 'Escola', fn (Linha $l): ?string => $l->aluno->turma?->nome),
            new Campo('turma_turno', 'Turno da turma', 'matricula', 'Escola', fn (Linha $l): ?string => $l->aluno->turma?->turno?->nome),
            new Campo('atendimento_curricular', 'Atendimento curricular', 'matricula', 'Transporte', fn (Linha $l): int => $l->alocacao->atendimento_curricular ? 1 : 0),
            new Campo('mediacao_didatica', 'Mediação didática', 'matricula', 'Transporte', fn (Linha $l): string => $l->alocacao->mediacao_didatica),
            new Campo('pais_residencia', 'País de residência', 'matricula', 'Transporte', fn (Linha $l): string => $l->alocacao->pais_residencia),
            new Campo('transporte_publico', 'Utiliza transporte escolar público', 'transporte', 'Transporte', fn (Linha $l): ?int => $l->anulada() ? null : 1, obrigatorio: true),
            new Campo('poder_publico', 'Poder público responsável', 'transporte', 'Transporte', fn (Linha $l): ?int => $l->anulada() ? null : $l->alocacao->poder_publico),
            new Campo('rota', 'Rota', 'transporte', 'Transporte', fn (Linha $l): ?string => $l->alocacao->rota?->nome),
            new Campo('turno_rota', 'Turno da rota', 'transporte', 'Transporte', fn (Linha $l): string => $l->alocacao->turno),
            new Campo('parada', 'Parada', 'transporte', 'Transporte', fn (Linha $l): ?string => $l->alocacao->parada?->nome),
            new Campo('placa', 'Placa do veículo', 'transporte', 'Transporte', fn (Linha $l): ?string => $l->alocacao->rota?->veiculo?->placa),
            new Campo('usa_transporte_rural', 'Transporte rural', 'transporte', 'Transporte', fn (Linha $l): int => $l->alocacao->usa_transporte_rural ? 1 : 0),
            new Campo('necessidade_especial', 'Necessidade de transporte adaptado', 'transporte', 'Transporte', fn (Linha $l): int => $l->alocacao->necessidade_especial ? 1 : 0, sensivel: true),
        ];
        foreach (self::TIPOLOGIAS as $codigo => $rotulo) {
            $campos[] = new Campo(
                "tipologia_{$codigo}", "Tipologia {$codigo} — {$rotulo}", 'transporte', 'Transporte',
                fn (Linha $l): int => $l->anulada() || $l->tipologia() !== $codigo ? 0 : 1,
            );
        }

        return $campos;
    }

    /** @return list<string> valores válidos da mediação, para referência dos testes */
    public static function mediacoes(): array
    {
        return array_column(MediacaoDidatica::cases(), 'value');
    }
}
