import assert from "node:assert/strict";
import test from "node:test";

import { resolveAssistenteModel } from "./client.ts";

test("resolveAssistenteModel remove sufixos de busca na web", () => {
  assert.equal(resolveAssistenteModel("openai/gpt-4o:online"), "openai/gpt-4o");
  assert.equal(resolveAssistenteModel("perplexity/sonar:web"), "perplexity/sonar");
  assert.equal(resolveAssistenteModel(undefined), "google/gemini-2.5-flash");
});
