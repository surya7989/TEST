import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { UtilityBar } from '@/components/layout/UtilityBar';
import { Header } from '@/components/layout/Header';
import { MainNavigation } from '@/components/layout/MainNavigation';
import { Footer } from '@/components/layout/Footer';
import { CartConflictModal } from '@/components/cart/CartConflictModal';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { Suspense, lazy } from 'react';
import { HomePage } from '@/pages/HomePage';

// Lazy-loaded Storefront Pages for high-performance route code splitting
const ShopPage = lazy(() => import('@/pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const ProductPage = lazy(() => import('@/pages/ProductPage').then((m) => ({ default: m.ProductPage })));
const CartPage = lazy(() => import('@/pages/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const ContactPage = lazy(() => import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const HirePage = lazy(() => import('@/pages/HirePage').then((m) => ({ default: m.HirePage })));
const NDISPage = lazy(() => import('@/pages/NDISPage').then((m) => ({ default: m.NDISPage })));
const ResourcesPage = lazy(() => import('@/pages/ResourcesPage').then((m) => ({ default: m.ResourcesPage })));
const ArticleDetailPage = lazy(() => import('@/pages/ArticleDetailPage').then((m) => ({ default: m.ArticleDetailPage })));
const BrandsPage = lazy(() => import('@/pages/BrandsPage').then((m) => ({ default: m.BrandsPage })));
const SearchResultsPage = lazy(() => import('@/pages/SearchResultsPage').then((m) => ({ default: m.SearchResultsPage })));
const WishlistPage = lazy(() => import('@/pages/WishlistPage').then((m) => ({ default: m.WishlistPage })));
const AccountPage = lazy(() => import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const ForCarersPage = lazy(() => import('@/pages/ForCarersPage').then((m) => ({ default: m.ForCarersPage })));
const HelpPage = lazy(() => import('@/pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const TeamPage = lazy(() => import('@/pages/TeamPage').then((m) => ({ default: m.TeamPage })));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
import { useAdminStore } from '@/store/adminStore';

// Lazy-loaded Admin pages for bundle splitting
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'));
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin })));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts').then((m) => ({ default: m.AdminProducts })));
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders').then((m) => ({ default: m.AdminOrders })));
const AdminCustomers = lazy(() => import('@/pages/admin/AdminCustomers').then((m) => ({ default: m.AdminCustomers })));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings').then((m) => ({ default: m.AdminSettings })));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics').then((m) => ({ default: m.AdminAnalytics })));
const AdminShipping = lazy(() => import('@/pages/admin/AdminShipping').then((m) => ({ default: m.AdminShipping })));
const AdminPromotions = lazy(() => import('@/pages/admin/AdminPromotions').then((m) => ({ default: m.AdminPromotions })));
const AdminReviews = lazy(() => import('@/pages/admin/AdminReviews').then((m) => ({ default: m.AdminReviews })));
const AdminInvoices = lazy(() => import('@/pages/admin/AdminInvoices').then((m) => ({ default: m.AdminInvoices })));
const AdminInquiries = lazy(() => import('@/pages/admin/AdminInquiries').then((m) => ({ default: m.AdminInquiries })));
const AdminRentals = lazy(() => import('@/pages/admin/AdminRentals').then((m) => ({ default: m.AdminRentals })));
const AdminQuotes = lazy(() => import('@/pages/admin/AdminQuotes').then((m) => ({ default: m.AdminQuotes })));
const ViewDocumentPage = lazy(() => import('@/pages/ViewDocumentPage').then((m) => ({ default: m.ViewDocumentPage })));

function AdminLoadingFallback() {
  return (<div className="min-h-screen bg-[#0F1E2E] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-400 rounded-full animate-spin" />
        <p className="text-white/70 text-sm font-medium">Loading Portal...</p>
      </div>
    </div>);
}

function StoreLoadingFallback() {
  return (<div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[#147A7A]/20 border-t-[#147A7A] rounded-full animate-spin" />
        <p className="text-gray-500 text-xs font-semibold">Loading content...</p>
      </div>
    </div>);
}

function NotFound() {
  return (<div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">Page not found</h1>
        <p className="text-gray-500 mt-2">The page you're looking for doesn't exist.</p>
        <a href="/" className="inline-block mt-6 px-6 py-3 bg-[#147A7A] text-white rounded-xl text-sm font-semibold hover:bg-[#106262] transition-all">
          Go Home
        </a>
      </div>
    </div>);
}

function App() {
  React.useEffect(() => {
    useAdminStore.getState().fetchPublicProducts();
  }, []);

  return (<Routes>
      {/* Admin Panel Routes */}
      <Route
        path="/at/login"
        element={
          <Suspense fallback={<AdminLoadingFallback />}>
            <AdminLogin />
          </Suspense>
        }
      />
      <Route
        path="/at"
        element={
          <Suspense fallback={<AdminLoadingFallback />}>
            <ScrollToTop />
            <AdminLayout />
          </Suspense>
        }
      >
        <Route index element={<Suspense fallback={<AdminLoadingFallback />}><AdminDashboard /></Suspense>} />
        <Route path="products" element={<Suspense fallback={<AdminLoadingFallback />}><AdminProducts /></Suspense>} />
        <Route path="sales" element={<Navigate to="/at" replace />} />
        <Route path="orders" element={<Suspense fallback={<AdminLoadingFallback />}><AdminOrders /></Suspense>} />
        <Route path="rentals" element={<Suspense fallback={<AdminLoadingFallback />}><AdminRentals /></Suspense>} />
        <Route path="inquiries" element={<Suspense fallback={<AdminLoadingFallback />}><AdminInquiries /></Suspense>} />
        <Route path="leads" element={<Suspense fallback={<AdminLoadingFallback />}><AdminInquiries /></Suspense>} />
        <Route path="customers" element={<Suspense fallback={<AdminLoadingFallback />}><AdminCustomers /></Suspense>} />
        <Route path="customers/segments" element={<Suspense fallback={<AdminLoadingFallback />}><AdminCustomers /></Suspense>} />
        <Route path="invoices" element={<Suspense fallback={<AdminLoadingFallback />}><AdminInvoices /></Suspense>} />
        <Route path="quotes" element={<Suspense fallback={<AdminLoadingFallback />}><AdminQuotes /></Suspense>} />
        <Route path="payments" element={<Suspense fallback={<AdminLoadingFallback />}><AdminInvoices /></Suspense>} />
        <Route path="emails" element={<Navigate to="/at/settings?tab=email" replace />} />
        <Route path="notifications" element={<Navigate to="/at/settings?tab=notifications" replace />} />
        <Route path="reviews" element={<Suspense fallback={<AdminLoadingFallback />}><AdminReviews /></Suspense>} />
        <Route path="analytics" element={<Suspense fallback={<AdminLoadingFallback />}><AdminAnalytics /></Suspense>} />
        {/* Operations hub retired — keep stale bookmarks working */}
        <Route path="operations" element={<Navigate to="/at" replace />} />
        <Route path="operations/*" element={<Navigate to="/at" replace />} />
        <Route path="shipping" element={<Suspense fallback={<AdminLoadingFallback />}><AdminShipping /></Suspense>} />
        <Route path="promotions" element={<Suspense fallback={<AdminLoadingFallback />}><AdminPromotions /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<AdminLoadingFallback />}><AdminSettings /></Suspense>} />
        <Route path="settings/*" element={<Suspense fallback={<AdminLoadingFallback />}><AdminSettings /></Suspense>} />
      </Route>

      {/* Public Verified Document Viewer (Click & Visit from Email) */}
      <Route
        path="/view-document/:docId"
        element={
          <Suspense fallback={<AdminLoadingFallback />}>
            <ViewDocumentPage />
          </Suspense>
        }
      />
      <Route
        path="/view/:docId"
        element={
          <Suspense fallback={<AdminLoadingFallback />}>
            <ViewDocumentPage />
          </Suspense>
        }
      />

      {/* Public Store Routes */}
      <Route
        path="*"
        element={
      <div className="min-h-screen bg-[#F7F9FA] flex flex-col selection:bg-[#147A7A]/20 w-full">
            <ScrollToTop />
            <UtilityBar />
            <Header />
            <MainNavigation />
            <main className="flex-1" id="main-content">
              <Suspense fallback={<StoreLoadingFallback />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/shop/:slug" element={<ShopPage />} />
                  <Route path="/shop/:categorySlug/:subCategorySlug" element={<ShopPage />} />
                  <Route path="/category/:slug" element={<ShopPage />} />
                  <Route path="/category/:categorySlug/:subCategorySlug" element={<ShopPage />} />
                  <Route path="/product/:slug" element={<ProductPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/hire" element={<HirePage />} />
                  <Route path="/ndis" element={<NDISPage />} />
                  <Route path="/for-carers" element={<ForCarersPage />} />
                  <Route path="/pages/for-carers" element={<ForCarersPage />} />
                  <Route path="/resources" element={<ResourcesPage />} />
                  <Route path="/resources/:slug" element={<ArticleDetailPage />} />
                  <Route path="/brands" element={<BrandsPage />} />
                  <Route path="/search" element={<SearchResultsPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/faqs" element={<HelpPage />} />
                  <Route path="/delivery" element={<HelpPage />} />
                  <Route path="/returns" element={<HelpPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/team" element={<TeamPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<PrivacyPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
            <CartConflictModal />
          </div>
        }
      />
    </Routes>);
}

export default App;
