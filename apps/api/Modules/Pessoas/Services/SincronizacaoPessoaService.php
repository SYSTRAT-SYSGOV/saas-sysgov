<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use App\Support\AuditLogger;
use Modules\Pessoas\Models\PessoaIntegracao;
use Modules\Pessoas\Models\PessoaSyncLog;
use Modules\Pessoas\Services\Adapters\GenericHttpPessoaImportAdapter;
use Throwable;

/**
 * Orquestra a consulta ao sistema da prefeitura + importação, sempre registrando
 * o resultado (sucesso, não encontrado ou falha) em log — uma integração externa
 * indisponível ou lenta nunca deve propagar exceção para além deste serviço.
 */
final readonly class SincronizacaoPessoaService
{
    public function __construct(
        private ImportacaoPessoaService $importacao,
        private AuditLogger $audit,
    ) {}

    public function sincronizar(PessoaIntegracao $integracao, string $cpf): PessoaSyncLog
    {
        $base = ['integracao_id' => $integracao->id, 'cpf' => $cpf, 'tipo' => 'importacao_pessoa', 'direcao' => 'inbound'];

        try {
            $dados = (new GenericHttpPessoaImportAdapter($integracao))->buscarPorCpf($cpf);

            if ($dados === null) {
                $log = PessoaSyncLog::create($base + [
                    'status' => 'nao_encontrado', 'registros_processados' => 1, 'registros_sucesso' => 0, 'registros_falha' => 0,
                ]);
                $this->audit->record('pessoas', 'pessoa.sync_nao_encontrado', "Integracao #{$integracao->id}", null, $log->toArray());

                return $log;
            }

            $resultado = $this->importacao->importar($dados);

            $log = PessoaSyncLog::create($base + [
                'status' => $resultado['erro'] ? 'erro' : 'sucesso',
                'registros_processados' => 1,
                'registros_sucesso' => $resultado['erro'] ? 0 : 1,
                'registros_falha' => $resultado['erro'] ? 1 : 0,
                'detalhes' => ['pessoa_id' => $resultado['pessoa']?->id, 'criada' => $resultado['criada'], 'erro' => $resultado['erro']],
            ]);
            $this->audit->record('pessoas', 'pessoa.sincronizada', "Integracao #{$integracao->id}", null, $log->toArray());

            return $log;
        } catch (Throwable $e) {
            $log = PessoaSyncLog::create($base + [
                'status' => 'erro', 'registros_processados' => 1, 'registros_sucesso' => 0, 'registros_falha' => 1,
                'detalhes' => ['erro' => $e->getMessage()],
            ]);
            $this->audit->record('pessoas', 'pessoa.sync_falhou', "Integracao #{$integracao->id}", null, $log->toArray());

            return $log;
        }
    }
}
