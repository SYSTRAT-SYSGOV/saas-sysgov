<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\PessoaDivergencia;
use Modules\Pessoas\Support\RegraNegocioException;

/** Decide qual valor prevalece em uma divergência e encerra o registro, com auditoria. */
final class DivergenciaPessoaService
{
    public function __construct(
        private readonly AtualizacaoCivilPessoaService $civil,
        private readonly AuditLogger $audit,
    ) {}

    /** @param string $decisao `modulo` (o valor do módulo prevalece) ou `mdm` (o do cadastro central) */
    public function resolver(PessoaDivergencia $divergencia, string $decisao, User $usuario): PessoaDivergencia
    {
        if ($divergencia->estado !== PessoaDivergencia::ABERTA) {
            throw new RegraNegocioException('divergencia_ja_resolvida', 'Esta divergência já foi resolvida.');
        }
        if (! in_array($decisao, PessoaDivergencia::DECISOES, true)) {
            throw new RegraNegocioException('decisao_invalida', 'A decisão deve ser "modulo" ou "mdm".');
        }

        return DB::transaction(function () use ($divergencia, $decisao, $usuario): PessoaDivergencia {
            // Valor do módulo prevalece: a pessoa do cadastro central passa a ter o valor do módulo.
            if ($decisao === 'modulo' && $divergencia->valor_modulo !== null) {
                $this->civil->atualizar($divergencia->pessoa()->firstOrFail(), [$divergencia->campo => $divergencia->valor_modulo], $divergencia->modulo);
            }

            $divergencia->update([
                'estado' => PessoaDivergencia::RESOLVIDA,
                'decisao' => $decisao,
                'resolvida_por' => $usuario->id,
                'resolvida_em' => now(),
            ]);

            $this->audit->record('pessoas', 'pessoa.divergencia_resolvida', "Pessoa #{$divergencia->pessoa_id}", null, [
                'divergencia_id' => $divergencia->id,
                'modulo' => $divergencia->modulo,
                'campo' => $divergencia->campo,
                'decisao' => $decisao,
            ]);

            return $divergencia;
        });
    }
}
