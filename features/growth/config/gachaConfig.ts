export interface GachaItem {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  image: string;
  type: 'theme' | 'decoration' | 'boost';
  dropRate: number;
}

export interface GachaBox {
  id: string;
  name: string;
  description: string;
  image: string;
  cost: number;
  pullType: 'single' | 'multi';
  guaranteedRarity?: 'rare' | 'epic' | 'legendary';
  items: GachaItem[];
  isSpecial?: boolean;
  bgGradient: [string, string];
  rarityColors: {
    common: string;
    rare: string;
    epic: string;
    legendary: string;
  };
}

export const GACHA_BOXES: GachaBox[] = [
  {
    id: 'premium_single',
    name: 'プレミアムガチャ',
    description: 'レア以上確定！',
    image: 'https://example.com/premium-box.jpg',
    cost: 300,
    pullType: 'single',
    guaranteedRarity: 'rare',
    isSpecial: false,
    bgGradient: ['#667eea', '#764ba2'],
    rarityColors: {
      common: '#9E9E9E',
      rare: '#2196F3',
      epic: '#9C27B0',
      legendary: '#FF9800',
    },
    items: [
      {
        id: 'theme_forest',
        name: '森のテーマ',
        rarity: 'rare',
        image: 'https://example.com/forest-theme.jpg',
        type: 'theme',
        dropRate: 30,
      },
      {
        id: 'theme_ocean',
        name: '海のテーマ',
        rarity: 'epic',
        image: 'https://example.com/ocean-theme.jpg',
        type: 'theme',
        dropRate: 15,
      },
      {
        id: 'theme_galaxy',
        name: '銀河テーマ',
        rarity: 'legendary',
        image: 'https://example.com/galaxy-theme.jpg',
        type: 'theme',
        dropRate: 3,
      },
    ],
  },
  {
    id: 'premium_multi',
    name: 'プレミアム10連',
    description: 'エピック以上1体確定！',
    image: 'https://example.com/premium-multi-box.jpg',
    cost: 2700,
    pullType: 'multi',
    guaranteedRarity: 'epic',
    isSpecial: false,
    bgGradient: ['#f093fb', '#f5576c'],
    rarityColors: {
      common: '#9E9E9E',
      rare: '#2196F3',
      epic: '#9C27B0',
      legendary: '#FF9800',
    },
    items: [
      {
        id: 'theme_forest',
        name: '森のテーマ',
        rarity: 'rare',
        image: 'https://example.com/forest-theme.jpg',
        type: 'theme',
        dropRate: 40,
      },
      {
        id: 'theme_ocean',
        name: '海のテーマ',
        rarity: 'epic',
        image: 'https://example.com/ocean-theme.jpg',
        type: 'theme',
        dropRate: 25,
      },
      {
        id: 'theme_galaxy',
        name: '銀河テーマ',
        rarity: 'legendary',
        image: 'https://example.com/galaxy-theme.jpg',
        type: 'theme',
        dropRate: 5,
      },
    ],
  },
  {
    id: 'winter_special',
    name: '冬限定ガチャ',
    description: '期間限定！雪テーマが当たる！',
    image: 'https://example.com/winter-box.jpg',
    cost: 500,
    pullType: 'single',
    guaranteedRarity: 'epic',
    isSpecial: true,
    bgGradient: ['#e3f2fd', '#1976d2'],
    rarityColors: {
      common: '#9E9E9E',
      rare: '#2196F3',
      epic: '#9C27B0',
      legendary: '#FF9800',
    },
    items: [
      {
        id: 'theme_winter',
        name: '雪景色テーマ',
        rarity: 'legendary',
        image: 'https://example.com/winter-theme.jpg',
        type: 'theme',
        dropRate: 15,
      },
    ],
  },
];

export const getGachaBoxById = (id: string): GachaBox | undefined => {
  return GACHA_BOXES.find(box => box.id === id);
};

export const getSpecialGachaBoxes = (): GachaBox[] => {
  return GACHA_BOXES.filter(box => box.isSpecial);
};

export const getNormalGachaBoxes = (): GachaBox[] => {
  return GACHA_BOXES.filter(box => !box.isSpecial);
};