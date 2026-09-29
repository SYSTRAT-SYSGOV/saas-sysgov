{{--
    Layout base de todas as mensagens transacionais (design D4). Recebe $identidade
    (App\Notificacoes\Identidade) e o conteúdo específico da mensagem no slot.
    HTML de e-mail: tabelas e estilo inline (clientes de e-mail ignoram a maior parte do CSS
    moderno), sem depender de nenhum asset externo além do logotipo do próprio órgão.
--}}
@php($cor = $identidade->corPrimaria ?? '#0c326f')
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $identidade->titulo }}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; max-width:600px;">
                    <tr>
                        <td style="background-color:{{ $cor }}; padding:20px 24px;">
                            @if($identidade->logoUrl)
                                <img src="{{ $identidade->logoUrl }}" alt="{{ $identidade->titulo }}" style="height:32px; display:block;">
                            @else
                                <span style="color:#ffffff; font-size:18px; font-weight:bold;">{{ $identidade->titulo }}</span>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px; color:#1f2937; font-size:14px; line-height:1.6;">
                            {{ $slot }}
                        </td>
                    </tr>
                    @unless($identidade->assinaturaOculta)
                        <tr>
                            <td style="padding:16px 24px; border-top:1px solid #e5e7eb; color:#6b7280; font-size:12px;">
                                Mensagem enviada por {{ $identidade->titulo }}, com tecnologia SYSTRAT/SYSGOV. Não responda este e-mail.
                            </td>
                        </tr>
                    @endunless
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
