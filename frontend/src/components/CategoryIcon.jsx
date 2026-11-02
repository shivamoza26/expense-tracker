import {
  ShoppingBag, Apple, Pizza, Car, Receipt, Repeat, Pill, Plane, RotateCcw,
  Heart, Briefcase, Umbrella, Tv, Gamepad2, Store, Home, Package, PlaySquare,
  Sprout, Activity, Bone, Shapes
} from 'lucide-react';

const CATEGORY_ICONS = {
  'shopping-bag': ShoppingBag,
  apple: Apple,
  pizza: Pizza,
  car: Car,
  receipt: Receipt,
  repeat: Repeat,
  pill: Pill,
  plane: Plane,
  'rotate-ccw': RotateCcw,
  heart: Heart,
  briefcase: Briefcase,
  umbrella: Umbrella,
  tv: Tv,
  'gamepad-2': Gamepad2,
  store: Store,
  home: Home,
  package: Package,
  'play-square': PlaySquare,
  sprout: Sprout,
  activity: Activity,
  bone: Bone
};

export default function CategoryIcon({ iconKey, color, size = 18 }) {
  const Icon = CATEGORY_ICONS[iconKey] || Shapes;
  return <Icon size={size} style={{ color }} />;
}
