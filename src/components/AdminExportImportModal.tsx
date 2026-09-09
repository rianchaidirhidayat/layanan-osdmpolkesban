import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Upload, Copy, Check, FileCode, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { MenuItem, MicrositeProfile } from '../types';

interface AdminExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  menus: MenuItem[];
  profile: MicrositeProfile;
  adminPin: string;
  onImport: (importedData: { menus: MenuItem[]; profile: MicrositeProfile; pin?: string }) => void;
}

export const AdminExportImportModal: React.FC<AdminExportImportModalProps> = ({
  isOpen,
  onClose,
  menus,
  profile,
  adminPin,
  onImport,
}) => {
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  if (!isOpen) return null;

  const exportPayload = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    adminPin: adminPin || '1234',
    profile,
    menus,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);

  const handleDownloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `osdm-portal-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    try {
      navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setImportError('Gagal menyalin teks ke clipboard.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
        processImportJson(content);
      }
    };
    reader.readAsText(file);
  };

  const processImportJson = (text: string) => {
    setImportError(null);
    setImportSuccess(false);

    try {
      const parsed = JSON.parse(text);

      if (!parsed || (typeof parsed !== 'object')) {
        throw new Error('Format JSON tidak valid.');
      }

      let importedMenus: MenuItem[] = [];
      let importedProfile: MicrositeProfile | null = null;
      let importedPin: string | undefined = undefined;

      if (Array.isArray(parsed.menus)) {
        importedMenus = parsed.menus;
      } else if (Array.isArray(parsed)) {
        importedMenus = parsed;
      } else {
        throw new Error('JSON tidak memiliki array "menus" yang sesuai.');
      }

      if (parsed.profile && typeof parsed.profile === 'object') {
        importedProfile = parsed.profile;
      } else {
        importedProfile = profile;
      }

      if (parsed.adminPin && typeof parsed.adminPin === 'string') {
        importedPin = parsed.adminPin.trim();
      }

      onImport({
        menus: importedMenus,
        profile: importedProfile,
        pin: importedPin,
      });

      setImportSuccess(true);
      setTimeout(() => {
        setImportSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setImportError(`Gagal membaca file/teks JSON: ${err?.message || 'Format tidak sesuai'}`);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top Bar */}
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-400">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight">
                  Cadangan & Sinkronisasi Manual (JSON)
                </h3>
                <p className="text-xs text-slate-400">
                  Ekspor atau Impor seluruh konfigurasi menu, profil, dan PIN antar perangkat.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-t border-x ${
                activeTab === 'export'
                  ? 'bg-white text-indigo-600 border-slate-200 shadow-xs'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>1. Ekspor Konfigurasi</span>
            </button>

            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-t border-x ${
                activeTab === 'import'
                  ? 'bg-white text-indigo-600 border-slate-200 shadow-xs'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>2. Impor / Pulihkan Ke Device Lain</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {activeTab === 'export' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 leading-relaxed">
                  💡 <strong>Gunakan Fitur Ini Jika Kuota Cloud Mengalami Penundaan:</strong>
                  <br />
                  Anda dapat mengunduh file backup JSON ini atau menyalin kodenya, lalu membuka aplikasi di HP/device teman Anda, lalu pilih tab <strong>Impor</strong> untuk menerapkan tampilan & PIN secara instan!
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Pratinjau JSON Konfigurasi Portal ({menus.length} Menu)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Tersalin!' : 'Salin Kode JSON'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadJson}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh File .JSON</span>
                    </button>
                  </div>
                </div>

                <pre className="p-4 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-xl overflow-x-auto max-h-60 border border-slate-800 leading-normal">
                  {jsonString}
                </pre>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                  ⚠️ <strong>Peringatan Impor:</strong>
                  <br />
                  Proses impor akan memperbarui susunan menu, profil, dan PIN pada perangkat ini sesuai file yang diunggah.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Pilihan A: Unggah File JSON Backup (.json)
                  </label>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Pilihan B: Tempel (Paste) Kode JSON Di Sini
                  </label>
                  <textarea
                    rows={6}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder='Tempelkan isi file JSON di sini (contoh: { "menus": [...], "adminPin": "1234" })'
                    className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {importError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                {importSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span className="font-bold">Berhasil mengimpor! Tampilan dan PIN di perangkat ini telah diperbarui.</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => processImportJson(importText)}
                    disabled={!importText.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Terapkan Hasil Impor Sekarang</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
