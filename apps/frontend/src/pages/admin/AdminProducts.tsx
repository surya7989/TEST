import React, { useState, useEffect, useRef } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { formatCurrency } from '@/lib/utils';
import { proxyImageUrl, handleImageError } from '@/lib/imageProxy';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Package,
  ArrowUpDown,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Images,
  ExternalLink,
  X,
  Check,
  Tag,
  DollarSign,
  Layers,
  FolderPlus,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Sparkles,
  Info,
  ShieldCheck,
  CheckCircle,
  Clock,
  Upload,
  Image as ImageIcon,
  Star,
  FileText,
  RotateCcw,
  Link as LinkIcon,
  Gift,
  SlidersHorizontal,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { AT_DEPARTMENTS, getDepartmentCount } from '@/data/departments';

type SortKey = 'name' | 'price' | 'stock' | 'brand' | 'category';
type SortDir = 'asc' | 'desc';
type ViewMode = 'list' | 'form' | 'detail';

const samplePresetImages = [
  { label: 'Configura® Lift Chair', url: 'https://www.rehabhire.com.au/wp-content/uploads/2021/11/Configura-Comfort-Black-Upright-2026.webp' },
  { label: 'Hospital Profiling Bed', url: 'https://www.rehabhire.com.au/wp-content/uploads/2024/12/Empresa-LTC-Bed-Main-Badge.webp' },
  { label: 'Transit Wheelchair', url: 'https://www.rehabhire.com.au/wp-content/uploads/2024/01/Aspire-VIDA-X-Purple-MWS449868-Front-Angle.webp' },
  { label: 'Tilt Shower Commode', url: 'https://www.rehabhire.com.au/wp-content/uploads/2023/04/Ocean-Ergo-VIP-Main.webp' },
  { label: 'Carbon Fibre Walker', url: 'https://www.rehabhire.com.au/wp-content/uploads/2021/06/Aspire-Vogue-Adventure-Walker-WAF705450.webp' },
  { label: 'Patient Standing Hoist', url: 'https://www.rehabhire.com.au/wp-content/uploads/2018/08/Sara-Stedy-Badge.webp' },
  { label: 'ROHO Pressure Cushion', url: 'https://www.rehabhire.com.au/wp-content/uploads/2018/09/Quadtro-Select-High-Profile-02-Flattened.png' },
  { label: 'Adaptive Tipping Kettle', url: 'https://www.rehabhire.com.au/wp-content/uploads/2022/01/Uccello-Black-and-White-01.webp' },
  { label: 'Automatic Bottle Opener', url: 'https://www.rehabhire.com.au/wp-content/uploads/2018/11/One-Touch-Bottle-Opener-01.webp' },
  { label: 'Access Threshold Ramp', url: 'https://www.rehabhire.com.au/wp-content/uploads/2018/08/Pride-Single-Fold-Ramp-01.jpg' },
  { label: 'Conni Absorbent Mat', url: 'https://www.rehabhire.com.au/wp-content/uploads/2018/09/Conni-Anti-Slip-Floor-Mat-Pebble.webp' },
];

