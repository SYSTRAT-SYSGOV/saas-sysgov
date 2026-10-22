<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Models\User;
use Modules\Cursos\Models\Participante;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaUsuario;
use Modules\Pessoas\Services\ResolucaoPessoaService;
use Modules\Pessoas\Support\Documento;

/**
 * Participante ligado ao Cadastro de Pessoas (D9). CPF → pessoa do tenant (criada se preciso) e um
 * único participante por pessoa; CNPJ (empresa) ou sem documento → participante sem pessoa. O nome
 * do participante acompanha o da pessoa; certificados já emitidos guardam o nome da época.
 */
final class ParticipantePessoaService
{
    public function __construct(private readonly ResolucaoPessoaService $pessoas) {}

    /** Pessoa ligada ao usuário (promovido a partir do Cadastro de Pessoas), se houver. */
    public function pessoaDoUsuario(User $user): ?Pessoa
    {
        $pessoaId = PessoaUsuario::query()->where('user_id', $user->id)->value('pessoa_id');

        return $pessoaId !== null ? Pessoa::query()->find($pessoaId) : null;
    }

    /** Liga o participante à pessoa (e o nome passa a ser o dela). */
    public function ligar(Participante $participante, Pessoa $pessoa): Participante
    {
        $participante->update(['pessoa_id' => $pessoa->id, 'nome' => $pessoa->nome]);

        return $participante;
    }

    /**
     * Resolve o destinatário informado à mão (emissão avulsa): por CPF, pela pessoa; por CNPJ, pelo
     * documento; senão pelo e-mail; cria o participante se não houver.
     */
    public function resolver(string $nome, ?string $email, ?string $documento): Participante
    {
        $digitos = Documento::somenteDigitos((string) $documento);
        $email = $email !== null && trim($email) !== '' ? mb_strtolower(trim($email)) : null;

        if (strlen($digitos) === 11 && Documento::valido($digitos)) {
            $pessoa = $this->pessoas->resolverPorCpf($digitos, ['nome' => $nome], 'cursos');
            $participante = Participante::query()->where('pessoa_id', $pessoa->id)->first()
                ?? ($email !== null ? Participante::query()->whereNull('pessoa_id')->where('email', $email)->first() : null);

            if ($participante === null) {
                return Participante::create(['pessoa_id' => $pessoa->id, 'nome' => $pessoa->nome, 'email' => $email, 'documento' => $digitos]);
            }

            return $this->ligar($participante, $pessoa);
        }

        $participante = ($digitos !== '' ? Participante::query()->whereNull('pessoa_id')->where('documento', $digitos)->first() : null)
            ?? ($email !== null ? Participante::query()->where('email', $email)->first() : null);

        return $participante ?? Participante::create(['nome' => $nome, 'email' => $email, 'documento' => $digitos !== '' ? $digitos : null]);
    }

    /** Evento PessoaAtualizada: o nome dos participantes ligados acompanha o da pessoa. */
    public function atualizarNomes(int $pessoaId, int $tenantId): void
    {
        $nome = Pessoa::withoutGlobalScopes()->where('tenant_id', $tenantId)->whereKey($pessoaId)->value('nome');
        if ($nome !== null) {
            Participante::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('pessoa_id', $pessoaId)->update(['nome' => $nome]);
        }
    }
}
