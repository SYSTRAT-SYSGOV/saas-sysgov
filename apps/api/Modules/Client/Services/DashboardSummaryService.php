<?php

declare(strict_types=1);

namespace Modules\Client\Services;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Modules\Campanha\Models\Eleitor;
use Modules\Capd\Models\Servidor;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cursos\Models\Curso;
use Modules\Escola\Models\Aluno;
use Modules\Formatura\Models\Participacao;
use Modules\Inservivel\Models\Bem;
use Modules\Licita\Models\Processo;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\Multiprofissional\Models\Atendimento;
use Modules\Passeio\Models\Passeio;
use Modules\Pedagogico\Models\Ocorrencia;
use Modules\Pessoas\Models\Pessoa;
use Modules\Portfolio\Models\Trabalho;
use Modules\Procurement\Models\Licitacao;
use Modules\Requerimentos\Models\Proposicao;
use Modules\Ata\Models\Ata;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Throwable;

/**
 * Totais da home do Cliente: um cartão por módulo que o usuário enxerga, com o total do que o módulo guarda.
 *
 * Contagem pelos próprios models, então os escopos de tenant (e de escola, onde existe) valem como em qualquer tela.
 * O módulo precisa passar no Gate `module` (o mesmo do menu), que já recusa módulo desligado no catálogo.
 * `tone` é só o nome da cor; quem desenha escolhe as classes.
 */
final class DashboardSummaryService
{
    /**
     * @return list<array{module: string, group: string, label: string, caption: string, tone: string, model: class-string}>
     */
    private function definicoes(): array
    {
        return [
            ['module' => 'pessoas', 'group' => 'gestao', 'label' => 'Pessoas', 'caption' => 'no cadastro único', 'tone' => 'emerald', 'model' => Pessoa::class],
            ['module' => 'cemiterios', 'group' => 'fiscalizacao', 'label' => 'Jazigos', 'caption' => 'cadastrados', 'tone' => 'slate', 'model' => Jazigo::class],
            ['module' => 'escola', 'group' => 'educacao', 'label' => 'Alunos', 'caption' => 'matriculados', 'tone' => 'amber', 'model' => Aluno::class],
            ['module' => 'cursos', 'group' => 'educacao', 'label' => 'Cursos', 'caption' => 'cadastrados', 'tone' => 'violet', 'model' => Curso::class],
            ['module' => 'inservivel', 'group' => 'compras', 'label' => 'Bens inservíveis', 'caption' => 'cadastrados', 'tone' => 'orange', 'model' => Bem::class],
            ['module' => 'requerimentos', 'group' => 'gestao', 'label' => 'Proposições', 'caption' => 'registradas', 'tone' => 'indigo', 'model' => Proposicao::class],
            ['module' => 'vistoria', 'group' => 'fiscalizacao', 'label' => 'Vistorias', 'caption' => 'executadas', 'tone' => 'teal', 'model' => ExecucaoVistoria::class],
            ['module' => 'ata', 'group' => 'gestao', 'label' => 'Atas', 'caption' => 'registradas', 'tone' => 'rose', 'model' => Ata::class],
            ['module' => 'licita', 'group' => 'compras', 'label' => 'Processos de licitação', 'caption' => 'em elaboração e concluídos', 'tone' => 'cyan', 'model' => Processo::class],
            ['module' => 'procurement', 'group' => 'compras', 'label' => 'Licitações', 'caption' => 'registradas', 'tone' => 'fuchsia', 'model' => Licitacao::class],
            ['module' => 'passeio', 'group' => 'educacao', 'label' => 'Passeios', 'caption' => 'cadastrados', 'tone' => 'lime', 'model' => Passeio::class],
            ['module' => 'formatura', 'group' => 'educacao', 'label' => 'Formandos', 'caption' => 'participantes', 'tone' => 'sky', 'model' => Participacao::class],
            ['module' => 'capd', 'group' => 'gestao', 'label' => 'Servidores', 'caption' => 'na carreira', 'tone' => 'red', 'model' => Servidor::class],
            ['module' => 'multiprofissional', 'group' => 'educacao', 'label' => 'Atendimentos', 'caption' => 'realizados', 'tone' => 'pink', 'model' => Atendimento::class],
            ['module' => 'pedagogico', 'group' => 'educacao', 'label' => 'Ocorrências', 'caption' => 'pedagógicas', 'tone' => 'yellow', 'model' => Ocorrencia::class],
            ['module' => 'meio_ambiente', 'group' => 'fiscalizacao', 'label' => 'Licenciamentos', 'caption' => 'processos ambientais', 'tone' => 'green', 'model' => ProcessoLicenciamento::class],
            ['module' => 'portfolio', 'group' => 'educacao', 'label' => 'Trabalhos', 'caption' => 'no portfólio', 'tone' => 'purple', 'model' => Trabalho::class],
            ['module' => 'campanha', 'group' => 'outros', 'label' => 'Eleitores', 'caption' => 'cadastrados', 'tone' => 'stone', 'model' => Eleitor::class],
        ];
    }

