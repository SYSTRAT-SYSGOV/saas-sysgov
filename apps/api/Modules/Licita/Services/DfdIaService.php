<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Services\Ai\NanoGptClient;
use Illuminate\Support\Collection;
use Modules\Licita\Models\LegalDocumento;
use Modules\Licita\Support\TextoParaHtml;

/**
 * Funcionalidades de IA do DFD (Fase 1.5 mencionada em LegalDocumento). Hoje:
 * sugestão de justificativa. Sempre fundamenta a resposta na legislação
 * cadastrada na plataforma (global + do tenant, ver LegalDocumento) — nunca
 * deixa o modelo "inventar" embasamento legal sem contexto real.
 *
 * Prompt dedicado (em vez do genérico de LicitaTextoIaService) porque o
 * enunciado da Justificativa do DFD é normativo e específico (art. 18, I da
 * Lei 14.133/2021) e os dados de entrada vêm estruturados (objeto, área,
 * itens), não como um único texto livre.
 */
final class DfdIaService
{
    /** Trecho do texto integral de cada documento incluído no prompt (caracteres) — o suficiente para embasar sem estourar o limite de tokens do provedor. */
    private const TAMANHO_TRECHO_TEXTO = 2000;

    public function __construct(
        private readonly NanoGptClient $client,
        private readonly LegislacaoContextoService $legislacaoContexto,
    ) {}

    /**
     * @param array{descricao: string, quantidade?: float, valor_unitario?: float}[] $itens
     * @param string|null $textoAtual Justificativa já escrita (HTML do RichTextEditor) — quando informado,
     *        a IA MELHORA esse texto (aprofunda, acrescenta) em vez de escrever do zero. Ver `montarPrompt`.
     * @return array{justificativa: string, legislacao_utilizada: array<int, array{id: int, tipo: string, numero: string|null, titulo: string}>}
     */
    public function sugerirJustificativa(string $objeto, ?string $areaRequisitante, array $itens, ?string $textoAtual = null): array
    {
        $textoReferencia = collect([$objeto, $areaRequisitante, ...array_column($itens, 'descricao')])
            ->filter()
            ->implode(' ');
        $legislacao = $this->legislacaoContexto->buscarRelevante($textoReferencia);

        $prompt = $this->montarPrompt($objeto, $areaRequisitante, $itens, $legislacao, $textoAtual);

        $resultado = $this->client->chatCompletion([
            [
                'role' => 'system',
                'content' => 'Você é um especialista em licitações públicas brasileiras (Lei 14.133/2021). '
                    . 'Redija apenas o texto solicitado, em português formal, sem saudações, sem markdown '
                    . 'e sem repetir o enunciado da tarefa. Separe cada parágrafo com uma linha em branco '
                    . 'entre eles — nunca escreva o texto todo como um único bloco corrido.',
            ],
            ['role' => 'user', 'content' => $prompt],
        ]);

        return [
            // Convertido para HTML (<p> por parágrafo) — a IA responde em
            // texto puro, e o RichTextEditor (TinyMCE) precisa de tags de
            // verdade para separar visualmente os parágrafos (na tela e no
            // PDF gerado depois), não apenas linhas em branco que o HTML
            // colapsa.
            'justificativa' => TextoParaHtml::converter($resultado['content']),
            'legislacao_utilizada' => $legislacao->map(fn (LegalDocumento $doc): array => [
                'id' => $doc->id,
                'tipo' => $doc->tipo,
                'numero' => $doc->numero,
                'titulo' => $doc->titulo,
            ])->all(),
        ];
    }

    /**
     * @param array{descricao: string}[] $itens
     * @param Collection<int, LegalDocumento> $legislacao
     */
    private function montarPrompt(string $objeto, ?string $areaRequisitante, array $itens, Collection $legislacao, ?string $textoAtual = null): string
    {
        $textoAtualLimpo = filled($textoAtual) ? trim(strip_tags($textoAtual)) : '';

        $linhas = [];

        if ($textoAtualLimpo !== '') {
            // Modo "melhorar": a IA recebe o texto já escrito e o expande —
            // cada clique em "Melhorar com IA" deve deixar o texto um pouco
            // mais completo (mais fundamentado, mais detalhado), nunca mais
            // curto nem repetindo o que já foi dito, permitindo o usuário
            // refinar a justificativa em vários passos em vez de só um
            // texto pronto de uma vez.
            $linhas[] = 'Você recebeu abaixo o texto ATUAL da JUSTIFICATIVA de um Documento de Formalização de '
                . 'Demanda (DFD), demonstrando a necessidade e conveniência da contratação (art. 18, I da Lei '
                . '14.133/2021). Sua tarefa é MELHORAR esse texto: aprofunde a fundamentação e acrescente pelo '
                . 'menos mais um parágrafo relevante (mais detalhamento técnico, mais um dispositivo legal '
                . 'aplicável, ou mais um argumento de conveniência/oportunidade), SEM se repetir e SEM remover '
                . 'ou encurtar o que já está bom. O resultado deve ficar mais completo que o texto atual.';
        } else {
            $linhas[] = 'Redija a JUSTIFICATIVA de um Documento de Formalização de Demanda (DFD), demonstrando '
                . 'a necessidade e conveniência da contratação (art. 18, I da Lei 14.133/2021), com base nos dados abaixo.';
        }
        $linhas[] = '';
        $linhas[] = "Objeto da contratação: {$objeto}";

        if (filled($areaRequisitante)) {
            $linhas[] = "Área requisitante: {$areaRequisitante}";
        }

        if ($itens !== []) {
            $linhas[] = 'Itens previstos: ' . collect($itens)->pluck('descricao')->filter()->implode('; ');
        }

        if ($textoAtualLimpo !== '') {
            $linhas[] = '';
            $linhas[] = 'Texto ATUAL da justificativa (a melhorar):';
            $linhas[] = '"""';
            $linhas[] = $textoAtualLimpo;
            $linhas[] = '"""';
        }

        if ($legislacao->isNotEmpty()) {
            $linhas[] = '';
            $linhas[] = 'Fundamente o texto na legislação cadastrada na plataforma abaixo (cite dispositivos '
                . 'quando pertinente, sem inventar artigos que não constem no trecho fornecido):';
            foreach ($legislacao as $doc) {
                $referencia = trim(($doc->tipo !== 'outro' ? ucfirst($doc->tipo) . ' ' : '') . ($doc->numero ?? ''));
                $linhas[] = '';
                $linhas[] = "### {$doc->titulo}" . ($referencia !== '' ? " ({$referencia})" : '');
                if (filled($doc->ementa)) {
                    $linhas[] = "Ementa: {$doc->ementa}";
                }
                $linhas[] = mb_substr(strip_tags($doc->texto_completo), 0, self::TAMANHO_TRECHO_TEXTO);
            }
        }

        $linhas[] = '';
        $linhas[] = $textoAtualLimpo !== ''
            ? 'Responda com o texto COMPLETO e revisado da justificativa (o atual incorporado, mais a melhoria), pronto para substituir o campo — sem título, sem markdown.'
            : 'Responda apenas com o texto da justificativa (2 a 4 parágrafos, sem título, sem markdown).';
        // Sem isso o modelo tende a escrever tudo como um único bloco
        // corrido — mesmo cobrindo vários assuntos distintos — e o texto
        // fica sem nenhuma separação visual ao entrar no editor.
        $linhas[] = 'Separe CADA parágrafo com uma linha em branco entre eles (\n\n) — nunca escreva tudo em um único bloco corrido, mesmo que sejam poucos parágrafos.';

        return implode("\n", $linhas);
    }
}
