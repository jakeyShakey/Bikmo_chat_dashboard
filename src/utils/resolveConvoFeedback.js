export function resolveConvoFeedback(feedbackRows) {
  const map = {};
  feedbackRows.forEach((f) => {
    const existing = map[f.conversation_id];
    if (!existing || new Date(f.created_at) > new Date(existing.created_at)) {
      map[f.conversation_id] = f;
    }
  });
  return map;
}
