<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Modules\Campanha\Models\Concerns\CampanhaAware;

/**
 * Lançamento do livro-caixa com os campos da prestação de contas do TSE (D4). Valor em centavos; CPF/CNPJ
 * criptografado (só dígitos) com HMAC para busca exata.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 * @property string $tipo receita | despesa
 * @property string $categoria
 * @property int $valor_centavos
 * @property Carbon $data
 * @property string $forma_pagamento
 * @property int|null $codigo_ibge
 * @property string|null $contraparte_nome
 * @property string|null $contraparte_documento
 * @property string|null $origem_recurso
 * @property string|null $recibo_eleitoral
 * @property string|null $documento_fiscal_tipo
 * @property string|null $documento_fiscal_numero
 * @property int|null $material_id
 * @property string|null $comprovante
 * @property string|null $observacoes
 */
final class Lancamento extends Model
{
    use CampanhaAware;
    use SoftDeletes;
    use TenantAware;

    /** Categorias do CRM de referência, por tipo. */
    public const CATEGORIAS = [
        'despesa' => [
            'publicidade_grafica' => 'Publicidade e gráfica', 'impulsionamento' => 'Impulsionamento de redes', 'combustivel' => 'Combustível',
            'alimentacao' => 'Alimentação', 'aluguel_comite' => 'Aluguel e despesas do comitê', 'pessoal' => 'Pagamento de equipe e cabos',
            'viagem' => 'Viagem e hospedagem', 'outra_despesa' => 'Outra despesa',
        ],
        'receita' => [
            'doacao_partidaria' => 'Doação partidária', 'doacao_pessoa_fisica' => 'Doação de pessoa física', 'recursos_proprios' => 'Recursos próprios',
            'financiamento_coletivo' => 'Financiamento coletivo', 'fundo_publico' => 'Fundo eleitoral ou partidário', 'outra_receita' => 'Outra receita',
        ],
    ];

    /** Origem do recurso (prestação de contas). */
    public const ORIGENS = [
        'recursos_proprios' => 'Recursos próprios', 'pessoa_fisica' => 'Pessoa física', 'partido' => 'Partido político',
        'fefc' => 'FEFC (Fundo Especial de Financiamento de Campanha)', 'fundo_partidario' => 'Fundo Partidário',
        'financiamento_coletivo' => 'Financiamento coletivo', 'outros' => 'Outros recursos',
    ];

    public const FORMAS = ['pix' => 'PIX', 'transferencia' => 'Transferência', 'dinheiro' => 'Dinheiro', 'cartao' => 'Cartão', 'cheque' => 'Cheque', 'estimavel' => 'Estimável'];

    public const DOCUMENTOS_FISCAIS = ['nota_fiscal' => 'Nota fiscal', 'recibo' => 'Recibo', 'cupom' => 'Cupom fiscal', 'outro' => 'Outro'];

    protected $table = 'campanha_lancamentos';

    protected $fillable = [
        'tenant_id', 'campanha_id', 'tipo', 'categoria', 'valor_centavos', 'data', 'forma_pagamento', 'codigo_ibge', 'contraparte_nome',
        'contraparte_documento', 'contraparte_documento_hash', 'origem_recurso', 'recibo_eleitoral', 'documento_fiscal_tipo',
        'documento_fiscal_numero', 'material_id', 'observacoes',
    ];

    protected $hidden = ['comprovante', 'contraparte_documento_hash'];

    protected $appends = ['tem_comprovante'];

    protected $casts = [
        'tenant_id' => 'integer',
        'campanha_id' => 'integer',
        'valor_centavos' => 'integer',
        'data' => 'date:Y-m-d',
        'codigo_ibge' => 'integer',
        'material_id' => 'integer',
        'contraparte_documento' => 'encrypted',
    ];

    public static function hashDocumento(string $digitos): string
    {
        return hash_hmac('sha256', $digitos, (string) config('app.key'));
    }

    public function getTemComprovanteAttribute(): bool
    {
        return $this->comprovante !== null;
    }
}
