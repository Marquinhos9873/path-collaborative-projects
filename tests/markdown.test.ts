import { describe, it, expect } from 'vitest';
import { renderReadme } from '../src/lib/markdown';
import { stickerNames } from '../src/lib/stickers';
import { ReadmeTooLong } from '../src/lib/types';

// El texto escapado (&lt;script&gt;) es inerte; lo que importa son las etiquetas reales.
const tags = (h: string) => h.match(/<[^>]+>/g) ?? [];
const hrefs = (h: string) => [...tags(h).join('').matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

describe('renderReadme', () => {
  it('elimina <script>', () => {
    expect(renderReadme('<script>alert(1)</script>')).not.toContain('<script');
  });
  it('bloquea javascript: en enlaces', () => {
    const h = renderReadme('[x](javascript:alert(1))');
    expect(h).not.toContain('href="javascript:');
    expect(hrefs(h)).toEqual([]);
  });
  it('no genera <img> desde Markdown', () => {
    expect(renderReadme('![a](https://x.com/y.png)')).not.toContain('<img');
  });
  it('quita onclick', () => {
    expect(tags(renderReadme('<a href="https://x.com" onclick="f()">x</a>')).join('')).not.toMatch(/onclick/);
  });
  it('enlaces https llevan rel seguro', () => {
    expect(renderReadme('[web](https://x.com)')).toContain('rel="nofollow ugc noopener"');
  });
  it('reemplaza :cohete: por sticker del set', () => {
    const h = renderReadme('hola :cohete:');
    expect(h).toContain('<img');
    expect(h).toContain('src="/stickers/cohete.svg"');
  });
  it(':inventado: queda como texto', () => {
    const h = renderReadme(':inventado:');
    expect(h).not.toContain('<img');
    expect(h).toContain(':inventado:');
  });
  it('lanza ReadmeTooLong con 20001 caracteres', () => {
    expect(() => renderReadme('a'.repeat(20001))).toThrow(ReadmeTooLong);
    expect(() => renderReadme('a'.repeat(20000))).not.toThrow();
  });
  it('bloquea data: URIs', () => {
    const h = renderReadme('[x](data:text/html;base64,PHNjcmlwdD4=) ![i](data:image/png;base64,AAAA)');
    expect(hrefs(h)).toEqual([]);
    expect(tags(h).join('')).not.toContain('data:');
    expect(h).not.toContain('<img');
  });
  it('bloquea variantes de javascript: (mayúsculas, espacios, entidades)', () => {
    for (const md of [
      '[x](JaVaScRiPt:alert(1))',
      '[x]( javascript:alert(1))',
      '[x](jav&#x61;script:alert(1))',
      '[x](&#106;avascript:alert(1))',
      '[x](java\tscript:alert(1))',
      '[x](<javascript:alert(1)>)',
      '<a href="jav&#x61;script:alert(1)">x</a>',
      '[x](vbscript:msgbox(1))',
    ]) {
      const h = renderReadme(md).toLowerCase();
      expect(hrefs(h).filter((u) => !u.startsWith('https://')), md).toEqual([]);
      expect(tags(h).join(''), md).not.toMatch(/script:|\son\w+=/);
    }
  });
  it('solo permite enlaces https', () => {
    const h = renderReadme('[a](http://x.com) [b](ftp://x.com) [c](/rel) [d](https://ok.com)');
    expect(h).not.toContain('href="http:');
    expect(h).not.toContain('ftp:');
    expect(h).not.toContain('href="/rel');
    expect(h).toContain('href="https://ok.com"');
  });
  it('neutraliza SVG en línea e iframe', () => {
    const h = renderReadme('<svg onload="alert(1)"><circle/></svg>\n\n<iframe src="https://x.com"></iframe>\n\n<img src=x onerror=alert(1)>');
    const t = tags(h).join('');
    expect(t).not.toMatch(/<(svg|iframe|circle|img)/);
    expect(t).not.toMatch(/onerror|onload/);
    expect(h).not.toContain('<img');
  });
  it('un <img> escrito a mano no pasa, ni siquiera hacia /stickers/', () => {
    expect(tags(renderReadme('<img src="/stickers/cohete.svg" onerror="x()">')).join('')).not.toMatch(/<img|onerror/);
  });
  it('renderiza Markdown básico', () => {
    const h = renderReadme('## Hola\n\n- **a**\n- `b`');
    expect(h).toContain('<h2>');
    expect(h).toContain('<strong>a</strong>');
    expect(h).toContain('<code>b</code>');
  });
  it('el set tiene al menos 12 stickers', () => {
    expect(stickerNames.length).toBeGreaterThanOrEqual(12);
  });
});
