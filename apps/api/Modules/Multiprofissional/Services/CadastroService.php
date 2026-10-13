<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Modules\Multiprofissional\Models\Cargo;
use Modules\Multiprofissional\Models\Condicao;
use Modules\Multiprofissional\Models\Laudo;
use Modules\Multiprofissional\Models\Profissional;
use Modules\Multiprofissional\Models\TipoAtendimento;

/**
 * Cadastros simples do tenant: cargos, condições (CID) e tipos de atendimento. Item em uso é desativado em vez de
 * excluído, para não quebrar o histórico. "Itens padrão" cria os cargos e tipos usuais (D10), sem repetir.
 */
final class CadastroService
{
    /** @var array<string, class-string<Model>> */
    public const TIPOS = [
        'cargos' => Cargo::class,
        'condicoes' => Condicao::class,
        'tipos-atendimento' => TipoAtendimento::class,
    ];

    /** @var array<string, string> cargo => objetivos */
    public const CARGOS_PADRAO = [
        'Psicólogo(a)' => 'Avaliação e acompanhamento psicológico no contexto escolar',
        'Fonoaudiólogo(a)' => 'Avaliação e acompanhamento da linguagem, fala e audição',
        'Assistente Social' => 'Acompanhamento socioassistencial do estudante e da família',
        'Psicopedagogo(a)' => 'Avaliação e intervenção nas dificuldades de aprendizagem',
        'Terapeuta Ocupacional' => 'Autonomia, coordenação e adaptações para as atividades escolares',
        'Pedagogo(a)' => 'Orientação pedagógica e adaptação curricular',
    ];

    public const TIPOS_ATENDIMENTO_PADRAO = [
        'Avaliação', 'Atendimento individual', 'Atendimento em grupo', 'Orientação à família',
        'Orientação ao professor', 'Observação em sala', 'Visita domiciliar', 'Encaminhamento', 'Devolutiva',
    ];

    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /** @return class-string<Model> */
    public function classe(string $tipo): string
    {
        return self::TIPOS[$tipo] ?? throw new DomainException('Cadastro desconhecido.');
    }

    /** @param array<string, mixed> $dados */
    public function salvar(string $tipo, ?Model $item, array $dados): Model
    {
        $classe = $this->classe($tipo);
        $repetido = $classe::query()->where('nome', $dados['nome'])->when($item, fn ($q) => $q->whereKeyNot($item->getKey()))->exists();
        if ($repetido) {
            throw new DomainException('Já existe um item com esse nome.');
        }

        $antes = $item?->toArray();
        $item ??= new $classe();
        $item->fill($dados)->save();
        $this->audit->record('multiprofissional', $antes === null ? "{$tipo}.criado" : "{$tipo}.alterado", "{$tipo}:{$item->getKey()}", $antes, $item->toArray());

        return $item;
    }

    /** @return bool true se excluiu; false se só desativou (item em uso) */
    public function excluir(string $tipo, Model $item): bool
    {
        if ($this->emUso($item)) {
            $item->update(['ativo' => false]);
            $this->audit->record('multiprofissional', "{$tipo}.desativado", "{$tipo}:{$item->getKey()}", null, ['nome' => $item->getAttribute('nome')]);

            return false;
        }
        $antes = $item->toArray();
        $item->delete();
        $this->audit->record('multiprofissional', "{$tipo}.excluido", "{$tipo}:{$item->getKey()}", $antes, null);

        return true;
    }

    /** @return array{cargos: int, tipos: int} quantos itens foram criados */
    public function carregarPadroes(): array
    {
        return DB::transaction(function (): array {
            $cargos = 0;
            foreach (self::CARGOS_PADRAO as $nome => $objetivos) {
                $cargos += Cargo::query()->firstOrCreate(['nome' => $nome], ['objetivos' => $objetivos])->wasRecentlyCreated ? 1 : 0;
            }
            $tipos = 0;
            foreach (self::TIPOS_ATENDIMENTO_PADRAO as $nome) {
                $tipos += TipoAtendimento::query()->firstOrCreate(['nome' => $nome])->wasRecentlyCreated ? 1 : 0;
            }
            $this->audit->record('multiprofissional', 'cadastros.padroes_carregados', 'cadastros', null, ['cargos' => $cargos, 'tipos' => $tipos]);

            return ['cargos' => $cargos, 'tipos' => $tipos];
        });
    }

    private function emUso(Model $item): bool
    {
        $id = $item->getKey();

        return match (true) {
            $item instanceof Cargo => Profissional::query()->where('cargo_id', $id)->exists(),
            $item instanceof Condicao => DB::table('multi_acompanhado_condicoes')->where('condicao_id', $id)->exists()
                || Laudo::query()->where('condicao_id', $id)->exists(),
            $item instanceof TipoAtendimento => DB::table('multi_atendimento_tipos')->where('tipo_id', $id)->exists(),
            default => false,
        };
    }
}
