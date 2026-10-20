<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Models\Empresa;
use Modules\Cursos\Models\Participante;
use Modules\Pessoas\Services\ResolucaoPessoaService;
use Modules\Pessoas\Support\Documento;

/**
 * Biblioteca de empresas do órgão (D10). CNPJ guardado só com dígitos e único no tenant; empresa
 * com participante ligado não é excluída — desative-a.
 */
final class EmpresaService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly ResolucaoPessoaService $pessoas,
    ) {}

    /**
     * @param array<string, mixed> $dados
     */
    public function criar(array $dados): Empresa
    {
        $dados = $this->normalizar($dados);

        return DB::transaction(function () use ($dados): Empresa {
            $empresa = Empresa::create($dados);
            $this->ligarPessoa($empresa);
            $this->audit->record('cursos', 'empresa.criada', "Empresa #{$empresa->id}", null, $empresa->toArray());

            return $empresa;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(Empresa $empresa, array $dados): Empresa
    {
        $dados = $this->normalizar($dados, $empresa);

        return DB::transaction(function () use ($empresa, $dados): Empresa {
            $antes = $empresa->toArray();
            $empresa->update($dados);
            $this->ligarPessoa($empresa);
            $this->audit->record('cursos', 'empresa.atualizada', "Empresa #{$empresa->id}", $antes, $empresa->toArray());

            return $empresa;
        });
    }

    /** CNPJ válido liga a empresa à pessoa jurídica do cadastro central (criada se não existir); inválido ou vazio, não. */
    private function ligarPessoa(Empresa $empresa): void
    {
        $juridica = $this->pessoas->tentarPorCnpj($empresa->cnpj, $empresa->razao_social, $empresa->nome_fantasia, 'cursos');
        if ($juridica !== null && $empresa->pessoa_id !== $juridica->id) {
            $empresa->forceFill(['pessoa_id' => $juridica->id])->save();
        }
    }

    public function excluir(Empresa $empresa): void
    {
        $participantes = Participante::query()->where('empresa_id', $empresa->id)->count();
        if ($participantes > 0) {
            throw new DomainException("Esta empresa está ligada a {$participantes} participante(s). Desative-a em vez de excluir.");
        }

        DB::transaction(function () use ($empresa): void {
            $antes = $empresa->toArray();
            $empresa->delete();
            $this->audit->record('cursos', 'empresa.excluida', "Empresa #{$antes['id']}", $antes, null);
        });
    }

    /** Empresa ativa do tenant pelo CNPJ (com ou sem máscara), para a importação por CSV. */
    public function porCnpj(string $cnpj): ?Empresa
    {
        $digitos = Documento::somenteDigitos($cnpj);

        return $digitos === '' ? null : Empresa::query()->where('cnpj', $digitos)->where('ativa', true)->first();
    }

    public static function cnpjValido(string $cnpj): bool
    {
        $d = Documento::somenteDigitos($cnpj);
        if (strlen($d) !== 14 || preg_match('/^(\d)\1{13}$/', $d)) {
            return false;
        }

        foreach ([12, 13] as $t) {
            $soma = 0;
            for ($i = 0, $peso = $t - 7; $i < $t; $i++) {
                $soma += (int) $d[$i] * $peso;
                $peso = $peso === 2 ? 9 : $peso - 1;
            }
            $digito = $soma % 11 < 2 ? 0 : 11 - $soma % 11;
            if ((int) $d[$t] !== $digito) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function normalizar(array $dados, ?Empresa $atual = null): array
    {
        if (array_key_exists('cnpj', $dados)) {
            $cnpj = Documento::somenteDigitos((string) $dados['cnpj']);
            if ($cnpj !== '' && !self::cnpjValido($cnpj)) {
                throw new DomainException('CNPJ inválido.');
            }
            $dados['cnpj'] = $cnpj !== '' ? $cnpj : null;

            if ($cnpj !== '' && Empresa::query()->where('cnpj', $cnpj)->when($atual, fn ($q) => $q->whereKeyNot($atual->id))->exists()) {
                throw new DomainException('Já existe uma empresa com este CNPJ.');
            }
        }

        return $dados;
    }
}
