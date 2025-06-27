export interface PickupConfig {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  imageUrl: string;
  gradientColors: [string, string];
  actionType: 'gacha' | 'store' | 'theme';
  actionParams?: {
    themeId?: string;
    gachaType?: string;
    storeCategory?: string;
    specialOffer?: boolean;
  };
  startDate: string;
  endDate: string;
  priority: number;
  isActive: boolean;
}

export const PICKUP_CONFIGS: PickupConfig[] = [
  {
    id: 'winter_special',
    title: '冬の特別テーマ',
    subtitle: '期間限定',
    description: '雪景色の美しいテーマが登場！限定ガチャで手に入れよう',
    imageUrl: 'https://example.com/winter-theme.jpg',
    gradientColors: ['#E3F2FD', '#1976D2'],
    actionType: 'gacha',
    actionParams: {
      gachaType: 'winter_special',
      specialOffer: true
    },
    startDate: '2024-12-01',
    endDate: '2024-02-28',
    priority: 1,
    isActive: true
  },
  {
    id: 'new_year_sale',
    title: 'お正月セール',
    subtitle: '50% OFF',
    description: 'すべてのテーマが半額！この機会をお見逃しなく',
    imageUrl: 'https://example.com/new-year-sale.jpg',
    gradientColors: ['#FFF3E0', '#F57C00'],
    actionType: 'store',
    actionParams: {
      storeCategory: 'themes',
      specialOffer: true
    },
    startDate: '2024-12-28',
    endDate: '2025-01-07',
    priority: 2,
    isActive: true
  },
  {
    id: 'premium_theme',
    title: 'プレミアムテーマ',
    description: '最高品質のプレミアムテーマをチェック',
    imageUrl: 'https://example.com/premium-theme.jpg',
    gradientColors: ['#F3E5F5', '#7B1FA2'],
    actionType: 'theme',
    actionParams: {
      themeId: 'premium_collection'
    },
    startDate: '2024-01-01',
    endDate: '2025-12-31',
    priority: 3,
    isActive: true
  }
];

export const getActivePickups = (): PickupConfig[] => {
  const now = new Date();
  return PICKUP_CONFIGS
    .filter(config => {
      if (!config.isActive) return false;
      const startDate = new Date(config.startDate);
      const endDate = new Date(config.endDate);
      return now >= startDate && now <= endDate;
    })
    .sort((a, b) => a.priority - b.priority);
};

export const getPickupById = (id: string): PickupConfig | undefined => {
  return PICKUP_CONFIGS.find(config => config.id === id);
};