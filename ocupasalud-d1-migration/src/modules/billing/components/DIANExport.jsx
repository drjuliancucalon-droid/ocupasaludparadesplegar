import React, { useState } from 'react';
import { FileCode2, Download, AlertTriangle } from 'lucide-react';

/**
 * DIANExport - Panel de facturación electrónica DIAN
 * Decreto 358/2020 · Resolución DIAN 000012/2021
 * Genera XML base UBL 2.1 para envío a software autorizado
 */
export const DIANExport = ({ bills = [], doctorData, onGenerateXML }) => {
  const [selectedBill, setSelectedBill] = useState(null);
  const [generated, setGenerated] = useState(null);

  const handleGenerate = (bill) => {
    if (onGenerateXML) {
      const xml = onGenerateXML(bill, doctorData, bill.numero);
      setGenerated(xml);
      setSelectedBill(bill.id);
    }
  };

  const handleDownload = () => {
    if (!generated) return;
    const blob = new Blob([generated], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FE-${selectedBill || 'factura'}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileCode2 className="w-5 h-5 text-blue-600" />
        <div>
          <h2 className="text-lg font-black text-gray-800">Facturación Electrónica DIAN</h2>
          <p className="text-xs text-gray-500">Decreto 358/2020 · UBL 2.1 · XML base para software autorizado</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        <p className="font-black flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Importante</p>
        <p className="mt-1">
          Este módulo genera el XML base en formato UBL 2.1. Para radicar la factura ante la DIAN,
          debe importar este archivo en su software de facturación autorizado (Siigo, Alegra, World Office, etc.).
        </p>
        <p className="mt-1">
          Servicios médicos ocupacionales: <strong>Exentos de IVA</strong> (Art. 476 E.T. numeral 1).
        </p>
      </div>

      {/* Bills list */}
      <div className="space-y-2">
        <p className="text-xs font-black text-gray-700 uppercase">Cuentas disponibles para facturar</p>
        {bills.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No hay cuentas de cobro guardadas</p>
        ) : (
          bills.map((bill) => (
            <div key={bill.id || bill.numero}
              className={`bg-white border rounded-xl p-3 flex items-center justify-between ${
                selectedBill === (bill.id || bill.numero) ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
              }`}>
              <div>
                <p className="text-xs font-black text-gray-800">{bill.numero} - {bill.empresaNombre || bill.clienteNombre}</p>
                <p className="text-[10px] text-gray-500">{bill.fecha} · ${(bill.total || bill.amount || 0).toLocaleString('es-CO')}</p>
              </div>
              <button onClick={() => handleGenerate(bill)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black hover:bg-blue-700">
                Generar XML
              </button>
            </div>
          ))
        )}
      </div>

      {/* Generated XML */}
      {generated && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-green-700">✅ XML generado correctamente</p>
            <button onClick={handleDownload}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Descargar XML
            </button>
          </div>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-[10px] overflow-x-auto max-h-60 overflow-y-auto font-mono">
            {generated.slice(0, 2000)}
            {generated.length > 2000 && '\n... (truncado para vista previa)'}
          </pre>
        </div>
      )}
    </div>
  );
};
