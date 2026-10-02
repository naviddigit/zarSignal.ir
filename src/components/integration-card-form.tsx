'use client';

import { useActionState } from 'react';
import { BrainCircuit, DatabaseZap, LogIn, Save, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { PendingButton } from '@/components/pending-button';
import { saveIntegrationAction, type SaveIntegrationState } from '@/app/admin/(protected)/integrations/actions';

const ICONS = {
  market_primary: DatabaseZap,
  market_fallback: ShieldCheck,
  ai_analysis: BrainCircuit,
  google_oauth: LogIn,
} as const;

type CardProps = {
  itemKey: keyof typeof ICONS | string;
  label: string;
  description: string;
  placeholder: string;
  google: boolean;
  publicValue: string | null;
  enabled: boolean;
  hasSecret: boolean;
};

export function IntegrationCardForm({
  itemKey,
  label,
  description,
  placeholder,
  google,
  publicValue,
  enabled,
  hasSecret,
}: CardProps) {
  const [state, action] = useActionState<SaveIntegrationState | null, FormData>(
    saveIntegrationAction,
    null,
  );

  const showState = state && (state.key === itemKey || (!state.key && Boolean(state.error)))
    ? state
    : null;
  const Icon = ICONS[itemKey as keyof typeof ICONS] ?? DatabaseZap;

  return (
    <form action={action} className="admin-card integration-card">
      <input type="hidden" name="key" value={itemKey} />
      <div className="integration-head">
        <span className="integration-icon"><Icon size={22} /></span>
        <div>
          <h2>{label}</h2>
          <p>{description}</p>
        </div>
        <span className={enabled ? 'run-status' : 'run-status failed'}>
          {enabled ? 'فعال' : 'غیرفعال'}
        </span>
      </div>
      {google ? (
        <div className="oauth-callback">
          <span>Authorized redirect URI در Google Cloud</span>
          <code dir="ltr">https://www.zarsignal.ir/api/auth/callback/google</code>
          <span>Authorized JavaScript origin</span>
          <code dir="ltr">https://www.zarsignal.ir</code>
        </div>
      ) : null}
      <div className="integration-fields">
        <label>
          <span>{google ? 'Google Client ID' : 'آدرس سرویس'}</span>
          <input
            name="publicValue"
            type={google ? 'text' : 'url'}
            defaultValue={publicValue ?? ''}
            placeholder={placeholder}
            dir="ltr"
            required={google}
          />
        </label>
        <label>
          <span>{google ? 'Google Client Secret' : 'کلید API'}</span>
          <input
            name="secret"
            type="password"
            placeholder={hasSecret ? 'کلید ذخیره شده؛ برای حفظ آن خالی بگذارید' : 'کلید جدید'}
            autoComplete="new-password"
            dir="ltr"
            required={google && !hasSecret}
          />
        </label>
      </div>
      <div className="integration-actions">
        <Checkbox name="enabled" label="اتصال فعال باشد" defaultChecked={enabled} className="integration-switch" />
        <PendingButton className="button small-button" pendingText="در حال ذخیره…">
          <Save size={15} /> ذخیره امن
        </PendingButton>
      </div>
      {showState?.error ? (
        <p className="form-error" role="alert">{showState.error}</p>
      ) : null}
      {showState?.ok && showState.message ? (
        <p className="admin-message is-ok" role="status">{showState.message}</p>
      ) : null}
    </form>
  );
}
