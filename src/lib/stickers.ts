// Set fijo de stickers (SVG planos en /public/stickers). Se escriben como :nombre:.
export const stickerNames: string[] = [
  'cohete', 'satelite', 'chip', 'antena', 'dron', 'cerebro',
  'camara', 'planeta', 'engranaje', 'libro', 'chispa', 'equipo',
];

export function isSticker(name: string): boolean {
  return stickerNames.includes(name);
}
