{{--
    Certificado de modelo visual (design D1): página A4 em pontos, fundo de página inteira e cada
    elemento em posição absoluta. Tudo vem do snapshot congelado na emissão ($leiaute), já
    resolvido pelo CertificadoService — esta view só desenha.
--}}
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>{{ $titulo }}</title>
<style>
    @page { margin: 0; }
    html, body { margin: 0; padding: 0; }
    body { font-family: 'DejaVu Sans', sans-serif; color: #1b2a41; }
    .pagina { position: relative; width: {{ $largura }}pt; height: {{ $altura }}pt; overflow: hidden; }
    .fundo { position: absolute; left: 0; top: 0; width: {{ $largura }}pt; height: {{ $altura }}pt; }
    .el { position: absolute; }
    .texto { line-height: 1.25; }
    .texto p { margin: 0 0 0.45em 0; }
    .assinatura { text-align: center; }
    .assinatura img { display: block; margin: 0 auto; }
    .assinatura .nome { font-weight: bold; margin-top: 2pt; }
</style>
</head>
<body>
<div class="pagina">
    @if ($fundo)
        <img class="fundo" src="{{ $fundo }}" alt="">
    @endif

    @foreach ($elementos as $el)
        @php($estilo = "left: {$el['x']}pt; top: {$el['y']}pt; width: {$el['largura']}pt;")
        @switch($el['tipo'])
            @case('texto')
                <div class="el texto" style="{{ $estilo }} font-family: {{ $el['fonte'] === 'serif' ? "'DejaVu Serif', serif" : "'DejaVu Sans', sans-serif" }}; font-size: {{ $el['tamanho'] }}pt; color: {{ $el['cor'] }}; font-weight: {{ $el['negrito'] ? 'bold' : 'normal' }}; text-align: {{ ['esquerda' => 'left', 'centro' => 'center', 'direita' => 'right', 'justificado' => 'justify'][$el['alinhamento']] ?? 'left' }};{{ $el['caixa_alta'] ? ' text-transform: uppercase;' : '' }}">
                    @foreach (preg_split('/\R{2,}/', $el['conteudo']) as $paragrafo)
                        <p>{!! nl2br(e($paragrafo)) !!}</p>
                    @endforeach
                </div>
                @break
            @case('qrcode')
                <img class="el" style="{{ $estilo }} height: {{ $el['largura'] }}pt;" src="{{ $qrCode }}" alt="QR code de validação">
                @break
            @case('logotipo')
                @if ($logotipo)
                    <img class="el" style="{{ $estilo }}" src="{{ $logotipo }}" alt="">
                @endif
                @break
            @case('selo')
                @if ($el['imagem'])
                    <img class="el" style="{{ $estilo }}" src="{{ $el['imagem'] }}" alt="">
                @endif
                @break
            @case('assinatura')
                <div class="el assinatura" style="{{ $estilo }} font-size: {{ $el['tamanho'] }}pt; color: {{ $el['cor'] }};">
                    @if ($el['imagem'])
                        <img src="{{ $el['imagem'] }}" style="width: {{ $el['largura'] }}pt;" alt="">
                    @endif
                    @if ($el['mostrar_textos'])
                        <div class="nome">{{ $el['nome'] }}</div>
                        @if ($el['linha_cargo'] !== '')
                            <div>{{ $el['linha_cargo'] }}</div>
                        @endif
                    @endif
                </div>
                @break
        @endswitch
    @endforeach
</div>

@include('cursos::certificado-verso')
</body>
</html>
