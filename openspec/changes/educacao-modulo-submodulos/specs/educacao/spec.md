## ADDED Requirements

### Requirement: Módulo Educação agrupa os submódulos da área de educação
O sistema SHALL oferecer o módulo **Educação** como agrupador dos submódulos **Cadastro Escolar**, **Gestão Pedagógica**, **Formatura e Eventos**, **Passeios**, **Portfólio Digital** e **Transporte Escolar**. O agrupamento SHALL ser apenas de navegação: cada submódulo mantém seu alias, suas permissões, seus perfis, sua API e seus dados. O sistema SHALL NOT criar permissão própria da Educação.

#### Scenario: Menu com os submódulos
- **WHEN** um usuário com acesso aos seis submódulos abre o menu
- **THEN** vê um item "Educação" que se expande nos seis submódulos, com os nomes padronizados, e não vê mais os seis itens soltos no grupo

#### Scenario: Usuário com acesso a um só submódulo
- **WHEN** um usuário tem permissão apenas em `transporte.view`
- **THEN** o menu mostra "Educação" com apenas "Transporte Escolar" dentro

#### Scenario: Usuário sem acesso a nenhum submódulo
- **WHEN** um usuário não tem permissão em nenhum dos seis submódulos
- **THEN** o item "Educação" não aparece no menu

#### Scenario: Módulo desativado no tenant
- **WHEN** o tenant não tem o módulo `portfolio` ativo
- **THEN** "Portfólio Digital" não aparece em "Educação", e os demais submódulos continuam disponíveis

### Requirement: Rotas dos submódulos e compatibilidade com as rotas antigas
Cada submódulo SHALL abrir em `/educacao/<submódulo>` (`cadastro-escolar`, `pedagogico`, `formatura`, `passeio`, `portfolio`, `transporte`). As rotas antigas `/escola`, `/pedagogico`, `/formatura`, `/passeio`, `/portfolio` e `/transporte` SHALL redirecionar para as novas, preservando o parâmetro de consulta (por exemplo `?aba=custos`) e o fragmento. As rotas de API SHALL NOTM mudar.

#### Scenario: Link antigo com aba
- **WHEN** um usuário abre `/transporte?aba=custos` a partir de um favorito
- **THEN** é levado a `/educacao/transporte?aba=custos` e vê a aba Custos

#### Scenario: Acesso negado
- **WHEN** um usuário sem a permissão do submódulo abre `/educacao/pedagogico`
- **THEN** recebe a tela de acesso negado, como acontecia em `/pedagogico`

### Requirement: Página inicial da Educação
A rota `/educacao` SHALL listar os submódulos que o usuário pode abrir, com nome e descrição curta de cada um. O sistema SHALL NOT listar submódulo sem permissão, desativado no tenant ou não liberado para a unidade do usuário.

#### Scenario: Lista conforme o acesso
- **WHEN** um usuário com acesso a Cadastro Escolar e Gestão Pedagógica abre `/educacao`
- **THEN** a página mostra esses dois submódulos e nenhum outro

### Requirement: Navegação entre submódulos
Toda tela de submódulo SHALL mostrar, no topo, a barra de submódulos da Educação com o submódulo atual destacado e apenas os submódulos permitidos. A barra SHALL funcionar por teclado, indicar o item atual a leitores de tela e permanecer utilizável em tela estreita.

#### Scenario: Trocar de submódulo
- **WHEN** o usuário está em Gestão Pedagógica e aciona "Transporte Escolar" na barra
- **THEN** abre `/educacao/transporte` sem voltar ao menu

### Requirement: Nomes padronizados
O sistema SHALL usar os mesmos nomes para os submódulos no menu, na barra superior, na página inicial, nos cards do painel, no gerenciador de menus e no registro de módulos: "Cadastro Escolar", "Gestão Pedagógica", "Formatura e Eventos", "Passeios", "Portfólio Digital" e "Transporte Escolar".

#### Scenario: Título na barra superior
- **WHEN** o usuário abre `/educacao/pedagogico`
- **THEN** o título da barra superior é "Gestão Pedagógica" e não "Módulo Pedagógico"

### Requirement: Migração do menu existente sem perda
A mudança SHALL reposicionar os itens de menu já gravados dos seis módulos sob o agrupador "Educação", mantendo permissão, ordem e situação (ativo ou não). A migração SHALL poder rodar mais de uma vez sem duplicar itens e SHALL NOT recriar item que o administrador do tenant removeu.

#### Scenario: Reexecução
- **WHEN** a migração roda duas vezes
- **THEN** existe um único item "Educação" e um único item por submódulo

#### Scenario: Item removido pelo tenant
- **WHEN** o administrador de um tenant removeu o item de Portfólio do menu
- **THEN** a migração não o recria
