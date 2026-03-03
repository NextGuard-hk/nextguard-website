"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Section {
  id: string;
  title: string;
  sort_order: number;
}

interface SectionGroup {
  id: string;
  section_id: string;
  title: string;
  sort_order: number;
}

interface Page {
  id: string;
  group_id: string;
  title: string;
  slug: string;
  content: string;
  status: "draft" | "published";
  sort_order: number;
  created: string;
}

export default function KBAdminPage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [groups, setGroups] = useState<SectionGroup[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; layer: "section" | "group" | "page"; mode: "create" | "edit"; data: any }>({ open: false, layer: "section", mode: "create", data: {} });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, g, p] = await Promise.all([
      supabase.from("kb_sections").select("*").order("sort_order"),
      supabase.from("kb_section_groups").select("*").order("sort_order"),
      supabase.from("kb_pages").select("*").order("sort_order"),
    ]);
    setSections(s.data || []);
    setGroups(g.data || []);
    setPages(p.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // CRUD: Section
  const createSection = async (title: string) => {
    const max = sections.reduce((m, s) => Math.max(m, s.sort_order), 0);
    await supabase.from("kb_sections").insert({ title, sort_order: max + 1 });
    fetchAll();
  };
  const updateSection = async (id: string, title: string) => {
    await supabase.from("kb_sections").update({ title }).eq("id", id);
    fetchAll();
  };
  const deleteSection = async (id: string) => {
    if (!confirm("Delete section and all groups/pages?")) return;
    const gIds = groups.filter(g => g.section_id === id).map(g => g.id);
    if (gIds.length) await supabase.from("kb_pages").delete().in("group_id", gIds);
    await supabase.from("kb_section_groups").delete().eq("section_id", id);
    await supabase.from("kb_sections").delete().eq("id", id);
    if (selectedSection === id) { setSelectedSection(null); setSelectedGroup(null); }
    fetchAll();
  };

  // CRUD: SectionGroup
  const createGroup = async (sectionId: string, title: string) => {
    const max = groups.filter(g => g.section_id === sectionId).reduce((m, g) => Math.max(m, g.sort_order), 0);
    await supabase.from("kb_section_groups").insert({ section_id: sectionId, title, sort_order: max + 1 });
    fetchAll();
  };
  const updateGroup = async (id: string, title: string) => {
    await supabase.from("kb_section_groups").update({ title }).eq("id", id);
    fetchAll();
  };
  const deleteGroup = async (id: string) => {
    if (!confirm("Delete group and all pages?")) return;
    await supabase.from("kb_pages").delete().eq("group_id", id);
    await supabase.from("kb_section_groups").delete().eq("id", id);
    if (selectedGroup === id) setSelectedGroup(null);
    fetchAll();
  };

  // CRUD: Page
  const createPage = async (groupId: string, title: string) => {
    const max = pages.filter(p => p.group_id === groupId).reduce((m, p) => Math.max(m, p.sort_order), 0);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    await supabase.from("kb_pages").insert({ group_id: groupId, title, slug, content: "", status: "draft", sort_order: max + 1 });
    fetchAll();
  };
  const updatePage = async (id: string, updates: Partial<Page>) => {
    await supabase.from("kb_pages").update(updates).eq("id", id);
    fetchAll();
  };
  const deletePage = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    await supabase.from("kb_pages").delete().eq("id", id);
    fetchAll();
  };

  const handleModalSave = async () => {
    const { layer, mode, data } = modal;
    if (!data.title?.trim()) return alert("Title is required");
    if (layer === "section") {
      mode === "create" ? await createSection(data.title) : await updateSection(data.id, data.title);
    } else if (layer === "group") {
      mode === "create" ? await createGroup(data.section_id || selectedSection!, data.title) : await updateGroup(data.id, data.title);
    } else {
      mode === "create" ? await createPage(data.group_id || selectedGroup!, data.title) : await updatePage(data.id, { title: data.title });
    }
    setModal({ ...modal, open: false });
  };

  const filteredGroups = selectedSection ? groups.filter(g => g.section_id === selectedSection) : [];
  const filteredPages = selectedGroup ? pages.filter(p => p.group_id === selectedGroup) : [];

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-black text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-zinc-800 p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">KB Admin — 3-Layer Structure</h1>
        <button onClick={() => router.push("/admin")} className="text-sm text-zinc-400 hover:text-white">← Back</button>
      </div>
      <div className="flex h-[calc(100vh-65px)]">
        {/* Column 1: Sections */}
        <div className="w-64 border-r border-zinc-800 flex flex-col">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Sections</span>
            <button onClick={() => setModal({ open: true, layer: "section", mode: "create", data: { title: "" } })} className="text-green-400 hover:text-green-300 text-lg">+</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sections.map(s => (
              <div key={s.id} onClick={() => { setSelectedSection(s.id); setSelectedGroup(null); }} className={`p-3 cursor-pointer border-b border-zinc-900 flex items-center justify-between group ${selectedSection === s.id ? "bg-zinc-800" : "hover:bg-zinc-900"}`}>
                <span className="truncate text-sm">{s.title}</span>
                <span className="hidden group-hover:flex gap-1">
                  <button onClick={e => { e.stopPropagation(); setModal({ open: true, layer: "section", mode: "edit", data: { id: s.id, title: s.title } }); }} className="text-blue-400 text-xs">Edit</button>
                  <button onClick={e => { e.stopPropagation(); deleteSection(s.id); }} className="text-red-400 text-xs">Del</button>
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Column 2: Groups */}
        <div className="w-72 border-r border-zinc-800 flex flex-col">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Groups</span>
            {selectedSection && <button onClick={() => setModal({ open: true, layer: "group", mode: "create", data: { title: "", section_id: selectedSection } })} className="text-green-400 hover:text-green-300 text-lg">+</button>}
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selectedSection ? <p className="p-3 text-zinc-600 text-sm">Select a section</p> : filteredGroups.length === 0 ? <p className="p-3 text-zinc-600 text-sm">No groups</p> : filteredGroups.map(g => (
              <div key={g.id} onClick={() => setSelectedGroup(g.id)} className={`p-3 cursor-pointer border-b border-zinc-900 flex items-center justify-between group ${selectedGroup === g.id ? "bg-zinc-800" : "hover:bg-zinc-900"}`}>
                <span className="truncate text-sm">{g.title}</span>
                <span className="hidden group-hover:flex gap-1">
                  <button onClick={e => { e.stopPropagation(); setModal({ open: true, layer: "group", mode: "edit", data: { id: g.id, title: g.title } }); }} className="text-blue-400 text-xs">Edit</button>
                  <button onClick={e => { e.stopPropagation(); deleteGroup(g.id); }} className="text-red-400 text-xs">Del</button>
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Column 3: Pages */}
        <div className="flex-1 flex flex-col">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Pages</span>
            {selectedGroup && <button onClick={() => setModal({ open: true, layer: "page", mode: "create", data: { title: "", group_id: selectedGroup } })} className="text-green-400 hover:text-green-300 text-lg">+</button>}
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selectedGroup ? <p className="p-3 text-zinc-600 text-sm">Select a group</p> : filteredPages.length === 0 ? <p className="p-3 text-zinc-600 text-sm">No pages</p> : filteredPages.map(pg => (
              <div key={pg.id} className="p-3 border-b border-zinc-900 flex items-center justify-between group hover:bg-zinc-900">
                <div><div className="text-sm font-medium">{pg.title}</div><div className="text-xs text-zinc-500">{pg.status} · /{pg.slug}</div></div>
                <span className="hidden group-hover:flex gap-2">
                  <button onClick={() => setModal({ open: true, layer: "page", mode: "edit", data: { id: pg.id, title: pg.title } })} className="text-blue-400 text-xs">Edit</button>
                  <button onClick={() => deletePage(pg.id)} className="text-red-400 text-xs">Del</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {modal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setModal({ ...modal, open: false })}>
          <div className="bg-zinc-900 rounded-lg p-6 w-96 border border-zinc-700" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{modal.mode === "create" ? "Create" : "Edit"} {modal.layer === "section" ? "Section" : modal.layer === "group" ? "Group" : "Page"}</h2>
            <input type="text" value={modal.data.title || ""} onChange={e => setModal({ ...modal, data: { ...modal.data, title: e.target.value } })} placeholder="Title" className="w-full p-2 rounded bg-zinc-800 border border-zinc-600 text-white mb-4" autoFocus onKeyDown={e => e.key === "Enter" && handleModalSave()} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModal({ ...modal, open: false })} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
              <button onClick={handleModalSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
