/** Nombre en español de un código ISO alpha-2; 'xx' = mundial. */
export function countryName(code: string | null | undefined): string {
  if (!code) return '';
  if (code.toLowerCase() === 'xx') return 'Mundial';
  try {
    return new Intl.DisplayNames(['es'], { type: 'region' }).of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

export const tipoLabel: Record<string, string> = {
  equipo: 'Equipo',
  capitulo: 'Capítulo',
  laboratorio: 'Laboratorio',
  competencia: 'Competencia',
};
export const modalidadLabel: Record<string, string> = {
  presencial: 'Presencial',
  remoto: 'Remoto',
  hibrido: 'Híbrido',
};
export const nivelLabel: Record<string, string> = {
  pregrado: 'Pregrado',
  posgrado: 'Posgrado',
  colegio: 'Colegio',
  profesional: 'Profesional',
  todos: 'Todos los niveles',
};
