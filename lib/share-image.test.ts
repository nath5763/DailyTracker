import { afterEach, expect, test, vi } from "vitest";
import { copyPngOrDownload } from "./share-image";

afterEach(() => vi.unstubAllGlobals());

test("copying a PNG uses the clipboard when supported", async () => {
  const write = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { write } });
  vi.stubGlobal("ClipboardItem", class { constructor(readonly parts: Record<string, Blob>) {} });
  const download = vi.fn();
  const image = new Blob(["png"], { type: "image/png" });
  expect(await copyPngOrDownload(image, download)).toBe("copied");
  expect(write).toHaveBeenCalledOnce();
  expect(download).not.toHaveBeenCalled();
});

test("failed or unsupported clipboard copying downloads the same PNG", async () => {
  const image = new Blob(["png"], { type: "image/png" });
  const download = vi.fn();
  vi.stubGlobal("navigator", { clipboard: { write: vi.fn().mockRejectedValue(new Error("Denied")) } });
  vi.stubGlobal("ClipboardItem", class { constructor(readonly parts: Record<string, Blob>) {} });
  expect(await copyPngOrDownload(image, download)).toBe("downloaded");
  expect(download).toHaveBeenCalledWith(image);
  vi.stubGlobal("navigator", {});
  expect(await copyPngOrDownload(image, download)).toBe("downloaded");
});
