// src/modules/clinical/components/AttachmentsTab.jsx
// Sprint 2.5: Tab for uploading paraclinical files (PDF, images)
// Uses localStorage for now, Supabase Storage later
import React, { useState, useCallback, useRef } from 'react';
import { Upload, Paperclip, Trash2, Download, FileText, Image, AlertCircle, X } from 'lucide-react';

const ALLOWED_TYPES = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
};
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type) => {
  if (type === 'application/pdf') return FileText;
  return Image;
};

export const AttachmentsTab = ({ patientId, attachments = [], onAttachmentsChange }) => {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const storageKey = `siso_attachments_${patientId || 'temp'}`;

  // Load from localStorage if no external state
  const files = attachments.length > 0 ? attachments : (() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch { return []; }
  })();

  const saveFiles = useCallback((newFiles) => {
    localStorage.setItem(storageKey, JSON.stringify(newFiles));
    if (onAttachmentsChange) onAttachmentsChange(newFiles);
  }, [storageKey, onAttachmentsChange]);

  const validateFile = (file) => {
    if (!ALLOWED_TYPES[file.type]) {
      return `Tipo no permitido: ${file.type || 'desconocido'}. Solo PDF, JPG, PNG, WEBP.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Archivo demasiado grande (${formatFileSize(file.size)}). Máximo 10 MB.`;
    }
    return null;
  };

  const processFile = useCallback((file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const newAttachment = {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: e.target.result,
        date: new Date().toISOString(),
      };
      const updated = [...files, newAttachment];
      saveFiles(updated);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, [files, saveFiles]);

  const handleFiles = useCallback((fileList) => {
    Array.from(fileList).forEach(processFile);
  }, [processFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback((e) => {
    handleFiles(e.target.files);
    e.target.value = ''; // Reset input
  }, [handleFiles]);

  const handleDelete = useCallback((id) => {
    if (!confirm('¿Eliminar este archivo adjunto?')) return;
    const updated = files.filter((f) => f.id !== id);
    saveFiles(updated);
  }, [files, saveFiles]);

  const handleDownload = useCallback((file) => {
    const link = document.createElement('a');
    link.href = file.dataUrl;
    link.download = file.name;
    link.click();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="w-5 h-5 text-emerald-600" />
        <h3 className="text-sm font-black text-gray-800 uppercase">Archivos Adjuntos</h3>
        <span className="text-xs text-gray-500">({files.length} archivo{files.length !== 1 ? 's' : ''})</span>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Drag & Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
        }`}
      >
        <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-emerald-500' : 'text-gray-400'}`} />
        <p className="text-sm font-semibold text-gray-600">
          {dragOver ? 'Suelta los archivos aquí' : 'Arrastra archivos o haz clic para seleccionar'}
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, WEBP — máximo 10 MB por archivo</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* Files list */}
      {files.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-emerald-50 text-emerald-800">
                <th className="text-left px-3 py-2 font-bold">Archivo</th>
                <th className="text-left px-3 py-2 font-bold hidden sm:table-cell">Tipo</th>
                <th className="text-left px-3 py-2 font-bold hidden sm:table-cell">Tamaño</th>
                <th className="text-left px-3 py-2 font-bold">Fecha</th>
                <th className="text-right px-3 py-2 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const Icon = getFileIcon(file.type);
                return (
                  <tr key={file.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-700 truncate max-w-[200px]">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{ALLOWED_TYPES[file.type] || file.type}</td>
                    <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{formatFileSize(file.size)}</td>
                    <td className="px-3 py-2 text-gray-500">{new Date(file.date).toLocaleDateString('es-CO')}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Descargar"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
