<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Services\Ai\NanoGptClient;
use Modules\Licita\Models\LegalDocumento;
use Modules\Licita\Support\TextoParaHtml;

/**
 * Sugestão de texto genérica para os campos de edição rica (TinyMCE) dos
 * ARTEFATOS do ciclo pré-editalício elaborados pelo órgão (DFD, ETP, Mapa
 * de Riscos, TR, ...) — incluindo campos extras configuráveis (texto_longo)
 * desses artefatos. É o padrão da plataforma: todo campo de texto rico
 * desses documentos tem a opção "Sugerir com IA" (ver componente
 * `RichTextEditorWithIa` no front).
 *
 * EXCEÇÃO deliberada: a Biblioteca de Legislação (texto_completo de
 * LegalDocumento) NUNCA tem essa opção — é a norma real, tal como
 * publicada, servindo de FONTE para a IA sugerir os outros campos; não faz
 * sentido (e é perigoso) a IA "sugerir" o próprio texto da lei.
 *
 * Diferente de DfdIaService::sugerirJustificativa (que tem um prompt
 * dedicado e dados de entrada estruturados), aqui a entrada é só uma
 * descrição do campo + um contexto livre — usado quando não vale a pena um
 * prompt dedicado para cada campo extra que um órgão possa configurar.
 * Mesmo assim, sempre fundamenta a resposta na legislação cadastrada na
 * plataforma (ver LegislacaoContextoService), nunca "inventando" embasamento
 * legal sem contexto real.
 */
final class LicitaTextoIaService
{
    /** Trecho do texto integral de cada documento incluído no prompt (caracteres) — o suficiente para embasar sem estourar o limite de tokens do provedor. */
    private const TAMANHO_TRECHO_TEXTO = 1500;

    public function __construct(
        private readonly NanoGptClient $client,
        private readonly LegislacaoContextoService $legislacaoContexto,
    ) {}

    /**
     * @param string|null $textoAtual Conteúdo já escrito no campo (HTML do RichTextEditor) — quando
     *        informado, a IA MELHORA esse texto (aprofunda, acrescenta) em vez de escrever do zero.
     * @return array{texto: string, legislacao_utilizada: array<int, array{id: int, tipo: string, numero: string|null, titulo: string}>}
     */
    public function sugerirTexto(string $campo, string $contexto, ?string $textoAtual = null): array
    {
        $legislacao = $this->legislacaoContexto->buscarRelevante($campo . ' ' . $contexto);

        $prompt = $this->montarPrompt($campo, $contexto, $legislacao, $textoAtual);

        $resultado = $this->client->chatCompletion([
            [
                'role' => 'system',
                'content' => 'Você é um especialista em licitações públicas brasileiras (Lei 14.133/2021), '
                    . 'redigindo conteúdo para o sistema SYSGOV. Redija apenas o texto solicitado, em '
                    . 'português formal, sem saudações, sem markdown e sem repetir o enunciado da tarefa. '
                    . 'Separe cada parágrafo com uma linha em branco entre eles — nunca escreva o texto '
                    . 'todo como um único bloco corrido.',
            ],
            ['role' => 'user', 'content' => $prompt],
        ]);

        return [
            // Ver comentário equivalente em DfdIaService::sugerirJustificativa.
            'texto' => TextoParaHtml::converter($resultado['content']),
            'legislacao_utilizada' => $legislacao->map(fn (LegalDocumento $doc): array => [
                'id' => $doc->id,
                'tipo' => $doc->tipo,
                'numero' => $doc->numero,
                'titulo' => $doc->titulo,
            ])->all(),
        ];
    }

    /**
     * @param \Illuminate\Support\Collection<int, LegalDocumento> $legislacao
     */
    private function montarPrompt(string $campo, string $contexto, \Illuminate\Support\Collection $legislacao, ?string $textoAtual = null): string
    {
        $textoAtualLimpo = filled($textoAtual) ? trim(strip_tags($textoAtual)) : '';

        $linhas = [];

        if ($textoAtualLimpo !== '') {
            // Modo "melhorar": ver comentário equivalente em
            // DfdIaService::montarPrompt — cada clique em "Melhorar com IA"
            // deve deixar o texto um pouco mais completo, nunca mais curto
            // nem repetindo o que já foi dito.
            $linhas[] = "Você recebeu abaixo o texto ATUAL do campo \"{$campo}\" de um documento do módulo de "
                . 'licitações e contratos (Lei 14.133/2021) de um órgão público brasileiro, já em uso. Sua tarefa '
                . 'é MELHORAR esse texto: aprofunde o conteúdo e acrescente pelo menos mais um parágrafo relevante, '
                . 'SEM se repetir e SEM remover ou encurtar o que já está bom. O resultado deve ficar mais '
                . 'completo que o texto atual.';
        } else {
            $linhas[] = "Redija o conteúdo do campo \"{$campo}\" de um documento do módulo de licitações e contratos "
                . '(Lei 14.133/2021) de um órgão público brasileiro.';
        }

        if (filled($contexto)) {
            $linhas[] = '';
            $linhas[] = 'Contexto disponível (dados já preenchidos em outros campos do mesmo documento):';
            $linhas[] = $contexto;
        }

        if ($textoAtualLimpo !== '') {
            $linhas[] = '';
            $linhas[] = 'Texto ATUAL do campo (a melhorar):';
            $linhas[] = '"""';
            $linhas[] = $textoAtualLimpo;
            $linhas[] = '"""';
        }

        if ($legislacao->isNotEmpty()) {
            $linhas[] = '';
            $linhas[] = 'Fundamente o texto na legislação cadastrada na plataforma abaixo, quando pertinente '
                . '(cite dispositivos apenas se constarem no trecho fornecido, nunca invente):';
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
            ? 'Responda com o texto COMPLETO e revisado do campo (o atual incorporado, mais a melhoria), pronto para substituir o campo — sem título, sem markdown, sem comentários.'
            : 'Responda apenas com o texto do campo, pronto para uso (sem título, sem markdown, sem comentários).';
        // Ver comentário equivalente em DfdIaService::montarPrompt.
        $linhas[] = 'Se o texto tiver mais de uma ideia/parágrafo, separe CADA parágrafo com uma linha em branco entre eles (\n\n) — nunca escreva tudo em um único bloco corrido.';

        return implode("\n", $linhas);
    }
}
