<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Formacao;

final class FormacaoService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenantContext,
    ) {}

    /**
     * @param array{titulo: string, descricao?: string|null, modelo_certificado_id?: int|null} $dados
     * @param list<array{curso_id: int, obrigatorio: bool, ordem?: int}> $cursos
     */
    public function criar(array $dados, array $cursos): Formacao
    {
        $composicao = $this->validarComposicao($cursos);

        return DB::transaction(function () use ($dados, $composicao): Formacao {
            $formacao = Formacao::create($dados);
            $formacao->cursos()->sync($composicao);
            $formacao->load('cursos');

            $this->audit->record('cursos', 'formacao.criada', "Formacao #{$formacao->id}", null, $formacao->toArray());
            $this->outbox->publish('cursos.FormacaoCriada', ['id' => $formacao->id]);

            return $formacao;
        });
    }

    /**
     * @param array<string, mixed> $dados
     * @param list<array{curso_id: int, obrigatorio: bool, ordem?: int}>|null $cursos null = mantém a composição
     */
    public function atualizar(Formacao $formacao, array $dados, ?array $cursos = null): Formacao
    {
        $composicao = $cursos !== null ? $this->validarComposicao($cursos) : null;

        return DB::transaction(function () use ($formacao, $dados, $composicao): Formacao {
            $antes = $formacao->load('cursos')->toArray();
            $formacao->update($dados);
            if ($composicao !== null) {
                $formacao->cursos()->sync($composicao);
            }
            $formacao->load('cursos');

            $this->audit->record('cursos', 'formacao.atualizada', "Formacao #{$formacao->id}", $antes, $formacao->toArray());

            return $formacao;
        });
    }

    public function excluir(Formacao $formacao): void
    {
        if (Certificado::query()->where('formacao_id', $formacao->id)->exists()) {
            throw new DomainException('Esta formação já emitiu certificados e não pode ser excluída.');
        }

        DB::transaction(function () use ($formacao): void {
            $antes = $formacao->load('cursos')->toArray();
            $formacao->delete();
            $this->audit->record('cursos', 'formacao.excluida', "Formacao #{$antes['id']}", $antes, null);
        });
    }

    /**
     * @param list<array{curso_id: int, obrigatorio: bool, ordem?: int}> $cursos
     * @return array<int, array{tenant_id: int, ordem: int, obrigatorio: bool}> no formato do sync()
     */
    private function validarComposicao(array $cursos): array
    {
        if ($cursos === []) {
            throw new DomainException('A formação precisa de ao menos um curso.');
        }

        $ids = array_map(fn (array $c): int => (int) $c['curso_id'], $cursos);
        if (count($ids) !== count(array_unique($ids))) {
            throw new DomainException('Um mesmo curso aparece mais de uma vez na formação.');
        }

        if (!in_array(true, array_map(fn (array $c): bool => (bool) $c['obrigatorio'], $cursos), true)) {
            throw new DomainException('A formação precisa de ao menos um curso obrigatório.');
        }

        // TenantAware: cursos de outro tenant simplesmente não são encontrados.
        if (Curso::query()->whereIn('id', $ids)->count() !== count($ids)) {
            throw new DomainException('A formação só pode conter cursos deste órgão.');
        }

        $composicao = [];
        foreach ($cursos as $i => $c) {
            $composicao[(int) $c['curso_id']] = [
                'tenant_id' => $this->tenantContext->id(),
                'ordem' => (int) ($c['ordem'] ?? $i + 1),
                'obrigatorio' => (bool) $c['obrigatorio'],
            ];
        }

        return $composicao;
    }
}
