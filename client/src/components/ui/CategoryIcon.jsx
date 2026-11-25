import {
  Banknote, Briefcase, Building2, Car, CircleDollarSign, Film, Gift, GraduationCap, HeartPulse,
  Home, Laptop, Plane, Receipt, ShieldCheck, ShoppingBag, Target, Tv, TrendingUp, Utensils
} from 'lucide-react';
import { categoryIcons } from '../../constants/categoryIcons';
import { useCategories } from '../../context/CategoryContext';

const categoryRules = [
  ['food', Utensils], ['dining', Utensils], ['transport', Car], ['shop', ShoppingBag], ['entertain', Film],
  ['bill', Receipt], ['util', Receipt], ['health', HeartPulse], ['educ', GraduationCap], ['travel', Plane],
  ['subscri', Tv], ['salary', Briefcase], ['freelance', Laptop], ['business', Building2],
  ['invest', TrendingUp], ['gift', Gift], ['other income', Banknote]
];

const goalRules = [
  ['tech', Laptop], ['gadget', Laptop], ['travel', Plane], ['vacation', Plane], ['emergency', ShieldCheck],
  ['edu', GraduationCap], ['vehicle', Car], ['car', Car], ['home', Home], ['invest', TrendingUp]
];

function pick(rules, name, fallback) {
  const key = (name || '').toLowerCase();
  return (rules.find(([match]) => key.includes(match)) || [null, fallback])[1];
}

/** A custom category shows the icon its owner chose; built-ins are matched by name. */
export function CategoryIcon({ category, size = 18 }) {
  const meta = useCategories()?.metaFor(category);
  const Icon = meta ? (categoryIcons[meta.icon] || categoryIcons.tag) : pick(categoryRules, category, CircleDollarSign);
  return <Icon size={size} strokeWidth={1.9} />;
}

export function GoalIcon({ category, size = 20 }) {
  const meta = useCategories()?.metaFor(category);
  const Icon = meta ? (categoryIcons[meta.icon] || categoryIcons.tag) : pick(goalRules, category, Target);
  return <Icon size={size} strokeWidth={1.9} />;
}
