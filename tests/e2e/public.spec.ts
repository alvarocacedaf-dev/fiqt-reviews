import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(
    layout.scrollWidth,
    `La página mide ${layout.scrollWidth}px, pero el viewport solo ${layout.clientWidth}px.`,
  ).toBeLessThanOrEqual(layout.clientWidth);
}

test.describe('recorridos públicos', () => {
  test('la portada ofrece registro e inicio de sesión', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', {
      level: 1,
      name: 'Tu experiencia académica también puede orientar.',
    })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crear cuenta UNI' })).toHaveAttribute('href', '/registro');
    await expect(page.getByRole('link', { name: 'Ya tengo cuenta' })).toHaveAttribute('href', '/login');
  });

  test('el registro exige correo UNI y contraseña segura', async ({ page }) => {
    await page.goto('/registro');

    const email = page.getByLabel('Correo institucional UNI');
    const password = page.getByLabel('Contraseña');
    await expect(email).toHaveAttribute('pattern', '^[^@\\s]+@uni\\.pe$');
    await expect(password).toHaveAttribute('minlength', '8');
    await expect(page.getByRole('button', { name: 'Crear cuenta UNI' })).toBeVisible();
  });

  test('el inicio de sesión enlaza la recuperación de contraseña', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Bienvenido de vuelta' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Me olvidé mi contraseña' }))
      .toHaveAttribute('href', '/recuperar-contrasena');
  });

  test('la recuperación pide un correo sin revelar si existe', async ({ page }) => {
    await page.goto('/recuperar-contrasena');
    await expect(page.getByLabel('Correo electrónico de la cuenta')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar enlace de recuperación' })).toBeVisible();
  });

  for (const route of ['/', '/registro', '/login']) {
    test(`${route} no produce desplazamiento horizontal`, async ({ page }) => {
      await page.goto(route);
      await expectNoHorizontalOverflow(page);
    });
  }
});

test.describe('validación pública de APIs', () => {
  test('rechaza un registro que imita el dominio institucional', async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: {
        email: 'alumno@uni.pe.example.com',
        password: 'segura123',
        fullName: 'Alumno Prueba',
      },
    });
    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Usa tu correo institucional @uni.pe.' });
  });

  test('rechaza un inicio de sesión incompleto', async ({ request }) => {
    const response = await request.post('/api/auth/login', { data: { email: '', password: '' } });
    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Completa el correo y la contraseña.' });
  });

  test('rechaza una recuperación sin correo', async ({ request }) => {
    const response = await request.post('/api/auth/password-reset', { data: { email: '' } });
    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Ingresa tu correo.' });
  });
});
