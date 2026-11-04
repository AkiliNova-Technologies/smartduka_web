"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { StoreFollowingClient } from "@/lib/store-following-client";
export function useStoreFollow(vendorId: string, initialCount: number) {
  const { isAuthenticated, sessionReady, sessionRevision } = useAuth();
  const [following, setFollowing] = useState(false), [followerCount, setFollowerCount] = useState(initialCount), [loading, setLoading] = useState(false), busy = useRef(false);
  useEffect(() => { const controller = new AbortController(); let active = true; Promise.resolve().then(async () => { if (!active) return; setFollowing(false); setFollowerCount(initialCount); if (!isAuthenticated || !sessionReady) return; const state = await StoreFollowingClient.state(vendorId, controller.signal); if (active) { setFollowing(state.following); setFollowerCount(state.followerCount); } }).catch(() => {}); return () => { active = false; controller.abort(); }; }, [initialCount, isAuthenticated, sessionReady, sessionRevision, vendorId]);
  const toggle = useCallback(async () => { if (busy.current) return; busy.current = true; setLoading(true); const previous = following, previousCount = followerCount, next = !previous; setFollowing(next); setFollowerCount(Math.max(0, previousCount + (next ? 1 : -1))); try { const state = await StoreFollowingClient.set(vendorId, next); setFollowing(state.following); setFollowerCount(state.followerCount); } catch (error) { setFollowing(previous); setFollowerCount(previousCount); throw error; } finally { busy.current = false; setLoading(false); } }, [followerCount, following, vendorId]);
  return { following, followerCount, loading, authenticated: isAuthenticated && sessionReady, toggle };
}
