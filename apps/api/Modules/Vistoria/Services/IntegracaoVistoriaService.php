<?php

declare(strict_types=1);

namespace Modules\Vistoria\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Modules\Vistoria\Models\VistoriaIntegracao;

final class IntegracaoVistoriaService
{
    public function __construct(
        private AuditLogger $audit,
    ) {}

    /**
     * Cria uma nova credencial de integração M2M. O `api_key` em texto puro só existe
     * neste retorno — a partir daqui fica oculto por padrão (`$hidden`) em qualquer
     * serialização do model (inclusive no `toArray()` gravado no audit log), prática
     * padrão de token de API (mostrar uma única vez, no momento da criação).
     */
    public function criar(string $nome): VistoriaIntegracao
    {
        $integracao = DB::transaction(fn (): VistoriaIntegracao => VistoriaIntegracao::create(['nome' => $nome, 'is_active' => true]));

        $this->audit->record('vistoria', 'integracao.criada', "VistoriaIntegracao #{$integracao->id}", null, $integracao->toArray());

        return $integracao;
    }

    /** Revoga a credencial (soft — mantém o histórico, só desativa o acesso). */
    public function revogar(VistoriaIntegracao $integracao): VistoriaIntegracao
    {
        $antes = $integracao->toArray();

        $integracao->update(['is_active' => false]);

        $this->audit->record('vistoria', 'integracao.revogada', "VistoriaIntegracao #{$integracao->id}", $antes, $integracao->toArray());

        return $integracao;
    }

    public function registrarUso(VistoriaIntegracao $integracao): void
    {
        $integracao->update(['ultimo_uso_em' => now()]);
    }
}
