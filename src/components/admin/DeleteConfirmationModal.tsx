"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteMode: "orphan" | "cascade") => void;
  itemName: string;
}

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, itemName }: Props) {
  const [deleteMode, setDeleteMode] = useState<"orphan" | "cascade">("orphan");
  const [confirmText, setConfirmText] = useState("");

  if (!isOpen) return null;

  const canDelete = confirmText === itemName;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-panel border border-white/10 rounded-4xl shadow-2xl max-w-2xl w-full p-8 m-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Confirm Deletion</h2>
            <p className="text-zinc-400 mt-1 text-sm">
              This action is irreversible. Please select how you want to handle associated tracks.
            </p>
          </div>
        </div>

        <div className="space-y-4 my-8">
          {/* Option 1: Orphan */}
          <label className={`block p-5 rounded-2xl border-2 transition-colors cursor-pointer ${deleteMode === 'orphan' ? 'border-brand bg-brand/10' : 'border-white/10 bg-black/20 hover:border-white/20'}`}>
            <input type="radio" name="deleteMode" value="orphan" checked={deleteMode === 'orphan'} onChange={() => setDeleteMode('orphan')} className="hidden" />
            <h3 className="font-bold text-white">Orphan Tracks (Recommended)</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Deletes the artist <strong className="text-white">{`"${itemName}"`}</strong>. Associated tracks will be kept but marked as "Unassigned".
            </p>
          </label>

          {/* Option 2: Cascade */}
          <label className={`block p-5 rounded-2xl border-2 transition-colors cursor-pointer ${deleteMode === 'cascade' ? 'border-brand bg-brand/10' : 'border-white/10 bg-black/20 hover:border-white/20'}`}>
            <input type="radio" name="deleteMode" value="cascade" checked={deleteMode === 'cascade'} onChange={() => setDeleteMode('cascade')} className="hidden" />
            <h3 className="font-bold text-white">Delete Artist and All Their Tracks</h3>
            <p className="text-xs text-zinc-400 mt-1">
              This will permanently delete the artist, all their associated tracks, and all audio files from Cloudflare R2.
            </p>
          </label>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">
            To confirm, type <strong className="text-brand">{`"${itemName}"`}</strong> below
          </label>
          <input 
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-2xl p-4 font-mono text-center tracking-widest text-lg font-bold text-white outline-none focus:border-brand transition-all"
          />
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button onClick={onClose} className="px-6 py-3 rounded-full font-bold text-sm bg-white/10 text-white hover:bg-white/20 transition-colors">
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(deleteMode)} 
            disabled={!canDelete}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm bg-red-600 text-white shadow-lg shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            Permanently Delete
          </button>
        </div>
      </div>
    </div>
  );
}