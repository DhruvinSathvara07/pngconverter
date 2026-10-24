import { chromium, Browser } from 'playwright';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'node:url';
import { COMMON_SLIDE_SELECTORS, SlideInfo, CandidateSelector } from '@exporter/shared';
import { ProjectImporter } from './projectImporter.js';

export class SlideDetector {
  static async detect(
    sessionId: string,
    entryHtml: string,
    customSelector?: string
  ): Promise<{
    detectedSlides: SlideInfo[];
    detectedSelector: string;
    candidateSelectors: CandidateSelector[];
    warnings: string[];
  }> {
    const sessionDir = ProjectImporter.getSessionDir(sessionId);
    const htmlPath = path.join(sessionDir, entryHtml);
    const warnings: string[] = [];

    if (!fs.existsSync(htmlPath)) {
      warnings.push(`Entry HTML file not found on disk: ${entryHtml}`);
      return {
        detectedSlides: [],
        detectedSelector: customSelector || '',
        candidateSelectors: [],
        warnings,
      };
    }

    const fileUrl = pathToFileURL(htmlPath).href;

    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
      });

      const page = await browser.newPage();
      await page.setViewportSize({ width: 1080, height: 1350 });

      try {
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } catch (navErr: any) {
        warnings.push(`Page navigation warning: ${navErr.message}. Attempting to parse DOM anyway.`);
      }

      // Wait a short moment for dynamic scripts or fonts
      await page.waitForTimeout(300);

      const selectorsToTest = customSelector
        ? [customSelector, ...COMMON_SLIDE_SELECTORS]
        : [...COMMON_SLIDE_SELECTORS, 'section', '.card', '.item'];

      const candidateSelectors: CandidateSelector[] = [];

      for (const sel of selectorsToTest) {
        try {
          const count = await page.evaluate((selector) => {
            try {
              return document.querySelectorAll(selector).length;
            } catch {
              return 0;
            }
          }, sel);

          if (count > 0 && !candidateSelectors.some((c) => c.selector === sel)) {
            const sampleLabels = await page.evaluate((selector) => {
              const elements = Array.from(document.querySelectorAll(selector)).slice(0, 4);
              return elements.map((el, i) => {
                const aria = el.getAttribute('aria-label');
                const title = el.getAttribute('title') || el.getAttribute('data-title');
                const heading = el.querySelector('h1, h2, h3, h4, .title, .tt')?.textContent?.trim();
                return aria || title || (heading ? heading.slice(0, 30) : `Slide ${i + 1}`);
              });
            }, sel);

            candidateSelectors.push({
              selector: sel,
              count,
              sampleLabels,
            });
          }
        } catch {
          // Ignore invalid custom selectors
        }
      }

      // Determine the best selector
      let chosenSelector = '';
      if (customSelector && candidateSelectors.some((c) => c.selector === customSelector)) {
        chosenSelector = customSelector;
      } else {
        // Prioritize common slide selectors first
        const matchedCommon = candidateSelectors.find((c) => COMMON_SLIDE_SELECTORS.includes(c.selector));
        if (matchedCommon) {
          chosenSelector = matchedCommon.selector;
        } else if (candidateSelectors.length > 0) {
          chosenSelector = candidateSelectors[0].selector;
        }
      }

      if (!chosenSelector) {
        warnings.push('Could not automatically identify slide containers. Please specify a custom CSS selector.');
        return {
          detectedSlides: [],
          detectedSelector: '',
          candidateSelectors,
          warnings,
        };
      }

      // Extract details for each slide element
      const detectedSlides: SlideInfo[] = await page.evaluate((selector) => {
        const elements = Array.from(document.querySelectorAll(selector));
        return elements.map((el, index) => {
          const aria = el.getAttribute('aria-label');
          const dataTitle = el.getAttribute('data-title') || el.getAttribute('title');
          const heading = el.querySelector('h1, h2, h3, h4, .title, .tt')?.textContent?.trim();
          const label = aria || dataTitle || (heading ? heading.slice(0, 40) : `Slide ${index + 1}`);

          const rect = el.getBoundingClientRect();
          const originalWidth = Math.round(rect.width) || 1080;
          const originalHeight = Math.round(rect.height) || 1350;
          const originalAspectRatio = +(originalWidth / originalHeight).toFixed(3);

          return {
            id: `slide-${index + 1}`,
            index,
            selector,
            label,
            originalWidth,
            originalHeight,
            originalAspectRatio,
          };
        });
      }, chosenSelector);

      if (detectedSlides.length === 0) {
        warnings.push(`Selector "${chosenSelector}" matched 0 elements.`);
      }

      return {
        detectedSlides,
        detectedSelector: chosenSelector,
        candidateSelectors,
        warnings,
      };
    } catch (err: any) {
      console.warn(`[SlideDetector] Playwright auto-detection unavailable (${err.message}). Using fast HTML static parser.`);
      try {
        const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
        return SlideDetector.parseHtmlStatically(htmlContent, customSelector);
      } catch (staticErr: any) {
        warnings.push(`Automatic slide detection issue: ${staticErr.message}`);
        return {
          detectedSlides: [],
          detectedSelector: customSelector || '',
          candidateSelectors: [],
          warnings,
        };
      }
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  static parseHtmlStatically(
    html: string,
    customSelector?: string
  ): {
    detectedSlides: SlideInfo[];
    detectedSelector: string;
    candidateSelectors: CandidateSelector[];
    warnings: string[];
  } {
    const candidateSelectors: CandidateSelector[] = [];
    const selectorsToCheck = [
      { sel: '.slide', regex: /<([a-zA-Z0-9]+)[^>]*\bclass=["'][^"']*\bslide\b[^"']*["'][^>]*>/gi },
      { sel: '.carousel-slide', regex: /<([a-zA-Z0-9]+)[^>]*\bclass=["'][^"']*\bcarousel-slide\b[^"']*["'][^>]*>/gi },
      { sel: '.swiper-slide', regex: /<([a-zA-Z0-9]+)[^>]*\bclass=["'][^"']*\bswiper-slide\b[^"']*["'][^>]*>/gi },
      { sel: '[data-slide]', regex: /<([a-zA-Z0-9]+)[^>]*\bdata-slide\b[^>]*>/gi },
      { sel: 'section', regex: /<section\b[^>]*>/gi },
    ];

    if (customSelector) {
      const escaped = customSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (customSelector.startsWith('.')) {
        const className = customSelector.slice(1);
        selectorsToCheck.unshift({
          sel: customSelector,
          regex: new RegExp(`<([a-zA-Z0-9]+)[^>]*\\bclass=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, 'gi'),
        });
      } else {
        selectorsToCheck.unshift({
          sel: customSelector,
          regex: new RegExp(`<${escaped}\\b[^>]*>`, 'gi'),
        });
      }
    }

    let chosenSelector = '';
    let matchedTags: string[] = [];

    for (const { sel, regex } of selectorsToCheck) {
      const matches = html.match(regex) || [];
      if (matches.length > 0) {
        const sampleLabels = matches.slice(0, 4).map((tag, idx) => {
          const ariaMatch = tag.match(/aria-label=["']([^"']+)["']/i);
          const titleMatch = tag.match(/data-title=["']([^"']+)["']/i) || tag.match(/title=["']([^"']+)["']/i);
          return ariaMatch ? ariaMatch[1] : titleMatch ? titleMatch[1] : `Slide ${idx + 1}`;
        });

        candidateSelectors.push({
          selector: sel,
          count: matches.length,
          sampleLabels,
        });

        if (!chosenSelector) {
          chosenSelector = sel;
          matchedTags = matches;
        }
      }
    }

    if (customSelector && candidateSelectors.some((c) => c.selector === customSelector)) {
      chosenSelector = customSelector;
      const target = selectorsToCheck.find((s) => s.sel === customSelector);
      matchedTags = target ? html.match(target.regex) || [] : matchedTags;
    }

    const detectedSlides: SlideInfo[] = matchedTags.map((tag, index) => {
      const ariaMatch = tag.match(/aria-label=["']([^"']+)["']/i);
      const titleMatch = tag.match(/data-title=["']([^"']+)["']/i) || tag.match(/title=["']([^"']+)["']/i);
      const label = ariaMatch ? ariaMatch[1] : titleMatch ? titleMatch[1] : `Slide ${index + 1}`;

      return {
        id: `slide-${index + 1}`,
        index,
        selector: chosenSelector,
        label,
        originalWidth: 1080,
        originalHeight: 1350,
        originalAspectRatio: +(1080 / 1350).toFixed(3),
      };
    });

    return {
      detectedSlides,
      detectedSelector: chosenSelector || '.slide',
      candidateSelectors,
      warnings: [],
    };
  }
}
