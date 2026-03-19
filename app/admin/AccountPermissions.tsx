"use client"
import { useState } from "react"
import { getPermissionsByGroup, countGranted, DEFAULT_PERMISSIONS, PERMISSION_DEFS } from "@/lib/permissions-config"

interface AccountPermissionsProps {
  account: any
  onSave: (id: string, permissions: Record<string, boolean>) => Promise<void>
}

export default function AccountPermissions({ account, onSave }: AccountPermissionsProps) {
  const [expanded, setExpanded] = useState(false)
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>(
    () => {
      const perms = account.permissions || DEFAULT_PERMISSIONS
      const result: Record<string, boolean> = {}
      PERMISSION_DEFS.forEach(p => { result[p.key] = perms[p.key] === true })
      return result
    }
  )
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const { granted, total } = countGranted(account.permissions)
  const grouped = getPermissionsByGroup()

  function togglePerm(key: string) {
    setLocalPerms(prev => ({ ...prev, [key]: !prev[key] }))
    setDirty(true)
  }

  function selectAll() {
    const allTrue: Record<string, boolean> = {}
    PERMISSION_DEFS.forEach(p => { allTrue[p.key] = true })
    setLocalPerms(allTrue)
    setDirty(true)
  }

  function deselectAll() {
    const allFalse: Record<string, boolean> = {}
    PERMISSION_DEFS.forEach(p => { allFalse[p.key] = false })
    setLocalPerms(allFalse)
    setDirty(true)
  }

  function handleCancel() {
    const perms = account.permissions || DEFAULT_PERMISSIONS
    const result: Record<string, boolean> = {}
    PERMISSION_DEFS.forEach(p => { result[p.key] = perms[p.key] === true })
    setLocalPerms(result)
    setDirty(false)
    setExpanded(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(account.id, localPerms)
      setDirty(false)
    } catch {
      alert("Failed to save permissions")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={"flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all " + (expanded ? "bg-cyan-600/20 text-cyan-400 ring-1 ring-cyan-600/40" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}
      >
        <span className={granted === total ? "text-green-400" : granted === 0 ? "text-red-400" : "text-yellow-400"}>
          {granted}/{total}
        </span>
        <span>Granted</span>
        <svg className={"w-3 h-3 transition-transform " + (expanded ? "rotate-180" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        {dirty && <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />}
      </button>

      {expanded && (
        <div className="mt-3 p-4 bg-zinc-800/60 rounded-xl border border-zinc-700 max-w-md">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white">Permissions for {account.contactName || account.email}</h4>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-cyan-400 hover:text-cyan-300">All</button>
              <span className="text-zinc-600">|</span>
              <button onClick={deselectAll} className="text-xs text-zinc-400 hover:text-zinc-300">None</button>
            </div>
          </div>

          <div className="space-y-3">
            {grouped.map(({ group, permissions }) => (
              <div key={group.id}>
                <div className="text-xs font-medium text-zinc-500 mb-1.5 flex items-center gap-1.5">
                  <span>{group.icon}</span>
                  <span>{group.label}</span>
                </div>
                <div className="space-y-1">
                  {permissions.map(perm => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-700/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={localPerms[perm.key] || false}
                        onChange={() => togglePerm(perm.key)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className={"text-sm " + (localPerms[perm.key] ? "text-white" : "text-zinc-400")}>{perm.label}</span>
                        {perm.description && <p className="text-xs text-zinc-600">{perm.description}</p>}
                      </div>
                      <span className={"w-2 h-2 rounded-full " + (localPerms[perm.key] ? "bg-green-400" : "bg-zinc-600")} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-700">
            <div className="text-xs text-zinc-500">
              {dirty && <span className="text-orange-400">Unsaved changes</span>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className={"px-4 py-1.5 rounded-lg text-xs font-medium transition-all " + (dirty ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "bg-zinc-700 text-zinc-500 cursor-not-allowed")}
              >
                {saving ? "Saving..." : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
