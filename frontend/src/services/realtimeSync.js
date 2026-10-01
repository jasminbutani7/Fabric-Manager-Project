// Cross-tab and local window synchronization utilities for Fabric Manager

export const SYNC_CHANNEL_NAME = 'fabric_manager_sync_channel';
export let syncChannel = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch (e) {
    console.error('BroadcastChannel initialization error:', e);
  }
}

let cloudBroadcastSender = null;

export const registerCloudBroadcastSender = (senderFn) => {
  cloudBroadcastSender = senderFn;
};

export const pruneSyncStorageKeys = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('fm_sync_') && key !== 'fm_sync_signal') {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Error pruning sync storage keys:', e);
  }
};

// Automatically clear legacy unbounded keys on script load
pruneSyncStorageKeys();

let activeSyncTenantId = null;

export const setActiveSyncTenant = (tenantId) => {
  activeSyncTenantId = tenantId ? String(tenantId).trim() : null;
};

export const getActiveSyncTenant = () => activeSyncTenantId;

export const isPayloadForTenant = (payload, candidateIds = []) => {
  if (!payload) return false;
  const pTenant = String(payload.tenantId || payload.item?.user_id || payload.item?.userId || '').trim();
  if (!pTenant) return true; // generic/unspecified payload
  if (candidateIds && candidateIds.length > 0) {
    return candidateIds.some((cid) => String(cid).trim() === pTenant);
  }
  if (activeSyncTenantId) {
    return activeSyncTenantId === pTenant;
  }
  return true;
};

export const LOCAL_TAB_ID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  ? crypto.randomUUID()
  : `tab_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;

const seenMessageIds = new Map();
const MAX_SEEN_CACHE = 500;
const DEDUP_WINDOW_MS = 15000;

export const hasSeenSyncMessage = (msgId) => {
  if (!msgId) return false;
  const now = Date.now();
  if (seenMessageIds.has(msgId)) {
    return true;
  }
  seenMessageIds.set(msgId, now);
  if (seenMessageIds.size > MAX_SEEN_CACHE) {
    const cutoff = now - DEDUP_WINDOW_MS;
    for (const [k, v] of seenMessageIds.entries()) {
      if (v < cutoff) seenMessageIds.delete(k);
    }
  }
  return false;
};

export const broadcastSyncUpdate = ({ type, item, id, tenantId }) => {
  const syncId = id || item?.id;
  if (!type && !syncId) return;

  const effectiveTenantId = String(
    tenantId ||
    item?.user_id ||
    item?.userId ||
    item?.adminUserId ||
    activeSyncTenantId ||
    ''
  ).trim() || null;

  const msgId = `${LOCAL_TAB_ID}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  // Mark as seen immediately in local tab so incoming echoes are discarded
  hasSeenSyncMessage(msgId);

  const payload = {
    msgId,
    originTabId: LOCAL_TAB_ID,
    timestamp: Date.now(),
    type,
    item,
    id: syncId,
    tenantId: effectiveTenantId,
  };

  // 1. Cross-tab sync via BroadcastChannel (primary zero-storage method)
  if (syncChannel) {
    try {
      syncChannel.postMessage(payload);
    } catch {}
  }

  // 2. Storage signal fallback (uses single tenant-scoped key to avoid duplicate events)
  try {
    const storageKey = effectiveTenantId ? `fm_sync_signal_${effectiveTenantId}` : 'fm_sync_signal';
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {}

  // 3. Multi-device cloud broadcast if Supabase Realtime channel is connected
  if (cloudBroadcastSender) {
    try {
      cloudBroadcastSender(payload);
    } catch (err) {
      console.warn('[Sync] Cloud broadcast send error:', err);
    }
  }
};

