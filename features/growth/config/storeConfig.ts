export interface StoreItem {
  id: string;
  name: string;
  description: string;
  image: string;
  originalPrice: number;
  salePrice?: number;
  category: 'themes' | 'currency' | 'premium' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isLimited?: boolean;
  discount?: number;
  tags: string[];
}

export interface StoreCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  items: StoreItem[];
}

export const STORE_ITEMS: StoreItem[] = [
  {
    id: 'theme_premium_forest',
    name: 'プレミアム森テーマ',
    description: '美しい森の風景で心を癒やそう',
    image: 'https://example.com/premium-forest.jpg',
    originalPrice: 500,
    salePrice: 250,
    category: 'themes',
    rarity: 'epic',
    discount: 50,
    tags: ['自然', '癒やし', '人気'],
  },
  {
    id: 'theme_cyber_city',
    name: 'サイバーシティテーマ',
    description: 'ネオンが輝く未来都市',
    image: 'https://example.com/cyber-city.jpg',
    originalPrice: 800,
    category: 'themes',
    rarity: 'legendary',
    isLimited: true,
    tags: ['未来', 'ネオン', '限定'],
  },
  {
    id: 'currency_gems_small',
    name: 'ジェムパック（小）',
    description: '100ジェムを獲得',
    image: 'https://example.com/gem-pack-small.jpg',
    originalPrice: 100,
    category: 'currency',
    rarity: 'common',
    tags: ['ジェム', 'お得'],
  },
  {
    id: 'currency_gems_large',
    name: 'ジェムパック（大）',
    description: '1000ジェムを獲得',
    image: 'https://example.com/gem-pack-large.jpg',
    originalPrice: 800,
    salePrice: 600,
    category: 'currency',
    rarity: 'rare',
    discount: 25,
    tags: ['ジェム', '大容量', 'セール'],
  },
  {
    id: 'premium_membership',
    name: 'プレミアム会員（月額）',
    description: '毎日ボーナス報酬とVIP特典',
    image: 'https://example.com/premium-membership.jpg',
    originalPrice: 1200,
    category: 'premium',
    rarity: 'legendary',
    tags: ['会員', 'VIP', 'ボーナス'],
  },
];

export const STORE_CATEGORIES: StoreCategory[] = [
  {
    id: 'themes',
    name: 'テーマ',
    icon: '🎨',
    color: '#2196F3',
    items: STORE_ITEMS.filter(item => item.category === 'themes'),
  },
  {
    id: 'currency',
    name: '通貨',
    icon: '💰',
    color: '#FF9800',
    items: STORE_ITEMS.filter(item => item.category === 'currency'),
  },
  {
    id: 'premium',
    name: 'プレミアム',
    icon: '👑',
    color: '#9C27B0',
    items: STORE_ITEMS.filter(item => item.category === 'premium'),
  },
];

export const getSaleItems = (): StoreItem[] => {
  return STORE_ITEMS.filter(item => item.salePrice && item.discount);
};

export const getLimitedItems = (): StoreItem[] => {
  return STORE_ITEMS.filter(item => item.isLimited);
};

export const getItemsByCategory = (categoryId: string): StoreItem[] => {
  return STORE_ITEMS.filter(item => item.category === categoryId);
};

export const getFeaturedItems = (): StoreItem[] => {
  return STORE_ITEMS.filter(item => 
    item.isLimited || 
    item.discount || 
    item.rarity === 'legendary'
  ).slice(0, 3);
};