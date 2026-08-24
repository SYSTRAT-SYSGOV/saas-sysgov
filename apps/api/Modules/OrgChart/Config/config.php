<?php

declare(strict_types=1);

return [
    'name' => 'OrgChart',
    'alias' => 'org',
    'types' => [
        'raiz' => 'Órgão / Prefeitura Raiz',
        'secretaria' => 'Secretaria Municipal',
        'departamento' => 'Departamento',
        'divisao' => 'Divisão',
        'setor' => 'Setor / Seção',
        'autarquia' => 'Autarquia',
        'fundacao' => 'Fundação Pública',
    ],
    'roles' => [
        'responsavel' => 'Responsável / Gestor da Unidade',
        'membro' => 'Membro da Unidade',
    ],
];
