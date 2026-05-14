"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Play, RefreshCw, Server, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StepStatus = "pass" | "warn" | "fail";

type HealthStep = {
  name: string;
  status: StepStatus;
  message: string;
  details?: {
    counts?: {
      jobs?: Record<string, number>;
      tracks?: Record<string, number>;
    };
    issues?: Array<{
      kind: string;
      trackId: string;
      title?: string;
      key: string;
      status: string;
      message: string;
    }>;
    action?: string;
    sampleHlsUrl?: string;
    mediaBaseUrl?: string | null;
    missing?: string[];
  } & Record<string, unknown>;
};

type HealthResponse = {
  ok: boolean;
  summary: {
    failed: number;
    warnings: number;
    passed: number;
    startedAt: string;
    finishedAt: string;
  };
  steps: HealthStep[];
};

const statusStyle: Record<StepStatus, string> = {
  pass: "border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-400",
  warn: "border-yellow-500/20 bg-yellow-500/[0.04] text-yellow-400",
  fail: "border-red-500/20 bg-red-500/[0.04] text-red-400",
};

const statusIcon = {
  pass: CheckCircle2,
  warn: TriangleAlert,
  fail: AlertCircle,
};

function formatCounts(counts?: Record<string, number>) {
  if (!counts) return [];
  return Object.entries(counts).map(([label, value]) => `${label}: ${value}`);
}

export default function StorageHealthPanel() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<HealthResponse | null>(null);

  const pipelineStep = useMemo(
    () => report?.steps.find((step) => step.name === "Upload pipeline consistency"),
    [report]
  );

  const runCheck = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/storage-health", { method: "POST" });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.error || `Storage health check failed with ${res.status}`);
      }

      setReport(body);
      if (body.ok) {
        toast.success("Storage health check passed");
      } else {
        toast.error("Storage health check found issues");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown storage health error";
      toast.error("Storage health check failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-blue-500">
            <Server size={16} /> Storage Health
          </h2>
          <p className="text-sm text-zinc-500 mt-2">
            Verify Supabase CRUD, Cloudflare R2 CRUD, media URLs, and HLS pipeline consistency.
          </p>
        </div>

        <Button
          onClick={runCheck}
          disabled={loading}
          className="bg-white text-black hover:bg-zinc-200 rounded-full font-bold px-6"
        >
          {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Play className="mr-2" size={16} />}
          Run Storage Health Check
        </Button>
      </div>

      {report && (
        <div className="space-y-5">
          <div
            className={cn(
              "grid grid-cols-3 gap-3 rounded-2xl border p-4",
              report.ok ? "bg-emerald-500/[0.04] border-emerald-500/20" : "bg-red-500/[0.04] border-red-500/20"
            )}
          >
            <SummaryCell label="Passed" value={report.summary.passed} tone="text-emerald-400" />
            <SummaryCell label="Warnings" value={report.summary.warnings} tone="text-yellow-400" />
            <SummaryCell label="Failed" value={report.summary.failed} tone="text-red-400" />
          </div>

          <div className="space-y-3">
            {report.steps.map((step) => (
              <HealthStepRow key={step.name} step={step} />
            ))}
          </div>

          {pipelineStep?.details?.counts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <CountBox title="Encoding Jobs" counts={pipelineStep.details.counts.jobs} />
              <CountBox title="Tracks" counts={pipelineStep.details.counts.tracks} />
            </div>
          )}

          {pipelineStep?.details?.issues && pipelineStep.details.issues.length > 0 && (
            <div className="border border-red-500/20 bg-red-500/[0.04] rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-400 text-xs font-black uppercase tracking-widest">
                <AlertCircle size={14} /> Missing R2 Objects
              </div>
              <div className="space-y-2">
                {pipelineStep.details.issues.map((issue) => (
                  <div key={`${issue.kind}-${issue.trackId}-${issue.key}`} className="bg-black/40 rounded-xl p-3">
                    <p className="text-xs font-bold text-white truncate">
                      {issue.title || issue.trackId} <span className="text-zinc-500">({issue.status})</span>
                    </p>
                    <p className="text-[11px] text-red-300/80 mt-1">{issue.message}</p>
                    <p className="text-[10px] text-zinc-500 font-mono truncate mt-2">{issue.key}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-zinc-600 font-mono">
            <span>Finished: {new Date(report.summary.finishedAt).toLocaleString()}</span>
            <button onClick={runCheck} disabled={loading} className="flex items-center gap-1 hover:text-white">
              <RefreshCw size={12} /> Re-run
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCell({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="text-center">
      <p className={cn("text-2xl font-black", tone)}>{value}</p>
      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{label}</p>
    </div>
  );
}

function HealthStepRow({ step }: { step: HealthStep }) {
  const Icon = statusIcon[step.status];

  return (
    <div className={cn("border rounded-2xl p-4", statusStyle[step.status])}>
      <div className="flex items-start gap-3">
        <Icon size={18} className="shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
            <p className="text-sm font-black text-white">{step.name}</p>
            <span className="text-[10px] font-black uppercase tracking-widest">{step.status}</span>
          </div>
          <p className="text-xs text-zinc-300 mt-1">{step.message}</p>

          {step.details?.action && <p className="text-[11px] text-zinc-400 mt-2">{String(step.details.action)}</p>}
          {step.details?.sampleHlsUrl && (
            <p className="text-[10px] text-zinc-500 font-mono truncate mt-2">{String(step.details.sampleHlsUrl)}</p>
          )}
          {step.details?.missing && step.details.missing.length > 0 && (
            <p className="text-[10px] text-zinc-500 font-mono truncate mt-2">
              Missing: {step.details.missing.join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CountBox({ title, counts }: { title: string; counts?: Record<string, number> }) {
  return (
    <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4">
      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-3">{title}</p>
      <div className="flex flex-wrap gap-2">
        {formatCounts(counts).map((count) => (
          <span key={count} className="px-2.5 py-1 rounded-full bg-zinc-900 text-[10px] text-zinc-400 font-mono">
            {count}
          </span>
        ))}
      </div>
    </div>
  );
}
