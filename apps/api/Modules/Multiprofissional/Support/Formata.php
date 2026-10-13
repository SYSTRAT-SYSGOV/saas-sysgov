<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Support;

use Illuminate\Support\Collection;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Multiprofissional\Models\Acompanhado;
use Modules\Multiprofissional\Models\Atendimento;
use Modules\Multiprofissional\Models\Equipe;
use Modules\Multiprofissional\Models\Laudo;
use Modules\Multiprofissional\Models\Profissional;

/**
 * JSON devolvido pela API do módulo (espelhado em web-client/src/modules/multiprofissional/api.ts). Os dados
 * sensíveis só entram quando a policy permite: relato do sigiloso (D6) e condições/laudos (D7).
 */
final class Formata
{
    /** @var array<int, string>|null */
    private ?array $escolas = null;

    /** @return array<string, mixed> */
    public function profissional(Profissional $p): array
    {
        return [
            'id' => $p->id,
            'nome' => $p->nome,
            'cpf_mascarado' => $p->cpf_mascarado,
            'cargo' => $p->cargo === null ? null : ['id' => $p->cargo->id, 'nome' => $p->cargo->nome],
            'registro_profissional' => $p->registro_profissional,
            'telefone' => $p->telefone,
            'usuario' => $p->usuario === null ? null : ['id' => $p->usuario->id, 'nome' => $p->usuario->name, 'email' => $p->usuario->email],
            'ativo' => $p->ativo,
        ];
    }

    /** @return array<string, mixed> */
    public function equipe(Equipe $e): array
    {
        return [
            'id' => $e->id,
            'nome' => $e->nome,
            'turno' => $e->turno,
            'ativo' => $e->ativo,
            'profissionais' => $e->profissionais->map(fn (Profissional $p): array => ['id' => $p->id, 'nome' => $p->nome])->values(),
            'escolas' => $e->escolas->map(fn (Escola $x): array => ['id' => $x->id, 'nome' => $x->nome])->values(),
        ];
    }

    /** @return array<string, mixed> */
    public function aluno(?Aluno $a): ?array
    {
        if ($a === null) {
            return null;
        }

        return [
            'id' => $a->id,
            'nome' => $a->nome,
            'cgm' => $a->cgm,
            'nascimento' => $a->nascimento?->format('Y-m-d'),
            'situacao' => $a->situacao,
            'escola' => $this->nomeEscola((int) $a->getAttribute('escola_id')),
            'turma' => $a->turma?->nome,
        ];
    }

    /** @return array<string, mixed> */
    public function acompanhado(Acompanhado $a, bool $clinico, bool $detalhe = false): array
    {
        $dados = [
            'id' => $a->id,
            'aluno' => $this->aluno($a->aluno),
            'ativo' => $a->ativo,
            'profissionais' => $a->profissionais->map(fn (Profissional $p): array => [
                'id' => $p->id, 'nome' => $p->nome, 'cargo' => $p->cargo?->nome, 'papel' => $p->pivot?->getAttribute('papel'),
            ])->values(),
            'condicoes' => $clinico
                ? $a->condicoes->map(fn ($c): array => ['id' => $c->id, 'nome' => $c->nome, 'cid' => $c->cid, 'diagnosticado_em' => $c->pivot?->getAttribute('diagnosticado_em')])->values()
                : null,
            'criado_em' => $a->created_at?->toIso8601String(),
        ];
        if ($detalhe) {
            $dados['observacoes'] = $clinico ? $a->observacoes : null;
            $dados['laudos'] = $clinico ? $a->laudos->map(fn (Laudo $l): array => $this->laudo($l))->values() : null;
            $dados['contatos'] = $a->aluno?->contatos->map(fn ($c): array => ['telefone' => $c->telefone, 'descricao' => $c->descricao])->values() ?? [];
        }

        return $dados;
    }

    /** @return array<string, mixed> */
    public function laudo(Laudo $l): array
    {
        return [
            'id' => $l->id,
            'descricao' => $l->descricao,
            'emitente' => $l->emitente,
            'emitido_em' => $l->emitido_em?->format('Y-m-d'),
            'condicao' => $l->condicao === null ? null : ['id' => $l->condicao->id, 'nome' => $l->condicao->nome, 'cid' => $l->condicao->cid],
            'arquivo_nome' => $l->arquivo_nome,
            'arquivo_mime' => $l->arquivo_mime,
            'arquivo_tamanho' => $l->arquivo_tamanho,
            'enviado_em' => $l->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public function atendimento(Atendimento $a, bool $verRelato, bool $podeEditar): array
    {
        return [
            'id' => $a->id,
            'data_hora' => $a->data_hora?->format('Y-m-d\TH:i'),
            'turno' => $a->turno,
            'turno_rotulo' => Atendimento::TURNOS[$a->turno] ?? $a->turno,
            'escola' => ['id' => $a->escola_id, 'nome' => $this->nomeEscola($a->escola_id)],
            'equipe' => $a->equipe === null ? null : ['id' => $a->equipe->id, 'nome' => $a->equipe->nome],
            'sigiloso' => $a->sigiloso,
            'relato_visivel' => $verRelato,
            'relato' => $verRelato ? $a->relato : null,
            'alunos' => $a->alunos->map(fn (Aluno $x): array => ['id' => $x->id, 'nome' => $x->nome])->values(),
            'profissionais' => $a->profissionais->map(fn (Profissional $p): array => ['id' => $p->id, 'nome' => $p->nome])->values(),
            'tipos' => $a->tipos->map(fn ($t): array => ['id' => $t->id, 'nome' => $t->nome])->values(),
            'autor' => $a->autor?->name,
            'pode_editar' => $podeEditar,
            'criado_em' => $a->created_at?->toIso8601String(),
        ];
    }

    private function nomeEscola(int $id): ?string
    {
        $this->escolas ??= Escola::query()->pluck('nome', 'id')->all();

        return $this->escolas[$id] ?? null;
    }

    /**
     * @param Collection<int, Escola> $escolas
     * @return list<array{id: int, nome: string}>
     */
    public static function escolas(Collection $escolas): array
    {
        return $escolas->map(fn (Escola $e): array => ['id' => $e->id, 'nome' => $e->nome])->values()->all();
    }
}
