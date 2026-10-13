<?php

declare(strict_types=1);

namespace Modules\Formatura\Enums;

/** Formas de pagamento aceitas (a configuração escolhe quais valem para o ano). */
enum FormaPagamento: string
{
    case Pix = 'pix';
    case Dinheiro = 'dinheiro';
    case CartaoCredito = 'cartao_credito';
    case CartaoDebito = 'cartao_debito';
    case Boleto = 'boleto';
}
