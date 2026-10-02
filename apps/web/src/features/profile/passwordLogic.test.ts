import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyPasswordValues,
  validatePasswordChange,
} from './passwordLogic.ts';

describe('validatePasswordChange', () => {
  it('exige los tres campos', () => {
    const result = validatePasswordChange(emptyPasswordValues);
    assert.ok(
      !result.ok &&
        result.errors.currentPassword &&
        result.errors.newPassword &&
        result.errors.confirmPassword,
    );
  });

  it('exige mínimo 8 caracteres', () => {
    const result = validatePasswordChange({
      currentPassword: 'actual-123',
      newPassword: 'corta',
      confirmPassword: 'corta',
    });
    assert.ok(!result.ok && result.errors.newPassword);
  });

  it('detecta confirmación distinta', () => {
    const result = validatePasswordChange({
      currentPassword: 'actual-123',
      newPassword: 'nueva-segura',
      confirmPassword: 'nueva-segurA',
    });
    assert.ok(
      !result.ok &&
        result.errors.confirmPassword === 'Las contraseñas no coinciden.',
    );
  });

  it('envía solo actual y nueva, sin recortar espacios', () => {
    assert.deepEqual(
      validatePasswordChange({
        currentPassword: ' actual ',
        newPassword: ' nueva segura ',
        confirmPassword: ' nueva segura ',
      }),
      {
        ok: true,
        payload: { currentPassword: ' actual ', newPassword: ' nueva segura ' },
      },
    );
  });
});
