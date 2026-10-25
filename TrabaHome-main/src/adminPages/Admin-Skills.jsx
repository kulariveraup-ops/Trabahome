import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Home,
  ClipboardList,
  Mail,
  FileText,
  User,
  Wrench,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  Tag,
  Loader2,
  X,
  Filter,
} from 'lucide-react';
import AdminNotificationBell from '../components/adminNotifications/AdminNotificationBell.tsx';
import { adminAPI } from '../services/AdminApi.ts';
import { clearAdminSession } from '../utils/adminAuth.ts';

const CATEGORIES = [
  'All Categories',
  'Home Repairs',
  'Cleaning & Yard',
  'Personal & Wellness',
  'Events & Food',
  'General Handyman',
];

function SidebarItem({ label, active, icon, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
        active
          ? 'bg-[#0B3B68] text-white shadow-md shadow-[#0B3B68]/15'
          : disabled
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
      }`}
    >
      <span className={active ? 'text-white' : 'text-gray-400'}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function AdminSkills() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All');
  const [feedback, setFeedback] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmSkill, setDeleteConfirmSkill] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Home Repairs',
    startingPrice: 500,
    description: '',
    isActive: true,
  });

  const sidebarSections = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, route: '/admin-dashboard' },
        { label: 'Workers', icon: Users, route: '/admin-workers' },
        { label: 'Homeowners', icon: Home, route: '/admin-homeowners' },
        { label: 'Request', icon: ClipboardList, route: '/admin-requests' },
        { label: 'Support Request', icon: Mail, route: '/admin-help-requests' },
        { label: 'Skill Manager', icon: Wrench, route: '/admin-skills' },
        { label: 'Email Logs', icon: FileText, route: '/admin-emaillogs' },
      ],
    },
  ];

  const fetchSkills = async () => {
    setIsLoading(true);
    try {
      const response = await adminAPI.getSkillsAdmin();
      if (response && response.skills) {
        setSkills(response.skills);
      }
    } catch (err) {
      console.error('Failed to fetch skills:', err);
      showFeedback('Failed to load skills.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleOpenAddModal = () => {
    setEditingSkill(null);
    setFormData({
      name: '',
      category: 'Home Repairs',
      startingPrice: 500,
      description: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (skill) => {
    setEditingSkill(skill);
    setFormData({
      name: skill.name || '',
      category: skill.category || 'Home Repairs',
      startingPrice: skill.startingPrice ?? 500,
      description: skill.description || '',
      isActive: skill.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSaveSkill = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showFeedback('Skill name is required.', 'error');
      return;
    }
    const price = Number(formData.startingPrice);
    if (!Number.isFinite(price) || price < 0) {
      showFeedback('Please enter a valid starting price.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSkill) {
        await adminAPI.updateSkill(editingSkill._id, formData);
        showFeedback(`Skill "${formData.name}" updated successfully!`);
      } else {
        await adminAPI.createSkill(formData);
        showFeedback(`Skill "${formData.name}" created successfully!`);
      }
      setIsModalOpen(false);
      fetchSkills();
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to save skill.';
      showFeedback(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (skill) => {
    try {
      await adminAPI.updateSkill(skill._id, { isActive: !skill.isActive });
      showFeedback(`Skill "${skill.name}" is now ${!skill.isActive ? 'Active' : 'Inactive'}.`);
      setSkills((prev) =>
        prev.map((s) => (s._id === skill._id ? { ...s, isActive: !skill.isActive } : s))
      );
    } catch (err) {
      showFeedback('Failed to update skill status.', 'error');
    }
  };

  const handleDeleteSkill = async () => {
    if (!deleteConfirmSkill) return;
    try {
      await adminAPI.deleteSkill(deleteConfirmSkill._id);
      showFeedback(`Skill "${deleteConfirmSkill.name}" has been deleted.`);
      setDeleteConfirmSkill(null);
      fetchSkills();
    } catch (err) {
      showFeedback('Failed to delete skill.', 'error');
    }
  };

  // Filtered skills
  const filteredSkills = useMemo(() => {
    return skills.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat =
        selectedCategory === 'All Categories' || item.category === selectedCategory;
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && item.isActive) ||
        (statusFilter === 'Inactive' && !item.isActive);
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [skills, searchQuery, selectedCategory, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = skills.length;
    const active = skills.filter((s) => s.isActive).length;
    const avgPrice = total
      ? Math.round(skills.reduce((acc, s) => acc + (s.startingPrice || 0), 0) / total)
      : 0;
    const categoriesCount = new Set(skills.map((s) => s.category)).size;
    return { total, active, avgPrice, categoriesCount };
  }, [skills]);

  return (
    <div className="flex flex-col h-screen bg-[#F8F5F2] overflow-hidden font-sans relative">
      {/* Top Header */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sm:px-12 z-20 shadow-xs shrink-0">
        <div className="flex items-center gap-4">
          <img src="/assets/Logo.png" alt="TrabaHome" className="h-10 w-auto" />
          <span className="hidden sm:inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#EAF2FF] text-[#0B3B68]">
            Platform Administrator
          </span>
        </div>
        <AdminNotificationBell />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="p-6 pr-2 h-full hidden md:block">
          <aside className="w-64 h-full bg-white border border-gray-100 rounded-3xl shadow-xs flex flex-col p-6">
            <div className="flex-1 overflow-y-auto pr-1">
              <nav className="space-y-3">
                {sidebarSections.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      {section.title}
                    </p>
                    {section.items.map((item) => (
                      <SidebarItem
                        key={item.label}
                        label={item.label}
                        active={item.label === 'Skill Manager'}
                        icon={<item.icon size={17} />}
                        onClick={() => navigate(item.route)}
                      />
                    ))}
                  </div>
                ))}
              </nav>
            </div>
            <div className="pt-4 border-t border-gray-100 text-center space-y-2">
              <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-xs">
                  <User className="text-gray-400" size={18} />
                </div>
                <span className="font-bold text-gray-800 text-xs">Admin</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearAdminSession();
                  navigate('/admin-login', { replace: true });
                }}
                className="w-full py-2 border border-gray-200 rounded-full text-gray-600 text-xs font-semibold hover:bg-gray-50 hover:text-red-500 transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          </aside>
        </motion.div>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Title & Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                  <Wrench className="text-[#0B3B68]" size={28} />
                  <span>Website Offered Skills Manager</span>
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Manage the official list of skills/trades available across TrabaHome and define starting rates in Philippine Peso (PHP).
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#0B3B68] text-white text-xs font-bold hover:bg-[#082a4d] transition-all shadow-md shadow-[#0B3B68]/20 cursor-pointer self-start sm:self-auto"
              >
                <Plus size={16} />
                <span>Add New Skill</span>
              </button>
            </div>

            {/* Notification Feedback Toast */}
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 ${
                  feedback.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                <span>{feedback.message}</span>
              </motion.div>
            )}

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Skills</span>
                <p className="text-2xl font-black text-[#0B3B68] mt-1">{stats.total}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-gray-400">Active On Site</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-gray-400">Avg Starting Cost</span>
                <p className="text-2xl font-black text-amber-600 mt-1">₱{stats.avgPrice.toLocaleString('en-PH')}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-gray-400">Trade Categories</span>
                <p className="text-2xl font-black text-purple-600 mt-1">{stats.categoriesCount}</p>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search skills by name, description, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#0B3B68] bg-gray-50/50"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs">
                  <Tag size={13} className="text-gray-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-transparent font-semibold text-gray-700 outline-none text-xs cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs">
                  <Filter size={13} className="text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent font-semibold text-gray-700 outline-none text-xs cursor-pointer"
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active Only</option>
                    <option value="Inactive">Inactive Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Skills Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-black uppercase text-gray-400 tracking-wider">
                      <th className="py-4 px-6 text-center">Skill / Trade</th>
                      <th className="py-4 px-6 text-center">Category</th>
                      <th className="py-4 px-6 text-center">Starting Cost (PHP)</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-gray-400">
                          <Loader2 className="animate-spin inline-block mr-2" size={20} />
                          <span>Loading platform skills...</span>
                        </td>
                      </tr>
                    ) : filteredSkills.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-gray-400">
                          No skills found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredSkills.map((skill) => (
                        <tr key={skill._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{skill.name}</p>
                              {skill.description ? (
                                <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{skill.description}</p>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#0B3B68]">
                              {skill.category || 'General'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="font-bold text-emerald-700 text-sm">
                              ₱{Number(skill.startingPrice || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(skill)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                                skill.isActive
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${skill.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                              <span>{skill.isActive ? 'Active' : 'Inactive'}</span>
                            </button>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(skill)}
                                className="p-2 rounded-xl text-gray-400 hover:text-[#0B3B68] hover:bg-gray-100 transition-colors cursor-pointer"
                                title="Edit Skill"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmSkill(skill)}
                                className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete Skill"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add / Edit Skill Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 text-left relative"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {editingSkill ? 'Edit Skill Details' : 'Add New Website Skill'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Configure trade title, estimated starting price in PHP, and categorization.
              </p>

              <form onSubmit={handleSaveSkill} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Skill / Trade Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Roof Plastering, Solar Installation"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-[#0B3B68]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-[#0B3B68] bg-white cursor-pointer"
                  >
                    {CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Estimated Starting Price (₱ PHP) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₱</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={50}
                      value={formData.startingPrice}
                      onChange={(e) => setFormData({ ...formData, startingPrice: Number(e.target.value) })}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-emerald-700 focus:outline-none focus:border-[#0B3B68]"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    This starting rate is shown to homeowners as a baseline estimation before on-site assessment.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the work covered under this skill..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-normal focus:outline-none focus:border-[#0B3B68] resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-[#0B3B68] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="isActiveToggle" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                    Active (Viewable on website and selectable by workers & homeowners)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0B3B68] text-white hover:bg-[#082a4d] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="animate-spin" size={14} />}
                    <span>{editingSkill ? 'Save Changes' : 'Create Skill'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmSkill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} />
              </div>
              <h3 className="text-base font-black text-gray-900">Delete Skill?</h3>
              <p className="text-xs text-gray-500 mt-2">
                Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteConfirmSkill.name}"</span>? Existing workers with this profession will retain it, but it will be removed from future selection.
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmSkill(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSkill}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
