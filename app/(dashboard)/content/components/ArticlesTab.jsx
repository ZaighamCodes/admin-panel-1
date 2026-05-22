'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchArticles,
  fetchArticleCategories,
  fetchArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  setArticleFilters,
  setArticlePage,
} from '@/store/slices/contentSlice';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import Table from '@/components/Table';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  category: '',
  title: '',
  shortDescription: '',
  description: '',
  fullContent: '',
  author: 'Dr. HeyDoctor Editorial',
  readTimeMinutes: 5,
  featured: false,
  publishedAt: '',
  active: true,
};

const toDatetimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromDatetimeLocal = (value) => {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
};

const validateImage = (file) => {
  if (!file) return null;
  const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!allowed.includes(file.type)) return 'Image must be JPG or PNG';
  if (file.size > 2 * 1024 * 1024) return 'Image must be under 2MB';
  return null;
};

export default function ArticlesTab() {
  const dispatch = useAppDispatch();
  const {
    items = [],
    page,
    size,
    totalElements,
    totalPages,
    hasNext,
    loading,
    saving,
    error,
    filters,
    categories,
  } = useAppSelector((state) => state.content?.articles || {});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [detailLoading, setDetailLoading] = useState(false);

  const mountedRef = useRef(false);
  const searchDebounceRef = useRef(null);
  const lastErrorRef = useRef(null);

  const loadArticles = useCallback(
    (overrides = {}) => {
      dispatch(
        fetchArticles({
          page: overrides.page ?? page,
          size: overrides.size ?? size,
          search: overrides.search !== undefined ? overrides.search : filters.search,
          category: overrides.category !== undefined ? overrides.category : filters.category,
          force: overrides.force,
        })
      );
    },
    [dispatch, page, size, filters.search, filters.category]
  );

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    loadArticles();
    dispatch(fetchArticleCategories());
  }, [dispatch, loadArticles]);

  useEffect(() => {
    if (error && lastErrorRef.current !== error) {
      lastErrorRef.current = error;
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (searchInput !== filters.search) {
        dispatch(setArticleFilters({ search: searchInput }));
        dispatch(setArticlePage(0));
        dispatch(
          fetchArticles({ page: 0, search: searchInput, category: filters.category, force: true })
        );
      }
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchInput, dispatch, filters.search, filters.category]);

  const handleCategoryChange = (category) => {
    dispatch(setArticleFilters({ category }));
    dispatch(setArticlePage(0));
    dispatch(fetchArticles({ page: 0, category, search: filters.search, force: true }));
  };

  const handlePageChange = (newPage) => {
    if (newPage < 0 || (totalPages > 0 && newPage >= totalPages)) return;
    dispatch(setArticlePage(newPage));
    dispatch(fetchArticles({ page: newPage, force: true }));
  };

  const handleRefresh = () => {
    loadArticles({ force: true });
    toast.success('Articles refreshed');
  };

  const resetImageState = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleOpenModal = async (article = null) => {
    resetImageState();
    if (article) {
      setSelected(article);
      setDetailLoading(true);
      setIsModalOpen(true);
      try {
        const detail = await dispatch(fetchArticleById(article.articleId)).unwrap();
        setFormData({
          category: detail.category || '',
          title: detail.title || '',
          shortDescription: detail.shortDescription || '',
          description: detail.description || '',
          fullContent: detail.fullContent || '',
          author: detail.author || 'Dr. HeyDoctor Editorial',
          readTimeMinutes: detail.readTimeMinutes ?? 5,
          featured: detail.isFeatured ?? detail.featured ?? false,
          publishedAt: toDatetimeLocal(detail.publishedAt),
          active: detail.active ?? true,
        });
        if (detail.imageUrl) setImagePreview(detail.imageUrl);
      } catch (err) {
        toast.error(err || 'Failed to load article');
        setIsModalOpen(false);
      } finally {
        setDetailLoading(false);
      }
    } else {
      setSelected(null);
      setFormData({ ...EMPTY_FORM, publishedAt: toDatetimeLocal(new Date().toISOString()) });
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    setFormData(EMPTY_FORM);
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
    const payload = {
      category: formData.category.trim(),
      title: formData.title.trim(),
      shortDescription: formData.shortDescription.trim(),
      description: formData.description.trim(),
      fullContent: formData.fullContent.trim(),
      author: formData.author.trim(),
      readTimeMinutes: Number(formData.readTimeMinutes) || 5,
      featured: formData.featured,
      publishedAt: fromDatetimeLocal(formData.publishedAt),
      active: formData.active,
    };

    try {
      if (selected) {
        await dispatch(
          updateArticle({ articleId: selected.articleId, data: payload, imageFile })
        ).unwrap();
        toast.success('Article updated');
      } else {
        await dispatch(createArticle({ data: payload, imageFile })).unwrap();
        toast.success('Article created');
      }
      handleCloseModal();
      dispatch(fetchArticles({ page, force: true }));
    } catch (err) {
      toast.error(err || 'Failed to save article');
    }
  };

  const handleDelete = async () => {
    try {
      await dispatch(deleteArticle(selected.articleId)).unwrap();
      toast.success('Article deleted');
      setIsDeleteOpen(false);
      setSelected(null);
      if (items.length === 1 && page > 0) {
        dispatch(setArticlePage(page - 1));
        dispatch(fetchArticles({ page: page - 1, force: true }));
      } else {
        dispatch(fetchArticles({ page, force: true }));
      }
    } catch (err) {
      toast.error(err || 'Failed to delete article');
    }
  };

  const columns = [
    {
      header: 'Article',
      accessor: (row) => (
        <div className="flex items-center gap-3 min-w-[220px]">
          {row.imageUrl ? (
            <img
              src={row.imageUrl}
              alt=""
              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-500" />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 line-clamp-1">{row.title}</p>
            <p className="text-xs text-gray-500">{row.category}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Featured',
      accessor: (row) =>
        row.isFeatured ? (
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
        ) : (
          <span className="text-gray-400">—</span>
        ),
      className: 'text-center',
    },
    {
      header: 'Read time',
      accessor: (row) => `${row.readTimeMinutes || 0} min`,
    },
    {
      header: 'Published',
      accessor: (row) =>
        row.publishedAt ? new Date(row.publishedAt).toLocaleDateString() : '—',
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenModal(row)}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelected(row);
              setIsDeleteOpen(true);
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-gray-600">
          {totalElements} article{totalElements !== 1 ? 's' : ''} · page {page + 1}
          {totalPages > 0 ? ` of ${totalPages}` : ''}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
            <span>New Article</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl soft-shadow-lg p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={filters.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-w-[160px]"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.code || cat.label} value={cat.label}>
                {cat.label} ({cat.articleCount})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="bg-white rounded-xl soft-shadow-lg p-12 text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading articles...</p>
        </div>
      ) : (
        <Table columns={columns} data={items} />
      )}

      {(totalPages > 1 || hasNext || page > 0) && (
        <div className="flex items-center justify-between bg-white rounded-xl soft-shadow-lg px-4 py-3">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 0 || loading}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page + 1} of {Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={!hasNext || loading}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selected ? 'Edit Article' : 'New Health Article'}
        size="xl"
      >
        {detailLoading ? (
          <div className="py-12 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Treatment, Wellness"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intro paragraph</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full content <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={6}
                value={formData.fullContent}
                onChange={(e) => setFormData({ ...formData, fullContent: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                placeholder="Plain text or HTML"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <input
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Read time (min)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={formData.readTimeMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, readTimeMinutes: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Published at</label>
                <input
                  type="datetime-local"
                  value={formData.publishedAt}
                  onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                Featured on home
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                Active
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cover image (JPG/PNG, max 2MB)
              </label>
              <div className="flex items-start gap-4">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-lg object-cover border border-gray-200"
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
        )}
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelected(null);
        }}
        onConfirm={handleDelete}
        title="Delete Article"
        message={`Delete "${selected?.title}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
