'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
import StatusFilterPills from './StatusFilterPills';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  FileText,
  Star,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compressImage, formatBytes, IMAGE_UPLOAD_LIMIT_LABEL } from '@/utils/compressImage';

const FEATURED_PILLS = [
  { id: 'all', label: 'All', countKey: 'all' },
  { id: 'active', label: 'Featured', countKey: 'active' },
  { id: 'inactive', label: 'Standard', countKey: 'inactive' },
];

const EMPTY_FORM = {
  category: '',
  title: '',
  shortDescription: '',
  description: '',
  fullContent: '',
  author: 'Dr. Docspot Editorial',
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

const fromDatetimeLocal = (value) => (value ? new Date(value).toISOString() : null);

const formatPublishedAt = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
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
    detailLoading,
    error,
    filters,
    categories,
    categoriesLoading,
  } = useAppSelector((state) => state.content?.articles || {});

  const [featuredFilter, setFeaturedFilter] = useState('all');
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageCompressing, setImageCompressing] = useState(false);
  const [imageSizeHint, setImageSizeHint] = useState(null);

  const previewUrlRef = useRef(null);
  const mountedRef = useRef(false);
  const searchDebounceRef = useRef(null);
  const lastErrorRef = useRef(null);

  const revokePreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const featuredToApi = (filter) => {
    if (filter === 'active') return 'true';
    if (filter === 'inactive') return 'false';
    return '';
  };

  const loadArticles = useCallback(
    (overrides = {}) => {
      const featured = overrides.featured !== undefined ? overrides.featured : featuredToApi(featuredFilter);
      dispatch(
        fetchArticles({
          page: overrides.page ?? page,
          size: overrides.size ?? size,
          search: overrides.search !== undefined ? overrides.search : filters.search,
          category: overrides.category !== undefined ? overrides.category : filters.category,
          featured,
          force: overrides.force,
        })
      );
    },
    [dispatch, page, size, filters.search, filters.category, featuredFilter]
  );

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    loadArticles({ size: 20 });
    dispatch(fetchArticleCategories());
  }, [dispatch, loadArticles]);

  useEffect(() => () => revokePreviewUrl(), []);

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
          fetchArticles({
            page: 0,
            search: searchInput,
            category: filters.category,
            featured: featuredToApi(featuredFilter),
            force: true,
          })
        );
      }
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchInput, dispatch, filters.search, filters.category, featuredFilter]);

  const counts = useMemo(() => {
    const featured = items.filter((a) => a.isFeatured).length;
    return { all: items.length, active: featured, inactive: items.length - featured };
  }, [items]);

  const handleFeaturedFilter = (filter) => {
    setFeaturedFilter(filter);
    dispatch(setArticleFilters({ featured: featuredToApi(filter) }));
    dispatch(setArticlePage(0));
    dispatch(
      fetchArticles({
        page: 0,
        featured: featuredToApi(filter),
        search: filters.search,
        category: filters.category,
        force: true,
      })
    );
  };

  const handleCategoryChange = (category) => {
    dispatch(setArticleFilters({ category }));
    dispatch(setArticlePage(0));
    dispatch(
      fetchArticles({
        page: 0,
        category,
        search: filters.search,
        featured: featuredToApi(featuredFilter),
        force: true,
      })
    );
  };

  const handlePageChange = (newPage) => {
    if (newPage < 0 || (totalPages > 0 && newPage >= totalPages)) return;
    dispatch(setArticlePage(newPage));
    dispatch(
      fetchArticles({
        page: newPage,
        featured: featuredToApi(featuredFilter),
        search: filters.search,
        category: filters.category,
        force: true,
      })
    );
  };

  const handleRefresh = () => {
    loadArticles({ force: true });
    toast.success('Articles refreshed');
  };

  const resetImageState = () => {
    revokePreviewUrl();
    setImageFile(null);
    setImagePreview(null);
    setImageSizeHint(null);
    setImageCompressing(false);
  };

  const handleOpenModal = async (article = null) => {
    resetImageState();
    if (article) {
      setSelected(article);
      setIsModalOpen(true);
      try {
        const detail = await dispatch(fetchArticleById(article.articleId)).unwrap();
        setFormData({
          category: detail.category || '',
          title: detail.title || '',
          shortDescription: detail.shortDescription || '',
          description: detail.description || '',
          fullContent: detail.fullContent || '',
          author: detail.author || 'Dr. Docspot Editorial',
          readTimeMinutes: detail.readTimeMinutes ?? 5,
          featured: detail.isFeatured ?? detail.featured ?? false,
          publishedAt: toDatetimeLocal(detail.publishedAt),
          active: detail.active ?? true,
        });
        if (detail.imageUrl) setImagePreview(detail.imageUrl);
      } catch (err) {
        toast.error(err || 'Failed to load article');
        setIsModalOpen(false);
      }
    } else {
      setSelected(null);
      setFormData({ ...EMPTY_FORM });
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    setFormData(EMPTY_FORM);
    resetImageState();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageCompressing(true);
    setImageSizeHint(null);
    try {
      const result = await compressImage(file, { maxWidth: 1600, maxHeight: 1200 });
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
    const payload = {
      category: formData.category.trim(),
      title: formData.title.trim(),
      shortDescription: formData.shortDescription.trim(),
      description: formData.description.trim() || undefined,
      fullContent: formData.fullContent.trim() || undefined,
      author: formData.author.trim() || undefined,
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
      loadArticles({ page, force: true });
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
      const nextPage = items.length === 1 && page > 0 ? page - 1 : page;
      if (nextPage !== page) dispatch(setArticlePage(nextPage));
      loadArticles({ page: nextPage, force: true });
    } catch (err) {
      toast.error(err || 'Failed to delete article');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-100/80 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-700">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Health articles</h2>
            <p className="text-sm text-gray-600 mt-0.5 max-w-lg">
              Long-form content for patient apps. List shows active articles only — set{' '}
              <span className="font-medium">active: false</span> on edit to hide from the app.
            </p>
          </div>
        </div>
        <span className="text-sm text-gray-500 bg-white/80 px-3 py-1.5 rounded-lg border border-emerald-100">
          {totalElements} article{totalElements !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <StatusFilterPills
          value={featuredFilter}
          onChange={handleFeaturedFilter}
          counts={counts}
          pills={FEATURED_PILLS}
        />
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
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg font-semibold text-sm"
          >
            <Plus className="w-5 h-5" />
            New article
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl soft-shadow-lg p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-300"
          />
        </div>
        <select
          value={filters.category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          disabled={categoriesLoading}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400/40 min-w-[180px] bg-white"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.code || cat.label} value={cat.label}>
              {cat.label} ({cat.articleCount})
            </option>
          ))}
        </select>
      </div>

      {loading && items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading articles...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-emerald-100 p-16 text-center">
          <FileText className="w-14 h-14 text-emerald-200 mx-auto mb-4" />
          <p className="text-gray-800 font-semibold text-lg">No articles found</p>
          <p className="text-sm text-gray-500 mt-2">Create a health article or adjust filters.</p>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600"
          >
            <Plus className="w-4 h-4" />
            Add article
          </button>
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(280px,450px))] justify-start">
          {items.map((article) => (
            <article
              key={article.articleId}
              className="w-full max-w-[450px] bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group"
            >
              <div className="relative h-40 bg-gradient-to-br from-emerald-50 to-teal-50">
                {article.imageUrl ? (
                  <img
                    src={article.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-12 h-12 text-emerald-200" />
                  </div>
                )}
                {article.isFeatured && (
                  <span className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-400 text-amber-950 shadow-sm">
                    <Star className="w-3 h-3 fill-current" />
                    Featured
                  </span>
                )}
                <span className="absolute top-3 left-3 px-2 py-0.5 text-xs font-medium bg-white/95 rounded-lg text-emerald-800 shadow-sm capitalize">
                  {article.category}
                </span>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-bold text-gray-900 line-clamp-2 leading-snug">{article.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{article.shortDescription}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>{article.readTimeMinutes || 0} min read</span>
                  {formatPublishedAt(article.publishedAt) && (
                    <span>· {formatPublishedAt(article.publishedAt)}</span>
                  )}
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(article)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(article);
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

      {(totalPages > 1 || hasNext || page > 0) && (
        <div className="flex items-center justify-between bg-white rounded-xl soft-shadow-lg px-4 py-3 border border-gray-100">
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
            Page {page + 1} of {Math.max(totalPages, 1)} · {totalElements} total
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
        title={selected ? 'Edit article' : 'New health article'}
        size="xl"
      >
        {detailLoading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400/40"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  list="article-categories"
                  placeholder="e.g. wellness, nutrition"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400/40"
                />
                <datalist id="article-categories">
                  {categories.map((cat) => (
                    <option key={cat.code || cat.label} value={cat.label} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Short description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400/40 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Card summary (optional)
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400/40 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Full content
              </label>
              <textarea
                rows={8}
                value={formData.fullContent}
                onChange={(e) => setFormData({ ...formData, fullContent: e.target.value })}
                placeholder="HTML or plain text for the article page"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400/40 font-mono text-sm resize-y min-h-[160px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Author</label>
                <input
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400/40"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Read time (min)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={formData.readTimeMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, readTimeMinutes: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400/40"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Published at
                </label>
                <input
                  type="datetime-local"
                  value={formData.publishedAt}
                  onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400/40"
                />
                <p className="text-xs text-gray-400 mt-1">Leave empty to publish now</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="font-medium">Featured</span> on patient home
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="font-medium">Active</span> — visible in app
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cover image ({IMAGE_UPLOAD_LIMIT_LABEL})
              </label>
              <div className="flex items-start gap-4">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-24 rounded-xl object-cover border border-gray-200"
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
                    <p className="text-xs text-emerald-600 flex items-center gap-1.5">
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
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || detailLoading}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:shadow-lg disabled:opacity-60"
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
        title="Delete article"
        message={`Delete "${selected?.title}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
