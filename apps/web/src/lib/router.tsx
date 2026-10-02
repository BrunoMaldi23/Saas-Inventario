import {
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from 'react';
import { normalizePath } from './path';

/*
 * Router mínimo basado en History API. Cubre rutas estáticas, que es todo lo
 * que necesita la app hoy. Si aparecen rutas con parámetros, layouts anidados
 * o loaders, reemplazar por react-router (ver deuda técnica en apps/web/README.md).
 */

const NAVIGATE_EVENT = 'app:navigate';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

function getPathname(): string {
  return normalizePath(window.location.pathname);
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, getPathname);
}

export function navigate(to: string, options: { replace?: boolean } = {}) {
  if (normalizePath(to) === getPathname()) return;
  if (options.replace) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
  window.scrollTo(0, 0);
}

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: string;
};

export function Link({ to, onClick, target, ...props }: LinkProps) {
  return (
    <a
      {...props}
      href={to}
      target={target}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || target || !isPlainLeftClick(event)) {
          return;
        }
        event.preventDefault();
        navigate(to);
      }}
    />
  );
}
