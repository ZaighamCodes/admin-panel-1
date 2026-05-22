'use client';

import { useEffect, useState, useRef } from 'react';
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
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Users,
  Stethoscope,
  ExternalLink,
  ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ACTION_TYPES = ['NONE', 'EXTERNAL_URL', 'DEEP_LINK', 'ARTICLE', 'TIP'];

const EMPTY_FORM = {
  audience: 'PATIENT',
  slug: '',
  title: '',
  description: '',
  actionType: 'NONE',
  actionUrl: '',
  sortOrder: 1,
  active: true,
  startsAt: '',
  endsAt: '',
};

const toDatetimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromDatetimeLocal = (value) => (value ? new Date(value).toISOString() : null);

const validateImage = (file) => {
  if (!file) return null;
  const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!allowed.includes(file.type)) return 'Image must be JPG or PNG';
  if (file.size > 2 * 1024 * 1024) return 'Image must be under 2MB';
  return null;
};

export default function AdvertisementsTab() {
  const dispatch = useAppDispatch();
  const { audience, patient, doctor, saving } = useAppSelector(
    (state) => state.content?.advertisements || {}
  );

  const bucket = audience === 'DOCTOR' ? doctor : patient;
  const items = bucket?.items || [];
  const loading = bucket?.loading;
  const error = bucket?.error;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM, audience });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const lastErrorRef = useRef(null);

  useEffect(() => {
    dispatch(fetchAdvertisements({ audience }));
  }, [audience, dispatch]);

  useEffect(() => {
    if (error && lastErrorRef.current !== error) {
      lastErrorRef.current = error;
      toast.error(error);
    }
  }, [error]);

  const handleAudienceChange = (newAudience) => {
    dispatch(setAdAudience(newAudience));
    setFormData((prev) => ({ ...prev, audience: newAudience }));
  };

  const handleRefresh = () => {
    dispatch(fetchAdvertisements({ audience, force: true }));
    toast.success('Advertisements refreshed');
  };

  const resetImageState = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleOpenModal = (ad = null) => {
    resetImageState();
    if (ad) {
      setSelected(ad);
      setFormData({
        audience: ad.audience || audience,
        slug: ad.slug || '',
        title: ad.title || '',
        description: ad.description || '',
        actionType: ad.actionType || 'NONE',
        actionUrl: ad.actionUrl || '',
        sortOrder: ad.sortOrder ?? 1,
        active: ad.active ?? true,
        startsAt: toDatetimeLocal(ad.startsAt),
        endsAt: toDatetimeLocal(ad.endsAt),
      });
      if (ad.imageUrl) setImagePreview(ad.imageUrl);
    } else {
      setSelected(null);
      setFormData({
        ...EMPTY_FORM,
        audience,
        startsAt: toDatetimeLocal(new Date().toISOString()),
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    resetImageState();
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    const err = validateImage(file);
    if (err) {
      toast.error(err);
      return;
    }
    setImageFile(file || null);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
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
      slug: formData.slug?.trim() || undefined,
      title: formData.title.trim(),
      description: formData.description.trim(),
      actionType: formData.actionType,
      actionUrl: formData.actionType === 'NONE' ? null : formData.actionUrl?.trim() || null,
      sortOrder: Number(formData.sortOrder) || 1,
      active: formData.active,
      startsAt: fromDatetimeLocal(formData.startsAt),
      endsAt: fromDatetimeLocal(formData.endsAt),
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => handleAudienceChange('PATIENT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              audience === 'PATIENT'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Patient panel
          </button>
          <button
            type="button"
            onClick={() => handleAudienceChange('DOCTOR')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              audience === 'DOCTOR'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            Doctor panel
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{items.length} active ad(s)</span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>New Ad</span>
          </button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="bg-white rounded-xl soft-shadow-lg p-12 text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading advertisements...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl soft-shadow-lg p-12 text-center border-2 border-dashed border-gray-200">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No active advertisements</p>
          <p className="text-sm text-gray-500 mt-1">
            Create a carousel banner for the {audience === 'DOCTOR' ? 'doctor' : 'patient'} app
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((ad) => (
            <article
              key={ad.advertisementId}
              className="bg-white rounded-xl soft-shadow-lg overflow-hidden border border-gray-100 hover:border-primary-200 transition-colors group"
            >
              <div className="relative h-36 bg-gradient-to-br from-primary-50 to-purple-50">
                {ad.imageUrl ? (
                  <img src={ad.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-10 h-10 text-gray-300" />
                  </div>
                )}
                <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold bg-white/90 rounded-full text-primary-700">
                  #{ad.sortOrder}
                </span>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-gray-900 line-clamp-1">{ad.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{ad.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-0.5 bg-gray-100 rounded">{ad.actionType}</span>
                  {ad.actionUrl && (
                    <ExternalLink className="w-3 h-3 text-primary-500" title={ad.actionUrl} />
                  )}
                </div>
                <div className="flex gap-2 pt-2 opacity-90 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(ad)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (optional)</label>
              <input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="auto-generated from title"
              />
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starts at</label>
              <input
                type="datetime-local"
                value={formData.startsAt}
                onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ends at</label>
              <input
                type="datetime-local"
                value={formData.endsAt}
                onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded"
            />
            Active (visible when within schedule)
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner image (JPG/PNG, max 2MB)
            </label>
            <div className="flex items-start gap-4">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-20 rounded-lg object-cover border border-gray-200"
                />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleImageChange}
                className="text-sm text-gray-600"
              />
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
