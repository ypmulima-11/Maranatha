import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") ?? "";
const REPO = Deno.env.get("REPO") ?? "ypmulima-11/Maranatha";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function corsRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return { ok: false, res: corsRes({ error: "Not signed in." }, 401) };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { ok: false, res: corsRes({ error: "Invalid session." }, 401) };
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!prof || prof.role !== "admin") {
    return { ok: false, res: corsRes({ error: "Admin access required." }, 403) };
  }
  return { ok: true };
}

async function github(method: string, path: string, data?: unknown) {
  const res = await fetch("https://api.github.com" + path, {
    method,
    headers: {
      Authorization: "Bearer " + GITHUB_TOKEN,
      "User-Agent": "maranatha-cms",
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  let body: unknown = null;
  try { body = await res.json(); } catch { /* ignore */ }
  return { status: res.status, body: body as any };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return corsRes({ error: "Use POST." }, 405);
  if (!GITHUB_TOKEN) {
    return corsRes({ error: "Server not configured yet: add the GITHUB_TOKEN secret." }, 500);
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  let body: any;
  try { body = await req.json(); } catch { return corsRes({ error: "Bad JSON body." }, 400); }

  if (body.action === "read") {
    const r = await github("GET", "/repos/" + REPO + "/contents/content.json");
    if (r.status === 200 && r.body && r.body.content) {
      return corsRes({ content: r.body.content, sha: r.body.sha });
    }
    return corsRes({ error: "Could not load content.json (GitHub " + r.status + ")." }, 502);
  }

  if (body.action === "save") {
    const cur = await github("GET", "/repos/" + REPO + "/contents/content.json");
    if (cur.status !== 200) {
      return corsRes({ error: "Could not read content.json (GitHub " + cur.status + ")." }, 502);
    }
    const r = await github("PUT", "/repos/" + REPO + "/contents/content.json", {
      message: "Update site content",
      content: body.content,
      sha: cur.body.sha,
    });
    if (r.status === 200 || r.status === 201) return corsRes({ ok: true });
    return corsRes({ error: "GitHub save failed (" + r.status + "): " + (r.body?.message ?? "") }, 502);
  }

  if (body.action === "upload") {
    const path = String(body.path || "");
    if (!path.startsWith("images/")) return corsRes({ error: "Invalid image path." }, 400);
    const cur = await github("GET", "/repos/" + REPO + "/contents/" + path);
    const sha = cur.status === 200 ? cur.body.sha : undefined;
    const r = await github("PUT", "/repos/" + REPO + "/contents/" + path, {
      message: "Add image " + String(path.split("/").pop()),
      content: body.content,
      sha,
    });
    if (r.status === 200 || r.status === 201) return corsRes({ ok: true });
    return corsRes({ error: "Upload failed (" + r.status + "): " + (r.body?.message ?? "") }, 502);
  }

  return corsRes({ error: "Unknown action." }, 400);
});
