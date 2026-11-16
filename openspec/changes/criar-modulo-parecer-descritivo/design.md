# Design — Módulo Parecer Descritivo (1º ao 5º)

## Contexto
Referência funcional: `parecer descritivo/app` (PHP, somente leitura), com cerca de 3.900 linhas e 11 tabelas `parecer_*`. Referência de arquitetura: o módulo `Pedagogico`, que tem a mesma forma (sobre o `Escola`, com notas, frequência e ocorrências próprias).

Regra do usuário: **portar tudo do jeito que está**. As estruturas do Pedagógico (6º ao 9º) e do Parecer (1º ao 5º) se repetem de propósito e **não são compartilhadas**. O que é compartilhado é só o cadastro (Escola + Pessoas).

## Mapeamento PHP → SYSGOV

| PHP | SYSGOV | Observação |
|---|---|---|
| `parecer_usuarios` + login + perfis | usuários/RBAC do núcleo | perfis viram permissões (abaixo) |
| `parecer_turmas` | `escola_turmas` + **`parecer_turmas`** (turma_id, `serie` 1–5) | o Escola não tem série; só aparecem no módulo as turmas com série definida |
| colunas de função da turma (`professor_regente`…`diretor`, `_id`) | **`parecer_turma_funcoes`** (turma_id, funcao, user_id, nome_impressao) | as 8 funções e o mapa função→matérias continuam fixos no código (`FUNCOES_TURMA`) |
| `parecer_alunos` | `escola_alunos` (número, CGM, mãe, pai, foto, situação) | nascimento e celular do responsável vêm do Escola/Pessoas (`AlunoContato`) |
| `parecer_trimestres` | `escola_trimestres` | cadastro único |
| `parecer_categorias_ocorrencia` | `escola_categorias_ocorrencia` | cadastro único |
| configurações "sistema" (nome e logo da escola) | `Escola`/`Unidade` | |
| `parecer_habilidades` | **`parecer_habilidades`** (+tenant_id) | seed a partir de `habilidades.json` na primeira ativação do tenant |
| `parecer_avaliacoes` | **`parecer_avaliacoes`** (aluno_id → escola_alunos) | única por (aluno, habilidade, trimestre) |
| `parecer_observacoes` | **`parecer_observacoes`** | única por (aluno, trimestre, matéria) |
| `parecer_notas` | **`parecer_notas`** | 1º ano só parecer; 2º ano só o 3º tri; 3º ao 5º os três; média 6,0 |
| `parecer_frequencia` | **`parecer_frequencias`** | C/F, aulas (padrão 5), faltas |
| `parecer_ocorrencias` | **`parecer_ocorrencias`** | categoria → id do Escola |
| `parecer_auditoria` | `AuditLog` do núcleo + tela filtrada pelo módulo | |

Todas as tabelas novas levam `tenant_id` e `escola_id`, no mesmo padrão do Pedagógico (multiescola).

Matérias: códigos fixos `LP, MAT, CIE, HIS, GEO, EF, ART, ER`, iguais ao PHP. Conceitos: `A`, `EP`, `NA`.

## Perfis → permissões
| PHP | Permissão |
|---|---|
| todos | `parecer.view` |
| professor (vê só as turmas e matérias da sua função) | `parecer.professor` |
| admin, diretor, pedagogo (GESTORES) | `parecer.gestor` (todas as turmas, conteúdos, configuração da turma) |
| admin, diretor (auditoria) | `parecer.auditoria` |

O vínculo do professor à turma vem de `parecer_turma_funcoes.user_id`. O regente avalia LP, MAT e CIE e também cobre as matérias sem professor próprio, como no PHP.

## Frontend
Telas na mesma ordem e com os mesmos nomes do PHP: Início (cards das turmas), Avaliar, Conteúdos, Notas, Frequência, Ocorrências, Relatórios, Configurações (séries e funções das turmas), Auditoria e Imprimir. A impressão gera HTML com o CSS de impressão portado e é salva como PDF pelo navegador, igual ao PHP. A importação de notas por planilha também é portada.

## Decisões do Claude (revisar)
- D1: série guardada em `parecer_turmas`, sem alterar a tabela `escola_turmas`.
- D2: funções da turma em tabela própria do módulo, em vez de `escola_turma_materias`/`escola_equipe`, para manter as 8 funções do PHP sem alteração.
- D3: impressão no navegador, como no PHP; não há PDF no servidor.
- D4: a bncc.api.br só é usada quando houver `BNCC_API_KEY`; sem a chave, vale apenas a lista local.

## Fora do escopo
- Importar dados do PHP da HostGator: o módulo começa vazio (decisão do usuário, 2026-11-11).
- Unificar com o Pedagógico.
- Mudar o PHP da HostGator (ele segue com o zip `subir_no_host.zip`).
