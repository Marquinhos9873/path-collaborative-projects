import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import { stickerNames, isSticker } from './stickers';
import { ReadmeTooLong } from './types';

export const MAX_README = 20000;

const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
md.disable(['image', 'html_inline', 'html_block']);

// :nombre: -> sticker, solo si pertenece al set fijo; si no, queda como texto.
md.inline.ruler.before('emphasis', 'sticker', (state, silent) => {
  const src = state.src;
  const start = state.pos;
  if (src.charCodeAt(start) !== 0x3a) return false;
  const m = /^:([a-z]+):/.exec(src.slice(start, start + 20));
  if (!m || !isSticker(m[1])) return false;
  if (!silent) {
    const t = state.push('sticker', '', 0);
    t.content = m[1];
  }
  state.pos += m[0].length;
  return true;
});
md.renderer.rules.sticker = (tokens, i) => {
  const n = tokens[i].content; // ya validado contra el set
  return `<img src="/stickers/${n}.svg" alt=":${n}:" class="sticker" width="24" height="24">`;
};

const STICKER_SRC = new RegExp(`^/stickers/(${stickerNames.join('|')})\\.svg$`);

export function renderReadme(src: string): string {
  if (src.length > MAX_README) throw new ReadmeTooLong();
  const raw = md.render(src);
  return sanitizeHtml(raw, {
    allowedTags: [
      'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'code', 'pre',
      'blockquote', 'a', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img',
    ],
    allowedAttributes: {
      a: ['href', 'rel', 'target'],
      img: ['src', 'alt', 'class', 'width', 'height'],
    },
    allowedSchemes: ['https'],
    allowedSchemesByTag: {},
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (tag, attribs) => ({
        tagName: 'a',
        attribs: { href: attribs.href ?? '', rel: 'nofollow ugc noopener', target: '_blank' },
      }),
    },
    exclusiveFilter: (f) => {
      if (f.tag === 'img') return !STICKER_SRC.test(f.attribs.src ?? '');
      if (f.tag === 'a') return !/^https:\/\//i.test(f.attribs.href ?? '');
      return false;
    },
  });
}
