import { SlideInfo, CandidateSelector } from '@exporter/shared';

const COMMON_SELECTORS = [
  '.slide',
  '.carousel-slide',
  '.carousel-item',
  '.swiper-slide',
  '.post-slide',
  '[data-slide]',
  'section.slide',
  '.card',
  'section',
  '.item',
];

export function detectSlidesFromDocument(
  doc: Document,
  customSelector?: string
): {
  detectedSlides: SlideInfo[];
  detectedSelector: string;
  candidateSelectors: CandidateSelector[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const candidateSelectors: CandidateSelector[] = [];

  const selectorsToTest = customSelector
    ? [customSelector, ...COMMON_SELECTORS]
    : COMMON_SELECTORS;

  for (const sel of selectorsToTest) {
    try {
      const elements = Array.from(doc.querySelectorAll(sel));
      if (elements.length > 0 && !candidateSelectors.some((c) => c.selector === sel)) {
        const sampleLabels = elements.slice(0, 4).map((el, i) => {
          const aria = el.getAttribute('aria-label');
          const title = el.getAttribute('title') || el.getAttribute('data-title');
          const heading = el.querySelector('h1, h2, h3, h4, .title, .tt')?.textContent?.trim();
          return aria || title || (heading ? heading.slice(0, 30) : `Slide ${i + 1}`);
        });

        candidateSelectors.push({
          selector: sel,
          count: elements.length,
          sampleLabels,
        });
      }
    } catch {
      // Ignore invalid CSS selector
    }
  }

  let chosenSelector = '';
  if (customSelector && candidateSelectors.some((c) => c.selector === customSelector)) {
    chosenSelector = customSelector;
  } else {
    // Prioritize standard carousel class selectors
    const matchedCommon = candidateSelectors.find((c) =>
      ['.slide', '.carousel-slide', '.carousel-item', '.swiper-slide', '[data-slide]', 'section.slide'].includes(
        c.selector
      )
    );
    if (matchedCommon) {
      chosenSelector = matchedCommon.selector;
    } else if (candidateSelectors.length > 0) {
      chosenSelector = candidateSelectors[0].selector;
    }
  }

  if (!chosenSelector) {
    warnings.push('No slides could be detected automatically. You can specify a custom CSS selector.');
    return {
      detectedSlides: [],
      detectedSelector: '',
      candidateSelectors,
      warnings,
    };
  }

  const elements = Array.from(doc.querySelectorAll(chosenSelector));
  const detectedSlides: SlideInfo[] = elements.map((el, index) => {
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
      selector: chosenSelector,
      label,
      originalWidth,
      originalHeight,
      originalAspectRatio,
    };
  });

  return {
    detectedSlides,
    detectedSelector: chosenSelector,
    candidateSelectors,
    warnings,
  };
}

export function detectSlidesFromHtml(
  htmlContent: string,
  customSelector?: string
) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  return detectSlidesFromDocument(doc, customSelector);
}
