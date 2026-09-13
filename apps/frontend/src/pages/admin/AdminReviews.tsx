import React, { useState, useMemo, useEffect } from 'react';
import { useAdminStore, type Review } from '@/store/adminStore';
import { getAllReviews, updateReviewStatus as apiUpdateReviewStatus, deleteReviewApi, submitProductReview, type StoreReview } from '@/lib/api';
import {
  Star,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Flag,
  Trash2,
  MessageSquare,
  Plus,
  Sparkles,
  ShieldCheck,
  Award,
  AlertTriangle,
  Send,
  X,
  ExternalLink,
  ChevronDown,
  Check,
  ThumbsUp,
  SlidersHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { proxyImageUrl, handleImageError } from '@/lib/imageProxy';

export function AdminReviews() {
  const {
    reviews,
    products,
    updateReviewStatus: storeUpdateReviewStatus,
    replyToReview,
    toggleReviewFeatured,
    deleteReview: storeDeleteReview,
    addReview: storeAddReview,
  } = useAdminStore();

  // ---- Live sync with the review API (moderation really works) ----
  // Server records are the source of truth; local-only admin replies stay local.
  const [apiOnline, setApiOnline] = useState(true);
  useEffect(() => {
    let active = true;
    getAllReviews()
      .then((res) => {
        if (!active) return;
        setApiOnline(true);
        const apiList = res.reviews || [];
        const current = useAdminStore.getState().reviews;
        const byId = new Map(current.map((r) => [r.id, r]));
        apiList.forEach((ar: StoreReview) => {
          const local = byId.get(ar.id);
          if (!local) {
            storeAddReview({
              productId: ar.productId,
              productName: ar.productName || '',
              productImage: ar.productImage || '',
              customerName: ar.customerName,
              customerEmail: ar.customerEmail || '',
              rating: ar.rating,
              title: ar.title,
              comment: ar.comment,
              status: ar.status,
              verifiedBuyer: !!ar.verifiedBuyer,
              ndisParticipant: !!ar.ndisParticipant,
              featured: !!ar.featured,
            });
          } else if (local.status !== ar.status) {
            storeUpdateReviewStatus(ar.id, ar.status as Review['status']);
          }
        });
      })
      .catch(() => {
        if (active) setApiOnline(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateReviewStatus = async (id: string, status: Review['status']) => {
    try {
      await apiUpdateReviewStatus(id, status);
    } catch {
      setApiOnline(false);
    }
    storeUpdateReviewStatus(id, status);
  };

  const toggleFeatureReview = async (id: string) => {
    const current = useAdminStore.getState().reviews.find((r) => r.id === id);
    try {
      await apiUpdateReviewStatus(id, (current?.status || 'approved') as Review['status'], {
        featured: !(current?.featured || false),
      });
    } catch {
      setApiOnline(false);
    }
    toggleReviewFeatured(id);
  };

  const deleteReview = async (id: string) => {
    try {
      await deleteReviewApi(id);
    } catch {
      setApiOnline(false);
    }
    storeDeleteReview(id);
  };

  const addReview = (review: any) => storeAddReview(review);

  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'flagged'>('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);

  // Replying state
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Add Review Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newReviewData, setNewReviewData] = useState({
    productId: products[0]?.id || '',
    customerName: '',
    customerEmail: '',
    rating: 5,
    title: '',
    comment: '',
    status: 'approved' as Review['status'],
    verifiedBuyer: true,
    ndisParticipant: true,
    featured: false,
  });

  // Calculate Statistics
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : '5.0';

  const pendingCount = reviews.filter((r) => r.status === 'pending').length;
  const approvedCount = reviews.filter((r) => r.status === 'approved').length;
  const flaggedCount = reviews.filter((r) => r.status === 'flagged').length;

  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percentage: totalReviews > 0
      ? Math.round((reviews.filter((r) => r.rating === star).length / totalReviews) * 100)
      : 0,
  }));

  // Filtered Reviews List
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const s = (search || '').toLowerCase();
      const matchesSearch =
        !s ||
        (r.customerName || '').toLowerCase().includes(s) ||
        (r.productName || '').toLowerCase().includes(s) ||
        (r.title || '').toLowerCase().includes(s) ||
        (r.comment || '').toLowerCase().includes(s) ||
        (r.customerEmail || '').toLowerCase().includes(s);

      const matchesRating = ratingFilter === 'all' || r.rating === ratingFilter;
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesFeatured = !featuredOnly || r.featured;

      return matchesSearch && matchesRating && matchesStatus && matchesFeatured;
    });
  }, [reviews, search, ratingFilter, statusFilter, featuredOnly]);

  const handleSendReply = (reviewId: string) => {
    if (!replyText.trim()) return;
    replyToReview(reviewId, replyText.trim());
    setReplyingReviewId(null);
    setReplyText('');
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find((p) => p.id === newReviewData.productId) || products[0];
    if (!product || !newReviewData.customerName.trim() || !newReviewData.comment.trim()) {
      alert('Please fill in required fields.');
      return;
    }

    // Persist server-side first so the review really appears on the storefront.
    let serverId: string | undefined;
    try {
      const created = await submitProductReview({
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        customerName: newReviewData.customerName.trim(),
        customerEmail: newReviewData.customerEmail.trim() || 'verified@user.ndis.gov.au',
        rating: newReviewData.rating,
        title: newReviewData.title.trim() || 'Verified Customer Review',
        comment: newReviewData.comment.trim(),
        ndisParticipant: newReviewData.ndisParticipant,
      });
      serverId = created.review?.id;
      if (serverId) {
        await apiUpdateReviewStatus(serverId, newReviewData.status);
      }
    } catch {
      setApiOnline(false);
    }

    addReview({
      ...(serverId ? { id: serverId } : {}),
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      customerName: newReviewData.customerName.trim(),
      customerEmail: newReviewData.customerEmail.trim() || 'verified@user.ndis.gov.au',
      rating: newReviewData.rating,
      title: newReviewData.title.trim() || 'Verified Customer Review',
      comment: newReviewData.comment.trim(),
      status: newReviewData.status,
      verifiedBuyer: newReviewData.verifiedBuyer,
      ndisParticipant: newReviewData.ndisParticipant,
      featured: newReviewData.featured,
    });

    setIsAddModalOpen(false);
    setNewReviewData({
      productId: products[0]?.id || '',
      customerName: '',
      customerEmail: '',
      rating: 5,
      title: '',
      comment: '',
      status: 'approved',
      verifiedBuyer: true,
      ndisParticipant: true,
      featured: false,
    });
  };

  return (<div className="space-y-6 pb-12 animate-fade-in">
      {!apiOnline && (<div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Review server unreachable — changes are saved locally on this device only until the backend reconnects.</span>
        </div>)}
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#147A7A] uppercase tracking-wider">Customer Experience</span>
            <span className="text-gray-300">&bull;</span>
            <span className="text-xs text-gray-500 font-medium">Ratings & Feedback Moderation</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-0.5">Reviews & Ratings Suite</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Manage product ratings, moderate clinical feedback, and pin verified NDIS reviews to the storefront.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 bg-[#147A7A] hover:bg-[#106262] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer hover:scale-[1.02] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Verified Review
        </button>
      </div>

      {/* 2. STATS & RATING BREAKDOWN OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Score Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Storefront Rating</span>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-4xl font-semibold text-slate-900 tracking-tight">{averageRating}</span>
              <div>
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (<Star key={i} className="w-4 h-4 fill-current" />))}
                </div>
                <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                  Based on {totalReviews} verified reviews
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100 mt-4 text-center">
            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-xs font-bold text-emerald-800 block">{approvedCount}</span>
              <span className="text-[10px] text-emerald-600 font-semibold uppercase">Approved</span>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
              <span className="text-xs font-bold text-amber-800 block">{pendingCount}</span>
              <span className="text-[10px] text-amber-600 font-semibold uppercase">Pending</span>
            </div>
            <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
              <span className="text-xs font-bold text-rose-800 block">{flaggedCount}</span>
              <span className="text-[10px] text-rose-600 font-semibold uppercase">Flagged</span>
            </div>
          </div>
        </div>

        {/* Star Rating Distribution Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
            Rating Distribution Breakdown
          </span>

          <div className="space-y-2 pt-1">
            {starCounts.map(({ star, count, percentage }) => (<div
                key={star}
                onClick={() => setRatingFilter(ratingFilter === star ? 'all' : star)}
                className={`flex items-center gap-3 p-1.5 rounded-xl transition-all cursor-pointer ${
                  ratingFilter === star ? 'bg-teal-50 ring-1 ring-[#147A7A]' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1 w-16 flex-shrink-0">
                  <span className="text-xs font-bold text-gray-700">{star}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </div>

                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-[#147A7A] rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="w-16 text-right flex-shrink-0">
                  <span className="text-xs font-bold text-gray-900">{count}</span>
                  <span className="text-[11px] text-gray-400 ml-1 font-mono">({percentage}%)</span>
                </div>
              </div>))}
          </div>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH TOOLBAR */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer, product, comment keywords or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 focus:border-[#147A7A] bg-white text-[#0F1E2E]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 cursor-pointer"
            >
              <option value="all">All Moderation Statuses</option>
              <option value="approved">Approved Reviews</option>
              <option value="pending">Pending Moderation ({pendingCount})</option>
              <option value="flagged">Flagged Reviews</option>
            </select>

            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 cursor-pointer"
            >
              <option value="all">All Star Ratings</option>
              <option value="5">5 Stars Only</option>
              <option value="4">4 Stars Only</option>
              <option value="3">3 Stars Only</option>
              <option value="2">2 Stars Only</option>
              <option value="1">1 Star Only</option>
            </select>

            <button
              type="button"
              onClick={() => setFeaturedOnly(!featuredOnly)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                featuredOnly
                  ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Pinned Featured</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. REVIEWS LIST */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (<div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900">No reviews found</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Try adjusting your search terms or filter selection.</p>
          </div>) : (filteredReviews.map((review) => (<div
              key={review.id}
              className={`bg-white rounded-2xl border transition-all p-5 shadow-sm space-y-4 ${
                review.status === 'pending'
                  ? 'border-amber-300 bg-amber-50/20'
                  : review.status === 'flagged'
                  ? 'border-rose-300 bg-rose-50/20'
                  : 'border-gray-200 hover:border-[#147A7A]/40'
              }`}
            >
              {/* Review Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
                {/* Product Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0 p-1 flex items-center justify-center">
                      <img
                        src={proxyImageUrl(review.productImage)}
                        alt={review.productName}
                        className="w-full h-full object-contain"
                        onError={handleImageError}
                      />
                  </div>
                  <div>
                    <Link
                      to={`/product/${review.productId}`}
                      target="_blank"
                      className="text-sm font-bold text-[#0F1E2E] hover:text-[#147A7A] transition-colors flex items-center gap-1.5 line-clamp-1"
                    >
                      <span>{review.productName}</span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </Link>
                    <span className="text-xs text-gray-400">Review ID: {review.id} &middot; {review.date}</span>
                  </div>
                </div>

                {/* Status Badges & Star Score */}
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  <div className="flex items-center text-amber-400 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    {[...Array(5)].map((_, i) => (<Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < review.rating ? 'fill-current' : 'text-gray-300 fill-none'
                        }`}
                      />))}
                    <span className="text-xs font-medium text-amber-900 ml-1.5">{review.rating}.0</span>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                      review.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : review.status === 'pending'
                        ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {review.status}
                  </span>

                  {review.featured && (<span className="bg-[#0F1E2E] text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 fill-current" />
                      FEATURED
                    </span>)}
                </div>
              </div>

              {/* Review Content & Customer Badges */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{review.customerName}</span>
                  <span className="text-xs text-gray-400 font-mono">({review.customerEmail})</span>

                  {review.verifiedBuyer && (<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-[#147A7A] rounded-md text-[10px] font-bold border border-teal-200">
                      <ShieldCheck className="w-3 h-3" />
                      Verified Purchase
                    </span>)}

                  {review.ndisParticipant && (<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold border border-blue-200">
                      <Award className="w-3 h-3" />
                      NDIS Participant
                    </span>)}
                </div>

                <h4 className="text-sm font-bold text-gray-900">&ldquo;{review.title}&rdquo;</h4>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-[#F8FAFC] p-3.5 rounded-xl border border-gray-100">
                  {review.comment}
                </p>
              </div>

              {/* Admin Reply Thread */}
              {review.adminReply && (<div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-[#147A7A]">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Response from AT Specialists Clinical Team
                    </span>
                    <span className="text-gray-400 font-normal">{review.adminReplyDate}</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{review.adminReply}</p>
                </div>)}

              {/* Inline Reply Box when replying */}
              {replyingReviewId === review.id && (<div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 animate-fade-in">
                  <label className="block text-xs font-bold text-gray-700">Write Store Response:</label>
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Thank the customer or address their clinical equipment feedback..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#147A7A]"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReplyingReviewId(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendReply(review.id)}
                      className="px-4 py-1.5 bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      Post Response
                    </button>
                  </div>
                </div>)}

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  {review.status !== 'approved' && (<button
                      type="button"
                      onClick={() => updateReviewStatus(review.id, 'approved')}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve Review
                    </button>)}

                  {review.status !== 'flagged' && (<button
                      type="button"
                      onClick={() => updateReviewStatus(review.id, 'flagged')}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      Flag
                    </button>)}

                  <button
                    type="button"
                    onClick={() => toggleFeatureReview(review.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                      review.featured
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${review.featured ? 'fill-amber-500 text-amber-500' : ''}`} />
                    {review.featured ? 'Pinned on Homepage' : 'Pin to Homepage'}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingReviewId(replyingReviewId === review.id ? null : review.id);
                      setReplyText(review.adminReply || '');
                    }}
                    className="p-2 text-gray-500 hover:text-[#147A7A] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                    title="Write Reply"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this review permanently?')) {
                        deleteReview(review.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete Review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>)))}
      </div>

      {/* 5. ADD MANUAL VERIFIED REVIEW MODAL */}
      {isAddModalOpen && (<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Add Verified Customer Review</h3>
                <p className="text-xs text-gray-500">Record a patient feedback or OT assessment testimonial</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Product / Equipment *
                </label>
                <select
                  value={newReviewData.productId}
                  onChange={(e) => setNewReviewData({...newReviewData, productId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#147A7A]"
                >
                  {products.map((p) => (<option key={p.id} value={p.id}>
                      {p.name} ({p.brand})
                    </option>))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newReviewData.customerName}
                    onChange={(e) => setNewReviewData({...newReviewData, customerName: e.target.value })}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    value={newReviewData.customerEmail}
                    onChange={(e) => setNewReviewData({...newReviewData, customerEmail: e.target.value })}
                    placeholder="e.g. eleanor.v@email.com"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Star Rating (1 - 5 Stars) *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (<button
                      key={star}
                      type="button"
                      onClick={() => setNewReviewData({...newReviewData, rating: star })}
                      className="p-2 rounded-xl border border-gray-200 hover:bg-amber-50 transition-colors cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= newReviewData.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                        }`}
                      />
                    </button>))}
                  <span className="text-sm font-bold text-gray-700 ml-2">{newReviewData.rating} / 5 Stars</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Review Headline / Title
                </label>
                <input
                  type="text"
                  value={newReviewData.title}
                  onChange={(e) => setNewReviewData({...newReviewData, title: e.target.value })}
                  placeholder="e.g. Exceptional hospital bed for recovery"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Clinical Testimonial / Feedback Comment *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newReviewData.comment}
                  onChange={(e) => setNewReviewData({...newReviewData, comment: e.target.value })}
                  placeholder="Detail the customer experience with the product..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]"
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newReviewData.verifiedBuyer}
                    onChange={(e) => setNewReviewData({...newReviewData, verifiedBuyer: e.target.checked })}
                    className="w-4 h-4 rounded text-[#147A7A] focus:ring-[#147A7A]"
                  />
                  <span>Verified Purchase Badge</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newReviewData.ndisParticipant}
                    onChange={(e) => setNewReviewData({...newReviewData, ndisParticipant: e.target.checked })}
                    className="w-4 h-4 rounded text-[#147A7A] focus:ring-[#147A7A]"
                  />
                  <span>NDIS Participant Badge</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newReviewData.featured}
                    onChange={(e) => setNewReviewData({...newReviewData, featured: e.target.checked })}
                    className="w-4 h-4 rounded text-[#147A7A] focus:ring-[#147A7A]"
                  />
                  <span>Pin to Homepage</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#147A7A] hover:bg-[#106262] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Publish Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
}

export default AdminReviews;
