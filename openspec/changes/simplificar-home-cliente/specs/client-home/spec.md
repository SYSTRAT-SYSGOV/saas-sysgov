# Spec Delta

## ADDED Requirements

### Requirement: Cabeçalho da home com o logo do tenant
<!-- id: client-home.logo -->
A página inicial do portal do cliente SHALL exibir, ao abrir, o logo do tenant (`settings.customLogoUrl`) junto à saudação ao usuário, e SHALL exibir a inicial do nome do órgão quando o tenant não tiver logo ou a imagem não carregar.

#### Scenario: Tenant com logo
- **WHEN** um usuário abre a home e o tenant tem `settings.customLogoUrl`
- **THEN** o logo do tenant aparece no cabeçalho, ao lado de "Olá, <nome>"

#### Scenario: Tenant sem logo
- **WHEN** um usuário abre a home e o tenant não tem logo
- **THEN** o cabeçalho mostra a inicial do nome do órgão no lugar da imagem

#### Scenario: Logo que não carrega
- **WHEN** a imagem do logo falha ao carregar
- **THEN** o cabeçalho mostra a inicial do nome do órgão, sem ícone de imagem quebrada

### Requirement: Quatro cards básicos fixos
<!-- id: client-home.cards-basicos -->
A home SHALL exibir exatamente quatro cards de resumo, iguais para todos os tenants e independentes dos módulos contratados: Unidades, Usuários, Perfis de acesso e Módulos ativos. Cada card SHALL ter cor própria. A home SHALL NOT exibir cards por módulo de negócio nem agrupá-los em seções recolhíveis.

#### Scenario: Home de um tenant com muitos módulos
- **WHEN** um usuário de um tenant com vários módulos abre a home
- **THEN** vê apenas os quatro cards básicos, cada um com uma cor diferente

#### Scenario: Home de um tenant com poucos módulos
- **WHEN** um usuário de um tenant com um único módulo abre a home
- **THEN** vê os mesmos quatro cards básicos

#### Scenario: Totais isolados por tenant
- **WHEN** dois tenants têm quantidades diferentes de usuários
- **THEN** cada um vê no card Usuários somente o total do seu próprio tenant

### Requirement: Módulos disponíveis só no modo Personalizar
<!-- id: client-home.modulos-personalizar -->
A seção "Módulos disponíveis" SHALL ficar oculta por padrão e SHALL ser exibida somente enquanto o modo Personalizar estiver ligado.

#### Scenario: Abrir a home
- **WHEN** um usuário abre a home sem ligar o modo Personalizar
- **THEN** a lista de módulos disponíveis não é exibida

#### Scenario: Ligar o modo Personalizar
- **WHEN** o usuário clica em "Personalizar"
- **THEN** a seção "Módulos disponíveis" aparece, com a opção de favoritar cada módulo

#### Scenario: Concluir a edição
- **WHEN** o usuário clica em "Concluir edição"
- **THEN** a seção "Módulos disponíveis" volta a ficar oculta

### Requirement: Favoritos em accordion
<!-- id: client-home.favoritos-accordion -->
Os módulos favoritos SHALL ser exibidos num accordion acessível, aberto por padrão, e SHALL ser o único elemento recolhível da home. O estado recolhido SHALL ser lembrado no navegador do usuário.

#### Scenario: Usuário com favoritos
- **WHEN** um usuário com módulos favoritos abre a home
- **THEN** vê o accordion "Favoritos" aberto, com os atalhos dentro

#### Scenario: Recolher e reabrir
- **WHEN** o usuário clica no título do accordion de Favoritos
- **THEN** o conteúdo recolhe, e nas próximas visitas a home abre com ele recolhido até o usuário abri-lo de novo

#### Scenario: Usuário sem favoritos
- **WHEN** um usuário sem favoritos abre a home fora do modo Personalizar
- **THEN** o accordion de Favoritos não é exibido

#### Scenario: Sem favoritos no modo Personalizar
- **WHEN** um usuário sem favoritos liga o modo Personalizar
- **THEN** o accordion aparece com a orientação para marcar módulos como favoritos
