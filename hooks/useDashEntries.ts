"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashEntry, NewDashEntryInput } from "@/lib/types";
import { useAuth } from "@/lib/authContext";
import * as localStore from "@/lib/storage";
import {
  subscribeToEntries,
  addCloudEntry,
  updateCloudEntry,
  deleteCloudEntry,
  importEntriesToCloud,
  subscribeToWeeklyGoal,
  setCloudWeeklyGoal
} from "@/lib/cloudEntries";

const IMPORTED_FLAG_KEY = "dasher.importedLocalToCloud.v1";

export function useDashEntries() {
  const { user, isCloudAvailable } = useAuth();
  const [entries, setEntries] = useState<DashEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [localBackupAvailable, setLocalBackupAvailable] = useState(false);
  const [importing, setImporting] = useState(false);
  const [weeklyGoal, setWeeklyGoalState] = useState<number | null>(null);

  useEffect(() => {
    setLoaded(false);
    if (user) {
      const unsubscribe = subscribeToEntries(user.uid, (cloudEntries) => {
        setEntries(cloudEntries);
        setLoaded(true);
      });
      const unsubscribeGoal = subscribeToWeeklyGoal(user.uid, setWeeklyGoalState);
      const alreadyImported = window.localStorage.getItem(IMPORTED_FLAG_KEY) === "true";
      setLocalBackupAvailable(!alreadyImported && localStore.loadEntries().length > 0);
      return () => {
        unsubscribe();
        unsubscribeGoal();
      };
    }
    setEntries(localStore.loadEntries());
    setWeeklyGoalState(localStore.loadWeeklyGoal());
    setLocalBackupAvailable(false);
    setLoaded(true);
  }, [user]);

  const addEntry = useCallback(
    async (input: NewDashEntryInput): Promise<DashEntry> => {
      if (user) return addCloudEntry(user.uid, input);
      const entry = localStore.addEntry(input);
      setEntries((prev) => [...prev, entry]);
      return entry;
    },
    [user]
  );

  const updateEntry = useCallback(
    async (id: string, patch: Partial<NewDashEntryInput>): Promise<void> => {
      if (user) {
        await updateCloudEntry(user.uid, id, patch);
        return;
      }
      setEntries(localStore.updateEntry(id, patch));
    },
    [user]
  );

  const deleteEntry = useCallback(
    async (id: string): Promise<void> => {
      if (user) {
        await deleteCloudEntry(user.uid, id);
        return;
      }
      setEntries(localStore.deleteEntry(id));
    },
    [user]
  );

  const importBackup = useCallback(
    async (parsed: DashEntry[]): Promise<void> => {
      if (user) {
        await importEntriesToCloud(user.uid, parsed);
        return;
      }
      localStore.replaceAllEntries(parsed);
      setEntries(parsed);
    },
    [user]
  );

  const importLocalToCloud = useCallback(async (): Promise<void> => {
    if (!user) return;
    setImporting(true);
    try {
      const local = localStore.loadEntries();
      if (local.length > 0) await importEntriesToCloud(user.uid, local);
      window.localStorage.setItem(IMPORTED_FLAG_KEY, "true");
      setLocalBackupAvailable(false);
    } finally {
      setImporting(false);
    }
  }, [user]);

  const dismissLocalImportPrompt = useCallback(() => {
    window.localStorage.setItem(IMPORTED_FLAG_KEY, "true");
    setLocalBackupAvailable(false);
  }, []);

  const setWeeklyGoal = useCallback(
    async (goal: number | null): Promise<void> => {
      if (user) {
        await setCloudWeeklyGoal(user.uid, goal);
        return;
      }
      localStore.saveWeeklyGoal(goal);
      setWeeklyGoalState(goal);
    },
    [user]
  );

  return {
    entries,
    loaded,
    addEntry,
    updateEntry,
    deleteEntry,
    importBackup,
    isCloudAvailable,
    isSignedIn: Boolean(user),
    localBackupAvailable,
    importing,
    importLocalToCloud,
    dismissLocalImportPrompt,
    weeklyGoal,
    setWeeklyGoal
  };
}
