"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ===== 3-Layer Data Model =====
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
interface KBPage {
  id: string;
  group_id: string;
  title: string;
  slug: string;
  content: string;
  status: "draft" | "published";
  sort_order: number;
}

const LS_KEY = "kb_admin_3layer";
function loadData(): { sections: Section[]; groups: SectionGroup[]; pages: KBPage[] } {
  if (typeof window === "undefined") return { sections: [], groups: [], pages: [] };
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null") || { sections: [], groups: [], pages: [] }; }
  catch { return { sections: [], groups: [], pages: [] }; }
}
function saveData(d: { sections: Section[]; groups: SectionGroup[]; pages: KBPage[] }) {
  localStorage.setItem(LS_KEY, JSON.stringify(d));
}
function uid() { return Math.random().toString(36).slice(2, 10); }

export default function KBAdminPage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [groups, setGroups] = useState<SectionGroup[]>([]);
  const [pages, setPages] = useState<KBPage[]>([]);
  const [selSection, setSelSection] = useState<string | null>(null);
  const [selGroup, setSelGroup] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; layer: "section" | "group" | "page"; mode: "create" | "edit"; data: any }>({ open: false, layer: "section", mode: "create", data: {} });

  useEffect(() => {
    const d = loadData();
    setSections(d.sections); setGroups(d.groups); setPages(d.pages);
  }, []);

  const persist = useCallback((s: Section[], g: SectionGroup[], p: KBPage[]) => {
    setSections(s); setGroups(g); setPages(p);
    saveData({ sections: s, groups: g, pages: p });
  }, []);

  // CRUD: Section
  const addSection = (title: string) => { const ns = [...sections, { id: uid(), title, sort_order: sections.length }]; persist(ns, groups, pages); };
  const editSection = (id: string, title: string) => { persist(sections.map(s => s.id === id ? { ...s, title } : s), groups, pages); };
  const delSection = (id: string) => {
    if (!confirm("Delete section + all groups & pages?")) return;
    const gIds = groups.filter(g => g.section_id === id).map(g => g.id);
    persist(sections.filter(s => s.id !== id), groups.filter(g => g.section_id !== id), pages.filter(p => !gIds.includes(p.group_id)));
    if (selSection === id) { setSelSection(null); setSelGroup(null); }
  };
  // CRUD: Group
  const addGroup = (sectionId: string, title: string) => { const sg = groups.filter(g => g.section_id === sectionId); persist(sections, [...groups, { id: uid(), section_id: sectionId, title, sort_order: sg.length }], pages); };
  const editGroup = (id: string, title: string) => { persist(sections, groups.map(g => g.id === id ? { ...g, title } : g), pages); };
  const delGroup = (id: string) => {
    if (!confirm("Delete group + all pages?")) return;
    persist(sections, groups.filter(g => g.id !== id), pages.filter(p => p.group_id !== id));
    if (selGroup === id) setSelGroup(null);
  };
  // CRUD: Page
  const addPage = (groupId: string, title: string) => {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const gp = pages.filter(p => p.group_id === groupId);
    persist(sections, groups, [...pages, { id: uid(), group_id: groupId, title, slug, content: "", status: "draft", sort_order: gp.length }]);
  };
  const editPage = (id: string, title: string) => { persist(sections, groups, pages.map(p => p.id === id ? { ...p, title } : p)); };
  const delPage = (id: string) => { if (!confirm("Delete page?")) return; persist(sections, groups, pages.filter(p => p.id !== id)); };

  const handleSave = () => {
    const { layer, mode, data } = modal;
    if (!data.title?.trim()) return alert("Title required");
    if (layer === "section") { mode === "create" ? addSection(data.title) : editSection(data.id, data.title); }
    else if (layer === "group") { mode === "create" ? addGroup(data.section_id || selSection!, data.title) : editGroup(data.id, data.title); }
    else { mode === "create" ? addPage(data.group_id || selGroup!, data.title) : editPage(data.id, data.title); }
    setModal({ ...modal, open: false });
  };

  const fGroups = selSection ? groups.filter(g => g.section_id === selSection) : [];
  const fPages = selGroup ? pages.filter(p => p.group_id === selGroup) : [];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-zinc-800 p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">KB Admin</h1>
        <button onClick={() => router.push("/admin")} className="text-sm text-zinc-400 hover:text-white">Back</button>
      </div>
      <div className="flex h-[calc(100vh-65px)]">
        {/* Col 1: Sections */}
        <div className="w-64 border-r border-zinc-800 flex flex-col">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Sections</span>
            <button onClick={() => setModal({ open: true, layer: "section", mode: "create", data: { title: "" } })} className="text-green-400 text-lg">+</button>
          </div>
          <div className="flex-1 overflow-y-auto">{sections.map(s => (
            <div key={s.id} onClick={() => { setSelSection(s.id); setSelGroup(null); }} className={`p-3 cursor-pointer border-b border-zinc-900 flex items-center justify-between group ${selSection === s.id ? "bg-zinc-800" : "hover:bg-zinc-900"}`}>
              <span className="truncate text-sm">{s.title}</span>
              <span className="hidden group-hover:flex gap-1">
                <button onClick={e => { e.stopPropagation(); setModal({ open: true, layer: "section", mode: "edit", data: { id: s.id, title: s.title } }); }} className="text-blue-400 text-xs">Edit</button>
                <button onClick={e => { e.stopPropagation(); delSection(s.id); }} className="text-red-400 text-xs">Del</button>
              </span>
            </div>
          ))}</div>
        </div>
        {/* Col 2: Groups */}
        <div className="w-72 border-r border-zinc-800 flex flex-col">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Groups</span>
            {selSection && <button onClick={() => setModal({ open: true, layer: "group", mode: "create", data: { title: "", section_id: selSection } })} className="text-green-400 text-lg">+</button>}
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selSection ? <p className="p-3 text-zinc-600 text-sm">Select a section</p> : fGroups.length === 0 ? <p className="p-3 text-zinc-600 text-sm">No groups</p> : fGroups.map(g => (
              <div key={g.id} onClick={() => setSelGroup(g.id)} className={`p-3 cursor-pointer border-b border-zinc-900 flex items-center justify-between group ${selGroup === g.id ? "bg-zinc-800" : "hover:bg-zinc-900"}`}>
                <span className="truncate text-sm">{g.title}</span>
                <span className="hidden group-hover:flex gap-1">
                  <button onClick={e => { e.stopPropagation(); setModal({ open: true, layer: "group", mode: "edit", data: { id: g.id, title: g.title } }); }} className="text-blue-400 text-xs">Edit</button>
                  <button onClick={e => { e.stopPropagation(); delGroup(g.id); }} className="text-red-400 text-xs">Del</button>
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Col 3: Pages */}
        <div className="flex-1 flex flex-col">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Pages</span>
            {selGroup && <button onClick={() => setModal({ open: true, layer: "page", mode: "create", data: { title: "", group_id: selGroup } })} className="text-green-400 text-lg">+</button>}
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selGroup ? <p className="p-3 text-zinc-600 text-sm">Select a group</p> : fPages.length === 0 ? <p className="p-3 text-zinc-600 text-sm">No pages</p> : fPages.map(pg => (
              <div key={pg.id} className="p-3 border-b border-zinc-900 flex items-center justify-between group hover:bg-zinc-900">
                <div><div className="text-sm font-medium">{pg.title}</div><div className="text-xs text-zinc-500">{pg.status} / {pg.slug}</div></div>
                <span className="hidden group-hover:flex gap-2">
                  <button onClick={() => setModal({ open: true, layer: "page", mode: "edit", data: { id: pg.id, title: pg.title } })} className="text-blue-400 text-xs">Edit</button>
                  <button onClick={() => delPage(pg.id)} className="text-red-400 text-xs">Del</button>
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
            <input type="text" value={modal.data.title || ""} onChange={e => setModal({ ...modal, data: { ...modal.data, title: e.target.value } })} placeholder="Title" className="w-full p-2 rounded bg-zinc-800 border border-zinc-600 text-white mb-4" autoFocus onKeyDown={e => e.key === "Enter" && handleSave()} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModal({ ...modal, open: false })} className="px-4 py-2 text-sm text-zinc-400">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 rounded text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
