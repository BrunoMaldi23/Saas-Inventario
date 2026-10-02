import { useState, type FormEvent } from 'react';
import { changePassword } from '@inventario/api-client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Field';
import { Notice } from '../../components/ui/States';
import { useToast } from '../../components/ui/toastContext';
import { apiErrorMessage, classifyApiError } from '../../lib/apiError';
import { useSession } from '../../session/sessionContext';
import {
  emptyPasswordValues,
  validatePasswordChange,
  type PasswordErrors,
  type PasswordValues,
} from './passwordLogic';

/**
 * POST /auth/change-password. La sesión actual sigue activa; el backend
 * revoca las demás. Las contraseñas solo viven en el estado del formulario y
 * se limpian al terminar.
 */
export function ChangePasswordCard() {
  const { revalidate } = useSession();
  const { notify } = useToast();
  const [values, setValues] = useState<PasswordValues>(emptyPasswordValues);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof PasswordValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const result = validatePasswordChange(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(result.payload);
      setValues(emptyPasswordValues);
      notify(
        'Contraseña actualizada. Esta sesión sigue activa y las demás se cerraron.',
      );
    } catch (error) {
      const kind = classifyApiError(error);
      if (kind === 'unauthorized') {
        // 401 = contraseña actual incorrecta o sesión vencida: se distingue
        // consultando /auth/me (si expiró, revalidate vuelve al login).
        if (await revalidate()) {
          setErrors({
            currentPassword: 'La contraseña actual no es correcta.',
          });
          setValues((current) => ({ ...current, currentPassword: '' }));
        }
      } else {
        setFormError(
          kind === 'invalid'
            ? 'El servidor rechazó la nueva contraseña. Revisa que tenga entre 8 y 1024 caracteres.'
            : apiErrorMessage(kind),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      title="Cambiar contraseña"
      description="Al cambiarla, se cerrarán tus otras sesiones abiertas."
    >
      <form
        className="form-grid"
        noValidate
        onSubmit={(event) => void onSubmit(event)}
      >
        {formError && <Notice tone="danger">{formError}</Notice>}
        <Field label="Contraseña actual" error={errors.currentPassword}>
          {(props) => (
            <Input
              {...props}
              type="password"
              autoComplete="current-password"
              value={values.currentPassword}
              onChange={(e) => set('currentPassword', e.target.value)}
            />
          )}
        </Field>
        <div className="form-row">
          <Field
            label="Nueva contraseña"
            hint="Mínimo 8 caracteres."
            error={errors.newPassword}
          >
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="new-password"
                maxLength={1024}
                value={values.newPassword}
                onChange={(e) => set('newPassword', e.target.value)}
              />
            )}
          </Field>
          <Field
            label="Confirmar nueva contraseña"
            error={errors.confirmPassword}
          >
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="new-password"
                maxLength={1024}
                value={values.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
              />
            )}
          </Field>
        </div>
        <div>
          <Button type="submit" variant="primary" loading={submitting}>
            Actualizar contraseña
          </Button>
        </div>
      </form>
    </Card>
  );
}
