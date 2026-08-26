import { expect, test } from '@playwright/test';

const studentEmail = process.env.E2E_STUDENT_EMAIL;
const studentPassword = process.env.E2E_STUDENT_PASSWORD;

test.describe('sesión estudiantil de solo lectura', () => {
  test.skip(!studentEmail || !studentPassword, 'Configura una cuenta estudiantil aislada para habilitar esta prueba.');

  test('inicia sesión y accede al catálogo protegido', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(studentEmail!);
    await page.getByLabel('Contraseña').fill(studentPassword!);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/ciclos/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
