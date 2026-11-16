# Proposal

## Why

O parecer descritivo dos anos iniciais (1º ao 5º ano) roda hoje num sistema PHP isolado (`parecer descritivo/app`, hospedado na HostGator). Ele tem login, turmas e alunos próprios, sem ligação com o cadastro escolar do SYSGOV. O módulo **Pedagógico** já cobre os anos finais (6º ao 9º) em cima do cadastro **Escola**. Os anos iniciais precisam de um módulo irmão sobre o mesmo cadastro único, com as regras do parecer: habilidades BNCC avaliadas por conceito, observações e o parecer em texto corrido.

## What Changes

- **Novo módulo Laravel `Parecer`** em `apps/api/Modules/Parecer`, irmão do `Pedagogico`, que depende de `Admin`, `Escola` e `Pessoas`. Ele porta **todas** as funcionalidades do PHP, com o mesmo comportamento:
  - habilidades por série e matéria (com código BNCC e trimestres) e a consulta opcional à bncc.api.br;
  - avaliação por habilidade com os conceitos A / EP / NA, por trimestre;
  - observações do professor por aluno, trimestre e matéria;
  - parecer em texto corrido, com impressão por aluno ou turma, por trimestre (ou os três) e por matérias, e assinaturas das funções;
  - notas (regras por série), frequência diária (C/F, aulas e faltas) e ocorrências **próprias do módulo**;
  - funções da turma (regente, História e Geografia, Educação Física, Arte, Ensino Religioso, pedagogo, pedagogo RMD, diretor);
  - relatórios com filtros e auditoria.
- **Base cadastral do Escola**: turmas, alunos, trimestres, categorias de ocorrência e dados da escola vêm do cadastro Escola. Não há cadastro paralelo.
- **Saem do PHP**: o login próprio, `usuarios.php`, `instalar.php` e `config.php`. No lugar entram o login, os usuários, o RBAC e o multi-tenant do SYSGOV.
- **Frontend** em `apps/web-client/src/modules/parecer` com `@sysgov/ui` e item de menu "Parecer Descritivo (1º ao 5º)".

## Capabilities

### New Capabilities

- `parecer`: séries e funções da turma, habilidades/BNCC, avaliação, observações, parecer e impressão, notas, frequência, ocorrências, relatórios, permissões e auditoria.

## Impact

- **Backend**: módulo novo (migrations `parecer_*`, models TenantAware, services, policies, controllers, rotas e testes). O `Escola` não muda.
- **Frontend**: módulo novo no web-client, registro e menu.
- **Configuração**: `BNCC_API_KEY` opcional no `.env`. Nenhum segredo vai para o repositório, que é público.
- **Entrega**: testado localmente no Docker (`sysgov.sh`) → PR no repo do Ricardo → PR em homologação da equipe (`cfgfernando/homologa-saas-sysgov`) → produção somente depois de homologado.
- O PHP da HostGator continua no ar sem mudanças até a virada.
