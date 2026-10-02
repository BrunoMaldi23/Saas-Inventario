/** Validación del cambio de contraseña (POST /auth/change-password). */
export type PasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type PasswordErrors = Partial<Record<keyof PasswordValues, string>>;

export const emptyPasswordValues: PasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const MIN = 8;
const MAX = 1024;

export function validatePasswordChange(
  values: PasswordValues,
):
  | { ok: true; payload: { currentPassword: string; newPassword: string } }
  | { ok: false; errors: PasswordErrors } {
  const errors: PasswordErrors = {};
  // Las contraseñas no se recortan: los espacios son parte del valor.
  if (!values.currentPassword)
    errors.currentPassword = 'Ingresa tu contraseña actual.';
  if (values.newPassword.length < MIN)
    errors.newPassword = `Debe tener al menos ${MIN} caracteres.`;
  else if (values.newPassword.length > MAX)
    errors.newPassword = `Máximo ${MAX} caracteres.`;
  if (!values.confirmPassword)
    errors.confirmPassword = 'Confirma la nueva contraseña.';
  else if (values.confirmPassword !== values.newPassword)
    errors.confirmPassword = 'Las contraseñas no coinciden.';

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : {
        ok: true,
        payload: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      };
}
