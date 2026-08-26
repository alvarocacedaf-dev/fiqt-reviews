import { describe, expect, it } from 'vitest';
import {
  containsForbiddenReviewLanguage,
  isUniEmail,
  normalizeEmail,
  validateLoginInput,
  validatePasswordResetInput,
  validateRegistrationInput,
} from '@/lib/validation';

describe('validación de autenticación', () => {
  it('normaliza el correo antes de validarlo', () => {
    expect(normalizeEmail('  ALUMNO@UNI.PE ')).toBe('alumno@uni.pe');
  });

  it.each([
    ['alumno@uni.pe', true],
    ['alumno@UNI.PE', false],
    ['alumno@uni.pe.example.com', false],
    ['alumno@gmail.com', false],
  ])('valida el dominio institucional de %s', (email, expected) => {
    expect(isUniEmail(email)).toBe(expected);
  });

  it('rechaza registros fuera del dominio UNI', () => {
    expect(validateRegistrationInput({
      email: 'alumno@gmail.com',
      password: 'segura123',
      fullName: 'Alumno Prueba',
    })).toBe('Usa tu correo institucional @uni.pe.');
  });

  it('exige nombre y contraseña de ocho caracteres', () => {
    expect(validateRegistrationInput({
      email: 'alumno@uni.pe',
      password: '1234567',
      fullName: '',
    })).toContain('al menos 8 caracteres');
  });

  it('acepta un registro institucional completo', () => {
    expect(validateRegistrationInput({
      email: 'alumno@uni.pe',
      password: 'segura123',
      fullName: 'Alumno Prueba',
    })).toBeNull();
  });

  it('exige ambas credenciales para iniciar sesión', () => {
    expect(validateLoginInput({ email: '', password: '' })).toBe('Completa el correo y la contraseña.');
    expect(validateLoginInput({ email: 'alumno@uni.pe', password: 'segura123' })).toBeNull();
  });

  it('exige un correo para recuperar la contraseña', () => {
    expect(validatePasswordResetInput('')).toBe('Ingresa tu correo.');
    expect(validatePasswordResetInput('alumno@uni.pe')).toBeNull();
  });
});

describe('moderación léxica de reseñas', () => {
  it.each(['Es un idiota', 'Fue un acosador', 'Qué IMBÉCIL'])('detecta lenguaje prohibido: %s', comment => {
    expect(containsForbiddenReviewLanguage(comment)).toBe(true);
  });

  it('permite una crítica académica respetuosa', () => {
    expect(containsForbiddenReviewLanguage('Sus evaluaciones fueron difíciles, pero coherentes.')).toBe(false);
  });
});
