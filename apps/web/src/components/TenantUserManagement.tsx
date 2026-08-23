import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Lock,
  Mail,
  Building2,
  DollarSign,
  AlertTriangle,
  Info,
  Key,
} from 'lucide-react';
import { SaaSUser, UserRole } from '../types/saas';
import {
  getTenantUsers,
  createTenantUser,
  updateTenantUser,
  deleteTenantUser,
} from '../services/api';

interface TenantUserManagementProps {
  tenantId?: string;
  tenantName?: string;
  authRole?: 'EMPRESA_MASTER' | 'PREFEITURA_CLIENTE';
}

export const TenantUserManagement: React.FC<TenantUserManagementProps> = ({
  tenantId = 'tenant-araucaria',
  tenantName = 'Prefeitura Municipal de Araucária',
  authRole = 'EMPRESA_MASTER',
}) => {
  const [users, setUsers] = useState<SaaSUser[]>([]);
  const [quota, setQuota] = useState<{
    userLimit: number;
    totalAtivos: number;
    usuariosInclusos: number;
    usuariosExcedentes: number;
    valorUsuarioExtra: number;
    cobrancaExtraTotal: number;
    valorMensalBase: number;
    valorTotalMensalidade: number;
  }>({
    userLimit: 2,
    totalAtivos: 2,
    usuariosInclusos: 2,
    usuariosExcedentes: 0,
    valorUsuarioExtra: 150,
    cobrancaExtraTotal: 0,
    valorMensalBase: 1890,
    valorTotalMensalidade: 1890,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    cargo: '',
    role: 'SECRETARIA_SETORIAL' as UserRole,
    secretariaRestrita: 'SMOP',
  });

  useEffect(() => {
    loadUsers();
  }, [tenantId]);

  const showToast = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await getTenantUsers(tenantId);
      setUsers(res.users);
      setQuota(res.quota);
    } catch (err: any) {
      showToast('Erro ao carregar usuários: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isExtra = quota.totalAtivos >= quota.userLimit;
      const res = await createTenantUser(tenantId, formData);
      showToast(res.message, isExtra ? 'warning' : 'success');
      setShowAddModal(false);
      loadUsers();
      setFormData({
        nome: '',
        email: '',
        cpf: '',
        cargo: '',
        role: 'SECRETARIA_SETORIAL',
        secretariaRestrita: 'SMOP',
      });
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleUser = async (user: SaaSUser) => {
    try {
      await updateTenantUser(tenantId, user.id, { ativo: !user.ativo });
      showToast(`Usuário ${user.nome} ${!user.ativo ? 'ativado' : 'desativado'}.`, 'success');
      loadUsers();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteUser = async (user: SaaSUser) => {
    if (user.role === 'PREFEITO') {
      showToast('O usuário Prefeito é o administrador titular e não pode ser excluído.', 'error');
      return;
    }
    if (!confirm(`Deseja revogar o acesso do usuário ${user.nome}?`)) return;

    try {
      await deleteTenantUser(tenantId, user.id);
      showToast('Usuário removido com sucesso.', 'success');
      loadUsers();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const isNextUserExtra = quota.totalAtivos >= quota.userLimit;

  return (
    <div className="space-y-6" id="tenant-user-management">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-semibold flex items-center gap-3 transition-all ${
            toastMessage.type === 'success'
              ? 'bg-[#168821] text-white border border-green-600'
              : toastMessage.type === 'warning'
              ? 'bg-amber-600 text-white border border-amber-700'
              : 'bg-[#e52207] text-white border border-red-600'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Plan Quota Banner */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-50 text-[#0c326f] text-xs font-bold px-2.5 py-0.5 rounded border border-blue-100 uppercase">
                {tenantName}
              </span>
              <span className="text-xs text-gray-500 font-medium">Controle de Licenciamento</span>
              {authRole === 'PREFEITURA_CLIENTE' && (
                <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Visualização Municipal (Leitura)
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              Gestão de Usuários & Perfis Municipais
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {authRole === 'PREFEITURA_CLIENTE'
                ? 'Acompanhe os usuários ativos e a cota do plano. Novos cadastros ou alterações são homologados pela Empresa SaaS.'
                : 'Gerencie os acessos de secretários e auditores conforme a cota de usuários do plano municipal.'}
            </p>
          </div>

          {authRole === 'EMPRESA_MASTER' ? (
            <button
              onClick={() => setShowAddModal(true)}
              id="btn-adicionar-usuario-municipal"
              className="bg-[#1351b4] hover:bg-[#0c326f] text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              + Novo Usuário Municipal (Empresa Master)
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg text-xs text-slate-600">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Inclusão e acréscimo de usuários restritos à <strong>Empresa SaaS</strong></span>
            </div>
          )}
        </div>

        {/* Quota & Billing Information Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-bold text-[#0c326f] uppercase">
              <span>Cota de Usuários do Plano</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{quota.totalAtivos}</span>
              <span className="text-xs text-gray-600 font-semibold">
                de <strong>{quota.userLimit} inclusos</strong> no plano básico
              </span>
            </div>
            <div className="w-full bg-blue-200/80 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  quota.usuariosExcedentes > 0 ? 'bg-amber-500' : 'bg-[#1351b4]'
                }`}
                style={{
                  width: `${Math.min(100, (quota.totalAtivos / quota.userLimit) * 100)}%`,
                }}
              ></div>
            </div>
            <div className="mt-2 text-[11px] text-gray-600">
              {quota.usuariosInclusos} de {quota.userLimit} licenças base utilizadas
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900 uppercase">
              <span>Usuários Excedentes (Extras)</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-900">
                {quota.usuariosExcedentes}
              </span>
              <span className="text-xs text-amber-800 font-medium">
                {quota.usuariosExcedentes === 0
                  ? 'Nenhum usuário excedente'
                  : `+R$ ${quota.cobrancaExtraTotal.toFixed(2)}/mês`}
              </span>
            </div>
            <div className="mt-3 text-[11px] text-amber-800 font-medium">
              Taxa de R$ {quota.valorUsuarioExtra.toFixed(2)}/mês por usuário extra além de {quota.userLimit}
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900 uppercase">
              <span>Valor Total da Mensalidade</span>
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#168821]">
                R$ {(quota?.valorTotalMensalidade ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-gray-500">/mês</span>
            </div>
            <div className="mt-3 text-[11px] text-emerald-800 font-medium">
              Base: R$ {(quota?.valorMensalBase ?? 1890).toFixed(2)} + Extras: R$ {(quota?.cobrancaExtraTotal ?? 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Notice of Rules */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 flex items-start gap-3 text-xs text-gray-700">
          <Info className="w-4 h-4 text-[#1351b4] flex-shrink-0 mt-0.5" />
          <div>
            <strong>Regra de Negócio de Usuários:</strong> O plano municipal básico dá direito a <strong>2 (dois) usuários com acesso pleno inclusos</strong> (Prefeito e Secretário de Finanças). Cada usuário adicional cadastrado (Controladoria, Secretários Setoriais de Saúde, Educação, Obras ou Técnicos) é cobrado automaticamente na fatura mensal do município com acréscimo de <strong>R$ 150,00/mês</strong>.
          </div>
        </div>
      </div>

      {/* Users List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">
            Usuários Cadastrados ({users.length})
          </h3>
          <span className="text-xs text-gray-500">
            Status e permissões de acesso ao sistema fiscal
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">Nome / Cargo</th>
                <th className="py-3 px-4">E-mail & CPF</th>
                <th className="py-3 px-4">Perfil de Acesso (RBAC)</th>
                <th className="py-3 px-4">Escopo Setorial</th>
                <th className="py-3 px-4 text-center">Tipo de Licença</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u, idx) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-gray-900">{u.nome}</div>
                    <div className="text-xs text-gray-500">{u.cargo}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-xs font-medium text-gray-800 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-gray-400" /> {u.email}
                    </div>
                    <div className="text-xs font-mono text-gray-500 mt-0.5">CPF: {u.cpf}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold ${
                        u.role === 'PREFEITO'
                          ? 'bg-blue-100 text-[#0c326f]'
                          : u.role === 'SECRETARIO_FINANCAS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : u.role === 'CONTROLADORIA'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      {u.role === 'PREFEITO'
                        ? 'Prefeito (Admin Geral)'
                        : u.role === 'SECRETARIO_FINANCAS'
                        ? 'Secretário de Finanças'
                        : u.role === 'CONTROLADORIA'
                        ? 'Controladoria / Auditoria'
                        : u.role === 'SECRETARIA_SETORIAL'
                        ? 'Secretaria Setorial'
                        : 'Visualizador'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    {u.secretariaRestrita ? (
                      <span className="text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        Restrito a: {u.secretariaRestrita}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Acesso Completo
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {u.isExtra ? (
                      <span className="inline-flex items-center text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                        + R$ 150/mês (Extra)
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[11px] font-bold bg-blue-100 text-[#0c326f] px-2 py-0.5 rounded-full">
                        Incluso no Plano Base
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {authRole === 'EMPRESA_MASTER' ? (
                      <button
                        onClick={() => handleToggleUser(u)}
                        title="Clique para alterar status (Empresa SaaS)"
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                          u.ativo
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {u.ativo ? '● Ativo' : '○ Inativo'}
                      </button>
                    ) : (
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                          u.ativo
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {u.ativo ? '● Ativo' : '○ Inativo'}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {authRole === 'EMPRESA_MASTER' ? (
                      u.role !== 'PREFEITO' && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          title="Remover Usuário (Empresa SaaS)"
                          className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    ) : (
                      <span className="text-[11px] text-gray-400 font-medium">Auditoria</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RBAC Roles Documentation Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#0c326f]" />
          Matriz de Permissões e Perfis de Acesso (RBAC)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="border border-blue-100 bg-blue-50/40 p-3.5 rounded-lg space-y-1.5">
            <div className="font-bold text-[#0c326f] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#1351b4]" /> Prefeito (Admin)
            </div>
            <p className="text-gray-600">
              Acesso total de consulta a todos os módulos, emissão de relatórios oficiais e gerenciamento de usuários e licenças do município.
            </p>
          </div>

          <div className="border border-emerald-100 bg-emerald-50/40 p-3.5 rounded-lg space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Secretário de Finanças
            </div>
            <p className="text-gray-600">
              Acesso irrestrito a receitas, despesas, limites da LRF, FUNDEB, SIOPE e captações externas (sem exclusão da entidade).
            </p>
          </div>

          <div className="border border-purple-100 bg-purple-50/40 p-3.5 rounded-lg space-y-1.5">
            <div className="font-bold text-purple-900 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-700" /> Controladoria Geral
            </div>
            <p className="text-gray-600">
              Auditoria de alertas fiscais, acompanhamento dos limites do TCE e Siconfi em modo analítico somente leitura.
            </p>
          </div>

          <div className="border border-gray-200 bg-gray-50 p-3.5 rounded-lg space-y-1.5">
            <div className="font-bold text-gray-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-600" /> Secretarias Setoriais
            </div>
            <p className="text-gray-600">
              Acesso filtrado apenas às dotações e obras da respectiva pasta (SMOP: Obras, SMSA: Saúde, SMED: Educação).
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: NOVO USUÁRIO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#0c326f]">
                  Cadastrar Usuário Municipal
                </h3>
                <p className="text-xs text-gray-500">
                  {tenantName}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Warning if Extra User */}
            {isNextUserExtra ? (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 mb-4 text-xs space-y-1 text-amber-900">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  Aviso de Usuário Excedente (+R$ {quota.valorUsuarioExtra.toFixed(2)}/mês)
                </div>
                <p>
                  O plano básico inclui até <strong>{quota.userLimit} usuários</strong>. Como o município já possui {quota.totalAtivos} usuários ativos, a inclusão deste usuário acarretará um acréscimo de <strong>R$ {quota.valorUsuarioExtra.toFixed(2)}</strong> na fatura mensal subsequente.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-4 text-xs text-blue-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1351b4] flex-shrink-0" />
                <span>
                  Este usuário será incluído <strong>dentro da cota gratuita</strong> do plano básico ({quota.totalAtivos + 1}/{quota.userLimit} inclusos).
                </span>
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nome Completo do Servidor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dra. Ana Paula Silveira"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 placeholder-slate-400 font-medium border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1351b4] focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    E-mail Institucional *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="servidor@prefeitura.gov.br"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 placeholder-slate-400 font-medium border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#1351b4] focus:outline-none transition shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    CPF (Apenas números) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 placeholder-slate-400 font-mono font-medium border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#1351b4] focus:outline-none transition shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Cargo / Função Oficial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Secretária Municipal de Saúde"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 placeholder-slate-400 font-medium border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1351b4] focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Perfil de Acesso (Role) *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as UserRole,
                        secretariaRestrita: e.target.value === 'SECRETARIA_SETORIAL' ? 'SMOP' : null,
                      })
                    }
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-semibold border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#1351b4] focus:outline-none transition shadow-xs"
                  >
                    <option value="SECRETARIO_FINANCAS" className="text-slate-900 bg-white">Secretário de Finanças</option>
                    <option value="CONTROLADORIA" className="text-slate-900 bg-white">Controladoria / Auditoria</option>
                    <option value="SECRETARIA_SETORIAL" className="text-slate-900 bg-white">Secretaria Setorial</option>
                    <option value="VISUALIZADOR_GERAL" className="text-slate-900 bg-white">Visualizador Geral</option>
                  </select>
                </div>

                {formData.role === 'SECRETARIA_SETORIAL' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Secretaria Vinculada *
                    </label>
                    <select
                      value={formData.secretariaRestrita || 'SMOP'}
                      onChange={(e) =>
                        setFormData({ ...formData, secretariaRestrita: e.target.value })
                      }
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-semibold border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#1351b4] focus:outline-none transition shadow-xs"
                    >
                      <option value="SMOP" className="text-slate-900 bg-white">SMOP (Obras Públicas)</option>
                      <option value="SMSA" className="text-slate-900 bg-white">SMSA (Saúde)</option>
                      <option value="SMED" className="text-slate-900 bg-white">SMED (Educação)</option>
                      <option value="SMMA" className="text-slate-900 bg-white">SMMA (Meio Ambiente)</option>
                      <option value="SMURB" className="text-slate-900 bg-white">SMURB (Urbanismo)</option>
                      <option value="SMSP" className="text-slate-900 bg-white">SMSP (Segurança Pública)</option>
                      <option value="SMAS" className="text-slate-900 bg-white">SMAS (Assistência Social)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`font-bold text-xs px-5 py-2 rounded-lg text-white shadow transition-all cursor-pointer ${
                    isNextUserExtra
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-[#1351b4] hover:bg-[#0c326f]'
                  }`}
                >
                  {isNextUserExtra ? 'Confirmar (+ R$ 150/mês)' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
