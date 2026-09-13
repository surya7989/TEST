export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  authorRole: string;
  publishedAt: string;
  readTime: number;
  featuredImage: string;
  tags: string[];
}

export const articles: Article[] = [
  {
    id: '1',
    slug: 'choosing-right-wheelchair',
    title: 'Choosing the Right Wheelchair',
    excerpt: 'Understanding the differences between manual, power, and tilt-in-space wheelchairs to find the best fit.',
    category: 'Wheelchairs',
    author: 'Sarah Mitchell, OT',
    authorRole: 'Senior Occupational Therapist',
    publishedAt: '2024-11-15',
    readTime: 8,
    featuredImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop',
    tags: ['NDIS', 'Wheelchairs'],
  },
  {
    id: '2',
    slug: 'bathroom-safety-at-home',
    title: 'Bathroom Safety at Home',
    excerpt: 'From grab rails to shower chairs — essential equipment for bathroom safety and accessibility.',
    category: 'Bathroom Safety',
    author: 'James Chen, OT',
    authorRole: 'Assistive Technology Specialist',
    publishedAt: '2024-11-08',
    readTime: 6,
    featuredImage: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&h=400&fit=crop',
    tags: ['Bathroom', 'Safety'],
  },
  {
    id: '3',
    slug: 'understanding-pressure-care',
    title: 'Understanding Pressure Care',
    excerpt: 'Learn about pressure injury prevention, mattress types and cushion options for effective care.',
    category: 'Pressure Care',
    author: 'Dr. Amanda Foster',
    authorRole: 'Clinical Nurse Consultant',
    publishedAt: '2024-11-01',
    readTime: 10,
    featuredImage: 'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=600&h=400&fit=crop',
    tags: ['Pressure Care', 'Clinical'],
  },
  {
    id: '4',
    slug: 'ndis-assistive-technology-guide',
    title: 'NDIS Assistive Technology Guide',
    excerpt: 'Navigate AT funding categories, assessment requirements and plan management for assistive technology.',
    category: 'NDIS',
    author: 'Lisa Thompson',
    authorRole: 'NDIS Support Coordinator',
    publishedAt: '2024-10-21',
    readTime: 12,
    featuredImage: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop',
    tags: ['NDIS', 'Funding'],
  },
];
