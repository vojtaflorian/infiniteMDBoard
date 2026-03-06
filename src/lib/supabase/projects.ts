import { createClient } from "./client";
import { APP_ID } from "@/lib/config";
import {
  projectDataSchema,
  projectNameSchema,
  shareTokenSchema,
  validatePayloadSize,
} from "@/lib/validation";
import { createLogger } from "@/lib/logger";
import type { Block, Connection, Camera } from "@/types";

const log = createLogger("supabase/projects");

export interface CloudProject {
  id: string;
  name: string;
  data: { blocks: Block[]; connections: Connection[]; camera: Camera };
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch all projects for the authenticated user. */
export async function fetchProjects(): Promise<CloudProject[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, data, share_token, created_at, updated_at")
    .eq("app_id", APP_ID)
    .order("updated_at", { ascending: false });

  if (error) {
    log.error("Failed to fetch projects", error.message);
    return [];
  }
  return (data ?? []) as CloudProject[];
}

/** Upsert (create or update) a project in the cloud. */
export async function upsertProject(
  id: string,
  name: string,
  data: { blocks: Block[]; connections: Connection[]; camera: Camera },
): Promise<boolean> {
  const nameResult = projectNameSchema.safeParse(name);
  if (!nameResult.success) {
    log.error("Invalid project name", nameResult.error.message);
    return false;
  }
  const dataResult = projectDataSchema.safeParse(data);
  if (!dataResult.success) {
    log.error("Invalid project data", dataResult.error.message);
    return false;
  }
  if (!validatePayloadSize(data)) {
    log.error("Project data exceeds 5 MB limit");
    return false;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("projects").upsert(
    {
      id,
      user_id: user.id,
      app_id: APP_ID,
      name,
      data: data as unknown as Record<string, unknown>,
    },
    { onConflict: "id" },
  );

  if (error) {
    log.error("Failed to upsert project", error.message);
    return false;
  }
  return true;
}

/** Delete a project from the cloud. */
export async function deleteCloudProject(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("app_id", APP_ID);
  if (error) {
    log.error("Failed to delete project", error.message);
    return false;
  }
  return true;
}

/** Fetch a single project by share token (public, no auth needed). */
export async function fetchSharedProject(
  shareToken: string,
): Promise<CloudProject | null> {
  if (!shareTokenSchema.safeParse(shareToken).success) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, data, share_token, created_at, updated_at")
    .eq("share_token", shareToken)
    .eq("app_id", APP_ID)
    .single();

  if (error || !data) return null;
  return data as CloudProject;
}

/** Set or clear share token on a project. */
export async function setShareToken(
  projectId: string,
  token: string | null,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({ share_token: token })
    .eq("id", projectId)
    .eq("app_id", APP_ID);

  if (error) {
    log.error("Failed to set share token", error.message);
    return false;
  }
  return true;
}
