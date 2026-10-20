<?php

declare(strict_types=1);

namespace Modules\Capd\Support;

use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\ServidorPessoaService;
use Modules\Pessoas\Contracts\ConciliacaoModuloInterface;
use Modules\Pessoas\Support\RegistroConciliacao;

/**
 * Porta do CAPD para `pessoas:conciliar capd` (unificar-pessoas-fase-2-capd): concilia as cópias de CPF, nome,
 * nome social e nascimento de `capd_servidores` com o cadastro central. Só liga e registra divergência: não
 * altera o servidor, então avaliações, notas e hashes seguem idênticos.
 */
final class ConciliacaoServidores implements ConciliacaoModuloInterface
{
    public function modulo(): string
    {
        return 'capd';
    }

    public function tabela(): string
    {
        return 'capd_servidores';
    }

    public function registros(): iterable
    {
        foreach (Servidor::query()->orderBy('id')->cursor() as $servidor) {
            yield new RegistroConciliacao(
                $servidor->id,
                $servidor->pessoa_id,
                // O `000.000.000-00` de preenchimento da integração vira "sem documento" (pessoa pendente).
                ServidorPessoaService::cpfValido($servidor->cpf),
                [
                    'nome' => $servidor->nome_completo,
                    'nome_social' => $servidor->nome_social,
                    'data_nascimento' => $servidor->data_nascimento?->toDateString(),
                ],
                null,
                false, // servidor é adulto: pessoa pendente sem nascimento é aceita
            );
        }
    }

    public function vincular(int $registroId, int $pessoaId): void
    {
        Servidor::query()->whereKey($registroId)->update(['pessoa_id' => $pessoaId]);
    }
}
