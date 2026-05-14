"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmationText: string;
}

export default function TextVerificationModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title,
  description,
  confirmationText
}: Props) {
  const [inputText, setInputText] = useState("");

  if (!isOpen) return null;

  const canConfirm = inputText === confirmationText;
  const handleClose = () => {
    setInputText("");
    onClose();
  };

  const handleConfirm = () => {
    setInputText("");
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-panel border border-white/10 rounded-[2rem] shadow-2xl max-w-lg w-full p-8 m-4">
        
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-zinc-400 mt-1 text-sm">{description}</p>
          </div>
        </div>

        <div className="my-8 space-y-3">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">
            To confirm, type <strong className="text-brand">{`"${confirmationText}"`}</strong> below
          </label>
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-2xl p-4 font-mono text-center tracking-widest text-lg font-bold text-white outline-none focus:border-brand transition-all"
          />
        </div>

        <div className="flex justify-end gap-4">
          <button 
            onClick={handleClose} 
            className="px-6 py-3 rounded-full font-bold text-sm bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={!canConfirm}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm bg-red-600 text-white shadow-lg shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            Confirm Deletion
          </button>
        </div>

      </div>
    </div>
  );
}
