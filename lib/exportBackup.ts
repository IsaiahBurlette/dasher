import { Capacitor } from "@capacitor/core";

/**
 * Downloads a backup file. In the standalone Android app, the WebView's
 * `<a download>` blob trick is a no-op (no download manager to hand it to),
 * so instead we write the file to disk via the Filesystem plugin and hand it
 * to the OS share sheet, where the user can save it to Files/Drive/etc.
 */
export async function exportBackupFile(json: string): Promise<void> {
  const filename = `dasher-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");

    const written = await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    });
    await Share.share({
      title: "Dasher backup",
      url: written.uri
    });
    return;
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
