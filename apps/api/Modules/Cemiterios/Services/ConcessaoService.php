<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Listeners\EnviarEmail;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Guia;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Support\ConflitoVersaoException;
use Modules\Cemiterios\Support\EstadoJazigo;
use Modules\Cemiterios\Support\RegraNegocioException;

/** Concessões temporárias e perpétuas: outorga, renovação, expiração e aviso de término (RF-11..RF-14). */
final readonly class ConcessaoService
{
    public function __construct(
        private JazigoEstadoService $estados,
        private ParametroService $parametros,
        private GuiaService $guias,
    ) {}

    /** @param array{plot_id: int, holder_id: int, modalidade: string, inicio?: string|null, lock_version: int, sujeita_taxa_anual?: bool, processo_administrativo?: string|null} $dados */
    public function conceder(array $dados): Concessao
    {
        $jazigo = Jazigo::findOrFail($dados['plot_id']);

        // A versão lida é conferida antes de tudo: dois atendentes no mesmo jazigo → um recebe 409 (RNF-06).
        if ($jazigo->lock_version !== (int) $dados['lock_version']) {
            throw new ConflitoVersaoException();
        }
        if ($jazigo->estado !== EstadoJazigo::Disponivel || $jazigo->concessaoVigente() !== null) {
            throw new RegraNegocioException('jazigo.indisponivel', 'Somente jazigo Disponível pode ser concedido.');
        }

        $inicio = CarbonImmutable::parse($dados['inicio'] ?? today());
        $termino = $dados['modalidade'] === 'perpetua'
            ? null
            : $inicio->addYearsNoOverflow($this->parametros->vigente()->concessao_temporaria_anos)->toDateString();

        return DB::transaction(function () use ($dados, $jazigo, $inicio, $termino): Concessao {
            $ano = (int) $inicio->year;
            $sequencia = Concessao::withTrashed()->where('numero', 'like', "%/{$ano}")->lockForUpdate()->count() + 1;

            $concessao = Concessao::create([
                'numero' => "{$sequencia}/{$ano}",
                'processo_administrativo' => $dados['processo_administrativo'] ?? null,
                'plot_id' => $jazigo->id,
                'holder_id' => $dados['holder_id'],
                'modalidade' => $dados['modalidade'],
                'inicio' => $inicio->toDateString(),
                'termino' => $termino,
                'sujeita_taxa_anual' => $dados['sujeita_taxa_anual'] ?? true,
                'situacao' => 'vigente',
            ]);

            if (!empty($dados['processo_administrativo'])) {
                $jazigo->update(['processo_administrativo' => $dados['processo_administrativo']]);
            }

            $this->estados->recalcular($jazigo, "Concessão {$concessao->numero} ativada", (int) $dados['lock_version']);

            return $concessao;
        });
    }

    /** @return array{concessao: Concessao, guia: Guia} */
    public function renovar(Concessao $concessao, ?string $processoAdministrativo = null): array
    {
        if ($concessao->modalidade !== 'temporaria' || $concessao->situacao !== 'vigente') {
            throw new RegraNegocioException('concessao.nao_renovavel', 'Somente concessão temporária vigente pode ser renovada.');
        }

        return DB::transaction(function () use ($concessao, $processoAdministrativo): array {
            $base = CarbonImmutable::parse(max($concessao->termino->toDateString(), today()->toDateString()));
            $updateData = [
                'termino' => $base->addYearsNoOverflow($this->parametros->vigente()->concessao_temporaria_anos)->toDateString(),
                'notificado_para_termino' => null,
            ];
            if ($processoAdministrativo !== null) {
                $updateData['processo_administrativo'] = $processoAdministrativo;
            }
            $concessao->update($updateData);

            return ['concessao' => $concessao, 'guia' => $this->guias->emitirParaConcessao($concessao, 'renovacao')];
        });
    }

    /**
     * Expira concessões temporárias vencidas (idempotente). Com restos no
     * jazigo, a concessão fica com pendência de regularização (RF-14).
     */
    public function expirarVencidas(): int
    {
        $total = 0;

        Concessao::where('situacao', 'vigente')->where('modalidade', 'temporaria')
            ->whereDate('termino', '<', today()->toDateString())
            ->each(function (Concessao $concessao) use (&$total): void {
                DB::transaction(function () use ($concessao): void {
                    $jazigo = $concessao->jazigo()->firstOrFail();
                    $concessao->update(['situacao' => 'expirada', 'pendencia_regularizacao' => $jazigo->ocupacao > 0]);
                    $this->estados->recalcular($jazigo, "Concessão {$concessao->numero} expirada");
                });
                $total++;
            });

        return $total;
    }

    /** Aviso de término com a antecedência parametrizada, uma vez por ciclo (RF-12). */
    public function notificarVencimentos(): int
    {
        $limite = today()->addDays($this->parametros->vigente()->notificacao_antecedencia_dias)->toDateString();
        $total = 0;

        Concessao::with('concessionario')->where('situacao', 'vigente')->where('modalidade', 'temporaria')
            ->whereDate('termino', '>=', today()->toDateString())
            ->whereDate('termino', '<=', $limite)
            ->each(function (Concessao $concessao) use (&$total): void {
                if ($concessao->notificado_para_termino?->equalTo($concessao->termino)) {
                    return;
                }

                $email = $concessao->concessionario?->email;
                if ($email) {
                    EnviarEmail::agendar($email, "Concessão {$concessao->numero} vence em " . $concessao->termino->format('d/m/Y'),
                        "Prezado(a) {$concessao->concessionario->nome},\n\nA concessão {$concessao->numero} termina em "
                        . $concessao->termino->format('d/m/Y') . ". Solicite a renovação pelo portal do concessionário ou na administração do cemitério.");
                }

                $concessao->update(['notificado_para_termino' => $concessao->termino]);
                $total++;
            });

        return $total;
    }
}
