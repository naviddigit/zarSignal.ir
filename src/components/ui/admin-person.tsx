type Props = {
  name: string | null | undefined;
  meta?: string | null;
  metaDir?: 'ltr' | 'rtl';
};

/** Shared person cell: avatar initials + primary/secondary text. */
export function AdminPerson({ name, meta, metaDir = 'ltr' }: Props) {
  const label = (name || meta || '?').trim();
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

  return (
    <div className="ds-person">
      <span className="ds-person__avatar" aria-hidden="true">{initials}</span>
      <span className="ds-person__text">
        <strong>{name || '—'}</strong>
        {meta ? <small dir={metaDir}>{meta}</small> : null}
      </span>
    </div>
  );
}
