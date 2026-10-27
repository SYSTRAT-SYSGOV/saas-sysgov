<?php

declare(strict_types=1);

namespace Modules\Client\Services;

use App\Models\User;
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
     * @return list<array{module: string, label: string, caption: string, tone: string, model: class-string}>
     */
    private function definicoes(): array
    {
        return [
            ['module' => 'pessoas', 'label' => 'Pessoas', 'caption' => 'no cadastro único', 'tone' => 'emerald', 'model' => Pessoa::class],
            ['module' => 'cemiterios', 'label' => 'Jazigos', 'caption' => 'cadastrados', 'tone' => 'slate', 'model' => Jazigo::class],
            ['module' => 'escola', 'label' => 'Alunos', 'caption' => 'matriculados', 'tone' => 'amber', 'model' => Aluno::class],
            ['module' => 'cursos', 'label' => 'Cursos', 'caption' => 'cadastrados', 'tone' => 'violet', 'model' => Curso::class],
            ['module' => 'inservivel', 'label' => 'Bens inservíveis', 'caption' => 'cadastrados', 'tone' => 'orange', 'model' => Bem::class],
            ['module' => 'requerimentos', 'label' => 'Proposições', 'caption' => 'registradas', 'tone' => 'indigo', 'model' => Proposicao::class],
            ['module' => 'vistoria', 'label' => 'Vistorias', 'caption' => 'executadas', 'tone' => 'teal', 'model' => ExecucaoVistoria::class],
            ['module' => 'ata', 'label' => 'Atas', 'caption' => 'registradas', 'tone' => 'rose', 'model' => Ata::class],
            ['module' => 'licita', 'label' => 'Processos de licitação', 'caption' => 'em elaboração e concluídos', 'tone' => 'cyan', 'model' => Processo::class],
            ['module' => 'procurement', 'label' => 'Licitações', 'caption' => 'registradas', 'tone' => 'fuchsia', 'model' => Licitacao::class],
            ['module' => 'passeio', 'label' => 'Passeios', 'caption' => 'cadastrados', 'tone' => 'lime', 'model' => Passeio::class],
            ['module' => 'formatura', 'label' => 'Formandos', 'caption' => 'participantes', 'tone' => 'sky', 'model' => Participacao::class],
            ['module' => 'capd', 'label' => 'Servidores', 'caption' => 'na carreira', 'tone' => 'red', 'model' => Servidor::class],
            ['module' => 'multiprofissional', 'label' => 'Atendimentos', 'caption' => 'realizados', 'tone' => 'pink', 'model' => Atendimento::class],
            ['module' => 'pedagogico', 'label' => 'Ocorrências', 'caption' => 'pedagógicas', 'tone' => 'yellow', 'model' => Ocorrencia::class],
            ['module' => 'meio_ambiente', 'label' => 'Licenciamentos', 'caption' => 'processos ambientais', 'tone' => 'green', 'model' => ProcessoLicenciamento::class],
            ['module' => 'portfolio', 'label' => 'Trabalhos', 'caption' => 'no portfólio', 'tone' => 'purple', 'model' => Trabalho::class],
            ['module' => 'campanha', 'label' => 'Eleitores', 'caption' => 'cadastrados', 'tone' => 'stone', 'model' => Eleitor::class],
        ];
    }

    /**
     * @return list<array{module: string, label: string, value: int, caption: string, tone: string}>
     */
    public function para(User $user): array
    {
        $cartoes = [];

        foreach ($this->definicoes() as $d) {
            if (!Gate::forUser($user)->allows('module', $d['module'])) {
                continue;
            }

            try {
                $total = $d['model']::query()->count();
            } catch (Throwable $e) {
                // Um módulo com tabela ausente ou escopo que exige contexto não pode derrubar a home inteira.
                Log::warning('dashboard.summary: contagem falhou', ['module' => $d['module'], 'error' => $e->getMessage()]);
                continue;
            }

            $cartoes[] = [
                'module' => $d['module'],
                'label' => $d['label'],
                'value' => $total,
                'caption' => $d['caption'],
                'tone' => $d['tone'],
            ];
        }

        return $cartoes;
    }
}
