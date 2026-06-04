import {
  Home,
  Search,
  ShoppingCart,
  User,
  Plus,
  Minus,
  Store,
  Tag,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Trash2,
  Pencil,
  SlidersHorizontal,
  Truck,
  List,
  LayoutGrid,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MapPin,
  ScanLine,
  Heart,
  Receipt,
  Package,
  Globe,
  Mail,
  Lock,
  LogOut,
  Coins,
  Bell,
  Camera,
  LucideProps,
} from 'lucide-react';
import { ComponentType } from 'react';

// Map the design's icon names → lucide-react components.
const MAP: Record<string, ComponentType<LucideProps>> = {
  home: Home,
  search: Search,
  cart: ShoppingCart,
  user: User,
  plus: Plus,
  minus: Minus,
  store: Store,
  tag: Tag,
  check: Check,
  chevR: ChevronRight,
  chevL: ChevronLeft,
  chevD: ChevronDown,
  x: X,
  trash: Trash2,
  edit: Pencil,
  sliders: SlidersHorizontal,
  truck: Truck,
  list: List,
  grid: LayoutGrid,
  arrowR: ArrowRight,
  back: ArrowLeft,
  spark: Sparkles,
  pin: MapPin,
  scan: ScanLine,
  heart: Heart,
  receipt: Receipt,
  box: Package,
  globe: Globe,
  mail: Mail,
  lock: Lock,
  logout: LogOut,
  coin: Coins,
  bell: Bell,
  camera: Camera,
};

export type IconName = keyof typeof MAP | string;

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  color?: string;
}

export function Icon({ name, size = 22, stroke = 2, className, color }: IconProps) {
  const Cmp = MAP[name] || Package;
  return <Cmp size={size} strokeWidth={stroke} className={className} color={color} />;
}

// Google "G" glyph (multicolor) — used on the auth screen.
export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.6-.05-1.2-.16-1.8H12v3.4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.1z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .95-3.4.95-2.6 0-4.8-1.75-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
      />
      <path fill="#FBBC05" d="M6.4 13.95a6 6 0 0 1 0-3.9V7.45H3.1a10 10 0 0 0 0 9.1l3.3-2.6z" />
      <path
        fill="#EA4335"
        d="M12 5.95c1.5 0 2.8.5 3.8 1.5l2.85-2.85A10 10 0 0 0 3.1 7.45l3.3 2.6C7.2 7.7 9.4 5.95 12 5.95z"
      />
    </svg>
  );
}
