// Category index must match the order in CATEGORIES exactly.
// index 0 = Dataset ROOT, 1 = Dataset INTERNAL, 2 = Dataset LEAF
// index 3 = Workbook FULLY MIGRATED, 4 = PARTIALLY MIGRATED, 5 = NOT MIGRATED

export const CATEGORIES = [
  { name: 'Dataset — Root',          itemStyle: { color: '#E8B84B' } },
  { name: 'Dataset — Internal',      itemStyle: { color: '#F4A623' } },
  { name: 'Dataset — Leaf',          itemStyle: { color: '#4A90D9' } },
  { name: 'Workbook — Done',         itemStyle: { color: '#27AE60' } },
  { name: 'Workbook — Partial',      itemStyle: { color: '#F39C12' } },
  { name: 'Workbook — Not migrated', itemStyle: { color: '#E74C3C' } },
];

export function categoryIndex(nodeType, nodeSubtype) {
  if (nodeType === 'dataset') {
    if (nodeSubtype === 'ROOT')     return 0;
    if (nodeSubtype === 'INTERNAL') return 1;
    return 2; // LEAF or unknown
  }
  // workbook
  if (nodeSubtype === 'FULLY MIGRATED')     return 3;
  if (nodeSubtype === 'PARTIALLY MIGRATED') return 4;
  return 5; // NOT MIGRATED or unknown
}

export function symbolForSubtype(nodeType, nodeSubtype) {
  if (nodeType === 'dataset') {
    if (nodeSubtype === 'ROOT') return 'diamond';
    return 'rect';
  }
  return 'circle';
}

// Returns an itemStyle override for the highest-priority migration targets:
// ROOT datasets that are not yet migrated get a red tint to stand out.
export function statusItemStyle(nodeType, nodeSubtype, status) {
  if (nodeType === 'dataset' && nodeSubtype === 'ROOT' && status === 'not-migrated') {
    return { color: '#C0392B', borderColor: '#922B21', borderWidth: 2 };
  }
  return undefined;
}