    /** Grupos da home, na ordem em que aparecem. */
    private const GRUPOS = [
        'educacao' => 'Educação',
        'gestao' => 'Gestão e documentos',
        'compras' => 'Compras e patrimônio',
        'fiscalizacao' => 'Fiscalização e território',
        'outros' => 'Outros',
    ];

    /**
     * Cards que o usuário pode escolher mostrar ou ocultar: só os dos módulos a que ele tem acesso.
     *
     * @return list<array{module: string, group: string, group_label: string, label: string, tone: string, hidden: bool}>
     */
    public function catalogo(User $user): array
    {
        $ocultos = $this->ocultos($user);
        $ativos = $this->modulosAtivosDoTenant();
        $itens = [];

        foreach ($this->definicoes() as $d) {
            if (!$this->acessa($user, $d['module'], $ativos)) {
                continue;
            }
            $itens[] = [
                'module' => $d['module'],
                'group' => $d['group'],
                'group_label' => self::GRUPOS[$d['group']],
                'label' => $d['label'],
                'tone' => $d['tone'],
                'hidden' => in_array($d['module'], $ocultos, true),
            ];
        }

        return $itens;
    }

    /**
     * Grava os cards ocultos. Aliases de módulos que o usuário não acessa neste tenant são descartados do que veio.
     * A preferência é do usuário, não do tenant: o que ele já tinha ocultado em módulos de outro tenant fica como está.
     *
     * @param list<string> $modulos
     * @return list<string> o que ficou gravado
     */
    public function definirOcultos(User $user, array $modulos): array
    {
        $acessiveis = array_column($this->catalogo($user), 'module');
        $deOutrosTenants = array_diff($this->ocultos($user), $acessiveis);
        $gravar = array_values(array_unique(array_merge(array_intersect($acessiveis, $modulos), $deOutrosTenants)));

        $user->forceFill(['dashboard_hidden_cards' => $gravar])->save();

        return $gravar;
    }

    /**
     * Cards visíveis da home, agrupados por área. Só conta o que o usuário não ocultou.
     *
     * @return list<array{key: string, label: string, cards: list<array{module: string, label: string, value: int, caption: string, tone: string}>}>
     */
    public function para(User $user): array
    {
        $ocultos = $this->ocultos($user);
        $ativos = $this->modulosAtivosDoTenant();
        $porGrupo = [];

        foreach ($this->definicoes() as $d) {
            if (in_array($d['module'], $ocultos, true) || !$this->acessa($user, $d['module'], $ativos)) {
                continue;
            }

            try {
                $total = $d['model']::query()->count();
            } catch (Throwable $e) {
                // Um módulo com tabela ausente ou escopo que exige contexto não pode derrubar a home inteira.
                Log::warning('dashboard.summary: contagem falhou', ['module' => $d['module'], 'error' => $e->getMessage()]);
                continue;
            }

            $porGrupo[$d['group']][] = [
                'module' => $d['module'],
                'label' => $d['label'],
                'value' => $total,
                'caption' => $d['caption'],
                'tone' => $d['tone'],
            ];
        }

        $grupos = [];
        foreach (self::GRUPOS as $chave => $rotulo) {
            if (!empty($porGrupo[$chave])) {
                $grupos[] = ['key' => $chave, 'label' => $rotulo, 'cards' => $porGrupo[$chave]];
            }
        }

        return $grupos;
    }

    /**
     * Aliases dos módulos contratados pelo tenant e ligados no catálogo. O Gate `module` deixa o admin do tenant
     * passar em qualquer módulo, então o que o tenant não tem precisa ser barrado aqui.
     *
     * @return list<string>
     */
    private function modulosAtivosDoTenant(): array
    {
        $tenant = Tenant::query()->find(app(TenantContext::class)->id());
        if ($tenant === null) {
            return [];
        }

        /** @var list<string> $aliases */
        $aliases = $tenant->modules()
            ->wherePivot('enabled', true)
            ->where('modules.enabled', true)
            ->pluck('modules.alias')
            ->all();

        return $aliases;
    }

    /** @param list<string> $ativos */
    private function acessa(User $user, string $modulo, array $ativos): bool
    {
        return in_array($modulo, $ativos, true) && Gate::forUser($user)->allows('module', $modulo);
    }

    /** @return list<string> */
    private function ocultos(User $user): array
    {
        $guardado = $user->getAttribute('dashboard_hidden_cards');

        return is_array($guardado) ? array_values(array_filter($guardado, 'is_string')) : [];
    }
}
