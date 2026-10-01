export function moveMilestone(milestones, id, offset) {
  const ids = milestones.map((milestone) => milestone.id);
  const index = ids.indexOf(id);
  const nextIndex = index + offset;
  if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) {
    return ids;
  }
  const [movedId] = ids.splice(index, 1);
  ids.splice(nextIndex, 0, movedId);
  return ids;
}
