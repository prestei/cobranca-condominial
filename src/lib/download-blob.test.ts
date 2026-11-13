import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { downloadBlob } from "@/lib/download-blob";

describe("downloadBlob", () => {
  test("no-op fora do navegador", () => {
    assert.doesNotThrow(() => downloadBlob(new Blob(["x"]), "test.csv"));
  });
});
