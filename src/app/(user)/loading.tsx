import { PageHeaderSkeleton, TrackListSkeleton } from "@/components/user/Skeletons";

export default function UserRouteLoading() {
  return (
    <div className="min-h-screen bg-[#050505] px-4 py-10 pb-40 text-white md:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHeaderSkeleton />
        <TrackListSkeleton rows={6} />
      </div>
    </div>
  );
}
