"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/stores/projectStore";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import {
  fetchSharedProject,
  upsertProject,
  type CloudProject,
} from "@/lib/supabase/projects";
import { shareTokenSchema } from "@/lib/validation";
import { generateId } from "@/lib/id";
import { Copy, ArrowLeft, Loader2 } from "lucide-react";
import type { Project } from "@/types";

export default function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const importProject = useProjectStore((s) => s.importProject);
  const isDarkMode = useUIStore((s) => s.isDarkMode);

  const [project, setProject] = useState<CloudProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shareTokenSchema.safeParse(token).success) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    fetchSharedProject(token).then((p) => {
      if (p) {
        setProject(p);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [token]);

  const handleSaveCopy = async () => {
    if (!project) return;
    setSaving(true);

    const newId = generateId();
    const localProject: Project = {
      id: newId,
      name: `${project.name} (copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blocks: project.data.blocks ?? [],
      connections: project.data.connections ?? [],
      camera: project.data.camera ?? { x: 0, y: 0, zoom: 1 },
    };

    // Save to localStorage
    importProject(localProject);

    // Also save to cloud if authenticated
    if (user) {
      await upsertProject(newId, localProject.name, {
        blocks: localProject.blocks,
        connections: localProject.connections,
        camera: localProject.camera,
      });
    }

    router.push(`/canvas/${newId}`);
  };

  const bg = isDarkMode
    ? "bg-zinc-950 text-white"
    : "bg-slate-50 text-slate-900";
  const cardBg = isDarkMode
    ? "bg-zinc-900 border-zinc-700"
    : "bg-white border-slate-200";

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <Loader2 size={32} className="animate-spin opacity-50" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${bg}`}>
        <p className="text-lg font-medium opacity-70">
          Shared project not found
        </p>
        <p className="text-sm opacity-40">
          The link may have expired or been revoked.
        </p>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
        >
          <ArrowLeft size={16} /> Go to dashboard
        </button>
      </div>
    );
  }

  const blockCount = project?.data?.blocks?.length ?? 0;
  const connectionCount = project?.data?.connections?.length ?? 0;

  return (
    <div className={`min-h-screen flex items-center justify-center p-8 ${bg}`}>
      <div
        className={`${cardBg} border rounded-xl p-8 w-full max-w-md shadow-2xl text-center`}
      >
        <p className="text-xs uppercase tracking-wider opacity-40 mb-2">
          Shared Project
        </p>
        <h1 className="text-2xl font-bold mb-4">{project?.name}</h1>

        <div className="flex justify-center gap-6 mb-6 text-sm opacity-50">
          <span>{blockCount} block{blockCount !== 1 ? "s" : ""}</span>
          <span>
            {connectionCount} connection{connectionCount !== 1 ? "s" : ""}
          </span>
        </div>

        <button
          onClick={handleSaveCopy}
          disabled={saving}
          className="flex items-center gap-2 mx-auto px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
        >
          <Copy size={18} />
          {saving ? "Saving..." : "Save a copy"}
        </button>

        <p className="text-xs opacity-30 mt-4">
          {user
            ? "Will be saved to your cloud account"
            : "Will be saved to your browser (sign in for cloud sync)"}
        </p>
      </div>
    </div>
  );
}
