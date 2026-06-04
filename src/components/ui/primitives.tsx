import React from 'react';
import { Product } from '../../types';
import { resolveCategory, catTint, catInk } from '../../lib/categories';
import { Icon, IconName } from './Icon';

// ── Product thumbnail: honest striped category-tinted placeholder ────────────
export function Thumb({
  product,
  size = 64,
  radius = 16,
  label = true,
  fill = false,
}: {
  product: Product;
  size?: number;
  radius?: number;
  label?: boolean;
  fill?: boolean;
}) {
  const cat = resolveCategory(product.category);
  const bg = catTint(cat.hue, 0.94, 0.04);
  const stripe = catTint(cat.hue, 0.89, 0.06);
  const ink = catInk(cat.hue);
  const fs = fill ? 13 : Math.max(8, size * 0.13);
  const shortId = (product.id || '').slice(0, 6);

  const containerStyle: React.CSSProperties = {
    width: fill ? '100%' : size,
    height: fill ? 'auto' : size,
    aspectRatio: fill ? '1 / 1' : undefined,
    borderRadius: radius,
    border: `1px solid oklch(0.86 0.03 ${cat.hue})`,
    overflow: 'hidden',
  };

  if (product.imageUrl) {
    return (
      <div className="relative shrink-0" style={containerStyle}>
        <img
          src={product.imageUrl}
          alt={product.name}
          style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block' }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center relative shrink-0"
      style={{
        ...containerStyle,
        background: `repeating-linear-gradient(135deg, ${bg} 0 9px, ${stripe} 9px 18px)`,
      }}
    >
      {label && (
        <span
          className="font-mono lowercase text-center"
          style={{
            fontSize: fs,
            color: ink,
            letterSpacing: '-0.02em',
            padding: '2px 5px',
            borderRadius: 5,
            background: 'rgba(255,255,255,0.62)',
            maxWidth: '86%',
            lineHeight: 1.05,
          }}
        >
          {product.name ? product.name.split(' ')[0].toLowerCase() : shortId}
        </span>
      )}
    </div>
  );
}

// ── Chip / segmented pill ────────────────────────────────────────────────────
export function Chip({
  children,
  active,
  onClick,
  className = '',
  style,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 font-sans font-semibold text-sm whitespace-nowrap rounded-full px-[15px] py-[9px] transition-all active:scale-[0.97] ${
        active ? 'bg-ink text-paper' : 'bg-surface text-ink-soft shadow-[inset_0_0_0_1px_var(--line)]'
      } ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

// ── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'dark' | 'ghost' | 'soft';
type BtnSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<BtnVariant, string> = {
  primary: 'bg-accent text-accent-on shadow-[0_1px_0_rgba(0,0,0,0.04)]',
  dark: 'bg-ink text-paper',
  ghost: 'bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--line)]',
  soft: 'bg-accent-wash text-accent-ink',
};
const PADS: Record<BtnSize, string> = {
  sm: 'px-[14px] py-[9px] text-sm',
  md: 'px-[18px] py-[13px] text-[15px]',
  lg: 'px-[22px] py-4 text-[17px]',
};

export function Btn({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  full,
  icon,
  className = '',
  style,
  disabled,
  type = 'button',
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  size?: BtnSize;
  full?: boolean;
  icon?: IconName;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`font-sans font-bold rounded-btn inline-flex items-center justify-center gap-2 tracking-[-0.01em] transition-transform active:scale-[0.975] disabled:opacity-40 ${
        VARIANTS[variant]
      } ${PADS[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {icon && <Icon name={icon} size={size === 'lg' ? 20 : 18} stroke={2.4} />}
      {children}
    </button>
  );
}

// ── Quantity stepper ──────────────────────────────────────────────────────────
export function Stepper({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange: (n: number) => void;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 30 : 36;
  const Step = ({ name, d }: { name: IconName; d: number }) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(Math.max(0, value + d));
      }}
      className="rounded-full bg-surface text-ink flex items-center justify-center shadow-[inset_0_0_0_1.5px_var(--line)] active:scale-95"
      style={{ width: dim, height: dim }}
    >
      <Icon name={name} size={size === 'sm' ? 15 : 17} stroke={2.6} />
    </button>
  );
  return (
    <div className="inline-flex items-center gap-2.5">
      <Step name="minus" d={-1} />
      <span
        className="font-mono font-bold text-center"
        style={{ fontSize: size === 'sm' ? 14 : 16, minWidth: 18 }}
      >
        {value}
      </span>
      <Step name="plus" d={1} />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  body,
  cta,
  onCta,
}: {
  icon: IconName;
  title: string;
  body: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-10 py-[70px]" style={{ minHeight: '60%' }}>
      <div
        className="grid place-items-center mb-5 bg-accent-wash text-accent-ink"
        style={{ width: 80, height: 80, borderRadius: 26 }}
      >
        <Icon name={icon} size={36} stroke={2} />
      </div>
      <h2 className="font-display font-extrabold text-[22px] tracking-[-0.02em] m-0">{title}</h2>
      <p className="text-ink-soft text-[14.5px] leading-relaxed mt-2 mb-[22px] max-w-[270px]">{body}</p>
      {cta && (
        <Btn icon="arrowR" onClick={onCta}>
          {cta}
        </Btn>
      )}
    </div>
  );
}
