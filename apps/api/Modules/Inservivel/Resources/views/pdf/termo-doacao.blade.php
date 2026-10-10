@extends('inservivel::pdf.layout')
@section('titulo', 'Termo de doação com encargo — Lote ' . $lote['numero'])
@section('conteudo')
    <h1>Termo de doação com encargo</h1>
    <p class="centro">Lote nº <span class="mono">{{ $lote['numero'] }}</span></p>

    <h2>I – Das partes</h2>
    <p class="just"><strong>DOADOR:</strong> <strong>{{ mb_strtoupper($doador['nome']) }}</strong>, {{ $doador['qualificacao'] }}.</p>
    <p class="just"><strong>DONATÁRIA:</strong> <strong>{{ mb_strtoupper($entidade['razao_social']) }}</strong>, entidade sem fins lucrativos, inscrita no CNPJ sob nº <span class="mono">{{ $entidade['cnpj'] }}</span>, com sede em {{ $entidade['endereco'] }}, {{ $entidade['cidade'] }}/{{ $entidade['uf'] }}, neste ato representada por {{ $entidade['representante'] }}, {{ $entidade['cargo'] }}, CPF nº <span class="mono">{{ $entidade['cpf'] }}</span>.</p>

    <h2>II – Fundamentação legal</h2>
    <p>O presente Termo é firmado com fundamento:</p>
    <ul>
        @foreach($legislacao as $norma)<li>{{ $norma }};</li>@endforeach
        <li>no processo de desfazimento e no sorteio do Lote nº <span class="mono">{{ $lote['numero'] }}</span>, realizado em <span class="mono">{{ $data_sorteio }}</span>.</li>
    </ul>

    <h2>III – Do objeto</h2>
    <p class="just">Constitui objeto do presente Termo a doação, com encargo, dos bens móveis inservíveis do Lote nº <span class="mono">{{ $lote['numero'] }}</span>, abaixo relacionados:</p>
    @include('inservivel::pdf._bens')

    <h2>IV – Da finalidade e do encargo</h2>
    <p class="just">A DONATÁRIA compromete-se a utilizar os bens exclusivamente para fins de interesse social, conforme suas finalidades estatutárias declaradas no cadastro. Parágrafo único: é vedada a utilização dos bens para fins diversos da finalidade pública declarada.</p>

    <h2>V – Das obrigações da donatária</h2>
    <p class="just">I – utilizar os bens estritamente conforme a finalidade social declarada; II – zelar pela conservação e adequada utilização dos bens; III – não alienar, ceder, transferir ou dar destinação diversa aos bens; IV – assumir integral responsabilidade pela guarda, uso e manutenção; V – arcar com os custos de retirada, transporte e eventual instalação; VI – apresentar prestação de contas do uso dos bens no prazo máximo de 6 (seis) meses, contados do recebimento; VII – permitir a fiscalização pela Administração Pública sempre que solicitado; VIII – manter a regularidade jurídica e fiscal durante o período de utilização dos bens.</p>

    <h2>VI – Das obrigações do doador</h2>
    <p class="just">I – formalizar a entrega dos bens mediante este Termo; II – registrar a baixa patrimonial dos bens; III – dar publicidade aos atos da doação no Portal da Transparência; IV – acompanhar e fiscalizar o cumprimento do encargo.</p>

    <h2>VII – Da entrega dos bens</h2>
    <p class="just">A entrega dos bens será realizada mediante a assinatura deste Termo. § 1º A retirada é de responsabilidade exclusiva da DONATÁRIA. § 2º Os bens são doados no estado em que se encontram, sem responsabilidade futura do DOADOR quanto a vícios, defeitos ou funcionamento.</p>

    <h2>VIII – Da cláusula de reversão</h2>
    <p class="just">O descumprimento de qualquer obrigação deste Termo implicará: I – a reversão imediata dos bens ao patrimônio público; II – a vedação da DONATÁRIA em participar de novos processos de doação pelo prazo de até 5 (cinco) anos; III – a adoção das medidas administrativas e legais cabíveis.</p>

    <h2>IX – Da fiscalização, da publicidade e da vigência</h2>
    <p class="just">A execução deste Termo será acompanhada pelos órgãos competentes da Administração, por vistorias, relatórios e auditorias. O Termo e os atos da doação serão publicados no Portal da Transparência. Este Termo entra em vigor na data de sua assinatura e permanece válido enquanto perdurar a finalidade social dos bens.</p>

    @if($doador['foro'])
    <h2>X – Do foro</h2>
    <p class="just">Fica eleito o foro da Comarca de {{ $doador['foro'] }} para dirimir quaisquer dúvidas oriundas deste Termo, com renúncia a qualquer outro, por mais privilegiado que seja.</p>
    @endif

    <p style="margin-top:18px;">{{ $doador['cidade'] ? $doador['cidade'] . ', ' : '' }}{{ $data_extenso }}.</p>

    <table class="assinaturas">
        <tr>
            <td><div class="linha"><strong>DOADOR</strong><br>{{ $doador['nome'] }}<br><span class="mono">{{ $doador['cnpj'] ?? '' }}</span></div></td>
            <td><div class="linha"><strong>DONATÁRIA</strong><br>{{ $entidade['razao_social'] }}<br><span class="mono">{{ $entidade['cnpj'] }}</span></div></td>
        </tr>
        <tr>
            <td><div class="linha">TESTEMUNHA 1<br>CPF:</div></td>
            <td><div class="linha">TESTEMUNHA 2<br>CPF:</div></td>
        </tr>
    </table>
@endsection
