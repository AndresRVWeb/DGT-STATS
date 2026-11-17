import React from 'react';
import { X, Printer, ShieldCheck } from 'lucide-react';
import type { AutoescuelaRecord } from '../../types/dgt';

interface AuditReportModalProps {
  autoescuela: AutoescuelaRecord | null;
  mediaNacionalTeorico: number;
  mediaNacionalPractico: number;
  onClose: () => void;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  autoescuela,
  mediaNacionalTeorico,
  mediaNacionalPractico,
  onClose,
}) => {
  if (!autoescuela) return null;

  const handlePrint = () => {
    window.print();
  };

  const deltaTeorico = Number((autoescuela.teorico.tasaAprobados - mediaNacionalTeorico).toFixed(1));
  const deltaPractico = Number((autoescuela.practico.tasaAprobados - mediaNacionalPractico).toFixed(1));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden my-8">
        {/* Modal Top Actions */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-800">
              Certificado de Rendimiento Oficial DGT {autoescuela.annoDatos}
            </span>
            <span aria-hidden="true">·</span>
            <span>Centro {autoescuela.codigoDGT}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Content */}
        <div className="p-8 text-slate-900 space-y-6">
          <div className="border-b border-slate-200 pb-6 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono tracking-wider text-slate-500">
                DATOS ABIERTOS · DIRECCIÓN GENERAL DE TRÁFICO (ESPAÑA)
              </div>
              <h1 className="text-xl font-bold font-display text-slate-900 mt-1">
                INFORME DE RENDIMIENTO Y APTITUD VIAL {autoescuela.annoDatos}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Fuente: Microdatos Oficiales Mensuales MATRABA ({autoescuela.mesesIncluidos.length} meses consolidados)
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-mono font-bold text-emerald-800">
                CÓDIGO DGT: {autoescuela.codigoDGT}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                {autoescuela.provincia} · {autoescuela.numSecciones} secciones
              </div>
            </div>
          </div>

          {/* Identification Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200/80">
            <div>
              <div className="text-slate-500 font-medium">Denominación Oficial DGT:</div>
              <div className="font-semibold text-slate-900 text-sm mt-0.5">{autoescuela.nombre}</div>
              <div className="text-slate-600 mt-0.5 font-mono">
                Código: {autoescuela.codigoDGT} · Permisos: {autoescuela.permisosImpartidos.join(', ')}
              </div>
            </div>
            <div>
              <div className="text-slate-500 font-medium">Provincia y Centro de Examen:</div>
              <div className="font-semibold text-slate-900 mt-0.5">{autoescuela.provincia}</div>
              <div className="text-slate-600 mt-0.5">
                Centro de examen: {autoescuela.centroExamenPrincipal}
              </div>
            </div>
          </div>

          {/* Key Official Performance Metrics */}
          <div>
            <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase mb-3 font-display">
              1. Métricas Consolidadas ({autoescuela.annoDatos})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                <div className="text-[11px] text-slate-500 font-medium">Tasa Oficial Teórico</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                  {autoescuela.teorico.tasaAprobados.toFixed(1)}%
                </div>
                <div className={`text-[11px] font-semibold mt-1 ${deltaTeorico >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {deltaTeorico >= 0 ? `+${deltaTeorico}%` : `${deltaTeorico}%`} vs media España ({mediaNacionalTeorico}%)
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono tabular-nums">
                  {autoescuela.teorico.aptos} Aptos / {autoescuela.teorico.noAptos} No Aptos
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                <div className="text-[11px] text-slate-500 font-medium">Tasa Oficial Práctico</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                  {autoescuela.practico.tasaAprobados.toFixed(1)}%
                </div>
                <div className={`text-[11px] font-semibold mt-1 ${deltaPractico >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {deltaPractico >= 0 ? `+${deltaPractico}%` : `${deltaPractico}%`} vs media España ({mediaNacionalPractico}%)
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono tabular-nums">
                  {autoescuela.practico.aptos} Aptos / {autoescuela.practico.noAptos} No Aptos
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                <div className="text-[11px] text-slate-500 font-medium">Evaluaciones Totales</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                  {autoescuela.totalPresentados.toLocaleString('es-ES')}
                </div>
                <div className="text-[11px] text-slate-600 font-medium mt-1">
                  {autoescuela.numSecciones} secciones activas
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {autoescuela.muestraSignificativa ? 'Muestra representativa DGT (≥15)' : 'Muestra reducida (<15)'}
                </div>
              </div>
            </div>
          </div>

          {/* Section Breakdown Table */}
          <div>
            <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase mb-3 font-display">
              2. Desglose de Rendimiento por Sección Autorizada
            </h2>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="py-2 px-3">Sección</th>
                    <th className="py-2 px-3">Centro de Examen</th>
                    <th className="py-2 px-3 text-right">Evaluaciones</th>
                    <th className="py-2 px-3 text-right">% Teórico</th>
                    <th className="py-2 px-3 text-right">% Práctico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {autoescuela.secciones.map((sec) => (
                    <tr key={sec.idSeccion} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-bold text-slate-800">{sec.codigoDGT}</td>
                      <td className="py-2 px-3 font-sans text-slate-700">{sec.centroExamen}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{sec.totalAlumnos}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700 tabular-nums">
                        {sec.teorico.tasaAprobados.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {sec.practico.tasaAprobados.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mathematical Formula Certification Footer */}
          <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span>Fórmula aplicada: </span>
              <span className="font-mono text-slate-700 font-semibold">Tasa = (Aptos / (Aptos + No Aptos)) * 100</span>
            </div>
            <div className="font-mono text-slate-400">
              DGT-{autoescuela.codigoDGT}-{autoescuela.annoDatos}
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 bg-slate-100 border border-slate-300 rounded-md transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
