import { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./firebase";
import type { DashEntry, NewDashEntryInput } from "./types";

function entriesCollection(uid: string) {
  return collection(getDb(), "users", uid, "entries");
}

/** Live-subscribes to a user's dash entries in Firestore; call the returned function to unsubscribe. */
export function subscribeToEntries(uid: string, callback: (entries: DashEntry[]) => void): () => void {
  return onSnapshot(entriesCollection(uid), (snapshot) => {
    const entries = snapshot.docs.map((d) => ({ ...(d.data() as Omit<DashEntry, "id">), id: d.id }));
    callback(entries);
  });
}

export async function addCloudEntry(uid: string, input: NewDashEntryInput): Promise<DashEntry> {
  const entry: DashEntry = { ...input, id: uuidv4(), createdAt: new Date().toISOString() };
  await setDoc(doc(entriesCollection(uid), entry.id), entry);
  return entry;
}

export async function updateCloudEntry(uid: string, id: string, patch: Partial<NewDashEntryInput>): Promise<void> {
  await setDoc(doc(entriesCollection(uid), id), patch, { merge: true });
}

export async function deleteCloudEntry(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(entriesCollection(uid), id));
}

/** Copies existing (e.g. local-only) entries into a user's cloud account, keeping their original ids. */
export async function importEntriesToCloud(uid: string, entries: DashEntry[]): Promise<void> {
  const batch = writeBatch(getDb());
  for (const entry of entries) {
    batch.set(doc(entriesCollection(uid), entry.id), entry);
  }
  await batch.commit();
}
