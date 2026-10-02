import { useState, type FormEvent } from 'react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { Notice } from '../components/ui/States';
import { apiErrorMessage, classifyApiError } from '../lib/apiError';
import { useSession, type SignedOutReason } from '../session/SessionProvider';

type FieldErrors = { email?: string; password?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validación de forma en cliente; la validación real ocurre en backend. */
function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) errors.email = 'Ingresa tu correo.';
  else if (!EMAIL_PATTERN.test(email.trim()))
    errors.email = 'Ingresa un correo válido.';
  if (!password) errors.password = 'Ingresa tu contraseña.';
  return errors;
}

/** Mensaje de error de login. 401 es genérico para no permitir enumeración. */
function loginErrorMessage(error: unknown): string {
  const kind = classifyApiError(error);
  if (kind === 'unauthorized') return 'Correo o contraseña incorrectos.';
  if (kind === 'invalid') return 'Revisa el correo y la contraseña ingresados.';
  return apiErrorMessage(kind);
}

export function LoginPage({ reason }: { reason: SignedOutReason }) {
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(email, password);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } catch (error) {
      setFormError(loginErrorMessage(error));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Inicia sesión"
      description="Accede a la gestión de inventario de tu empresa."
    >
      <form
        className="form-grid"
        onSubmit={(event) => void onSubmit(event)}
        noValidate
      >
        {formError ? (
          <Notice tone="danger">{formError}</Notice>
        ) : reason === 'expired' ? (
          <Notice tone="warning">
            Tu sesión expiró. Vuelve a iniciar sesión para continuar.
          </Notice>
        ) : reason === 'signed-out' ? (
          <Notice tone="success">Cerraste sesión correctamente.</Notice>
        ) : null}
        <Field label="Correo electrónico" error={errors.email}>
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoFocus
            />
          )}
        </Field>
        <Field label="Contraseña" error={errors.password}>
          {(props) => (
            <Input
              {...props}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>
        <Button type="submit" variant="primary" block loading={submitting}>
          Ingresar
        </Button>
      </form>
    </AuthLayout>
  );
}
