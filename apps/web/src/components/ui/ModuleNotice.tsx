import { Notice } from './States';

type ModuleNoticeProps = {
  phase: number;
  children?: string;
};

/** Aviso estándar para módulos cuya API aún no existe. */
export function ModuleNotice({ phase, children }: ModuleNoticeProps) {
  return (
    <Notice tone="info" title={`Módulo en preparación · Fase ${phase}`}>
      {children ??
        'La estructura de esta pantalla está lista; los datos se mostrarán cuando el backend publique el contrato correspondiente.'}
    </Notice>
  );
}
