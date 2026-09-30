<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaContato;
use Modules\Pessoas\Models\PessoaDocumento;
use Modules\Pessoas\Models\PessoaEndereco;
use Modules\Pessoas\Support\Documento;

/** Cadastro, atualização e busca de pessoas físicas e suas sub-entidades (MDM). */
final readonly class PessoaService
{
    /** @param array<string, mixed> $dados */
    public function criar(array $dados): Pessoa
    {
        return Pessoa::create($dados);
    }

    /** @param array<string, mixed> $dados */
    public function atualizar(Pessoa $pessoa, array $dados): Pessoa
    {
        $pessoa->update($dados);

        return $pessoa;
    }

    /**
     * @param array{q?: string, tipo_vinculo?: string, status?: string, per_page?: int} $filtros
     * @return LengthAwarePaginator<int, Pessoa>
     */
    public function listar(array $filtros = []): LengthAwarePaginator
    {
        return Pessoa::query()
            ->with(['vinculos', 'usuario'])
            ->when($filtros['q'] ?? null, function ($query, string $q): void {
                $digitos = Documento::somenteDigitos($q);
                if (strlen($digitos) === 11) {
                    $query->where('cpf_hash', Documento::hash($digitos));
                } else {
                    $query->where('nome', 'like', "%{$q}%");
                }
            })
            ->when($filtros['tipo_vinculo'] ?? null, fn ($query, string $tipo) => $query->whereHas(
                'vinculos',
                fn ($vinculo) => $vinculo->where('tipo_vinculo', $tipo)
            ))
            ->when($filtros['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->orderBy('nome')
            ->paginate((int) ($filtros['per_page'] ?? 25));
    }

    /** @param array<string, mixed> $dados */
    public function adicionarDocumento(Pessoa $pessoa, array $dados): PessoaDocumento
    {
        return $pessoa->documentos()->create($dados);
    }

    /** @param array<string, mixed> $dados */
    public function atualizarDocumento(PessoaDocumento $documento, array $dados): PessoaDocumento
    {
        $documento->update($dados);

        return $documento;
    }

    public function removerDocumento(PessoaDocumento $documento): void
    {
        $documento->delete();
    }

    /** @param array<string, mixed> $dados */
    public function adicionarEndereco(Pessoa $pessoa, array $dados): PessoaEndereco
    {
        return $pessoa->enderecos()->create($dados);
    }

    /** @param array<string, mixed> $dados */
    public function atualizarEndereco(PessoaEndereco $endereco, array $dados): PessoaEndereco
    {
        $endereco->update($dados);

        return $endereco;
    }

    public function removerEndereco(PessoaEndereco $endereco): void
    {
        $endereco->delete();
    }

    /**
     * Adiciona contato garantindo atomicidade transacional para a regra de contato principal único por tipo.
     *
     * @param array<string, mixed> $dados
     */
    public function adicionarContato(Pessoa $pessoa, array $dados): PessoaContato
    {
        return DB::transaction(function () use ($pessoa, $dados): PessoaContato {
            $tipo = (string) ($dados['tipo'] ?? 'celular');
            $ePrincipal = (bool) ($dados['principal'] ?? false);

            $nenhumContatoDoTipo = ! $pessoa->contatos()->where('tipo', $tipo)->exists();
            if ($nenhumContatoDoTipo) {
                $ePrincipal = true;
            }

            if ($ePrincipal) {
                $pessoa->contatos()->where('tipo', $tipo)->update(['principal' => false]);
            }

            $dados['principal'] = $ePrincipal;

            return $pessoa->contatos()->create($dados);
        });
    }

    /**
     * Atualiza contato garantindo consistência na flag de contato principal.
     *
     * @param array<string, mixed> $dados
     */
    public function atualizarContato(PessoaContato $contato, array $dados): PessoaContato
    {
        return DB::transaction(function () use ($contato, $dados): PessoaContato {
            $tipo = (string) ($dados['tipo'] ?? $contato->tipo);
            $marcouComoPrincipal = isset($dados['principal']) && (bool) $dados['principal'];

            if ($marcouComoPrincipal) {
                PessoaContato::where('pessoa_id', $contato->pessoa_id)
                    ->where('tipo', $tipo)
                    ->where('id', '!=', $contato->id)
                    ->update(['principal' => false]);
            }

            $contato->update($dados);

            return $contato;
        });
    }

    /**
     * Remove contato. Caso seja o contato principal, promove automaticamente outro contato do mesmo tipo.
     */
    public function removerContato(PessoaContato $contato): void
    {
        DB::transaction(function () use ($contato): void {
            $eraPrincipal = (bool) $contato->principal;
            $pessoaId = $contato->pessoa_id;
            $tipo = $contato->tipo;

            $contato->delete();

            if ($eraPrincipal) {
                $sucessor = PessoaContato::where('pessoa_id', $pessoaId)
                    ->where('tipo', $tipo)
                    ->orderByDesc('id')
                    ->first();

                if ($sucessor !== null) {
                    $sucessor->update(['principal' => true]);
                }
            }
        });
    }
}
