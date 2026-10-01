import { test, expect } from '@playwright/test';

test.describe('Fabric Manager - End-to-End Manufacturing & Business Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Inject active admin test session before page scripts execute
    await page.addInitScript(() => {
      const mockAdminUser = {
        id: 'e2e_admin_user',
        name: 'Apex Admin',
        role: 'Admin',
        companyName: 'Apex Textiles Inc',
        phone: '9876543210',
      };
      sessionStorage.setItem('fabric_app_session', JSON.stringify(mockAdminUser));
      localStorage.setItem('fabric_app_session', JSON.stringify(mockAdminUser));
    });
  });

  test('Full Production Lifecycle: Fabric -> Cut -> Stitch -> Invoicing Navigation', async ({ page }) => {
    // 1. Visit Fabric Inventory
    await page.goto('/fabrics');
    await expect(page).toHaveTitle(/Fabric Manager/i);

    // Verify header and mobile layout navigation
    const headerTitle = page.locator('header h1');
    await expect(headerTitle).toContainText('Fabric Manager');

    // Verify Fabric Inventory tabs are present (All, In Stock, In Cutting, Ready, Delivered, Archive)
    await expect(page.getByRole('button', { name: /All/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Stock/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Archive/i })).toBeVisible();

    // 2. Navigate to Production Floor (Orders / Cuttings / Stitching)
    await page.goto('/orders');
    await expect(page).toHaveURL(/.*orders/);

    // Verify 5 production floor stages: Cuts, Tailors, Handovers, Trimming, Delivery
    await expect(page.getByRole('button', { name: /Cuts/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tailors/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Handovers/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Trimming/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Delivery/i })).toBeVisible();

    // Switch to Tailor Assignments stage
    await page.getByRole('button', { name: /Tailors/i }).click();
    await expect(page.getByText(/All Assignments/i)).toBeVisible();

    // Switch to Master Handovers stage
    await page.getByRole('button', { name: /Handovers/i }).click();
    await expect(page.getByText(/All Handovers/i)).toBeVisible();

    // 3. Navigate to Financial Transactions & Invoicing
    await page.goto('/transactions/invoices');
    await expect(page).toHaveURL(/.*invoices/);

    // Verify Invoice action button and filters are active and visible
    await expect(page.getByRole('button', { name: /Add Invoice/i })).toBeVisible();

    // Verify Invoices section renders with search and filter controls
    const searchInput = page.getByPlaceholder(/Search invoice/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('INV-TEST');
    await expect(searchInput).toHaveValue('INV-TEST');
  });

  test('Worker Shop Floor Portals: Master & Tailor Isolation', async ({ page }) => {
    // 1. Cutting Master Portal direct access
    await page.goto('/portal/master/mst_sample_master');
    await expect(page.getByText(/Master Portal/i).first()).toBeVisible();

    // 2. Tailor Stitching Portal direct access
    await page.goto('/portal/tailor/tlr_sample_tailor');
    await expect(page.getByText(/Tailor Portal/i).first()).toBeVisible();
  });
});
