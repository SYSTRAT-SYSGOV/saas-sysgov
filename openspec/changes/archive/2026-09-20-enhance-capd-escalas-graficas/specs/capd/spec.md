# Spec Delta

## ADDED Requirements

### Requirement: Gestão e Parametrização Completa da Escala Gráfica no Portal da CAD
<!-- id: Capd.EscalaGrafica.GestaoCompleta -->
<!-- entities: EscalaGrafica, EscalaNivel, ModeloFormulario -->
<!-- enforced: EscalaGraficaPanel, EscalaGraficaController -->

O painel de Escalas Gráficas da CAD SHALL fornecer ciclo de vida administrativo completo das escalas associadas a modelos de formulário, permitindo listagem, criação, edição (`PUT`), ativação e exclusão segura (`DELETE`) com validação de integridade contínua de 0 a 100 pontos e suporte a 3 até 5 graus de desempenho segundo a Metodologia Chiavenato. Todo diálogo destrutivo ou confirmatório SHALL utilizar exclusivamente componentes de `@sysgov/ui` (`Modal`), sendo proibido o uso de `window.confirm` ou `alert`.

#### Scenario: Criação de escala com 3 a 5 níveis e validação de continuidade
- **WHEN** o membro da CAD preenche o formulário de escala com 3 a 5 graus, com o primeiro grau iniciando em 0.0, o último grau finalizando em 100.0 e intervalos contíguos sem sobreposições ou buracos
- **THEN** a escala é cadastrada com sucesso via API, os níveis são persistidos e a nova escala torna-se a vigente do modelo, desativando eventuais escalas anteriores

#### Scenario: Bloqueio de escala com faixas inconsistentes ou fora da amplitude 0 a 100
- **WHEN** o usuário tenta submeter uma escala onde o primeiro nível não inicia em 0.0, o último não termina em 100.0, ou há lacuna ou sobreposição numérica entre níveis consecutivos
- **THEN** o sistema bloqueia o salvamento e apresenta mensagem de erro orientativa detalhando o intervalo inconsistente

#### Scenario: Edição de escala gráfica existente
- **WHEN** o gestor aciona a ação de editar em uma escala gráfica cadastrada e ajusta seus rótulos conceituais, descrição comportamental ou limites de pontos
- **THEN** a requisição `PUT` é enviada com os dados atualizados e o painel reflete imediatamente os novos valores

#### Scenario: Exclusão segura de escala inativa via modal institucional
- **WHEN** o gestor seleciona a exclusão de uma escala não ativa
- **THEN** é aberto um `Modal` institucional com aviso de impacto, exigindo confirmação explícita antes de disparar a exclusão (`DELETE`)

#### Scenario: Aplicação de templates pré-configurados de Chiavenato
- **WHEN** o gestor aciona o botão de preset (5 Graus Padrão, 4 Graus ou 3 Graus)
- **THEN** o formulário de graus é automaticamente preenchido com a distribuição equilibrada de pontos (0 a 100) e rótulos conceituais canônicos da metodologia

---

### Requirement: Régua Gráfica Contínua e Simulador Interativo com Trava Antileniência
<!-- id: Capd.EscalaGrafica.ReguaSimulador -->
<!-- entities: EscalaGrafica, EscalaNivel, DiarioBordo -->
<!-- enforced: EscalaGraficaPanel -->

A aba de Escalas Gráficas SHALL exibir visualização gráfica de régua contínua (0 a 100 pontos) com graduação cromática semântica canônica do `@sysgov/ui` / `graduTone.ts` e disponibilizar um Simulador Interativo de Enquadramento. O simulador SHALL permitir testar qualquer pontuação ou nota convertida, exibindo em tempo real o grau correspondente, o rótulo conceitual, a descrição comportamental e o aviso preventivo da Trava Antileniência quando a nota recair em graus extremos (Grau 1, 2 ou 5).

#### Scenario: Simulação de pontuação em grau intermediário
- **WHEN** o usuário desloca o controle do simulador para uma nota ou pontuação pertencente a graus intermediários (Grau 3 ou Grau 4)
- **THEN** o simulador destaca a respectiva faixa na régua contínua, exibe o rótulo ("Bom" ou "Muito Bom") e indica conformidade avaliativa sem necessidade de CIT prévio

#### Scenario: Simulação de pontuação em grau extremo acionando alerta de Trava Antileniência
- **WHEN** o usuário simula uma pontuação que enquadre no Grau 1 (Insuficiente), Grau 2 (Regular) ou Grau 5 (Excelente)
- **THEN** o simulador exibe alerta visual informativo destacando que a nota acionará a Trava Antileniência regimental (Art. 24 da Lei nº 1.704/2006), exigindo lançamento tempestivo de Incidente Crítico fundamentado no Diário de Bordo
