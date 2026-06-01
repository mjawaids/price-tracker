import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { Icon, GoogleIcon, Btn, IconName } from '../ui';

const FEATURES: [IconName, string, string][] = [
  ['scan', 'Track real prices', 'Your products, your stores, your prices.'],
  ['truck', 'Delivery-smart', 'Knows each store’s delivery rules.'],
  ['spark', 'Auto shopping lists', 'Split by store for the lowest total.'],
];

function BrandPanel({ big }: { big?: boolean }) {
  return (
    <div className="relative overflow-hidden h-full flex flex-col justify-center" style={{ padding: big ? '0 56px' : '0 4px' }}>
      {big && (
        <div className="absolute bg-accent-wash" style={{ top: -120, right: -90, width: 320, height: 320, borderRadius: 999 }} />
      )}
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2.5" style={{ marginBottom: big ? 30 : 22 }}>
          <span className="grid place-items-center bg-accent text-accent-on" style={{ width: 38, height: 38, borderRadius: 12 }}>
            <Icon name="tag" size={21} stroke={2.4} />
          </span>
          <span className="font-display font-extrabold text-[23px] tracking-[-0.03em]">SpendLess</span>
        </div>
        <h1 className="m-0 font-display font-extrabold tracking-[-0.035em] leading-[0.98]" style={{ fontSize: big ? 52 : 40 }}>
          Buy what you
          <br />
          love, <span className="text-accent-ink">for less.</span>
        </h1>
        <p className="text-ink-soft leading-relaxed max-w-[360px]" style={{ fontSize: big ? 17 : 15.5, margin: '18px 0 0' }}>
          Add your favourite products and the stores you shop. SpendLess builds the cheapest shopping list across them all —
          delivery fees included.
        </p>
        <div className="mt-[26px] flex flex-col gap-3">
          {FEATURES.map(([ic, t, d]) => (
            <div key={t} className="flex items-center gap-3">
              <span className="grid place-items-center bg-surface shrink-0 shadow-[inset_0_0_0_1px_var(--line)]" style={{ width: 40, height: 40, borderRadius: 13 }}>
                <Icon name={ic} size={20} color="var(--accent-ink)" stroke={2.1} />
              </span>
              <div>
                <div className="font-bold text-[15px]">{t}</div>
                <div className="text-[13px] text-ink-faint">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthForm() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null);
  const signup = mode === 'signup';

  const inputCls =
    'w-full box-border border-none outline-none bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] rounded-[13px] py-3.5 pl-[42px] pr-3.5 font-sans text-[15.5px]';

  const wrap = (icon: IconName, el: React.ReactNode) => (
    <div className="relative mb-[11px]">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 grid place-items-center">
        <Icon name={icon} size={18} color="var(--ink-faint)" stroke={2} />
      </span>
      {el}
    </div>
  );

  const submit = async () => {
    setMsg(null);
    if (!email.trim() || !pw) {
      setMsg({ kind: 'err', text: 'Enter your email and password.' });
      return;
    }
    setBusy(true);
    const { error } = signup
      ? await signUp(email.trim(), pw, name.trim() || email.split('@')[0])
      : await signIn(email.trim(), pw);
    setBusy(false);
    if (error) setMsg({ kind: 'err', text: error.message });
    else if (signup) setMsg({ kind: 'ok', text: 'Check your email to confirm your account.' });
  };

  const google = async () => {
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    } catch {
      setMsg({ kind: 'err', text: 'Google sign-in is not configured.' });
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      setMsg({ kind: 'err', text: 'Enter your email first.' });
      return;
    }
    const { error } = await resetPassword(email.trim());
    setMsg(error ? { kind: 'err', text: error.message } : { kind: 'ok', text: 'Password reset email sent.' });
  };

  return (
    <div className="w-full max-w-[380px]">
      <div className="flex gap-1 bg-surface rounded-full p-1 mb-[22px] shadow-[inset_0_0_0_1px_var(--line)]">
        {(['signin', 'signup'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`flex-1 font-sans font-bold text-sm rounded-full transition-all ${
              mode === id ? 'bg-ink text-paper' : 'bg-transparent text-ink-soft'
            }`}
            style={{ padding: '9px 0' }}
          >
            {id === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <Btn full size="lg" variant="ghost" onClick={google} className="mb-3.5">
        <GoogleIcon /> Continue with Google
      </Btn>
      <div className="flex items-center gap-3 text-ink-faint text-[12.5px]" style={{ margin: '4px 0 16px' }}>
        <span className="flex-1 h-px bg-line" /> or <span className="flex-1 h-px bg-line" />
      </div>

      {signup && wrap('user', <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />)}
      {wrap('mail', <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" />)}
      {wrap('lock', <input className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" type="password" />)}

      {!signup && (
        <div className="text-right -mt-0.5 mb-3">
          <button type="button" onClick={forgot} className="text-[13px] text-accent-ink font-semibold">
            Forgot password?
          </button>
        </div>
      )}

      {msg && (
        <div
          className="text-[13px] rounded-[12px] px-3.5 py-2.5 mb-3"
          style={{
            background: msg.kind === 'err' ? 'oklch(0.95 0.04 25)' : 'var(--accent-wash)',
            color: msg.kind === 'err' ? 'oklch(0.5 0.16 25)' : 'var(--accent-ink)',
          }}
        >
          {msg.text}
        </div>
      )}

      <Btn full size="lg" onClick={submit} disabled={busy} style={{ marginTop: signup ? 8 : 0 }}>
        {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
      </Btn>
      <p className="text-[11.5px] text-ink-faint text-center leading-relaxed mt-4">
        By continuing you agree to SpendLess’s Terms &amp; Privacy Policy.
      </p>
    </div>
  );
}

export default function AuthScreen() {
  const { compact } = useBreakpoint();
  if (!compact) {
    return (
      <div className="h-full grid bg-paper" style={{ gridTemplateColumns: '1.05fr 1fr' }}>
        <div className="bg-surface border-r border-line">
          <BrandPanel big />
        </div>
        <div className="flex items-center justify-center overflow-auto" style={{ padding: 40 }}>
          <div>
            <div className="mb-[26px]">
              <h2 className="m-0 font-display font-extrabold text-[27px] tracking-[-0.02em]">Welcome back</h2>
              <p className="m-0 mt-1 text-ink-faint text-[14.5px]">Sign in to sync your cart and shopping lists.</p>
            </div>
            <AuthForm />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto bg-paper">
      <div style={{ padding: '30px 26px 10px' }}>
        <BrandPanel />
      </div>
      <div className="flex justify-center" style={{ padding: '6px 26px 30px' }}>
        <AuthForm />
      </div>
    </div>
  );
}
