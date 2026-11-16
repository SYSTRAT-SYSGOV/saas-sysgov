# Módulo Parecer Descritivo (`/educacao/parecer`)

Parecer descritivo dos **anos iniciais (1º ao 5º ano)**, sobre o Cadastro Escolar (`escola`). É o módulo irmão do
Gestão Pedagógica (6º ao 9º) e o sétimo submódulo da Educação (ver `educacao.md`). Desenvolvido pelo Ricardo
(`feat/modulo-parecer-descritivo`); a integração ao SYSGOV está na change `incluir-parecer-no-educacao`.

Specs: `openspec/changes/criar-modulo-parecer-descritivo` (o módulo) e `openspec/changes/incluir-parecer-no-educacao`
(a inclusão na Educação).

## O que faz

Habilidades por série e matéria (código BNCC e trimestres), avaliação por conceito (A, EP, NA) por trimestre,
observações, parecer em texto corrido com impressão (por aluno ou turma), notas (regras por série), frequência diária,
ocorrências próprias do módulo, funções da turma (regente, História e Geografia, Educação Física, Arte, Ensino Religioso,
pedagogo, pedagogo RMD, diretor), relatórios e auditoria. Turmas, alunos, trimestres e dados da escola vêm do Cadastro
Escolar; não há cadastro paralelo.

## Backend

- Alias `parecer`; requer `Admin`, `Escola` e `Pessoas`. API em `/api/parecer`, com `X-Escola-ID` obrigatório.
- Tabelas novas `parecer_turmas`, `parecer_turma_funcoes`, `parecer_habilidades`, `parecer_avaliacoes`,
  `parecer_observacoes`, `parecer_notas`, `parecer_frequencias`, `parecer_ocorrencias` (migration
  `2026_11_11_110000_create_parecer_tables`; só cria, o `down()` apaga só estas).
- As habilidades vêm de `Database/dados/habilidades.json`, carregadas sob demanda (sem carga no deploy).
- `BNCC_API_KEY` (opcional) liga a consulta a https://bncc.api.br; vazia, só vale a lista local.

## Permissões e perfis

| Permissão | Efeito |
|---|---|
| `parecer.view` | Acessar o módulo |
| `parecer.professor` | Avaliar e lançar notas, frequência e ocorrências nas turmas e matérias da sua função |
| `parecer.gestor` | Todas as turmas e matérias; define séries e funções das turmas; edita conteúdos |
| `parecer.auditoria` | Consulta a auditoria do módulo |

Perfis-modelo (`ParecerRbacSeeder`, clonados para o tenant quando o módulo é habilitado): Direção (gestor + auditoria),
Pedagogia (gestor) e Professor(a). Ter o perfil de professor não basta: a regra também exige a **função na turma**.

## Habilitar

O módulo entra no catálogo no boot da API (`module:register`) e fica invisível até ser habilitado para o tenant no Admin
Suite. Definir a tarifa mensal ali antes de liberar.
