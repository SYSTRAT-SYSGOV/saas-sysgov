<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use DomainException;
use Modules\Cursos\Contracts\ComLiberacao;
use Modules\Cursos\Enums\RegraLiberacao;
use Modules\Cursos\Models\Aula;
use Modules\Cursos\Models\Curso;

/**
 * Valida e normaliza os campos de liberação (regra, dias e aula) de
 * materiais e avaliações, que compartilham as mesmas colunas (design D2).
 */
final class LiberacaoAtributos
{
    /**
     * @param array<string, mixed> $dados campos informados (parcial na atualização)
     * @return array{aula_id: int|null, liberacao_regra: string, liberacao_dias: int|null}
     */
    public function montar(Curso $curso, array $dados, ?ComLiberacao $atual): array
    {
        $regra = isset($dados['liberacao_regra'])
            ? RegraLiberacao::from((string) $dados['liberacao_regra'])
            : ($atual?->regraLiberacao() ?? RegraLiberacao::Imediata);
        $aulaId = array_key_exists('aula_id', $dados) ? ($dados['aula_id'] !== null ? (int) $dados['aula_id'] : null) : $atual?->aulaLiberacaoId();
        $dias = array_key_exists('liberacao_dias', $dados) ? ($dados['liberacao_dias'] !== null ? (int) $dados['liberacao_dias'] : null) : $atual?->diasLiberacao();

        if ($aulaId !== null && !Aula::query()->where('curso_id', $curso->id)->whereKey($aulaId)->exists()) {
            throw new DomainException('A aula informada não pertence a este curso.');
        }
        if ($regra === RegraLiberacao::InicioAula && $aulaId === null) {
            throw new DomainException('A liberação "no início da aula" exige uma aula vinculada.');
        }
        if ($regra === RegraLiberacao::DiasAposInicio && ($dias === null || $dias < 0 || $dias > 365)) {
            throw new DomainException('Informe de 0 a 365 dias para a liberação após o início da turma.');
        }

        return [
            'aula_id' => $aulaId,
            'liberacao_regra' => $regra->value,
            'liberacao_dias' => $regra === RegraLiberacao::DiasAposInicio ? $dias : null,
        ];
    }
}
