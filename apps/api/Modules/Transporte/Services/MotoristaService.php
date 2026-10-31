<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Services\ResolucaoPessoaService;
use Modules\Pessoas\Support\Documento;
use Modules\Transporte\Models\Motorista;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Support\ConflitoException;

/** Motorista nasce de uma pessoa física do Cadastro de Pessoas (D4), resolvida pelo CPF ou escolhida pelo id. */
final class MotoristaService
{
    private const ROTULOS_MOTIVOS = [
        'cnh_vencida' => 'CNH vencida',
        'curso_ausente' => 'curso especializado não informado',
        'curso_vencido' => 'curso especializado vencido',
        'toxicologico_ausente' => 'exame toxicológico não informado',
        'toxicologico_vencido' => 'exame toxicológico vencido',
        'nascimento_ausente' => 'data de nascimento ausente no Cadastro de Pessoas',
        'idade_minima' => 'idade mínima de mais de 21 anos não atingida',
    ];

    public function __construct(
        private readonly ResolucaoPessoaService $pessoas,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array<string, mixed> $dados
     */
    public function salvar(?Motorista $motorista, array $dados): Motorista
    {
        return DB::transaction(function () use ($motorista, $dados): Motorista {
            $antes = $motorista?->toArray();
            $campos = [
                'empresa_id' => $dados['empresa_id'] ?? null,
                'cnh_numero' => trim((string) $dados['cnh_numero']),
                'cnh_categoria' => strtoupper((string) $dados['cnh_categoria']),
                'cnh_primeira_habilitacao' => $dados['cnh_primeira_habilitacao'] ?? null,
                'cnh_validade' => $dados['cnh_validade'],
                'curso_certificado' => $dados['curso_certificado'] ?? null,
                'curso_validade' => $dados['curso_validade'] ?? null,
                'toxicologico_data' => $dados['toxicologico_data'] ?? null,
                'toxicologico_validade' => $dados['toxicologico_validade'] ?? null,
                'ativo' => $dados['ativo'] ?? true,
                'observacoes' => $dados['observacoes'] ?? null,
            ];

            $duplicada = Motorista::query()->where('cnh_numero', $campos['cnh_numero'])
                ->when($motorista, fn ($q) => $q->whereKeyNot($motorista->id))->exists();
            if ($duplicada) {
                throw new ConflitoException('Já existe um motorista com essa CNH.');
            }

            $pessoa = null;
            if ($motorista === null) {
                $pessoa = $this->pessoaFisica($dados);
                $existente = Motorista::withTrashed()->where('pessoa_id', $pessoa->id)->first();
                if ($existente !== null && !$existente->trashed()) {
                    throw new ConflitoException('Essa pessoa já é motorista.');
                }
                $motorista = $existente ?? new Motorista(['pessoa_id' => $pessoa->id]);
                if ($existente?->trashed()) {
                    $existente->restore();
                }
            }

            // Ativar exige elegibilidade; quem já está ativo pode ter outros dados corrigidos mesmo com documento vencido.
            $vaiAtivar = $campos['ativo'] && ($antes === null || !($antes['ativo'] ?? false));
            $motorista->fill($campos);
            $motorista->setRelation('pessoa', $pessoa ?? $motorista->pessoa ?? Pessoa::query()->find($motorista->pessoa_id));
            if ($vaiAtivar && !$motorista->elegivel()) {
                $motivos = array_map(fn (string $m): string => self::ROTULOS_MOTIVOS[$m] ?? $m, $motorista->motivosInelegibilidade());
                throw new DomainException('Motorista inelegível: ' . implode('; ', $motivos) . '. Cadastre-o como inativo ou regularize os documentos.');
            }
            $motorista->save();

            $this->audit->record('transporte', $antes === null ? 'motorista.criado' : 'motorista.alterado', "motorista:{$motorista->id}", $antes, $motorista->toArray());

            return $motorista;
        });
    }

    /** Motorista que é padrão de um veículo não é excluído: é inativado. */
    public function excluir(Motorista $motorista): void
    {
        if (Veiculo::query()->where('motorista_padrao_id', $motorista->id)->exists()) {
            throw new ConflitoException('O motorista é o condutor padrão de um veículo; troque o condutor ou inative-o.');
        }
        $antes = $motorista->toArray();
        // Libera a CNH para um novo cadastro (a unicidade é do banco; a exclusão é lógica).
        $motorista->forceFill(['cnh_numero' => substr($motorista->cnh_numero, 0, 20) . '#' . $motorista->id])->save();
        $motorista->delete();
        $this->audit->record('transporte', 'motorista.excluido', "motorista:{$motorista->id}", $antes, null);
    }

    /** @param array<string, mixed> $dados */
    private function pessoaFisica(array $dados): Pessoa
    {
        if (!empty($dados['pessoa_id'])) {
            $pessoa = Pessoa::query()->find($dados['pessoa_id']);
            if ($pessoa === null) {
                throw new DomainException('Pessoa não encontrada.');
            }
            if ($pessoa->tipo !== 'fisica') {
                throw new DomainException('O motorista deve ser uma pessoa física.');
            }

            return $pessoa;
        }

        $cpf = Documento::somenteDigitos((string) ($dados['cpf'] ?? ''));

        return $this->pessoas->resolverPorCpf($cpf, [
            'nome' => (string) ($dados['nome'] ?? ''),
            'data_nascimento' => $dados['data_nascimento'] ?? null,
        ], 'transporte');
    }
}
