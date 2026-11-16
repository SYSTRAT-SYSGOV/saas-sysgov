<?php

declare(strict_types=1);

namespace Modules\Parecer\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Aluno;
use Modules\Parecer\Models\Avaliacao;
use Modules\Parecer\Models\Habilidade;
use Modules\Parecer\Models\Observacao;
use Modules\Parecer\Services\Concerns\RegistraMutacao;
use Modules\Parecer\Support\Catalogo;

/** Conceitos por habilidade e observação do professor (avaliar.php). */
final class AvaliacaoService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /**
     * @param array<int|string, string|null> $conceitos habilidade_id => A|EP|NA|'' ('' apaga)
     * @return array{mudancas: int, observacao: bool}
     */
    public function salvar(Aluno $aluno, int $serie, int $tri, string $materia, array $conceitos, ?string $observacao, User $user): array
    {
        return DB::transaction(function () use ($aluno, $serie, $tri, $materia, $conceitos, $observacao, $user): array {
            $validas = Habilidade::query()->where('serie', $serie)->where('materia', $materia)->pluck('descricao', 'id');
            $antes = Avaliacao::query()->where('aluno_id', $aluno->id)->where('trimestre', $tri)->pluck('conceito', 'habilidade_id');
            $mudancas = [];
            foreach ($conceitos as $hid => $conceito) {
                $hid = (int) $hid;
                if (!isset($validas[$hid])) {
                    continue;
                }
                $novo = isset(Catalogo::CONCEITOS[(string) $conceito]) ? (string) $conceito : '';
                $velho = (string) ($antes[$hid] ?? '');
                if ($novo === $velho) {
                    continue;
                }
                if ($novo !== '') {
                    Avaliacao::query()->updateOrCreate(['aluno_id' => $aluno->id, 'habilidade_id' => $hid, 'trimestre' => $tri], ['conceito' => $novo, 'avaliado_por' => $user->id]);
                } else {
                    Avaliacao::query()->where('aluno_id', $aluno->id)->where('habilidade_id', $hid)->where('trimestre', $tri)->delete();
                }
                $mudancas[] = ['habilidade_id' => $hid, 'habilidade' => mb_substr((string) $validas[$hid], 0, 120), 'antes' => $velho ?: '–', 'depois' => $novo ?: '–'];
            }

            $obsMudou = false;
            if ($observacao !== null) {
                $nova = Catalogo::primeiraMaiuscula(mb_substr($observacao, 0, 2000));
                $registro = Observacao::query()->where('aluno_id', $aluno->id)->where('trimestre', $tri)->where('materia', $materia)->first();
                $velha = (string) ($registro->texto ?? '');
                if ($nova !== $velha) {
                    $obsMudou = true;
                    $nova === ''
                        ? $registro?->delete()
                        : Observacao::query()->updateOrCreate(['aluno_id' => $aluno->id, 'trimestre' => $tri, 'materia' => $materia], ['texto' => $nova, 'atualizado_por' => $user->id]);
                    $this->auditar('observacao', 'salva', $aluno->id, sprintf('Observação de %s no %dº tri · %s', Catalogo::MATERIAS[$materia], $tri, $aluno->nome), ['texto' => $velha], ['texto' => $nova]);
                }
            }

            if ($mudancas !== []) {
                $this->auditar('avaliacao', 'salva', $aluno->id, sprintf('%d conceito(s) de %s no %dº tri · %s (%s)', count($mudancas), Catalogo::MATERIAS[$materia], $tri, $aluno->nome, Catalogo::SERIES[$serie]), null, ['mudancas' => $mudancas]);
            }

            return ['mudancas' => count($mudancas), 'observacao' => $obsMudou];
        });
    }
}
