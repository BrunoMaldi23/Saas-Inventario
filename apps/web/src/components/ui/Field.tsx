import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { cx } from '../../lib/cx';
import { Icon } from './Icon';

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  /** Oculta visualmente el label manteniéndolo para lectores de pantalla. */
  hideLabel?: boolean;
  children: (control: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: true;
  }) => ReactNode;
};

/** Envuelve un control con label, ayuda y error asociados por id. */
export function Field({ label, hint, error, hideLabel, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label
        htmlFor={id}
        className={cx('field__label', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error">
          <Icon name="alertCircle" size={14} />
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx('control', className)} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="select">
      <select
        {...props}
        className={cx('control', 'select__control', className)}
      >
        {children}
      </select>
      <Icon name="chevronDown" size={16} className="select__chevron" />
    </div>
  );
}

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
};

export function SearchInput({ label, className, ...props }: SearchInputProps) {
  return (
    <div className={cx('search', className)}>
      <Icon name="search" size={16} className="search__icon" />
      <input
        {...props}
        type="search"
        aria-label={label}
        className="control search__control"
      />
    </div>
  );
}
