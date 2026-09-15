<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Services\Ai\AiException;
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

    /** Quantidade máxima de itens sugeridos por chamada — o bastante para um DFD típico sem sobrecarregar a revisão manual. */
    private const QUANTIDADE_ITENS_SUGERIDOS = 8;

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
     * Sugere itens (materiais/serviços) para o DFD a partir do Objeto/Área/
     * Justificativa já preenchidos — diferente da Pesquisa de Preços (que já
     * tem o código do item e busca preço real no Compras.gov.br), aqui não
     * há dado externo determinístico a consultar: a IA gera a lista do
     * zero. Por isso código, quantidade e valor unitário sugeridos são
     * SEMPRE estimativas de planejamento a confirmar pelo usuário, nunca
     * uma fonte de verdade — a Pesquisa de Preços, mais adiante no
     * processo, é quem apura o valor real a partir de cotações de mercado.
     *
     * @return array{itens: array<int, array{tipo: string, codigo: string, descricao: string, unidade_medida: string, quantidade: float, valor_unitario: float}>}
     */
    public function sugerirItens(string $objeto, ?string $areaRequisitante, ?string $justificativa): array
    {
        $prompt = $this->montarPromptItens($objeto, $areaRequisitante, $justificativa);

        $resultado = $this->client->chatCompletion([
            [
                'role' => 'system',
                'content' => 'Você é um especialista em planejamento de contratações públicas brasileiras '
                    . '(Lei 14.133/2021, art. 18). Responda SEMPRE com um objeto JSON válido, sem markdown, sem '
                    . 'texto antes ou depois do JSON, sem comentários — apenas o objeto.',
            ],
            ['role' => 'user', 'content' => $prompt],
        ]);

        return ['itens' => $this->extrairItens($resultado['content'])];
    }

    private function montarPromptItens(string $objeto, ?string $areaRequisitante, ?string $justificativa): string
    {
        $linhas = [];
        $linhas[] = 'Identifique até ' . self::QUANTIDADE_ITENS_SUGERIDOS . ' itens (materiais e/ou serviços, '
            . 'conforme fizer sentido) necessários para a contratação pública descrita abaixo, para compor a '
            . 'lista de itens do Documento de Formalização de Demanda (DFD).';
        $linhas[] = '';
        $linhas[] = "Objeto da contratação: {$objeto}";

        if (filled($areaRequisitante)) {
            $linhas[] = "Área requisitante: {$areaRequisitante}";
        }

        if (filled($justificativa)) {
            $linhas[] = '';
            $linhas[] = 'Justificativa da contratação: ' . mb_substr(strip_tags($justificativa), 0, self::TAMANHO_TRECHO_TEXTO);
        }

        $linhas[] = '';
        $linhas[] = 'Responda APENAS com um objeto JSON (sem markdown, sem texto fora do objeto) no formato:';
        $linhas[] = '{ "itens": [ ... ] }';
        $linhas[] = '';
        $linhas[] = 'Cada item do array "itens" deve ter exatamente estas chaves:';
        $linhas[] = '- "tipo": "material" ou "servico";';
        $linhas[] = '- "codigo": string com um código CATMAT (se material) ou CATSER (se serviço) plausível — '
            . 'trata-se de uma SUGESTÃO APROXIMADA, não uma consulta a catálogo oficial; o usuário vai conferir '
            . 'e corrigir este código antes de salvar, então prefira omitir dígitos incertos a inventar um '
            . 'código com aparência de certeza absoluta;';
        $linhas[] = '- "descricao": string objetiva descrevendo o item;';
        $linhas[] = '- "unidade_medida": string curta (ex.: "unidade", "mês", "hora", "posto/mês");';
        $linhas[] = '- "quantidade": número estimado necessário;';
        $linhas[] = '- "valor_unitario": número, estimativa aproximada de mercado em reais (R$) para fins de '
            . 'planejamento preliminar — a etapa de Pesquisa de Preços, mais adiante, é quem apura o valor real '
            . 'a partir de cotações; não é necessário precisão, apenas uma ordem de grandeza razoável.';
        $linhas[] = '';
        $linhas[] = 'Não escreva nada antes ou depois do objeto JSON.';

        return implode("\n", $linhas);
    }

    /**
     * @return array<int, array{tipo: string, codigo: string, descricao: string, unidade_medida: string, quantidade: float, valor_unitario: float}>
     */
    private function extrairItens(string $conteudo): array
    {
        $json = trim($conteudo);
        if (str_starts_with($json, '```')) {
            $json = preg_replace('/^```[a-zA-Z]*\s*/', '', $json);
            $json = preg_replace('/\s*```$/', '', (string) $json);
        }

        $decodificado = json_decode((string) $json, true);
        if (!is_array($decodificado) || !isset($decodificado['itens']) || !is_array($decodificado['itens'])) {
            throw new AiException('O provedor de IA retornou uma resposta em formato inesperado.');
        }

        $itens = [];
        foreach ($decodificado['itens'] as $item) {
            if (!is_array($item) || !isset($item['descricao']) || !is_string($item['descricao']) || trim($item['descricao']) === '') {
                continue;
            }

            $itens[] = [
                'tipo' => in_array($item['tipo'] ?? null, ['material', 'servico'], true) ? $item['tipo'] : 'material',
                'codigo' => $this->normalizarTextoCurto($item['codigo'] ?? null, 50) ?? '',
                'descricao' => mb_substr(trim($item['descricao']), 0, 1000),
                'unidade_medida' => $this->normalizarTextoCurto($item['unidade_medida'] ?? null, 30) ?? 'unidade',
                'quantidade' => $this->normalizarNumero($item['quantidade'] ?? null, 1.0),
                'valor_unitario' => $this->normalizarNumero($item['valor_unitario'] ?? null, 0.0),
            ];
        }

        if ($itens === []) {
            throw new AiException('A IA não retornou nenhum item válido. Tente novamente.');
        }

        return $itens;
    }

    private function normalizarTextoCurto(mixed $valor, int $tamanhoMaximo): ?string
    {
        if (!is_string($valor) || trim($valor) === '') {
            return null;
        }

        return mb_substr(trim($valor), 0, $tamanhoMaximo);
    }

    private function normalizarNumero(mixed $valor, float $default): float
    {
        if (!is_numeric($valor)) {
            return $default;
        }

        return max(0.0, (float) $valor);
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
