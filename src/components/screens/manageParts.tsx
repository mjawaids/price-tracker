import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { getCurrencyByCode } from '../../utils/currency';

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block mb-4">
      <div className="font-mono text-[12.5px] font-bold text-ink-soft mb-[7px] tracking-[0.04em] uppercase">{label}</div>
      {children}
      {hint && <div className="text-[12px] text-ink-faint mt-1.5">{hint}</div>}
    </label>
  );
}

const inputCls =
  'w-full box-border border-none outline-none bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] rounded-[13px] font-sans text-base';

export function TextIn(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} px-3.5 py-[13px] ${props.className || ''}`} />;
}

export function NumIn(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const app = useApp();
  const sym = getCurrencyByCode(app.currencyCode)?.symbol || '$';
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint font-mono text-base">{sym}</span>
      <input
        type="number"
        inputMode="decimal"
        {...props}
        className={`${inputCls} py-[13px] pr-3.5 font-mono`}
        style={{ paddingLeft: 28 + (sym.length - 1) * 8, ...props.style }}
      />
    </div>
  );
}

export function ManageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between px-[18px] pt-[18px] pb-2.5 md:px-7 md:pt-6 md:pb-3">
      <div>
        <div className="font-mono text-[11px] tracking-[0.14em] text-accent-ink uppercase">Manage</div>
        <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em]" style={{ margin: '2px 0 0' }}>
          {title}
        </h1>
        {sub && <div className="text-ink-faint text-[13px] font-mono mt-0.5">{sub}</div>}
      </div>
      {action}
    </div>
  );
}