export const broadcastAssignmentUpdate = (updatedAssignment, tenantId = null) => {
  if (!updatedAssignment?.id) return;
  const effectiveTenantId = tenantId || updatedAssignment.user_id || updatedAssignment.userId || null;

  broadcastSyncUpdate({
    type: 'ASSIGNMENT_UPDATED',
    item: updatedAssignment,
    id: updatedAssignment.id,
    tenantId: effectiveTenantId,
  });
};

export const mergeAssignmentSafely = (currentA, incomingA) => {
  if (!currentA) return incomingA;
  if (!incomingA) return currentA;

  const currentSubs = currentA.dailySubmissions || [];
  const incomingSubs = incomingA.dailySubmissions || [];

  const deletedIds = new Set([
    ...(currentA.deletedSubmissionIds || []),
    ...(incomingA.deletedSubmissionIds || []),
  ]);

  const subsMap = new Map();
  // Put current submissions first (ignoring any explicitly deleted ones)
  currentSubs.forEach((s) => {
    if (s && s.id && !deletedIds.has(s.id)) subsMap.set(s.id, s);
  });

  // Overlay incoming submissions, strictly preserving Approved / Rejected
  incomingSubs.forEach((inc) => {
    if (!inc || !inc.id || deletedIds.has(inc.id)) return;
    if (subsMap.has(inc.id)) {
      const cur = subsMap.get(inc.id);
      if (
        (cur.approvalStatus === 'Approved' || cur.approvalStatus === 'Rejected') &&
        (inc.approvalStatus === 'Pending' || inc.approvalStatus === 'Pending Approval')
      ) {
        // Retain verified status
        return;
      }
    }
    subsMap.set(inc.id, { ...(subsMap.get(inc.id) || {}), ...inc });
  });

  const mergedSubmissions = Array.from(subsMap.values()).sort(
    (x, y) => new Date(y.createdAt || y.date) - new Date(x.createdAt || x.date)
  );

  const seenIds = new Set();
  const deduplicatedSubs = [];

  for (const s of mergedSubmissions) {
    if (!s || !s.id) continue;
    if (seenIds.has(s.id)) continue;
    seenIds.add(s.id);
    deduplicatedSubs.push(s);
  }

  const rate = parseFloat(incomingA.ratePerPiece) || parseFloat(currentA.ratePerPiece) || 0;
  const newCompleted = deduplicatedSubs
    .filter((s) => s.approvalStatus === 'Approved')
    .reduce((acc, s) => acc + (parseInt(s.quantity, 10) || 0), 0);
  const newTotalEarned = deduplicatedSubs
    .filter((s) => s.approvalStatus === 'Approved')
    .reduce(
      (acc, s) => acc + (parseFloat(s.earnedAmount) || (parseInt(s.quantity, 10) || 0) * rate),
      0
    );

  const totalAssigned =
    currentA.assignedSubParts &&
    typeof currentA.assignedSubParts === 'object' &&
    Object.keys(currentA.assignedSubParts).length > 0
      ? Object.values(currentA.assignedSubParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0)
      : parseInt(currentA.totalAssignedPieces, 10) || 0;

  const hasSubmissions = deduplicatedSubs.length > 0;
  const isAccepted = Boolean(
    incomingA.tailorAccepted ||
    currentA.tailorAccepted ||
    hasSubmissions ||
    newCompleted > 0 ||
    incomingA.status === 'In Stitching' ||
    incomingA.status === 'Completed' ||
    currentA.status === 'In Stitching' ||
    currentA.status === 'Completed'
  );

  let newStatus = incomingA.status || currentA.status;
  if (newCompleted >= totalAssigned && totalAssigned > 0) {
    newStatus = 'Completed';
  } else if (newCompleted > 0 || isAccepted) {
    newStatus = 'In Stitching';
  }

  return {
    ...currentA,
    ...incomingA,
    tailorAccepted: isAccepted,
    deletedSubmissionIds: Array.from(deletedIds),
    dailySubmissions: deduplicatedSubs,
    completedQuantity: newCompleted,
    totalEarned: newTotalEarned,
    status: newStatus,
  };
};
