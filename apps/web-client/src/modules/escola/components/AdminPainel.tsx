import React, { useState } from 'react';
import { Settings, ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import AlunosAdmin from './AlunosAdmin';
import TurmasAdmin from './TurmasAdmin';
import MateriasAdmin from './MateriasAdmin';
import CategoriasAdmin from './CategoriasAdmin';
import EquipeAdmin from './EquipeAdmin';
import TrimestresAdmin from './TrimestresAdmin';
import SistemaAdmin from './SistemaAdmin';
import EscolasAdmin from './EscolasAdmin';
import { useAuth } from '@/core/auth/AuthProvider';
import type { Toast } from './AdminModal';

export type AdminTab = 'alunos' | 'equipe' | 'usuarios' | 'turmas' | 'materias' | 'categorias' | 'trimestres' | 'sistema' | 'escolas';

const TABS: { id: AdminTab; label: string; icon?: React.ElementType }[] = [
  { id: 'alunos', label: 'Alunos' },
  { id: 'equipe', label: 'Equipe' },
  { id: 'usuarios', label: 'Usuários' },
  { id: 'turmas', label: 'Turmas' },
  { id: 'materias', label: 'Matérias' },
  { id: 'categorias', label: 'Categorias' },
  { id: 'trimestres', label: 'Trimestres' },
  { id: 'sistema', label: 'Sistema', icon: Settings },
];

interface AdminPainelProps {
  onToast: Toast;
}

/** Cadastro Escolar: cada aba carrega e grava seus próprios dados na API do Escola. */
export const AdminPainel: React.FC<AdminPainelProps> = ({ onToast }) => {
  const [tab, setTab] = useState<AdminTab>('alunos');
  const { permissions } = useAuth();
  // Cadastro das escolas do órgão: só com escola.escolas.manage (o servidor confere de novo).
  const gerenciaEscolas = permissions.includes('*') || permissions.includes('escola.escolas.manage');
  const abas = gerenciaEscolas ? [...TABS, { id: 'escolas' as AdminTab, label: 'Escolas' }] : TABS;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Painel Administrativo
        </h1>
        <nav className="flex flex-wrap gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl" aria-label="Seções administrativas">
          {abas.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-8 shadow-sm">
        {tab === 'escolas' && gerenciaEscolas ? (
          <EscolasAdmin onToast={onToast} />
        ) : tab === 'alunos' ? (
          <AlunosAdmin onToast={onToast} />
        ) : tab === 'equipe' ? (
          <EquipeAdmin onToast={onToast} />
        ) : tab === 'sistema' ? (
          <SistemaAdmin onToast={onToast} />
        ) : tab === 'trimestres' ? (
          <TrimestresAdmin onToast={onToast} />
        ) : tab === 'categorias' ? (
          <CategoriasAdmin onToast={onToast} />
        ) : tab === 'materias' ? (
          <MateriasAdmin onToast={onToast} />
        ) : tab === 'turmas' ? (
          <TurmasAdmin onToast={onToast} />
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-16 gap-3 text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-10 h-10 text-indigo-400" />
            <p className="font-semibold text-slate-700 dark:text-slate-200">Usuários, professores e perfis de acesso</p>
            <p className="text-sm max-w-md">
              Professores e equipe são usuários do órgão. Cadastre-os e atribua os perfis (Professor, Coordenação…) em
              Usuários &amp; Acessos; depois vincule-os às matérias na aba Turmas.
            </p>
            <Link to="/usuarios" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500">
              Abrir Usuários &amp; Acessos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPainel;
