import { categoryIndex, symbolForSubtype, statusItemStyle } from './categories.js';

// useElementData returns { [sigmaColumnId]: [...values] }.
// colMap maps semantic field names to the Sigma column IDs chosen by the user.
function columnarToRows(rawData, colMap) {
  const firstKey = Object.values(colMap)[0];
  if (!rawData || !firstKey || !Array.isArray(rawData[firstKey])) return [];

  const len = rawData[firstKey].length;
  const rows = [];
  for (let i = 0; i < len; i++) {
    const row = {};
    for (const [field, colId] of Object.entries(colMap)) {
      row[field] = colId ? rawData[colId]?.[i] : undefined;
    }
    rows.push(row);
  }
  return rows;
}

export function transformNodes(rawData, colMap) {
  const rows = columnarToRows(rawData, colMap);

  const seen = new Set();
  const nodes = [];

  for (const row of rows) {
    const id = String(row.node_id ?? '');
    if (!id) continue;

    if (seen.has(id)) {
      console.warn(`[GraphPlugin] Duplicate node_id "${id}" — skipping`);
      continue;
    }
    seen.add(id);

    const nodeType    = String(row.node_type    ?? '');
    const nodeSubtype = String(row.node_subtype ?? '');
    const status      = String(row.status       ?? '');
    const override    = statusItemStyle(nodeType, nodeSubtype, status);

    const node = {
      id,
      name:       String(row.node_name ?? id),
      symbolSize: Math.max(10, Number(row.symbol_size) || 10),
      symbol:     symbolForSubtype(nodeType, nodeSubtype),
      category:   categoryIndex(nodeType, nodeSubtype),
      node_type:    nodeType,
      node_subtype: nodeSubtype,
      status,
    };
    if (override) node.itemStyle = override;
    nodes.push(node);
  }

  return nodes;
}

export function transformEdges(rawData, colMap, nodeIds) {
  const rows = columnarToRows(rawData, colMap);

  return rows.filter(row => {
    const src = String(row.source ?? '');
    const tgt = String(row.target ?? '');

    if (!nodeIds.has(src)) {
      console.warn(`[GraphPlugin] Edge source "${src}" not in nodes — skipping`);
      return false;
    }
    if (!nodeIds.has(tgt)) {
      console.warn(`[GraphPlugin] Edge target "${tgt}" not in nodes — skipping`);
      return false;
    }
    return true;
  }).map(row => ({
    source:    String(row.source),
    target:    String(row.target),
    edge_type: String(row.edge_type ?? ''),
    lineStyle: {
      type:  row.edge_type === 'ds-wb' ? 'dashed' : 'solid',
      color: row.edge_type === 'ds-wb' ? '#999'   : '#555',
    },
  }));
}

// Positions nodes in a circle for layout: 'none' (large-graph fallback).
export function applyCircularLayout(nodes) {
  const count = nodes.length;
  if (count === 0) return nodes;
  const r = Math.max(200, count * 15);
  return nodes.map((n, i) => ({
    ...n,
    x:     r * Math.cos((2 * Math.PI * i) / count),
    y:     r * Math.sin((2 * Math.PI * i) / count),
    fixed: true,
  }));
}
