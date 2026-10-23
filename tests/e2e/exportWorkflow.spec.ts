import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import AdmZip from 'adm-zip';

test.describe('Instagram Carousel PNG Exporter Workflow', () => {
  test('Complete import-to-export workflow with index.html', async ({ page, request }) => {
    // 1. Visit Web App
    await page.goto('/');
    await expect(page).toHaveTitle(/Instagram Carousel PNG Exporter/i);

    // 2. Click "Load Current Project (index.html)"
    const loadButton = page.getByRole('button', { name: /Load Current Project/i });
    await expect(loadButton).toBeVisible();
    await loadButton.click();

    // 3. Verify Project Loaded and 6 Slides Detected
    await expect(page.getByText('Project Loaded')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Detected 6 slides')).toBeVisible();

    // Check slide labels in the list
    await expect(page.getByText('Skiper UI')).toBeVisible();
    await expect(page.getByText('Cult UI')).toBeVisible();

    // 4. Verify Default Preset is Instagram Portrait 1080x1350
    await expect(page.getByText('1080 × 1350 px').first()).toBeVisible();

    // 5. Click "Convert to PNG"
    const convertButton = page.getByRole('button', { name: /Convert to PNG/i });
    await expect(convertButton).toBeVisible();
    await convertButton.click();

    // 6. Verify Progress & Completion
    await expect(page.getByText('Export Complete!')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('6 / 6 Ready')).toBeVisible();

    // 7. Verify All 6 Output Slide Cards Exist
    await expect(page.getByText('slide-01.png', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('slide-02.png', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('slide-03.png', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('slide-04.png', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('slide-05.png', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('slide-06.png', { exact: true }).first()).toBeVisible();

    // 8. Verify ZIP Download button exists
    const zipButton = page.getByRole('link', { name: /Download All as ZIP/i });
    await expect(zipButton).toBeVisible();
    const zipHref = await zipButton.getAttribute('href');
    expect(zipHref).toBeTruthy();

    // 9. Fetch and verify the ZIP content directly from the server
    const zipResponse = await request.get(zipHref!);
    expect(zipResponse.ok()).toBe(true);

    const zipBuffer = await zipResponse.body();
    const adm = new AdmZip(zipBuffer);
    const zipFileNames = adm.getEntries().map((e) => e.entryName);

    expect(zipFileNames).toContain('slide-01.png');
    expect(zipFileNames).toContain('slide-02.png');
    expect(zipFileNames).toContain('slide-03.png');
    expect(zipFileNames).toContain('slide-04.png');
    expect(zipFileNames).toContain('slide-05.png');
    expect(zipFileNames).toContain('slide-06.png');

    // 10. Verify Slide 1 Image Dimensions via Sharp
    const slide1Data = adm.getEntry('slide-01.png')!.getData();
    const meta1 = await sharp(slide1Data).metadata();
    expect(meta1.width).toBe(1080);
    expect(meta1.height).toBe(1350);
    expect(meta1.format).toBe('png');

    // 11. Verify Slide 2 Image Dimensions via Sharp
    const slide2Data = adm.getEntry('slide-02.png')!.getData();
    const meta2 = await sharp(slide2Data).metadata();
    expect(meta2.width).toBe(1080);
    expect(meta2.height).toBe(1350);
    expect(meta2.format).toBe('png');
  });
});
