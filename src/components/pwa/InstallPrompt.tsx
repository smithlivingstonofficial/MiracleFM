"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "miraclefm-install-dismissed-at";
const COOLDOWN_MS = 1000 * 60 * 60 * 24 * 14;

export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissedAt < COOLDOWN_MS) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      window.setTimeout(() => setVisible(true), 2500);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => undefined);
    dismiss();
  };

  if (!visible || !promptEvent) return null;

  return (
    <div className="fixed inset-x-3 bottom-36 z-[60] mx-auto max-w-md rounded-[1.5rem] border border-white/10 bg-zinc-950/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-2xl md:bottom-28 md:right-6 md:left-auto md:mx-0 md:w-96">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FF0055] text-white shadow-[0_0_20px_rgba(255,0,85,0.35)]">
          <Download size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Install Miracle FM</p>
          <p className="mt-0.5 text-xs leading-5 text-zinc-400">Open faster and keep worship close from your home screen.</p>
        </div>
        <button onClick={dismiss} className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white" aria-label="Dismiss install prompt">
          <X size={18} />
        </button>
      </div>
      <button onClick={install} className="mt-3 w-full rounded-full bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-black transition-transform active:scale-95">
        Install App
      </button>
    </div>
  );
}
