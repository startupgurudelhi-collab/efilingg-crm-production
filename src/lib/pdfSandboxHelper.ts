import html2canvas from 'html2canvas';

// Helper to convert OKLCH and OKLAB color values to standard Hex/RGB colors for html2canvas
function parseColorPart(valStr: string, index: number, isOklch: boolean): number {
  const isPercent = valStr.includes('%');
  const num = parseFloat(valStr);
  if (isNaN(num)) return 0;
  
  if (isPercent) {
    if (index === 0) { // Lightness is 0-100% -> 0-1
      return num / 100;
    }
    if (index === 1) { // Chroma is 0-100% -> 0-0.4
      return (num / 100) * 0.4;
    }
    if (index === 3) { // Alpha is 0-100% -> 0-1
      return num / 100;
    }
  }
  return num;
}

function oklchToRgb(l: number, c: number, h: number, alpha?: number): string {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const bVal = c * Math.sin(hRad);
  return oklabToRgb(l, a, bVal, alpha);
}

function oklabToRgb(l: number, a: number, bVal: number, alpha?: number): string {
  // LMS linear transformations
  const L = l + 0.3963377774 * a + 0.2158037573 * bVal;
  const M = l - 0.1055613458 * a - 0.0638541728 * bVal;
  const S = l - 0.0894841775 * a - 1.2914855480 * bVal;

  // LMS cubed
  const L3 = L * L * L;
  const M3 = M * M * M;
  const S3 = S * S * S;

  // Linear RGB
  const rL = L3 * 4.0767245293 - M3 * 3.3072168827 + S3 * 0.2307590544;
  const gL = -L3 * 1.2681437731 + M3 * 2.6093323202 - S3 * 0.3411344290;
  const bL = -L3 * 0.0041119885 - M3 * 0.7034763098 + S3 * 1.7068625689;

  // Gamma correction to sRGB
  const gamma = (x: number) => {
    if (x <= 0.0031308) return 12.92 * x;
    return 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };

  const r = Math.max(0, Math.min(255, Math.round(gamma(rL) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(gamma(gL) * 255)));
  const b = Math.max(0, Math.min(255, Math.round(gamma(bL) * 255)));

  if (alpha !== undefined && !isNaN(alpha)) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function replaceColorText(text: string): string {
  if (!text) return text;
  if (!text.includes('oklch') && !text.includes('oklab')) return text;

  // Parse oklch(...) and oklab(...) patterns and replace them with standard rgb(...)
  return text.replace(/(oklch|oklab)\(([^)]+)\)/g, (match, type, content) => {
    try {
      const rawParts = content.trim().replace(/[,/]/g, ' ').split(/\s+/).filter(Boolean);
      if (rawParts.length >= 3) {
        const isOklch = type === 'oklch';
        const parts = rawParts.map((p, idx) => parseColorPart(p, idx, isOklch));
        
        const l = parts[0];
        const aOrC = parts[1];
        const bOrH = parts[2];
        const alpha = parts[3];
        
        if (isOklch) {
          return oklchToRgb(l, aOrC, bOrH, alpha);
        } else {
          return oklabToRgb(l, aOrC, bOrH, alpha);
        }
      }
    } catch (e) {
      console.warn('Error converting color:', match, e);
    }
    return 'rgb(79, 70, 229)'; // standard primary brand color fallback
  });
}

export function patchModernColorsForHtml2Canvas(): () => void {
  const restores: (() => void)[] = [];

  // Helper helper to modify getters safely on prototype objects
  const patchDescriptor = (
    obj: any,
    prop: string,
    getter: (original: any) => () => any
  ) => {
    const desc = Object.getOwnPropertyDescriptor(obj, prop);
    if (desc) {
      const originalGet = desc.get;
      Object.defineProperty(obj, prop, {
        configurable: true,
        get: getter(originalGet)
      });
      restores.push(() => {
        Object.defineProperty(obj, prop, desc);
      });
    }
  };

  try {
    // 1. Intercept CSSRule.prototype.cssText
    patchDescriptor(CSSRule.prototype, 'cssText', (original) => {
      return function(this: any) {
        const val = original ? original.call(this) : '';
        return replaceColorText(val);
      };
    });

    // 2. Intercept CSSStyleDeclaration.prototype.cssText
    patchDescriptor(CSSStyleDeclaration.prototype, 'cssText', (original) => {
      return function(this: any) {
        const val = original ? original.call(this) : '';
        return replaceColorText(val);
      };
    });

    // 3. Intercept CSSStyleDeclaration.prototype.getPropertyValue
    const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;
    CSSStyleDeclaration.prototype.getPropertyValue = function (this: CSSStyleDeclaration, propertyName: string): string {
      const val = originalGetPropertyValue.call(this, propertyName);
      return replaceColorText(val);
    };
    restores.push(() => {
      CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue;
    });

    // 4. Monkeypatch window.getComputedStyle to intercept dynamic properties queried by html2canvas
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function (elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
      const style = originalGetComputedStyle(elt, pseudoElt);
      return new Proxy(style, {
        get(target, prop) {
          const val = target[prop as any];
          if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
            return replaceColorText(val);
          }
          if (typeof val === 'function') {
            if (prop === 'getPropertyValue') {
              return function (propertyName: string) {
                const res = target.getPropertyValue(propertyName);
                return replaceColorText(res);
              };
            }
            return (val as any).bind(target);
          }
          return val;
        }
      }) as CSSStyleDeclaration;
    };
    restores.push(() => {
      window.getComputedStyle = originalGetComputedStyle;
    });
  } catch (error) {
    console.error('Failed to set up sandbox prototype patchers:', error);
  }

  return () => {
    restores.forEach((r) => {
      try {
        r();
      } catch (e) {
        console.warn('Restore helper warning:', e);
      }
    });
  };
}
