/**
 * Utilidades matemáticas y de formato oficial DGT 2026
 */

export function calcularTasaOficial(aptos: number, noAptos: number): number {
  const total = aptos + noAptos;
  if (total <= 0) return 0;
  return Number(((aptos / total) * 100).toFixed(2));
}

export const MESES_NOMBRES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/**
 * Genera el texto CSV/TXT con el diseño de registro oficial de la DGT (MATRABA 2026)
 */
export function generarPlantillaMicrodatosDGT(): string {
  const headers = [
    'DESC_PROVINCIA',
    'CENTRO_EXAMEN',
    'CODIGO_AUTOESCUELA',
    'NOMBRE_AUTOESCUELA',
    'CODIGO_SECCION',
    'MES',
    'ANYO',
    'TIPO_EXAMEN',
    'NOMBRE_PERMISO',
    'NUM_APTOS',
    'NUM_APTOS_1conv',
    'NUM_APTOS_2conv',
    'NUM_APTOS_3o4conv',
    'NUM_APTOS_5_o_mas_conv',
    'NUM_NO_APTOS',
  ].join(';');

  const rows = [
    'Cádiz;Cádiz;CA0528;EL PASEO;01;10;2026;PRUEBA TEÓRICA;B  ;13;7;2;3;1;13',
    'Cádiz;Cádiz;CA0528;EL PASEO;01;10;2026;PRUEBA CONDUCCIÓN Y CIRCULACIÓN;B  ;5;4;1;0;0;7',
    'Cádiz;Cádiz;CA0528;EL PASEO;02;10;2026;PRUEBA TEÓRICA;B  ;10;7;2;1;0;6',
    'Cádiz;Cádiz;CA0528;EL PASEO;02;10;2026;PRUEBA CONDUCCIÓN Y CIRCULACIÓN;B  ;10;3;6;1;0;11',
    'Madrid;Madrid;M0240;GALA;01;10;2026;PRUEBA TEÓRICA;B  ;85;60;18;6;1;30',
    'Madrid;Madrid;M0240;GALA;01;10;2026;PRUEBA CONDUCCIÓN Y CIRCULACIÓN;B  ;52;28;16;6;2;45',
  ];

  return `${headers}\n${rows.join('\n')}`;
}
