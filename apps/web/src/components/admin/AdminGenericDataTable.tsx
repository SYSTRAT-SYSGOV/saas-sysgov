import React, { useState, useMemo } from 'react';
import {
  Table,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Trash2,
  Edit2,
  Eye,
  CheckSquare,
  Square,
  FileSpreadsheet,
  FileCode,
  X,
  Tag,
  Calendar,
  DollarSign,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
} from 'lucide-react';
import { INITIAL_GENERIC_RECORDS } from '../../services/adminMockData';
import { GenericRecord } from '../../types/admin';

interface AdminGenericDataTableProps {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

type SortField = 'code' | 'title' | 'category' | 'priority' | 'value' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

export const AdminGenericDataTable: React.FC<AdminGenericDataTableProps> = ({ onAddToast }) => {
  const [records, setRecords] = useState<GenericRecord[]>(INITIAL_GENERIC_RECORDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [previewRecord, setPreviewRecord] = useState<GenericRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    code: string;
    title: string;
    category: string;
    status: GenericRecord['status'];
    priority: GenericRecord['priority'];
    value: number;
    assignee: string;
    tags: string;
  }>({
    code: '',
    title: '',
    category: 'Tecnologia & Inovação',
    status: 'ativo',
    priority: 'media',
    value: 0,
    assignee: 'Carlos Silva',
    tags: 'Geral, Sistema',
  });

  // Unique Categories
  const categories = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.category)));
  }, [records]);

  // Filtered & Sorted Records
  const processedRecords = useMemo(() => {
    return records
      .filter((r) => {
        const matchesSearch =
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCat = categoryFilter === 'ALL' || r.category === categoryFilter;
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter;

        return matchesSearch && matchesCat && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === 'string') {
          return sortOrder === 'asc'
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        }

        if (typeof valA === 'number') {
          return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
        }

        return 0;
      });
  }, [records, searchQuery, categoryFilter, statusFilter, priorityFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === processedRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(processedRecords.map((r) => r.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleOpenCreateModal = () => {
    setEditingRecordId(null);
    setFormData({
      code: `DOC-2026-${String(records.length + 100).padStart(3, '0')}`,
      title: '',
      category: 'Tecnologia & Inovação',
      status: 'ativo',
      priority: 'media',
      value: 0,
      assignee: 'Carlos Silva',
      tags: 'Planejamento, Contrato',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rec: GenericRecord) => {
    setEditingRecordId(rec.id);
    setFormData({
      code: rec.code,
      title: rec.title,
      category: rec.category,
      status: rec.status,
      priority: rec.priority,
      value: rec.value,
      assignee: rec.assignee,
      tags: rec.tags.join(', '),
    });
    setIsModalOpen(true);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      onAddToast({
        type: 'error',
        title: 'Título Obrigatório',
        message: 'Por favor, insira o título do registro.',
      });
      return;
    }

    const tagList = formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingRecordId) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingRecordId
            ? {
                ...r,
                title: formData.title,
                category: formData.category,
                status: formData.status,
                priority: formData.priority,
                value: formData.value,
                assignee: formData.assignee,
                updatedAt: new Date().toISOString().split('T')[0],
                tags: tagList,
              }
            : r
        )
      );
      onAddToast({
        type: 'success',
        title: 'Registro Atualizado',
        message: `O registro ${formData.code} foi salvo com sucesso.`,
      });
    } else {
      const newRec: GenericRecord = {
        id: `rec-${Date.now()}`,
        code: formData.code,
        title: formData.title,
        category: formData.category,
        status: formData.status,
        priority: formData.priority,
        value: formData.value,
        assignee: formData.assignee,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        tags: tagList,
      };
      setRecords((prev) => [newRec, ...prev]);
      onAddToast({
        type: 'success',
        title: 'Registro Criado',
        message: `Novo registro ${newRec.code} adicionado com sucesso.`,
      });
    }
    setIsModalOpen(false);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setRecords((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
    onAddToast({
      type: 'info',
      title: 'Itens Excluídos',
      message: `${selectedIds.length} registro(s) foram removidos.`,
    });
    setSelectedIds([]);
  };

  const handleExportCSV = () => {
    const headers = ['ID,Código,Título,Categoria,Status,Prioridade,Valor,Responsável,Atualizado Em,Tags'];
    const rows = processedRecords.map(
      (r) =>
        `"${r.id}","${r.code}","${r.title}","${r.category}","${r.status}","${r.priority}","${r.value}","${r.assignee}","${r.updatedAt}","${r.tags.join(';')}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tabela_registros_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddToast({
      type: 'success',
      title: 'Exportação CSV Concluída',
      message: `${processedRecords.length} registros exportados.`,
    });
  };

  const getStatusBadge = (status: GenericRecord['status']) => {
    switch (status) {
      case 'ativo':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Ativo
          </span>
        );
      case 'em_revisao':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Em Revisão
          </span>
        );
      case 'rascunho':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Edit2 className="w-3 h-3" /> Rascunho
          </span>
        );
      case 'arquivado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
            <Archive className="w-3 h-3" /> Arquivado
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: GenericRecord['priority']) => {
    switch (priority) {
      case 'critica':
        return 'text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 border-rose-500/20';
      case 'alta':
        return 'text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 border-amber-500/20';
      case 'media':
        return 'text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-500/10 border-indigo-500/20';
      case 'baixa':
        return 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Table className="w-5 h-5 text-indigo-500" />
            Tabela de Dados Universal & Gerenciador CRUD
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Componente reutilizável de dados com ordenação multi-coluna, busca instantânea, filtros por tag e exportação.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md hover:shadow-indigo-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Registro</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, título, responsável ou tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ativo">Ativo</option>
            <option value="em_revisao">Em Revisão</option>
            <option value="rascunho">Rascunho</option>
            <option value="arquivado">Arquivado</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Prioridades</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>
      </div>

      {/* Batch Actions Bar (when selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 p-3 rounded-xl flex items-center justify-between animate-fade-in text-xs">
          <span className="text-indigo-900 dark:text-indigo-200 font-semibold">
            {selectedIds.length} item(ns) selecionado(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-sm transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Selecionados</span>
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
                <th className="py-3.5 px-4 w-10">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                    {selectedIds.length === processedRecords.length && processedRecords.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSort('code')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Código</span>
                    {sortField === 'code' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('title')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Título & Tags</span>
                    {sortField === 'title' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Categoria</span>
                    {sortField === 'category' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4">Status</th>
                <th
                  onClick={() => handleSort('priority')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Prioridade</span>
                    {sortField === 'priority' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('value')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Valor Estimado</span>
                    {sortField === 'value' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {processedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhum registro localizado para os filtros informados.
                  </td>
                </tr>
              ) : (
                processedRecords.map((r) => {
                  const isSelected = selectedIds.includes(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleSelect(r.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs whitespace-nowrap">
                        {r.code}
                      </td>

                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {r.title}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {r.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {r.category}
                      </td>

                      <td className="py-3.5 px-4">{getStatusBadge(r.status)}</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] border uppercase ${getPriorityBadge(
                            r.priority
                          )}`}
                        >
                          {r.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        R$ {r.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewRecord(r)}
                            title="Visualizar Detalhes"
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(r)}
                            title="Editar Registro"
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Exibindo <strong className="text-slate-900 dark:text-white font-mono">{processedRecords.length}</strong> de{' '}
            <strong className="text-slate-900 dark:text-white font-mono">{records.length}</strong> registros
          </span>
          <span className="text-[11px] font-mono">datatable-universal-v2</span>
        </div>
      </div>

      {/* Add / Edit Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Table className="w-4 h-4 text-indigo-500" />
                {editingRecordId ? 'Editar Registro' : 'Novo Registro de Dados'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Código Identificador
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título do Registro / Documento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Contrato de Manutenção de Servidores"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="em_revisao">Em Revisão</option>
                    <option value="rascunho">Rascunho</option>
                    <option value="arquivado">Arquivado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Responsável
                  </label>
                  <input
                    type="text"
                    value={formData.assignee}
                    onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="SaaS, Contrato, 2026"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-md"
                >
                  {editingRecordId ? 'Salvar Registro' : 'Criar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Preview Drawer / Modal */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {previewRecord.code}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {previewRecord.title}
                </h2>
              </div>
              <button
                onClick={() => setPreviewRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Categoria:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {previewRecord.category}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Responsável:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {previewRecord.assignee}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Status:</span>
                  <div className="mt-0.5">{getStatusBadge(previewRecord.status)}</div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Valor:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    R$ {previewRecord.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Tags do Registro:</span>
                <div className="flex flex-wrap gap-1.5">
                  {previewRecord.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between text-slate-400 font-mono text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800">
                <span>Criado em: {previewRecord.createdAt}</span>
                <span>Atualizado em: {previewRecord.updatedAt}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setPreviewRecord(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
