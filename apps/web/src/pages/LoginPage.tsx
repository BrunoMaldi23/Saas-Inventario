import { useState, type FormEvent } from 'react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { Notice } from '../components/ui/States';
import { useSession } from '../session/SessionProvider';
import { InvalidCredentialsError } from '../session/types';

type FieldErrors = { email?: string; password?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validación de forma en cliente; la validación real ocurre en backend. */
function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) errors.email = 'Ingresa tu correo.';
  else if (!EMAIL_PATTERN.test(email.trim()))
    errors.email = 'Ingresa un correo válido.';
  if (!password) errors.password = 'Ingresa tu contraseña.';
  else if (password.length < 8)
    errors.password = 'Debe tener al menos 8 caracteres.';
  return errors;
}

export function LoginPage() {
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
      await login({ email, password });
    } catch (error) {
      setFormError(
        error instanceof InvalidCredentialsError
          ? error.message
          : 'No pudimos iniciar sesión. Inténtalo nuevamente.',
      );
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
        {formError && <Notice tone="danger">{formError}</Notice>}
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
