# admin-design-system Specification

## Purpose
TBD - created by archiving change admin-design-system-govbr. Update Purpose after archive.

## Requirements

### Requirement: Tokens do Design System Gov.br no painel administrativo
<!-- id: admin-design-system.tokens -->
O painel administrativo SHALL usar os mesmos tokens de cor, tipografia, raio, sombra e foco do portal do cliente, importados de um único arquivo compartilhado em `packages/ui`, e SHALL NOT definir paleta própria (verde esmeralda, Navy) para ação primária, superfície ou texto.

#### Scenario: Cor de ação primária
- **WHEN** uma tela do admin renderiza um botão primário ou um link ativo
- **THEN** a cor resolvida é a mesma do portal (`#1351B4`) e vem do token `--primary`

#### Scenario: Sem cores soltas
- **WHEN** o código do admin é inspecionado
- **THEN** não há classes `slate-*`, `emerald-*`, `navy-*`, `bg-white` nem cores hexadecimais fora dos arquivos de tokens

### Requirement: Layout institucional do admin
<!-- id: admin-design-system.layout -->
O cabeçalho, o menu lateral, o rodapé, as notificações e a tela de login do admin SHALL seguir o mesmo padrão visual do portal (menu lateral `--sidebar`, cabeçalho claro, fonte Inter, escala tipográfica oficial).

#### Scenario: Login
- **WHEN** o usuário abre a tela de login do admin
- **THEN** vê o cabeçalho e o cartão de acesso no padrão Gov.br, com e-mail e senha

### Requirement: Componentes e padrões compartilhados
<!-- id: admin-design-system.componentes -->
As grades, diálogos, campos, cabeçalhos de página, estados de tela e a validação de formulários do admin SHALL usar os componentes e padrões compartilhados de `@sysgov/ui` (grade com exportação, paginação e ações em dropdown; validação em modal) em vez de cópias locais.

#### Scenario: Grade do admin
- **WHEN** o usuário abre uma listagem do admin
- **THEN** ela tem botão de exportação, paginação, seletor de linhas por página e ações da linha à esquerda (dropdown quando houver mais de uma)

#### Scenario: Campo obrigatório vazio
- **WHEN** o usuário salva um formulário do admin com campo obrigatório vazio
- **THEN** a modal padrão de validação lista os campos que faltam
