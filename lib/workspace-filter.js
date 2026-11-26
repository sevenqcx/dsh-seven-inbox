/**
 * Pure multi-workspace filter helpers for dsh-seven-inbox.
 * - Normalizes selected IDs (deduplicates; selecting all collapses to [] = All projects)
 * - Supports toggle, invert (quick exclude), prune against live workspace list, and badge state.
 */

export function normalizeWorkspaceFilterIds(ids, allIds = []) {
  const clean = [...new Set((ids ?? []).filter((id) => typeof id === 'string' && id))];
  const all = [...new Set((allIds ?? []).filter((id) => typeof id === 'string' && id))];
  if (all.length > 0 && clean.length >= all.length) {
    const set = new Set(clean);
    if (all.every((id) => set.has(id))) return [];
  }
  return clean;
}

export function toggleWorkspaceFilterId(selectedIds, workspaceId, allIds = []) {
  if (typeof workspaceId !== 'string' || !workspaceId) {
    return normalizeWorkspaceFilterIds(selectedIds, allIds);
  }
  const set = new Set((selectedIds ?? []).filter((id) => typeof id === 'string' && id));
  if (set.has(workspaceId)) set.delete(workspaceId);
  else set.add(workspaceId);
  return normalizeWorkspaceFilterIds([...set], allIds);
}

export function invertWorkspaceFilterIds(selectedIds, allIds = []) {
  const all = [...new Set((allIds ?? []).filter((id) => typeof id === 'string' && id))];
  if (all.length < 2) return [];
  const selected = new Set((selectedIds ?? []).filter((id) => typeof id === 'string' && id));
  const inverted = all.filter((id) => !selected.has(id));
  return normalizeWorkspaceFilterIds(inverted, all);
}

export function pruneWorkspaceFilterIds(selectedIds, allIds = []) {
  const all = [...new Set((allIds ?? []).filter((id) => typeof id === 'string' && id))];
  if (all.length === 0) return normalizeWorkspaceFilterIds(selectedIds, []);
  const valid = new Set(all);
  const kept = (selectedIds ?? []).filter((id) => typeof id === 'string' && valid.has(id));
  return normalizeWorkspaceFilterIds(kept, all);
}

export function workspaceFilterBadgeState(selectedIds, totalWorkspaces) {
  const count = (selectedIds ?? []).filter((id) => typeof id === 'string' && id).length;
  if (count === 0) return { mode: '', text: '' };
  if (count === 1) return { mode: 'single', text: '' };
  return {
    mode: 'multi',
    text: totalWorkspaces > 0 ? `${count}/${totalWorkspaces}` : String(count),
  };
}
