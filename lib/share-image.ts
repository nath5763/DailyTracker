export async function copyPngOrDownload(blob: Blob, download: (image: Blob) => void): Promise<"copied" | "downloaded"> {
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("Clipboard images are unavailable.");
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return "copied";
  } catch {
    download(blob);
    return "downloaded";
  }
}
