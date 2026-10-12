import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "../api";
import { AppContext } from "../components";
import type { ImportGroup, Manga } from "../types";
import ImportPage from "./ImportPage";

function group(key: string, volume: string | null, chapter: string | null): ImportGroup {
  return {
    key, title: "Series", authors: [], total_size: 100,
    items: [{ path: `${key}.cbz`, kind: "archive", size: 100, images: 3, series_hint: "Series", volume, chapter, chapter_title: "" }],
  };
}

beforeEach(() => {
  vi.spyOn(api, "library").mockResolvedValue([]);
  vi.spyOn(api, "importStatus").mockResolvedValue({ running: false });
  vi.spyOn(api, "importStart").mockResolvedValue({ running: false, finished: true });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function scan(groups: ImportGroup[]) {
  vi.spyOn(api, "importScan").mockResolvedValue({ root: "drop", groups, skipped: [], rar_supported: false });
  render(<AppContext.Provider value={{ health: null, notify: vi.fn(), refreshJobs: vi.fn(), refreshHealth: vi.fn() }}><ImportPage /></AppContext.Provider>);
  fireEvent.click(screen.getByRole("button", { name: "Scan drop folder" }));
  return screen.findAllByRole("combobox", { name: "Target series" });
}

it("requires a number for an ambiguous file instead of using its list position", async () => {
  const [target] = await scan([group("ambiguous", null, null)]);
  fireEvent.change(target, { target: { value: "__new_local_series__" } });
  const number = screen.getByRole("textbox", { name: "Volume" }) as HTMLInputElement;
  const submit = screen.getByRole("button", { name: "Import 1 selected" }) as HTMLButtonElement;
  expect(number.value).toBe("");
  expect(submit.disabled).toBe(true);
  fireEvent.change(number, { target: { value: "2" } });
  fireEvent.click(submit);
  await waitFor(() => expect(api.importStart).toHaveBeenCalled());
  expect(vi.mocked(api.importStart).mock.calls[0][0][0].items[0].volume).toBe("2");
});

it("preserves both units when the groups target the same series followed as volumes", async () => {
  vi.mocked(api.library).mockResolvedValue([{ id: "series", title: "Series", authors: [], preferred_language: "en", series_unit_override: "volumes" } as unknown as Manga]);
  const targets = await scan([group("volumes", "1", null), group("chapters", null, "148")]);
  for (const target of targets) fireEvent.change(target, { target: { value: "series" } });
  fireEvent.click(screen.getByRole("button", { name: "Import 2 selected" }));
  await waitFor(() => expect(api.importStart).toHaveBeenCalled());
  const groups = vi.mocked(api.importStart).mock.calls[0][0];
  expect(groups.map((entry) => [entry.unit, entry.items[0].volume, entry.items[0].chapter])).toEqual([
    ["volumes", "1", null], ["chapters", null, "148"],
  ]);
});
