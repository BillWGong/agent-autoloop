// Finding the Codex the desktop app installs. Failure case: every update unpacks a new build into
// %LOCALAPPDATA%\OpenAI\Codex\bin\<id> and removes the previous one, while PATH keeps naming the removed folder, so
// every Codex turn fails with 找不到 codex beside the build that is there; while an update deletes a folder, the folder
// is still listed but its codex.exe is already gone, and reading it must skip that folder rather than fail the lookup.
import assert from "node:assert/strict";
import { mkdirSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { setup } from "./helpers.ts";

const { inTheApp } = await import("../plugins/codex/agent.ts");

test("the build an update moved to is found in its new folder, newest first", () => {
  const local = setup("codex-app");
  const root = join(local, "OpenAI", "Codex", "bin");
  const yesterday = join(root, "5b4923dff14fbe66");
  const today = join(root, "89cd6612adc9c8d8");
  const helpersOnly = join(root, "6b3391ee968b4b80");
  mkdirSync(yesterday, { recursive: true });
  mkdirSync(today, { recursive: true });
  mkdirSync(helpersOnly, { recursive: true });
  writeFileSync(join(yesterday, "codex.exe"), "");
  writeFileSync(join(today, "codex.exe"), "");
  writeFileSync(join(helpersOnly, "rg.exe"), "");
  utimesSync(join(yesterday, "codex.exe"), new Date("2026-11-20T06:12:00Z"), new Date("2026-11-20T06:12:00Z"));
  utimesSync(join(today, "codex.exe"), new Date("2026-11-20T06:13:00Z"), new Date("2026-11-20T06:13:00Z"));
  const usual = process.env.LOCALAPPDATA;
  process.env.LOCALAPPDATA = local;
  try {
    assert.deepEqual(inTheApp().slice(0, 2), [join(today, "codex.exe"), join(yesterday, "codex.exe")]);
  } finally {
    if (usual === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = usual;
  }
});

test("a folder an update is still emptying is skipped, not thrown", () => {
  const local = setup("codex-app-deleting");
  const root = join(local, "OpenAI", "Codex", "bin");
  const kept = join(root, "89cd6612adc9c8d8");
  const emptying = join(root, "5b4923dff14fbe66");
  mkdirSync(kept, { recursive: true });
  mkdirSync(emptying, { recursive: true });
  writeFileSync(join(kept, "codex.exe"), "");
  const usual = process.env.LOCALAPPDATA;
  process.env.LOCALAPPDATA = local;
  try {
    assert.deepEqual(inTheApp().slice(0, 1), [join(kept, "codex.exe")], "the build that is there is still found");
  } finally {
    if (usual === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = usual;
  }
});
