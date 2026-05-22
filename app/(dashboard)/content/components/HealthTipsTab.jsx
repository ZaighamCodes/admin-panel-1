'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchHealthTips,
  createHealthTip,
  updateHealthTip,
  deleteHealthTip,
  setTipAudience,
} from '@/store/slices/contentSlice';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import ContentAudienceToggle from './ContentAudienceToggle';
import StatusFilterPills from './StatusFilterPills';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Lightbulb,
  Search,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  audience: 'PATIENT',
  description: '',
  sortOrder: 0,
  active: true,
};

const formatCreatedAt = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export default function HealthTipsTab() {
  const dispatch = useAppDispatch();
  const { audience, patient, doctor, saving } = useAppSelector(
    (state) => state.content?.healthTips || {}
  );

  const bucket = audience === 'DOCTOR' ? doctor : patient;
  const allItems = bucket?.items || [];
  const loading = bucket?.loading;
  const error = bucket?.error;

  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const lastErrorRef = useRef(null);

  useEffect(() => {
    dispatch(fetchHealthTips({ audience }));
  }, [audience, dispatch]);

  useEffect(() => {
    if (error && lastErrorRef.current !== error) {
      lastErrorRef.current = error;
      toast.error(error);
    }
  }, [error]);

  const counts = useMemo(() => {
    const active = allItems.filter((t) => t.active).length;
    return { all: allItems.length, active, inactive: allItems.length - active };
  }, [allItems]);

  const filteredItems = useMemo(() => {
    let list = allItems;
    if (statusFilter === 'active') list = list.filter((t) => t.active);
    if (statusFilter === 'inactive') list = list.filter((t) => !t.active);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.description?.toLowerCase().includes(q));
    }
    return list;
  }, [allItems, statusFilter, search]);

  const tipLabel = audience === 'DOCTOR' ? 'Doctor tips' : 'Patient health tips';

  const handleAudienceChange = (newAudience) => {
    dispatch(setTipAudience(newAudience));
    setStatusFilter('all');
    setSearch('');
  };

  const handleRefresh = () => {
    dispatch(fetchHealthTips({ audience, force: true }));
    toast.success('Tips refreshed');
  };

  const handleOpenModal = (tip = null) => {
    if (tip) {
      setSelected(tip);
      setFormData({
        audience,
        description: tip.description || '',
        sortOrder: tip.sortOrder ?? 0,
        active: tip.active ?? true,
      });
    } else {
      setSelected(null);
      setFormData({ ...EMPTY_FORM, audience });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelected(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }

    const payload = {
      audience: formData.audience,
      description: formData.description.trim(),
      sortOrder: Number(formData.sortOrder) || 0,
      active: formData.active,
    };

    try {
      if (selected) {
        await dispatch(updateHealthTip({ tipId: selected.tipId, data: payload })).unwrap();
        toast.success('Tip updated');
      } else {
        await dispatch(createHealthTip({ data: payload })).unwrap();
        toast.success('Tip created');
      }
      handleCloseModal();
      dispatch(fetchHealthTips({ audience: formData.audience, force: true }));
      if (formData.audience !== audience) {
        dispatch(setTipAudience(formData.audience));
      }
    } catch (err) {
      toast.error(err || 'Failed to save tip');
    }
  };

  const handleDelete = async () => {
    try {
      await dispatch(deleteHealthTip(selected.tipId)).unwrap();
      toast.success('Tip deleted');
      setIsDeleteOpen(false);
      setSelected(null);
      dispatch(fetchHealthTips({ audience, force: true }));
    } catch (err) {
      toast.error(err || 'Failed to delete tip');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border border-amber-100/80 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-400/20 text-amber-700">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{tipLabel}</h2>
            <p className="text-sm text-gray-600 mt-0.5 max-w-md">
              Text-only tips for the app. Created date is set automatically by the server.
            </p>
          </div>
        </div>
        <ContentAudienceToggle value={audience} onChange={handleAudienceChange} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <StatusFilterPills value={statusFilter} onChange={setStatusFilter} counts={counts} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 text-gray-600 hover:bg-white hover:shadow-sm rounded-xl border border-transparent hover:border-gray-200 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-amber-200/50 transition-all font-semibold text-sm"
          >
            <Plus className="w-5 h-5" />
            New tip
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search tips by description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400/50 focus:border-amber-300 shadow-sm"
        />
      </div>

      {loading && allItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading tips...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-amber-100 p-16 text-center">
          <Lightbulb className="w-14 h-14 text-amber-300 mx-auto mb-4" />
          <p className="text-gray-800 font-semibold text-lg">No tips found</p>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
            {allItems.length === 0
              ? `Create the first tip for the ${audience === 'DOCTOR' ? 'doctor' : 'patient'} app.`
              : 'Try a different filter or search term.'}
          </p>
          {allItems.length === 0 && (
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600"
            >
              <Plus className="w-4 h-4" />
              Add tip
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredItems.map((tip) => (
            <article
              key={tip.tipId}
              className={`group relative bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                tip.active
                  ? 'border-amber-100 hover:border-amber-200'
                  : 'border-gray-200 opacity-75 hover:opacity-100'
              }`}
            >
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  tip.active ? 'bg-gradient-to-b from-amber-400 to-orange-400' : 'bg-gray-300'
                }`}
              />
              <div className="p-5 pl-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <Lightbulb className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-mono text-gray-400">#{tip.tipId}</span>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      tip.active
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                        : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'
                    }`}
                  >
                    {tip.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-gray-800 leading-relaxed text-[15px]">{tip.description}</p>
                {formatCreatedAt(tip.createdAt) && (
                  <p className="text-xs text-gray-400 mt-2">Created {formatCreatedAt(tip.createdAt)}</p>
                )}
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(tip)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(tip);
                      setIsDeleteOpen(true);
                    }}
                    className="px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selected ? 'Edit tip' : 'New tip'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Audience</label>
            <select
              value={formData.audience}
              onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
              disabled={!!selected}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400/40 focus:border-amber-300 disabled:bg-gray-50"
            >
              <option value="PATIENT">Patient — daily health tip</option>
              <option value="DOCTOR">Doctor — dashboard tip</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              maxLength={500}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Drink 8 glasses of water today"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400/40 focus:border-amber-300 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {formData.description.length}/500
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sort order</label>
            <input
              type="number"
              min={0}
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400/40"
            />
          </div>

          {selected?.createdAt && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              Created: {formatCreatedAt(selected.createdAt)}
            </p>
          )}

          <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-amber-600 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              <span className="font-medium">Active</span> — visible in the app
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:shadow-lg disabled:opacity-60"
            >
              {saving ? 'Saving...' : selected ? 'Update tip' : 'Create tip'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelected(null);
        }}
        onConfirm={handleDelete}
        title="Delete tip"
        message={`Delete this tip? "${selected?.description?.slice(0, 80)}${(selected?.description?.length || 0) > 80 ? '…' : ''}"`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
