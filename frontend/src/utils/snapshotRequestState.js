export const initialSnapshotRequestState = Object.freeze({
  status: "loading",
  snapshot: null,
  error: null,
});

export function snapshotRequestReducer(state, event) {
  switch (event.type) {
    case "start": return { ...state, status: "loading", error: null };
    case "success": return { status: "ready", snapshot: event.snapshot, error: null };
    case "failure": return { ...state, status: "error", error: event.error };
    default: return state;
  }
}
