import test from "node:test";
import assert from "node:assert/strict";

import { initialSnapshotRequestState, snapshotRequestReducer } from "./snapshotRequestState.js";

test("preserves the last valid snapshot during refresh and failure", () => {
  const snapshot = { source: "akshare", rows: [1, 2, 3] };
  const ready = snapshotRequestReducer(initialSnapshotRequestState, { type: "success", snapshot });
  assert.deepEqual(ready, { status: "ready", snapshot, error: null });

  const refreshing = snapshotRequestReducer(ready, { type: "start" });
  assert.deepEqual(refreshing, { status: "loading", snapshot, error: null });

  const error = new Error("offline");
  const failed = snapshotRequestReducer(refreshing, { type: "failure", error });
  assert.deepEqual(failed, { status: "error", snapshot, error });
});
