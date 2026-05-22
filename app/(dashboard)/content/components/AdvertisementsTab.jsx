'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  setAdAudience,
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
  ExternalLink,
  ImageIcon,
  Megaphone,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compressImage, formatBytes, IMAGE_UPLOAD_LIMIT_LABEL } from '@/utils/compressImage';

const ACTION_TYPES = ['NONE', 'EXTERNAL_URL', 'DEEP_LINK', 'ARTICLE', 'TIP'];

const EMPTY_FORM = {
  audience: 'PATIENT',
  title: '',
  description: '',
  actionType: 'NONE',
  actionUrl: '',
  sortOrder: 1,
  active: true,
};

const formatCreatedAt = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export default function AdvertisementsTab() {
  const dispatch = useAppDispatch();
  const { audience, patient, doctor, saving } = useAppSelector(
    (state) => state.content?.advertisements || {}
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
  const [formData, setFormData] = useState({ ...EMPTY_FORM, audience });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageCompressing, setImageCompressing] = useState(false);
  const [imageSizeHint, setImageSizeHint] = useState(null);

  const previewUrlRef = useRef(null);
  const lastErrorRef = useRef(null);

  const revokePreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  useEffect(() => {
    dispatch(fetchAdvertisements({ audience }));
  }, [audience, dispatch]);

  useEffect(() => () => revokePreviewUrl(), []);

  useEffect(() => {
    if (error && lastErrorRef.current !== error) {
      lastErrorRef.current = error;
      toast.error(error);
    }
  }, [error]);

  const counts = useMemo(() => {
    const active = allItems.filter((a) => a.active).length;
    return { all: allItems.length, active, inactive: allItems.length - active };
  }, [allItems]);

  const filteredItems = useMemo(() => {
    let list = allItems;
    if (statusFilter === 'active') list = list.filter((a) => a.active);
    if (statusFilter === 'inactive') list = list.filter((a) => !a.active);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allItems, statusFilter, search]);

  const handleAudienceChange = (newAudience) => {
    dispatch(setAdAudience(newAudience));
    setFormData((prev) => ({ ...prev, audience: newAudience }));
    setStatusFilter('all');
    setSearch('');
  };

  const handleRefresh = () => {
    dispatch(fetchAdvertisements({ audience, force: true }));
    toast.success('Advertisements refreshed');
  };

  const resetImageState = () => {
    revokePreviewUrl();
    setImageFile(null);
    setImagePreview(null);
    setImageSizeHint(null);
    setImageCompressing(false);
  };

  const handleOpenModal = (ad = null) => {
    resetImageState();
    if (ad) {
      setSelected(ad);
      setFormData({
        audience: ad.audience || audience,
        title: ad.title || '',
        description: ad.description || '',
        actionType: ad.actionType || 'NONE',
        actionUrl: ad.actionUrl || '',
        sortOrder: ad.sortOrder ?? 1,
        active: ad.active ?? true,
      });
      if (ad.imageUrl) setImagePreview(ad.imageUrl);
    } else {
      setSelected(null);
      setFormData({ ...EMPTY_FORM, audience });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    resetImageState();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageCompressing(true);
    setImageSizeHint(null);
    try {
      const result = await compressImage(file);
      revokePreviewUrl();
      previewUrlRef.current = result.previewUrl;
      setImageFile(result.file);
      setImagePreview(result.previewUrl);
      if (result.wasCompressed) {
        setImageSizeHint(
          `${formatBytes(result.originalBytes)} → ${formatBytes(result.compressedBytes)}`
        );
        toast.success('Image optimized for upload', { duration: 2500 });
      } else {
        setImageSizeHint(formatBytes(result.compressedBytes));
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to process image');
      e.target.value = '';
    } finally {
      setImageCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const needsUrl = ['EXTERNAL_URL', 'DEEP_LINK', 'ARTICLE', 'TIP'].includes(formData.actionType);
    if (needsUrl && !formData.actionUrl?.trim()) {
      toast.error('Action URL is required for this action type');
      return;
    }

    const payload = {
      audience: formData.audience,
      title: formData.title.trim(),
      description: formData.description.trim(),
      actionType: formData.actionType,
      actionUrl: formData.actionType === 'NONE' ? null : formData.actionUrl?.trim() || null,
      sortOrder: Number(formData.sortOrder) || 1,
      active: formData.active,
    };

    try {
      if (selected) {
        await dispatch(
          updateAdvertisement({
            advertisementId: selected.advertisementId,
            data: payload,
            imageFile,
          })
        ).unwrap();
        toast.success('Advertisement updated');
      } else {
        await dispatch(createAdvertisement({ data: payload, imageFile })).unwrap();
        toast.success('Advertisement created');
      }
      handleCloseModal();
      dispatch(fetchAdvertisements({ audience: formData.audience, force: true }));
      if (formData.audience !== audience) {
        dispatch(fetchAdvertisements({ audience: formData.audience, force: true }));
      }
    } catch (err) {
      toast.error(err || 'Failed to save advertisement');
    }
  };

  const handleDelete = async () => {
    try {
      await dispatch(deleteAdvertisement(selected.advertisementId)).unwrap();
      toast.success('Advertisement deleted');
      setIsDeleteOpen(false);
      setSelected(null);
      dispatch(fetchAdvertisements({ audience, force: true }));
    } catch (err) {
      toast.error(err || 'Failed to delete advertisement');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary-50 via-purple-50 to-indigo-50 border border-primary-100/80 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary-500/15 text-primary-600">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Carousel advertisements</h2>
            <p className="text-sm text-gray-600 mt-0.5 max-w-md">
              Banner ads with image upload. Manage endpoint shows all ads including inactive.
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
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl hover:shadow-lg font-semibold text-sm"
          >
            <Plus className="w-5 h-5" />
            New ad
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by title or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 shadow-sm"
        />
      </div>

      {loading && allItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading advertisements...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-primary-100 p-16 text-center">
          <ImageIcon className="w-14 h-14 text-primary-200 mx-auto mb-4" />
          <p className="text-gray-800 font-semibold text-lg">No advertisements</p>
          <p className="text-sm text-gray-500 mt-2">
            {allItems.length === 0
              ? `Create a carousel banner for the ${audience === 'DOCTOR' ? 'doctor' : 'patient'} app.`
              : 'Try a different filter or search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(280px,450px))] justify-start">
          {filteredItems.map((ad) => (
            <article
              key={ad.advertisementId}
              className={`w-full max-w-[450px] bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-all group ${
                ad.active
                  ? 'border-gray-100 hover:border-primary-200'
                  : 'border-gray-200 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="relative h-40 bg-gradient-to-br from-primary-50 to-purple-50">
                {ad.imageUrl ? (
                  <img src={ad.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                <span className="absolute top-3 left-3 px-2 py-0.5 text-xs font-bold bg-white/95 rounded-lg text-primary-700 shadow-sm">
                  #{ad.sortOrder}
                </span>
                <span
                  className={`absolute top-3 right-3 px-2.5 py-0.5 text-xs font-semibold rounded-full shadow-sm ${
                    ad.active
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-600/90 text-white'
                  }`}
                >
                  {ad.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-bold text-gray-900 line-clamp-1">{ad.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{ad.description}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-md font-medium">
                    {ad.actionType}
                  </span>
                  {ad.actionUrl && (
                    <ExternalLink className="w-3.5 h-3.5 text-primary-500" title={ad.actionUrl} />
                  )}
                  {formatCreatedAt(ad.createdAt) && (
                    <span className="text-gray-400">· {formatCreatedAt(ad.createdAt)}</span>
                  )}
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(ad)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(ad);
                      setIsDeleteOpen(true);
                    }}
                    className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
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
        title={selected ? 'Edit Advertisement' : 'New Advertisement'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target panel</label>
            <select
              value={formData.audience}
              onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
              disabled={!!selected}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
            >
              <option value="PATIENT">Patient panel</option>
              <option value="DOCTOR">Doctor panel</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action type</label>
              <select
                value={formData.actionType}
                onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort order</label>
              <input
                type="number"
                min={1}
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {formData.actionType !== 'NONE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action URL</label>
              <input
                value={formData.actionUrl}
                onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Required for non-NONE actions"
              />
            </div>
          )}

          {selected?.createdAt && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Created: {formatCreatedAt(selected.createdAt)}
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded"
            />
            Active — shown in the app carousel
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner image ({IMAGE_UPLOAD_LIMIT_LABEL})
            </label>
            <div className="flex items-start gap-4">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-20 rounded-lg object-cover border border-gray-200"
                />
              )}
              <div className="flex-1 space-y-1.5">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleImageChange}
                  disabled={imageCompressing}
                  className="text-sm text-gray-600 disabled:opacity-50"
                />
                {imageCompressing && (
                  <p className="text-xs text-primary-600 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Optimizing image…
                  </p>
                )}
                {imageSizeHint && !imageCompressing && (
                  <p className="text-xs text-gray-500">Size: {imageSizeHint}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-purple-500 rounded-lg hover:shadow-lg disabled:opacity-60"
            >
              {saving ? 'Saving...' : selected ? 'Update' : 'Create'}
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
        title="Delete Advertisement"
        message={`Delete "${selected?.title}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
