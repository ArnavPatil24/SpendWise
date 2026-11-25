import {
  Baby, BookOpen, Briefcase, Bus, Car, Coffee, Dumbbell, Film, Fuel, Gamepad2, Gift, GraduationCap, HandCoins,
  HeartPulse, Home, Laptop, Music, PawPrint, Pizza, Plane, Receipt, Shirt, ShoppingBag, Smartphone, Sparkles,
  Store, Tag, TrendingUp, Utensils, Wallet, Wifi, Wrench
} from 'lucide-react';

// Keys match server/constants/categories.js (ICON_KEYS).
export const categoryIcons = {
  tag: Tag, utensils: Utensils, coffee: Coffee, pizza: Pizza, car: Car, bus: Bus, fuel: Fuel,
  'shopping-bag': ShoppingBag, shirt: Shirt, film: Film, music: Music, gamepad: Gamepad2, receipt: Receipt,
  wifi: Wifi, smartphone: Smartphone, 'heart-pulse': HeartPulse, dumbbell: Dumbbell, 'graduation-cap': GraduationCap,
  'book-open': BookOpen, plane: Plane, home: Home, gift: Gift, 'paw-print': PawPrint, baby: Baby, wrench: Wrench,
  briefcase: Briefcase, laptop: Laptop, store: Store, 'trending-up': TrendingUp, wallet: Wallet,
  'hand-coins': HandCoins, sparkles: Sparkles
};
export const categoryIconKeys = Object.keys(categoryIcons);

export const categoryColors = ['#4F6BF0', '#12A58A', '#D9A23B', '#E4647C', '#8A6CE0', '#3AA6D6', '#F0803C', '#C74B9B', '#5BA85B', '#7C8BA6'];