export function AdminProducts() {
  const { products, categories, addProduct, updateProduct, deleteProduct, addCategory, deleteCategory, clearAllProducts } = useAdminStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Sync with top-bar quick search (?search=...) on every navigation
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Selected / Editing States
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Inline Category Creator Toggle
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');

  // Image Input Mode State
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url' | 'presets'>('upload');
  const [customGalleryUrl, setCustomGalleryUrl] = useState('');

  // Hidden File Input Refs
  const mainImageInputRef = useRef<HTMLInputElement | null>(null);
  const galleryImageInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: categories[0]?.name || 'General',
    price: '',
    gstType: 'standard' as 'standard' | 'gst-free' | 'custom',
    customGstRate: '10',
    isFreeDelivery: true,
    deliveryFee: '',
    isHireAvailable: false,
    hirePrice: '',
    hirePeriod: 'week' as 'week' | 'month',
    stock: '15',
    sku: '',
    description: '',
    image: '',
    galleryImages: [] as string[],
    available: true,
    badge: '',
    lowStockThreshold: '10',
    hasFreeSample: false,
    sampleNote: '',
  });

  const hasImage = Boolean((formData.image && formData.image.trim()) || (formData.galleryImages && formData.galleryImages.length > 0));

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];

  const filteredProducts = products
    .filter((p) => {
      const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(search.toLowerCase()) ||
        pCats.some((c) => c.includes(search.toLowerCase()));

      const selectedDept = AT_DEPARTMENTS.find((d) =>
          d.name.toLowerCase() === categoryFilter.toLowerCase() ||
          d.id.toLowerCase() === categoryFilter.toLowerCase() ||
          d.shopSlug.toLowerCase() === categoryFilter.toLowerCase());

      const matchesCategory =
        categoryFilter === 'all' ||
        (selectedDept
          ? (selectedDept.isHire
              ? (p.hireAvailable || (p.hirePrice && p.hirePrice > 0))
              : selectedDept.id === 'for-carers'
              ? ((p.brand || '').toLowerCase() === 'tena' || pCats.includes('continence-care') || pCats.includes('for-carers') || pCats.includes('incontinence-aids') || (p.name || '').toLowerCase().includes('tena'))
              : selectedDept.slugs.some((s) => pCats.some((pc) => pc.includes(s))))
          : ((p.category || '').toLowerCase() === categoryFilter.toLowerCase() || pCats.includes(categoryFilter.toLowerCase())));

      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'low' && p.stock <= p.lowStockThreshold && p.stock > 0) ||
        (stockFilter === 'out' && p.stock === 0);
      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'name') return mul * a.name.localeCompare(b.name);
      if (sortKey === 'brand') return mul * a.brand.localeCompare(b.brand);
      if (sortKey === 'category') return mul * a.category.localeCompare(b.category);
      if (sortKey === 'price') return mul * (a.price - b.price);
      if (sortKey === 'stock') return mul * (a.stock - b.stock);
      return 0;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />;
    return sortDir === 'asc' ? (<ArrowUp className="w-3.5 h-3.5 text-[#147A7A]" />) : (<ArrowDown className="w-3.5 h-3.5 text-[#147A7A]" />);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      category: categories[0]?.name || 'General',
      price: '',
      gstType: 'standard',
      customGstRate: '10',
      isFreeDelivery: true,
      deliveryFee: '',
      isHireAvailable: false,
      hirePrice: '',
      hirePeriod: 'week',
      stock: '15',
      sku: '',
      description: '',
      image: '',
      galleryImages: [],
      available: true,
      badge: '',
      lowStockThreshold: '10',
      hasFreeSample: false,
      sampleNote: '',
    });
    setIsAddingCategory(false);
    setNewCategoryTitle('');
    setFormAttrs([]);
    setFormVariants([]);
    setNewAttrName('');
    setValueDrafts({});
    setHexDrafts({});
  };

  const openAddForm = () => {
    resetForm();
    setEditingProductId(null);
    setViewMode('form');
  };

  // ---------- Size & Colour Options (Variants) ----------
  // Same data shape as the storefront catalogue: attributes drive the
  // Size/Colour dropdowns on the product page, variants drive price/SKU/image.
  interface FormAttrValue { label: string; value: string; colorHex?: string }
  interface FormAttr { key: string; name: string; type: 'select' | 'color'; values: FormAttrValue[] }
  interface FormVariant { key: string; attrs: Record<string, string>; sku: string; price: string; image: string; available: boolean }

  const [formAttrs, setFormAttrs] = useState<FormAttr[]>([]);
  const [formVariants, setFormVariants] = useState<FormVariant[]>([]);
  const [newAttrName, setNewAttrName] = useState('');
  const [valueDrafts, setValueDrafts] = useState<Record<string, string>>({});
  const [hexDrafts, setHexDrafts] = useState<Record<string, string>>({});

  const slugifyText = (s: string) =>
    (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const comboKeyFor = (attrs: Record<string, string>) =>
    Object.keys(attrs).sort().map((k) => `${k}=${attrs[k]}`).join('|');

  const prettyLabel = (v: string) =>
    v.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const rebuildVariants = (attrs: FormAttr[],
    prev: FormVariant[],
    baseSku: string,
    basePrice: string): FormVariant[] => {
    const usable = attrs.filter((a) => a.key && a.values.length > 0);
    if (usable.length === 0) return [];
    const prevByKey = new Map(prev.map((v) => [v.key, v]));
    // cartesian product of attribute values
    let combos: Record<string, string>[] = [{}];
    usable.forEach((a) => {
      const next: Record<string, string>[] = [];
      combos.forEach((c) => {
        a.values.forEach((v) => next.push({...c, [a.key]: v.value }));
      });
      combos = next;
    });
    return combos.map((c, i) => {
      const key = comboKeyFor(c);
      const old = prevByKey.get(key);
      if (old) return old;
      const suffix = Object.values(c).join('-').toUpperCase().slice(0, 12) || `${i + 1}`;
      return {
        key,
        attrs: c,
        sku: baseSku ? `${baseSku}-${suffix}` : '',
        price: basePrice || '',
        image: '',
        available: true,
      };
    });
  };

  const syncVariants = (attrs: FormAttr[],
    prev: FormVariant[],
    baseSku?: string,
    basePrice?: string) => {
    setFormVariants(rebuildVariants(attrs,
        prev,
        baseSku ?? formData.sku.trim(),
        basePrice ?? formData.price));
  };

  const handleAddAttribute = (presetName?: string, presetValues?: { label: string; value: string; colorHex?: string }[]) => {
    const name = (presetName ?? newAttrName).trim();
    if (!name) return;
    const key = slugifyText(name);
    if (!key) return;
    let next = formAttrs;
    if (!next.some((a) => a.key === key)) {
      next = [
        ...next,
        {
          key,
          name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
          type: /colou?r/i.test(name) ? 'color' : 'select',
          values: [],
        },
      ];
    }
    if (presetValues && presetValues.length > 0) {
      next = next.map((a) => {
        if (a.key !== key) return a;
        const have = new Set(a.values.map((v) => v.value));
        return {...a, values: [...a.values,...presetValues.filter((v) => !have.has(v.value))] };
      });
    }
    setFormAttrs(next);
    setNewAttrName('');
    syncVariants(next, formVariants);
  };

  const handleRemoveAttribute = (key: string) => {
    const next = formAttrs.filter((a) => a.key !== key);
    setFormAttrs(next);
    syncVariants(next, formVariants);
  };

  const handleAddAttrValue = (attrKey: string) => {
    const label = (valueDrafts[attrKey] || '').trim();
    if (!label) return;
    const value = slugifyText(label);
    if (!value) return;
    const next = formAttrs.map((a) => {
      if (a.key !== attrKey || a.values.some((v) => v.value === value)) return a;
      const hex = hexDrafts[attrKey];
      return {
        ...a,
        values: [...a.values, { label: prettyLabel(label), value,...(a.type === 'color' && hex ? { colorHex: hex } : {}) }],
      };
    });
    setFormAttrs(next);
    setValueDrafts((d) => ({...d, [attrKey]: '' }));
    syncVariants(next, formVariants);
  };

  const handleRemoveAttrValue = (attrKey: string, value: string) => {
    const next = formAttrs.map((a) =>
      a.key === attrKey ? {...a, values: a.values.filter((v) => v.value !== value) } : a);
    setFormAttrs(next);
    syncVariants(next, formVariants);
  };

  const updateFormVariant = (key: string, patch: Partial<FormVariant>) => {
    setFormVariants((prev) => prev.map((v) => (v.key === key ? {...v,...patch } : v)));
  };

  const openEditForm = (id: string) => {
    const p = products.find((pr) => pr.id === id);
    if (p) {
      setFormData({
        name: p.name,
        brand: p.brand,
        category: p.category,
        price: String(p.price),
        gstType: p.gstType || 'standard',
        customGstRate: p.gstRate !== undefined ? String(p.gstRate) : '10',
        isFreeDelivery: p.deliveryFee === undefined || p.deliveryFee === 0,
        deliveryFee: p.deliveryFee && p.deliveryFee > 0 ? String(p.deliveryFee) : '',
        isHireAvailable: (p.hirePrice || 0) > 0,
        hirePrice: p.hirePrice > 0 ? String(p.hirePrice) : '',
        hirePeriod: (p.hirePeriod as 'week' | 'month') || 'week',
        stock: String(p.stock),
        sku: p.sku,
        description: p.description,
        image: p.image,
        galleryImages: p.galleryImages && p.galleryImages.length > 0 ? p.galleryImages : [p.image],
        available: p.available,
        badge: p.badge || '',
        lowStockThreshold: String(p.lowStockThreshold),
        hasFreeSample: !!p.hasFreeSample,
        sampleNote: p.sampleNote || '',
      });
      // Load existing Size/Colour options + variants (catalogue products) into the editor
      const loadedAttrs: FormAttr[] = ((p as any).attributes || [])
        .filter((a: any) => a && a.slug && Array.isArray(a.values) && a.values.length > 0)
        .map((a: any) => ({
          key: String(a.slug),
          name: String(a.name || prettyLabel(String(a.slug))),
          type: (a.type === 'color' ? 'color' : 'select') as 'select' | 'color',
          values: a.values.map((v: any) => ({
            label: String(v.label || prettyLabel(String(v.value))),
            value: String(v.value),
            ...(v.colorHex ? { colorHex: String(v.colorHex) } : {}),
          })),
        }));
      setFormAttrs(loadedAttrs);
      setFormVariants(((p as any).variants || []).map((v: any, i: number) => {
          const attrs: Record<string, string> = {};
          Object.entries((v.attributes || {}) as Record<string, unknown>).forEach(([k, val]) => {
            if (k === 'purchase-type') return;
            attrs[k] = String(val ?? '');
          });
          return {
            key: comboKeyFor(attrs) || `row-${i}`,
            attrs,
            sku: String(v.sku || ''),
            price: v.price !== undefined && v.price !== null ? String(v.price) : '',
            image: String(v.image || ''),
            available: v.available !== false,
          };
        }));
      setNewAttrName('');
      setValueDrafts({});
      setHexDrafts({});
      setEditingProductId(id);
      setViewMode('form');
    }
  };

  const openDetailView = (id: string) => {
    setViewingProductId(id);
    setViewMode('detail');
  };

  // Image Upload Handlers
  const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setFormData((prev) => ({
            ...prev,
            image: result,
            galleryImages: prev.galleryImages.includes(result) ? prev.galleryImages : [result,...prev.galleryImages],
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (result) {
            setFormData((prev) => ({
              ...prev,
              galleryImages: prev.galleryImages.includes(result) ? prev.galleryImages : [...prev.galleryImages, result],
            }));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleAddGalleryUrl = () => {
    if (!customGalleryUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.includes(customGalleryUrl.trim())
        ? prev.galleryImages
        : [...prev.galleryImages, customGalleryUrl.trim()],
    }));
    setCustomGalleryUrl('');
  };

  const handleRemoveGalleryImage = (indexToRemove: number) => {
    setFormData((prev) => {
      const currentGallery = prev.galleryImages && prev.galleryImages.length > 0
        ? [...prev.galleryImages]
        : (prev.image ? [prev.image] : []);
      const removedUrl = currentGallery[indexToRemove];
      const newGallery = currentGallery.filter((_, idx) => idx !== indexToRemove);
      const isRemovingCover = prev.image === removedUrl || (!prev.image && indexToRemove === 0);
      const newCover = newGallery.length > 0
        ? (isRemovingCover ? newGallery[0] : prev.image)
        : '';
      return {
        ...prev,
        galleryImages: newGallery,
        image: newCover,
      };
    });
  };

  const handleSetCoverImage = (imgUrl: string) => {
    setFormData((prev) => {
      const remaining = prev.galleryImages.filter((u) => u !== imgUrl);
      return {
        ...prev,
        image: imgUrl,
        galleryImages: [imgUrl,...remaining],
      };
    });
  };

  const handleInlineAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryTitle.trim()) return;

    const catName = newCategoryTitle.trim();
    const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    addCategory({
      id: slug,
      name: catName,
    });

    setFormData((prev) => ({...prev, category: catName }));
    setNewCategoryTitle('');
    setIsAddingCategory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      alert('Please enter product title and buy price.');
      return;
    }

    const hasPhoto = Boolean((formData.image && formData.image.trim()) || (formData.galleryImages && formData.galleryImages.length > 0));
    if (!hasPhoto) {
      alert('Photo upload is required! You cannot save a product without uploading or selecting an image.');
      return;
    }

    let finalImage = formData.image.trim();
    if (!finalImage && formData.galleryImages.length > 0) {
      finalImage = formData.galleryImages[0];
    }
    const galleryImgs = formData.galleryImages.length > 0 ? formData.galleryImages : [finalImage];
    const hirePriceNum = formData.isHireAvailable ? Number(formData.hirePrice) || 0 : 0;
    const finalDeliveryFee = formData.isFreeDelivery ? 0 : Number(formData.deliveryFee) || 0;

    // Catalogue-compatible identity + taxonomy so the product renders
    // correctly on the storefront (cards, filters, breadcrumbs, search).
    const baseSku = formData.sku.trim();
    const basePriceNum = Number(formData.price) || 0;
    const catSlug = slugifyText(formData.category) || 'general';
    const existingForSlug = editingProductId ? products.find((pr) => pr.id === editingProductId) : undefined;
    const mergedCategories = (() => {
      const current = ((existingForSlug as any)?.categories as string[] | undefined) || [];
      const rest = current.filter((c) => c !== catSlug);
      return [catSlug,...rest];
    })();
    const descText = formData.description.trim();
    const shortText = descText.length > 160 ? `${descText.slice(0, 157).trim()}...` : descText;

    const buildAttributes = () =>
      formAttrs
        .filter((a) => a.key && a.values.length > 0)
        .map((a) => ({
          id: `attr-${a.key}`,
          name: a.name,
          slug: a.key,
          type: a.type,
          values: a.values,
        }));

    const buildVariants = () =>
      formVariants.map((v, i) => {
        const vImgValid = v.image && galleryImgs.includes(v.image);
        return {
          id: `var-${i + 1}`,
          sku: v.sku.trim() || baseSku || `AT-${Date.now().toString().slice(-4)}-${i + 1}`,
          attributes: v.attrs,
          price: Number(v.price) || basePriceNum,
          regularPrice: Number(v.price) || basePriceNum,
          image: vImgValid ? v.image : finalImage,
          stockStatus: v.available ? 'in_stock' : 'out_of_stock',
          available: v.available,
        };
      });

    const buyPriceNum = basePriceNum;
    const buyAvailable = buyPriceNum > 0 || formVariants.length > 0;
    const hireAvailable = hirePriceNum > 0;
    const purchaseType = hireAvailable && buyAvailable ? 'both' : hireAvailable ? 'hire' : 'buy';

    const uniqueSlugFor = (name: string) => {
      let s = slugifyText(name) || `product-${Date.now().toString().slice(-4)}`;
      let candidate = s;
      let n = 2;
      while (products.some((pr) => (pr as any).slug === candidate && pr.id !== editingProductId)) {
        candidate = `${s}-${n}`;
        n += 1;
      }
      return candidate;
    };

    const finalGstRate =
      formData.gstType === 'gst-free'
        ? 0
        : formData.gstType === 'custom'
        ? Number(formData.customGstRate) || 10
        : 10;

    if (editingProductId) {
      updateProduct(editingProductId, {
        name: formData.name.trim(),
        brand: formData.brand.trim() || 'AT Specialists',
        category: formData.category,
        categories: mergedCategories,
        categoryPath: mergedCategories,
        tags: [(formData.brand.trim() || 'AT Specialists').toLowerCase(), catSlug],
        shortDescription: shortText,
        fullDescription: descText,
        attributes: buildAttributes(),
        variants: buildVariants(),
        price: Number(formData.price),
        buyPrice: buyPriceNum,
        buyAvailable,
        hireAvailable,
        purchaseType,
        quoteRequired: !buyAvailable && !hireAvailable,
        gstType: formData.gstType,
        gstRate: finalGstRate,
        deliveryFee: finalDeliveryFee,
        freeDelivery: finalDeliveryFee === 0,
        hirePrice: hirePriceNum,
        hirePeriod: formData.hirePeriod,
        stock: Number(formData.stock) || 0,
        sku: formData.sku.trim() || `AT-${formData.category.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}`,
        description: formData.description.trim(),
        image: finalImage,
        thumbnail: finalImage,
        galleryImages: galleryImgs,
        images: galleryImgs,
        available: formData.available,
        badge: formData.badge.trim() || (hirePriceNum > 0 ? 'Hire Available' : undefined),
        lowStockThreshold: Number(formData.lowStockThreshold) || 10,
        hasFreeSample: formData.hasFreeSample,
        sampleNote: formData.hasFreeSample ? (formData.sampleNote.trim() || 'Complimentary trial sample kit') : undefined,
      });
    } else {
      addProduct({
        name: formData.name.trim(),
        slug: uniqueSlugFor(formData.name.trim()),
        brand: formData.brand.trim() || 'AT Specialists',
        category: formData.category,
        categories: mergedCategories,
        categoryPath: mergedCategories,
        tags: [(formData.brand.trim() || 'AT Specialists').toLowerCase(), catSlug],
        shortDescription: shortText,
        fullDescription: descText,
        attributes: buildAttributes(),
        variants: buildVariants(),
        price: Number(formData.price),
        buyPrice: buyPriceNum,
        buyAvailable,
        hireAvailable,
        purchaseType,
        quoteRequired: !buyAvailable && !hireAvailable,
        gstType: formData.gstType,
        gstRate: finalGstRate,
        deliveryFee: finalDeliveryFee,
        freeDelivery: finalDeliveryFee === 0,
        hirePrice: hirePriceNum,
        hirePeriod: formData.hirePeriod,
        stock: Number(formData.stock) || 0,
        sku: formData.sku.trim() || `AT-${formData.category.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)}-${Date.now().toString().slice(-4)}`,
        description: formData.description.trim(),
        image: finalImage,
        thumbnail: finalImage,
        galleryImages: galleryImgs,
        images: galleryImgs,
        available: formData.available,
        badge: formData.badge.trim() || (hirePriceNum > 0 ? 'Hire Available' : undefined),
        rating: 4.9,
        reviewCount: 10,
        lowStockThreshold: Number(formData.lowStockThreshold) || 10,
        hasFreeSample: formData.hasFreeSample,
        sampleNote: formData.hasFreeSample ? (formData.sampleNote.trim() || 'Complimentary trial sample kit') : undefined,
      });
    }

    setViewMode('list');
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this product from catalog?')) {
      deleteProduct(id);
      if (viewMode === 'detail') setViewMode('list');
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear ALL products and categories? This permanently wipes all items so you can start completely fresh and add your products manually.')) {
      await clearAllProducts();
      setSelectedProducts([]);
      setCategoryFilter('all');
    }
  };

  const toggleSelect = (id: string) =>
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const lowStockCount = products.filter((p) => p.stock <= p.lowStockThreshold && p.stock > 0).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const viewingProduct = viewingProductId ? products.find((p) => p.id === viewingProductId) : null;

  // ==========================================
  // VIEW MODE: FULL-PAGE ADD / EDIT PRODUCT
  // ==========================================
  if (viewMode === 'form') {
    return (<div className="space-y-6 pb-12 animate-fade-in">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={mainImageInputRef}
          onChange={handleMainImageUpload}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={galleryImageInputRef}
          onChange={handleGalleryUpload}
          accept="image/*"
          multiple
          className="hidden"
        />

        {/* Top Action Bar */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-[#147A7A] transition-colors cursor-pointer border border-gray-200"
              title="Return to Product List"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#147A7A] uppercase tracking-wider">Catalog Management</span>
                <span className="text-gray-300">&bull;</span>
                <span className="text-xs text-gray-500 font-semibold">{editingProductId ? 'Editing Mode' : 'New Creation'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
                {editingProductId ? `Edit Product: ${formData.name || 'Untitled'}` : 'Create New Assistive Equipment Product'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!hasImage}
              onClick={handleSubmit}
              className={`px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 ${
                hasImage
                  ? 'bg-[#147A7A] hover:bg-[#106262] text-white cursor-pointer hover:scale-[1.02]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none opacity-60'
              }`}
              title={hasImage ? (editingProductId ? 'Save Changes' : 'Publish Product') : 'Photo upload required before saving'}
            >
              <Check className="w-4 h-4" />
              <span>{editingProductId ? 'Save Changes' : 'Publish Product'}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Full-Page Form Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: FORM INPUTS */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Core Details */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-[#0F1E2E] flex items-center gap-2 border-b border-gray-100 pb-3">
                <Tag className="w-4 h-4 text-[#147A7A]" />
                <span>1. Product Core Details</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Product Title / Model Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value })}
                    placeholder="e.g. Electric Power Wheelchair QM-7"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 focus:border-[#147A7A] bg-white text-gray-900 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Brand / Manufacturer
                    </label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({...formData, brand: e.target.value })}
                      placeholder="e.g. Sunrise Medical, TENA, Etac"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      SKU / Item Code
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({...formData, sku: e.target.value })}
                      placeholder="e.g. AT-WH-0001"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white font-mono"
                    />
                  </div>
                </div>

                {/* Category Selection with Clean Inline Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Department Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(!isAddingCategory)}
                      className="text-xs font-bold text-[#147A7A] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingCategory ? 'Cancel Category Creation' : 'Create New Category'}</span>
                    </button>
                  </div>

                  {/* Inline Category Creator */}
                  {isAddingCategory && (<div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-fade-in">
                      <input
                        type="text"
                        value={newCategoryTitle}
                        onChange={(e) => setNewCategoryTitle(e.target.value)}
                        placeholder="Enter new category name (e.g. Bariatric Care)..."
                        className="flex-1 px-3.5 py-2 border border-teal-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#147A7A]"
                      />
                      <button
                        type="button"
                        onClick={handleInlineAddCategory}
                        className="px-4 py-2 bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold rounded-lg shadow-sm whitespace-nowrap cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Add Category</span>
                      </button>
                    </div>)}

                  <div className="space-y-2">
                    <input
                      type="text"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value })}
                      placeholder="Type category (e.g. Wheelchairs, Care Beds, Mobility)..."
                      list="admin-category-suggestions"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white text-gray-900 font-medium"
                    />
                    <datalist id="admin-category-suggestions">
                      {categories.map((c) => (<option key={c.id} value={c.name} />))}
                    </datalist>

                    {categories.length > 0 && (<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[11px] font-bold text-gray-400">Quick Select:</span>
                        {categories.map((c) => (<button
                            key={c.id}
                            type="button"
                            onClick={() => setFormData({...formData, category: c.name })}
                            className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              formData.category.toLowerCase() === c.name.toLowerCase()
                                ? 'bg-[#147A7A] text-white border-[#147A7A]'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {c.name}
                          </button>))}
                      </div>)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Marketing Badge / Highlight
                  </label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({...formData, badge: e.target.value })}
                    placeholder="e.g. Best Seller, NDIS Approved, Popular"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Pricing, GST, Delivery & Equipment Hire */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
              <h2 className="text-sm font-bold text-[#0F1E2E] flex items-center gap-2 border-b border-gray-100 pb-3">
                <DollarSign className="w-4 h-4 text-[#147A7A]" />
                <span>2. Pricing, GST, Delivery & Inventory</span>
              </h2>

              {/* Price and Stock Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Buy Price (AUD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Stock in Inventory
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value })}
                    placeholder="15"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({...formData, lowStockThreshold: e.target.value })}
                    placeholder="10"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white font-medium"
                  />
                </div>
              </div>

              {/* GST & TAX CONFIGURATION BOX */}
              <div className="p-4 sm:p-5 rounded-2xl border border-teal-200 bg-teal-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">GST / Tax Status</p>
                    <p className="text-xs text-gray-600">Australian Taxation Office GST classification</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-100 text-teal-800">
                    {formData.gstType === 'gst-free'
                      ? '0% GST (NDIS Exempt)'
                      : formData.gstType === 'custom'
                      ? `${formData.customGstRate || 10}% Custom GST`
                      : '10% Taxable GST'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.gstType === 'standard'
                        ? 'border-[#147A7A] bg-white shadow-xs'
                        : 'border-gray-200 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gstType"
                      value="standard"
                      checked={formData.gstType === 'standard'}
                      onChange={() => setFormData({...formData, gstType: 'standard' })}
                      className="mt-0.5 text-[#147A7A] focus:ring-[#147A7A]"
                    />
                    <div>
                      <span className="font-bold text-xs text-gray-900 block">Standard 10% GST</span>
                      <span className="text-[10.5px] text-gray-500 block mt-0.5">Commercial taxable (1/11th GST)</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.gstType === 'gst-free'
                        ? 'border-[#147A7A] bg-white shadow-xs'
                        : 'border-gray-200 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gstType"
                      value="gst-free"
                      checked={formData.gstType === 'gst-free'}
                      onChange={() => setFormData({...formData, gstType: 'gst-free' })}
                      className="mt-0.5 text-[#147A7A] focus:ring-[#147A7A]"
                    />
                    <div>
                      <span className="font-bold text-xs text-emerald-800 block">NDIS GST-Free</span>
                      <span className="text-[10.5px] text-gray-500 block mt-0.5">0% GST (Section 38-45)</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.gstType === 'custom'
                        ? 'border-[#147A7A] bg-white shadow-xs'
                        : 'border-gray-200 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gstType"
                      value="custom"
                      checked={formData.gstType === 'custom'}
                      onChange={() => setFormData({...formData, gstType: 'custom', customGstRate: formData.customGstRate || '10' })}
                      className="mt-0.5 text-[#147A7A] focus:ring-[#147A7A]"
                    />
                    <div>
                      <span className="font-bold text-xs text-[#147A7A] block">Custom GST %</span>
                      <span className="text-[10.5px] text-gray-500 block mt-0.5">Custom tax percentage</span>
                    </div>
                  </label>
                </div>

                {/* Custom GST Rate Input */}
                {formData.gstType === 'custom' && (<div className="pt-2">
                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">
                      Custom GST Percentage (%) *
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        required={formData.gstType === 'custom'}
                        value={formData.customGstRate}
                        onChange={(e) => setFormData({...formData, customGstRate: e.target.value })}
                        placeholder="e.g. 15"
                        className="w-full pl-4 pr-8 py-2 border-2 border-teal-500 bg-white rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 font-bold">%</span>
                    </div>
                  </div>)}
              </div>

              {/* DELIVERY & FREIGHT CHARGES CONFIGURATION BOX */}
              <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Delivery & Freight Charges</p>
                    <p className="text-xs text-gray-600">Set shipping fee applied in cart and checkout</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                    {formData.isFreeDelivery ? 'Free Delivery' : `+ $${formData.deliveryFee || 0} Freight`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.isFreeDelivery
                        ? 'border-blue-600 bg-white shadow-xs'
                        : 'border-gray-200 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={formData.isFreeDelivery}
                      onChange={() => setFormData({...formData, isFreeDelivery: true, deliveryFee: '' })}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-gray-900 block">Free Delivery Australia-Wide</span>
                      <span className="text-[11px] text-gray-500 block mt-0.5">$0.00 Shipping for this equipment</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      !formData.isFreeDelivery
                        ? 'border-blue-600 bg-white shadow-xs'
                        : 'border-gray-200 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={!formData.isFreeDelivery}
                      onChange={() => setFormData({...formData, isFreeDelivery: false, deliveryFee: formData.deliveryFee || '49' })}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-xs text-gray-900 block">Custom Delivery Fee ($AUD)</span>
                      <span className="text-[11px] text-gray-500 block mt-0.5">For bulky or white-glove equipment</span>
                    </div>
                  </label>
                </div>

                {/* Custom Delivery Fee Input */}
                {!formData.isFreeDelivery && (<div className="pt-2">
                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">
                      Delivery Charge Amount (AUD) *
                    </label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 font-bold">$</span>
                      <input
                        type="number"
                        required={!formData.isFreeDelivery}
                        value={formData.deliveryFee}
                        onChange={(e) => setFormData({...formData, deliveryFee: e.target.value })}
                        placeholder="e.g. 49"
                        className="w-full pl-8 pr-4 py-2 border-2 border-blue-400 bg-white rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>)}
              </div>

              {/* EQUIPMENT HIRE TOGGLE BOX WITH HIGH-CONTRAST SWITCH */}
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/70 space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-200/80 flex items-center justify-center text-[#B45309] flex-shrink-0">
                      <CalendarCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Enable Equipment Hire</p>
                      <p className="text-xs text-gray-600">Make this product available for short & long-term rental</p>
                    </div>
                  </div>

                  {/* Accessible Pill Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({...prev, isHireAvailable: !prev.isHireAvailable }))}
                    className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.isHireAvailable ? 'bg-[#E88D2A]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        formData.isHireAvailable ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Reveal Hire Pricing Inputs when turned ON */}
                {formData.isHireAvailable && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-amber-300/80 animate-fade-in">
                    <div>
                      <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">
                        Hire Rate (AUD) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 font-bold">$</span>
                        <input
                          type="number"
                          required={formData.isHireAvailable}
                          value={formData.hirePrice}
                          onChange={(e) => setFormData({...formData, hirePrice: e.target.value })}
                          placeholder="e.g. 65"
                          className="w-full pl-8 pr-4 py-2.5 border-2 border-amber-400 bg-white rounded-xl text-sm font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">
                        Billing Period
                      </label>
                      <select
                        value={formData.hirePeriod}
                        onChange={(e) => setFormData({...formData, hirePeriod: e.target.value as 'week' | 'month' })}
                        className="w-full px-3.5 py-2.5 border-2 border-amber-400 bg-white rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="week">Per Week (Standard $xx/wk)</option>
                        <option value="month">Per Month ($xx/month)</option>
                      </select>
                    </div>
                  </div>)}
              </div>

              {/* FREE SAMPLE / TRIAL PACK OPTION */}
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-200/80 flex items-center justify-center text-emerald-800 flex-shrink-0">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Offer Free Sample / Trial Kit</p>
                      <p className="text-xs text-gray-600">Allow carers, clinicians and clients to request a complimentary sample</p>
                    </div>
                  </div>

                  {/* Accessible Pill Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({...prev, hasFreeSample: !prev.hasFreeSample }))}
                    className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.hasFreeSample ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        formData.hasFreeSample ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {formData.hasFreeSample && (<div className="pt-4 border-t border-emerald-300/80 animate-fade-in space-y-2">
                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Sample Pack Description / Inclusions
                    </label>
                    <input
                      type="text"
                      value={formData.sampleNote}
                      onChange={(e) => setFormData({...formData, sampleNote: e.target.value })}
                      placeholder="e.g. Complimentary 2-piece trial sample kit in discreet packaging"
                      className="w-full px-4 py-2.5 border-2 border-emerald-400 bg-white rounded-xl text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[11px] text-gray-500">
                      When enabled, clients can click &quot;Request Free Sample&quot; directly on this product.
                    </p>
                  </div>)}
              </div>
            </div>

            {/* Section 3: Media & Multi-Angle Photos with Upload */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-[#0F1E2E] flex items-center gap-2">
                  <Images className="w-4 h-4 text-[#147A7A]" />
                  <span>3. Product Images & Multi-Angle Upload <span className="text-red-600 font-black">*</span></span>
                </h2>

                {/* Input Mode Selector */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setImageInputMode('upload')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      imageInputMode === 'upload' ? 'bg-white text-[#147A7A] shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Files</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode('url')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      imageInputMode === 'url' ? 'bg-white text-[#147A7A] shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>Direct URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode('presets')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      imageInputMode === 'presets' ? 'bg-white text-[#147A7A] shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Sample Presets</span>
                  </button>
                </div>
              </div>

              {/* Mandatory Photo Status Banner */}
              {!hasImage ? (<div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Photo upload is required to save</span>
                    <span className="text-amber-800">
                      You must upload a main cover photo, add an image URL, or choose a preset before saving. The Save / Publish button is disabled until at least one photo is attached.
                    </span>
                  </div>
                </div>) : (<div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-900 animate-fade-in font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Photo ready ({formData.galleryImages.length > 0 ? `${formData.galleryImages.length} image(s)` : 'Cover selected'}) — Save option enabled</span>
                </div>)}

              {/* Mode 1: Drag & Drop Interactive File Upload */}
              {imageInputMode === 'upload' && (<div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Main Cover Uploader */}
                    <div
                      onClick={() => mainImageInputRef.current?.click()}
                      className="border-2 border-dashed border-[#147A7A]/40 bg-[#147A7A]/5 hover:bg-[#147A7A]/10 rounded-2xl p-5 text-center cursor-pointer transition-all group flex flex-col items-center justify-center min-h-[140px]"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#147A7A]/10 text-[#147A7A] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-gray-900">Upload Main Cover Photo</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Click or drag & drop (PNG, JPG, WebP)</p>
                    </div>

                    {/* Gallery Multi-Angle Uploader */}
                    <div
                      onClick={() => galleryImageInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 rounded-2xl p-5 text-center cursor-pointer transition-all group flex flex-col items-center justify-center min-h-[140px]"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Images className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-gray-900">Add Gallery Angle Photos</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Select multiple side, folded, or detail views</p>
                    </div>
                  </div>
                </div>)}

              {/* Mode 2: Direct URL Inputs */}
              {imageInputMode === 'url' && (<div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Main Display Cover URL
                    </label>
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData({...formData, image: e.target.value })}
                      placeholder="/images/cat_wheelchair_1787635999408.jpg"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white"
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customGalleryUrl}
                      onChange={(e) => setCustomGalleryUrl(e.target.value)}
                      placeholder="Add another angle image URL..."
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddGalleryUrl}
                      className="px-4 py-2.5 bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap"
                    >
                      Add Photo
                    </button>
                  </div>
                </div>)}

              {/* Mode 3: Sample Presets */}
              {imageInputMode === 'presets' && (<div className="space-y-2 animate-fade-in">
                  <p className="text-xs font-bold text-gray-700">Quick Clinical Presets:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {samplePresetImages.map((preset, idx) => (<button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            image: preset.url,
                            galleryImages: prev.galleryImages.includes(preset.url) ? prev.galleryImages : [preset.url,...prev.galleryImages],
                          }));
                        }}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          formData.image === preset.url
                            ? 'border-[#147A7A] bg-teal-50/70 ring-1 ring-[#147A7A]'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          <img src={proxyImageUrl(preset.url)} alt="" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[11px] font-bold text-gray-800 line-clamp-1">{preset.label}</span>
                      </button>))}
                  </div>
                </div>)}

              {/* Interactive Thumbnail Gallery Manager */}
              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Active Product Photos ({formData.galleryImages.length > 0 ? formData.galleryImages.length : (formData.image ? 1 : 0)})
                  </span>
                  {formData.galleryImages.length > 1 && (<span className="text-[11px] text-gray-400">Click star to set as main cover</span>)}
                </div>

                {!formData.image && formData.galleryImages.length === 0 ? (<div className="p-6 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl">
                    <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-700">No photos uploaded yet</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Click the upload box above or select a preset</p>
                  </div>) : (<div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {(formData.galleryImages.length > 0 ? formData.galleryImages : [formData.image]).filter(Boolean).map((imgUrl, idx) => {
                      const isCover = formData.image === imgUrl || (!formData.image && idx === 0);
                      return (<div
                          key={idx}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 p-1 bg-[#F8FAFC] group flex items-center justify-center transition-all ${
                            isCover ? 'border-[#147A7A] ring-2 ring-[#147A7A]/25' : 'border-gray-200'
                          }`}
                        >
                          <img src={proxyImageUrl(imgUrl)} alt="" className="w-full h-full object-contain" onError={handleImageError} />

                          {/* Top Badges & Actions */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                            <button
                              type="button"
                              onClick={() => handleSetCoverImage(imgUrl)}
                              className={`p-1.5 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer ${
                                isCover ? 'bg-amber-400 text-gray-900' : 'bg-white text-gray-800 hover:bg-amber-100'
                              }`}
                              title="Set as Main Cover"
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryImage(idx)}
                              className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
                              title="Remove Image"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Corner Indicator */}
                          {isCover && (<span className="absolute bottom-1 left-1 bg-[#147A7A] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                              COVER
                            </span>)}
                        </div>);
                    })}
                  </div>)}
              </div>
            </div>

            {/* Section 4: Size & Colour Options (Variants) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-[#0F1E2E] flex items-center gap-2 border-b border-gray-100 pb-3">
                <SlidersHorizontal className="w-4 h-4 text-[#147A7A]" />
                <span>4. Size & Colour Options (Variants)</span>
              </h2>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Add Size / Colour options exactly like the main storefront. Each combination becomes a variant
                with its own SKU, price and photo — shoppers pick them from dropdowns on the product page.
              </p>

              {/* Quick presets + custom attribute */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleAddAttribute('Size', [
                      { label: 'Small', value: 'small' },
                      { label: 'Medium', value: 'medium' },
                      { label: 'Large', value: 'large' },
                      { label: 'Extra Large', value: 'extra-large' },
                    ])
                  }
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-gray-800 text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                >
                  + Size: S / M / L / XL
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAddAttribute('Colour', [
                      { label: 'Black', value: 'black', colorHex: '#1a1a1a' },
                      { label: 'Blue', value: 'blue', colorHex: '#2563eb' },
                      { label: 'Red', value: 'red', colorHex: '#dc2626' },
                      { label: 'Grey', value: 'grey', colorHex: '#9ca3af' },
                    ])
                  }
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-gray-800 text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                >
                  + Colour: Black / Blue / Red / Grey
                </button>
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="text"
                    value={newAttrName}
                    onChange={(e) => setNewAttrName(e.target.value)}
                    placeholder="Custom option (e.g. Depth)"
                    className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white w-44"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddAttribute()}
                    className="px-3 py-1.5 bg-[#147A7A] hover:bg-[#106262] text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Option
                  </button>
                </div>
              </div>

              {/* Attribute cards */}
              {formAttrs.length === 0 && (<div className="p-4 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl">
                  <p className="text-xs text-gray-500">
                    No options yet — a product without options sells as a single item (Add to Cart directly).
                  </p>
                </div>)}
              <div className="space-y-3">
                {formAttrs.map((attr) => (<div key={attr.key} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#0F1E2E] uppercase tracking-wider">{attr.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            attr.type === 'color' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {attr.type === 'color' ? 'Colour swatches' : 'Dropdown'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttribute(attr.key)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title={`Remove ${attr.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Values */}
                    <div className="flex flex-wrap gap-1.5">
                      {attr.values.map((v) => (<span
                          key={v.value}
                          className="inline-flex items-center gap-1.5 pl-1 pr-1.5 py-1 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-gray-800"
                        >
                          {attr.type === 'color' && (<span
                              className="w-4 h-4 rounded-full border border-black/15"
                              style={{ backgroundColor: v.colorHex || '#cbd5e1' }}
                            />)}
                          {v.label}
                          <button
                            type="button"
                            onClick={() => handleRemoveAttrValue(attr.key, v.value)}
                            className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>))}
                      {attr.values.length === 0 && (<span className="text-[11px] text-gray-400">Add values below (e.g. Small, Medium, Large)</span>)}
                    </div>

                    {/* Add value */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={valueDrafts[attr.key] || ''}
                        onChange={(e) => setValueDrafts((d) => ({...d, [attr.key]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddAttrValue(attr.key);
                          }
                        }}
                        placeholder={attr.type === 'color' ? 'Colour name (e.g. Navy)' : 'Value (e.g. Small)'}
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white"
                      />
                      {attr.type === 'color' && (<input
                          type="color"
                          value={hexDrafts[attr.key] || '#147A7A'}
                          onChange={(e) => setHexDrafts((d) => ({...d, [attr.key]: e.target.value }))}
                          title="Swatch colour"
                          className="w-9 h-8 p-0.5 border border-gray-300 rounded-xl cursor-pointer bg-white"
                        />)}
                      <button
                        type="button"
                        onClick={() => handleAddAttrValue(attr.key)}
                        className="px-3 py-1.5 bg-[#0F1E2E] hover:bg-black text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>))}
              </div>

              {/* Variant matrix */}
              {formVariants.length > 0 && (<div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Variants ({formVariants.length}) — SKU, price & photo per combination
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="max-h-[280px] overflow-y-auto divide-y divide-gray-100">
                      {formVariants.map((v) => (<div key={v.key} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center gap-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#0F1E2E] truncate">
                              {Object.entries(v.attrs)
                                .map(([k, val]) => prettyLabel(val))
                                .join(' / ')}
                            </p>
                            <p className="text-[10.5px] text-gray-400 font-mono truncate">{v.key}</p>
                          </div>
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) => updateFormVariant(v.key, { sku: e.target.value })}
                            placeholder="SKU"
                            title="Variant SKU"
                            className="w-full sm:w-32 px-2.5 py-1.5 border border-gray-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white"
                          />
                          <div className="flex items-center gap-1 w-full sm:w-28">
                            <span className="text-xs text-gray-400 font-bold">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={v.price}
                              onChange={(e) => updateFormVariant(v.key, { price: e.target.value })}
                              placeholder={formData.price || 'Price'}
                              title="Variant price (AUD)"
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white"
                            />
                          </div>
                          <select
                            value={v.image}
                            onChange={(e) => updateFormVariant(v.key, { image: e.target.value })}
                            title="Variant photo (switches on the product page)"
                            className="w-full sm:w-36 px-2 py-1.5 border border-gray-300 rounded-xl text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 cursor-pointer"
                          >
                            <option value="">Cover photo</option>
                            {(formData.galleryImages.length > 0 ? formData.galleryImages : [formData.image])
                              .filter(Boolean)
                              .map((g, gi) => (<option key={gi} value={g}>
                                  Photo {gi + 1}
                                </option>))}
                          </select>
                          <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 cursor-pointer whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={v.available}
                              onChange={(e) => updateFormVariant(v.key, { available: e.target.checked })}
                              className="h-3.5 w-3.5 rounded border-gray-300 text-[#147A7A] focus:ring-[#147A7A] cursor-pointer"
                            />
                            In stock
                          </label>
                        </div>))}
                    </div>
                  </div>
                </div>)}
            </div>

            {/* Section 5: Clinical Specs & Description */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-[#0F1E2E] flex items-center gap-2 border-b border-gray-100 pb-3">
                <Layers className="w-4 h-4 text-[#147A7A]" />
                <span>5. Clinical Description & Specifications</span>
              </h2>

              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value })}
                placeholder="Enter clinical benefits, weight capacity, battery range, ergonomic adjustments, and NDIS justification notes..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white resize-none"
              />
            </div>

            {/* Section 5: Storefront Visibility */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-[#147A7A]" />
                <div>
                  <p className="text-sm font-bold text-gray-900">Publish to Online Storefront</p>
                  <p className="text-xs text-gray-500">Visible to active buyers and NDIS participants</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.available}
                onChange={(e) => setFormData({...formData, available: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-[#147A7A] focus:ring-[#147A7A] cursor-pointer"
              />
            </div>

            {/* Bottom Save / Action Bar */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                {!hasImage ? (<div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Upload a product photo to enable saving</span>
                  </div>) : (<div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Photo attached — ready to save</span>
                  </div>)}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!hasImage}
                  onClick={handleSubmit}
                  className={`px-7 py-2.5 text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 ${
                    hasImage
                      ? 'bg-[#147A7A] hover:bg-[#106262] text-white cursor-pointer hover:scale-[1.02]'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none opacity-60'
                  }`}
                  title={hasImage ? (editingProductId ? 'Save Changes' : 'Publish Product') : 'Photo upload required before saving'}
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProductId ? 'Save Changes' : 'Publish Product'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT 1 COLUMN: LIVE STORE CARD PREVIEW */}
          <div className="space-y-6">
            <div className="sticky top-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Live Store Card Preview
                </span>
                <span className="text-[11px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  Realtime Preview
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg p-5 space-y-4">
                {/* Image Box */}
                <div className="aspect-square bg-[#F8FAFC] rounded-xl overflow-hidden border border-gray-100 p-2 flex items-center justify-center relative">
                  {formData.badge && (<span className="absolute top-2 left-2 bg-[#0F1E2E] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm z-10">
                      {formData.badge}
                    </span>)}
                  {formData.image ? (<img
                      src={proxyImageUrl(formData.image)}
                      alt="Product preview"
                      className="w-full h-full object-contain"
                      onError={handleImageError}
                    />) : (<div className="flex flex-col items-center justify-center text-center p-4">
                      <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-2">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-gray-500">No Image Uploaded</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Upload a cover photo to preview</p>
                    </div>)}
                </div>

                {/* Gallery Thumbnails Strip Preview */}
                {formData.galleryImages.length > 1 && (<div className="flex gap-1.5 overflow-x-auto pb-1">
                    {formData.galleryImages.map((url, i) => (<div
                        key={i}
                        onClick={() => handleSetCoverImage(url)}
                        className={`w-10 h-10 bg-white border rounded-lg overflow-hidden flex-shrink-0 p-0.5 cursor-pointer transition-all ${
                          formData.image === url ? 'border-[#147A7A] ring-1 ring-[#147A7A]' : 'border-gray-200'
                        }`}
                      >
                        <img src={proxyImageUrl(url)} alt="" className="w-full h-full object-contain" onError={handleImageError} />
                      </div>))}
                  </div>)}

                {/* Titles & Prices */}
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    {formData.brand || 'AT Specialists'}
                  </p>
                  <h3 className="text-base font-bold text-gray-900 line-clamp-2 mt-0.5">
                    {formData.name || 'New Clinical Product'}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                    {formData.description || 'No description entered yet.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-black text-[#0F1E2E]">
                      {formData.price ? `$${Number(formData.price).toLocaleString()}` : '$0.00'}
                    </span>
                    {formData.isHireAvailable && Number(formData.hirePrice) > 0 && (<span className="block text-[11px] font-bold text-[#E88D2A]">
                        or Hire: ${formData.hirePrice}/{formData.hirePeriod}
                      </span>)}
                  </div>

                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200/60">
                    In Stock ({formData.stock})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>);
  }

  // ==========================================
  // VIEW MODE: FULL-PAGE PRODUCT DETAILS / INSPECTION
  // ==========================================
  if (viewMode === 'detail' && viewingProduct) {
    return (<div className="space-y-6 pb-12 animate-fade-in">
        {/* Top Header */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-[#147A7A] transition-colors cursor-pointer border border-gray-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs font-bold text-[#147A7A] uppercase tracking-wider">Product Inspection</span>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">{viewingProduct.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/product/${viewingProduct.id}`}
              target="_blank"
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-1.5"
            >
              <span>View on Store</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => openEditForm(viewingProduct.id)}
              className="px-5 py-2.5 bg-[#147A7A] hover:bg-[#106262] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Product</span>
            </button>
          </div>
        </div>

        {/* 2-Column Detail View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Images Gallery */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">Product Media & Angles</h2>
            <div className="aspect-square bg-[#F8FAFC] rounded-2xl border border-gray-200 p-4 flex items-center justify-center">
              <img
                src={proxyImageUrl(viewingProduct.image)}
                alt={viewingProduct.name}
                className="w-full h-full object-contain"
                onError={handleImageError}
              />
            </div>
            {viewingProduct.galleryImages && viewingProduct.galleryImages.length > 1 && (<div className="flex gap-2 overflow-x-auto pb-2">
                {viewingProduct.galleryImages.map((img: string, i: number) => (<div key={i} className="w-20 h-20 bg-[#F8FAFC] rounded-xl border border-gray-200 p-1 flex-shrink-0">
                    <img src={proxyImageUrl(img)} alt="" className="w-full h-full object-contain" onError={handleImageError} />
                  </div>))}
              </div>)}
          </div>

          {/* Details & Specs */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">Product Specifications</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 font-semibold uppercase">Purchase Price</span>
                <p className="text-2xl font-black text-[#0F1E2E] mt-1">{formatCurrency(viewingProduct.price)}</p>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl">
                <span className="text-xs text-amber-800 font-semibold uppercase">Hire Rate</span>
                <p className="text-2xl font-black text-[#D97706] mt-1">
                  {viewingProduct.hirePrice > 0 ? `$${viewingProduct.hirePrice}/${viewingProduct.hirePeriod || 'wk'}` : 'Buy Only'}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Brand / Manufacturer</span>
                <span className="font-bold text-gray-900">{viewingProduct.brand}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">SKU / Item Code</span>
                <span className="font-mono text-gray-900">{viewingProduct.sku}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Department Category</span>
                <span className="font-bold text-[#147A7A] capitalize">{viewingProduct.category.replace(/-/g, ' ')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Stock in Warehouse</span>
                <span className="font-bold text-gray-900">{viewingProduct.stock} units</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Storefront Status</span>
                <span className={`font-bold ${viewingProduct.available ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {viewingProduct.available ? 'Active & Published' : 'Hidden'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Clinical Description</span>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl">
                {viewingProduct.description}
              </p>
            </div>
          </div>
        </div>
      </div>);
  }

  // ==========================================
  // VIEW MODE: DEFAULT PRODUCT CATALOG TABLE
  // ==========================================
  return (<div className="space-y-6 animate-fade-in">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-teal-50 text-[#147A7A] border border-teal-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Products Hub
            </span>
            <span className="text-slate-400 text-xs">&bull;</span>
            <span className="text-xs text-slate-500 font-medium">Catalogue, Inventory &amp; Merchandising</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Products &amp; Inventory Hub</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            {products.length} total products in database &middot; {products.filter((p) => p.buyAvailable !== false).length} for outright buy &middot; {products.filter((p) => p.hireAvailable === true).length} hire equipment fleet
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {selectedProducts.length > 0 && (<button
              onClick={() => {
                if (window.confirm(`Delete ${selectedProducts.length} selected items?`)) {
                  selectedProducts.forEach((id) => deleteProduct(id));
                  setSelectedProducts([]);
                }
              }}
              className="inline-flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-100 transition-all cursor-pointer shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedProducts.length})
            </button>)}

          <button
            onClick={openAddForm}
            className="inline-flex items-center gap-2 bg-[#147A7A] hover:bg-[#106262] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Catalogue Counts Breakdown Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Catalogue</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{products.length}</span>
            <span className="text-xs text-slate-500 font-medium">unique items</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Outright Purchase</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-800 font-mono">{products.filter((p) => p.buyAvailable !== false).length}</span>
            <span className="text-xs text-emerald-600 font-medium">buy online</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-100 bg-amber-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">Equipment Hire Fleet</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-800 font-mono">{products.filter((p) => p.hireAvailable === true).length}</span>
            <span className="text-xs text-amber-600 font-medium">available for hire</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Stock Health</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{lowStockCount}</span>
            <span className="text-xs text-red-600 font-medium">low stock alerts</span>
          </div>
        </div>
      </div>

      {/* 2. FILTERS & SEARCH TOOLBAR */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product title, brand, SKU or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 focus:border-[#147A7A] bg-white text-[#0F1E2E]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 cursor-pointer"
            >
              {categoryOptions.map((opt) => (<option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 cursor-pointer"
            >
              <option value="all">All Stock Statuses</option>
              <option value="low">Low Stock (&le; 10)</option>
              <option value="out">Out of Stock (0)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. PRODUCT TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-[#F8FAFC]">
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                    onChange={(e) =>
                      setSelectedProducts(e.target.checked ? filteredProducts.map((p) => p.id) : [])
                    }
                    className="w-4 h-4 rounded border-gray-300 text-[#147A7A] focus:ring-[#147A7A] cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => toggleSort('name')}
                  className="text-left px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Product & Model</span>
                    <SortIcon k="name" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('category')}
                  className="text-left px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:bg-gray-100/50 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Category</span>
                    <SortIcon k="category" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('price')}
                  className="text-left px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Buy Price</span>
                    <SortIcon k="price" />
                  </div>
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                  Hire Rate
                </th>
                <th
                  onClick={() => toggleSort('stock')}
                  className="text-left px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Stock</span>
                    <SortIcon k="stock" />
                  </div>
                </th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                  Status
                </th>
                <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (<tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#147A7A] flex items-center justify-center mx-auto mb-3">
                      <Package className="w-7 h-7" />
                    </div>
                    {products.length === 0 ? (<div>
                        <p className="text-gray-900 font-bold text-base">Your product catalog is empty</p>
                        <p className="text-gray-500 text-xs mt-1 mb-5 max-w-sm mx-auto">
                          All sample data has been cleared. You can now add your clinical assistive technology products manually.
                        </p>
                        <button
                          type="button"
                          onClick={openAddForm}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Your First Product</span>
                        </button>
                      </div>) : (<div>
                        <p className="text-gray-700 font-bold">No products match your search/filter criteria</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearch('');
                            setCategoryFilter('all');
                            setStockFilter('all');
                          }}
                          className="mt-3 text-xs font-bold text-[#147A7A] hover:underline cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      </div>)}
                  </td>
                </tr>) : (filteredProducts.map((p) => {
                  const isSelected = selectedProducts.includes(p.id);
                  const isLow = p.stock <= p.lowStockThreshold && p.stock > 0;
                  const isOut = p.stock === 0;

                  return (<tr
                      key={p.id}
                      className={`hover:bg-teal-50/30 transition-colors ${
                        isSelected ? 'bg-teal-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#147A7A] focus:ring-[#147A7A] cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0 p-1 flex items-center justify-center">
                            <img
                              src={proxyImageUrl(p.image)}
                              alt={p.name}
                              className="w-full h-full object-contain"
                              onError={handleImageError}
                            />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => openDetailView(p.id)}
                              className="font-bold text-gray-900 hover:text-[#147A7A] text-left cursor-pointer transition-colors leading-snug line-clamp-1"
                            >
                              {p.name}
                            </button>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                              {p.sku} &middot; <span className="font-sans font-semibold text-[#147A7A]">{p.brand}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                          {p.category.replace(/-/g, ' ')}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-semibold font-mono text-slate-900">{formatCurrency(p.price)}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {p.gstType === 'gst-free' ? (<span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                              GST-Free
                            </span>) : p.gstType === 'custom' ? (<span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                              {p.gstRate || 10}% GST
                            </span>) : (<span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                              10% GST
                            </span>)}
                          {p.deliveryFee && p.deliveryFee > 0 ? (<span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                              +${p.deliveryFee} ship
                            </span>) : (<span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                              Free Ship
                            </span>)}
                          {p.hasFreeSample && (<span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                              Free Sample
                            </span>)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {p.hirePrice > 0 ? (<span className="inline-flex items-center gap-1 text-xs font-bold text-[#D97706] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            ${p.hirePrice}/{p.hirePeriod || 'wk'}
                          </span>) : (<span className="text-xs text-gray-400 font-medium">Buy Only</span>)}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isOut
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : isLow
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : isLow ? `Low (${p.stock})` : `${p.stock} units`}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                        <button
                          type="button"
                          onClick={() => updateProduct(p.id, { available: !p.available })}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            p.available
                              ? 'text-emerald-700 hover:bg-emerald-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={p.available ? 'Click to hide from store' : 'Click to publish on store'}
                        >
                          {p.available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetailView(p.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#147A7A] hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Inspect Details"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditForm(p.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#147A7A] hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>);
                }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
}

export default AdminProducts;
