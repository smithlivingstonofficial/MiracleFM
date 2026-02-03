"use client";

import { AlertTriangle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  loading?: boolean;
}

export default function UserConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText = "Delete",
  loading = false
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-white/10 w-full max-w-md rounded-[2rem] p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2">
            <AlertTriangle size={32} />
          </div>
          
          <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
          <p className="text-zinc-400 font-medium leading-relaxed">
            {description}
          </p>

          <div className="grid grid-cols-2 gap-4 w-full mt-6">
            <button 
              onClick={onClose}
              className="py-3.5 rounded-xl font-bold text-sm bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              disabled={loading}
              className="py-3.5 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center justify-center gap-2"
            >
              {loading ? "Processing..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}