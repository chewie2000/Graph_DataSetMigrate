import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import {
  useConfig,
  useEditorPanelConfig,
  useElementData,
  useElementColumns,
} from '@sigmacomputing/plugin';
import { CATEGORIES } from './categories.js';
import { transformNodes, transformEdges, applyCircularLayout } from './transform.js';

// ── Persistent chart — lives outside React, never destroyed ──────────────────
const _div = document.createElement('div');
_div.style.cssText = 'width:100%;height:100vh;';
const _chart = echarts.init(_div);
const _ro = new ResizeObserver(() => _chart.resize());
_ro.observe(_div);

_chart.on('click', (params) => {
  if (params.dataType === 'node' && params.data?.url) {
    window.open(params.data.url, '_blank');
  }
});

// ── Editor panel ──────────────────────────────────────────────────────────────
const EDITOR_FIELDS = [
  // Nodes source
  { name: 'nodesSource',    type: 'element',                                    label: 'Nodes data source' },
  { name: 'nodeIdCol',      type: 'column', source: 'nodesSource',              label: 'Node ID',      allowedTypes: ['text'] },
  { name: 'nodeNameCol',    type: 'column', source: 'nodesSource',              label: 'Node name',    allowedTypes: ['text'] },
  { name: 'nodeTypeCol',    type: 'column', source: 'nodesSource',              label: 'Node type',    allowedTypes: ['text'] },
  { name: 'nodeSubtypeCol', type: 'column', source: 'nodesSource',              label: 'Node subtype', allowedTypes: ['text'] },
  { name: 'statusCol',      type: 'column', source: 'nodesSource',              label: 'Status',       allowedTypes: ['text'] },
  { name: 'symbolSizeCol',  type: 'column', source: 'nodesSource',              label: 'Symbol size',  allowedTypes: ['number', 'integer'] },
  { name: 'urlCol',         type: 'column', source: 'nodesSource',              label: 'URL (optional)', allowedTypes: ['text'] },
  // Edges source
  { name: 'edgesSource',    type: 'element',                                    label: 'Edges data source' },
  { name: 'edgeSourceCol',  type: 'column', source: 'edgesSource',              label: 'Source node ID',  allowedTypes: ['text'] },
  { name: 'edgeTargetCol',  type: 'column', source: 'edgesSource',              label: 'Target node ID',  allowedTypes: ['text'] },
  { name: 'edgeTypeCol',    type: 'column', source: 'edgesSource',              label: 'Edge type',       allowedTypes: ['text'] },
  // Layout options
  { name: 'forceLayout',    type: 'checkbox',                                   label: 'Force layout (uncheck for large graphs)', defaultValue: true },
  { name: 'repulsion',      type: 'text',                                       label: 'Repulsion',    defaultValue: '300' },
  { name: 'edgeLength',     type: 'text',                                       label: 'Edge length',  defaultValue: '150' },
];

export default function App() {
  const rootRef = useRef(null);

  useEditorPanelConfig(EDITOR_FIELDS);

  const config = useConfig();

  const nodesSourceId = config?.nodesSource;
  const edgesSourceId = config?.edgesSource;

  // Both hooks called unconditionally (React rules of hooks).
  // useElementColumns registers which columns the plugin intends to access.
  const nodesRaw  = useElementData(nodesSourceId);
  useElementColumns(nodesSourceId);
  const edgesRaw  = useElementData(edgesSourceId);
  useElementColumns(edgesSourceId);

  const forceLayout = config?.forceLayout !== false;
  const repulsion   = Math.max(50, parseInt(config?.repulsion  ?? '300')  || 300);
  const edgeLength  = Math.max(30, parseInt(config?.edgeLength ?? '150')  || 150);

  // Column maps: semantic field name → Sigma column ID chosen by user
  const nodesColMap = {
    node_id:      config?.nodeIdCol,
    node_name:    config?.nodeNameCol,
    node_type:    config?.nodeTypeCol,
    node_subtype: config?.nodeSubtypeCol,
    status:       config?.statusCol,
    symbol_size:  config?.symbolSizeCol,
    url:          config?.urlCol,
  };
  const edgesColMap = {
    source:    config?.edgeSourceCol,
    target:    config?.edgeTargetCol,
    edge_type: config?.edgeTypeCol,
  };

  // Mount the persistent chart div when the container is ready
  useEffect(() => {
    const root = rootRef.current;
    if (root && !root.contains(_div)) root.appendChild(_div);
  });

  // Re-render chart whenever data or config changes
  useEffect(() => {
    if (!nodesRaw || !nodesColMap.node_id) return;

    const nodes   = transformNodes(nodesRaw, nodesColMap);
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges   = edgesRaw && edgesColMap.source
      ? transformEdges(edgesRaw, edgesColMap, nodeIds)
      : [];

    const layoutNodes = forceLayout ? nodes : applyCircularLayout(nodes);

    _chart.setOption({
      backgroundColor: 'transparent',

      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          if (params.dataType === 'node') {
            const d = params.data;
            const hint = d.url ? '<br/><i style="color:#aaa;font-size:11px">Click to open in Sigma</i>' : '';
            return `<b>${d.name}</b><br/>Type: ${d.node_type}<br/>Role: ${d.node_subtype}<br/>Status: ${d.status}${hint}`;
          }
          if (params.dataType === 'edge') {
            return params.data.edge_type;
          }
        },
      },

      legend: [{
        data:    CATEGORIES.map(c => c.name),
        orient:  'vertical',
        left:    10,
        top:     'middle',
        textStyle: { fontSize: 11, fontFamily: 'Inter, sans-serif' },
      }],

      series: [{
        type:      'graph',
        layout:    forceLayout ? 'force' : 'none',
        roam:      true,
        draggable: true,
        animation: forceLayout,

        label: {
          show:      true,
          position:  'right',
          fontSize:  11,
          formatter: '{b}',
        },

        edgeSymbol:     ['none', 'arrow'],
        edgeSymbolSize: [0, 8],
        edgeLabel:      { show: false },

        lineStyle: { curveness: 0.1, opacity: 0.7, width: 1.5 },

        force: {
          repulsion,
          edgeLength:      [edgeLength * 0.5, edgeLength * 1.5],
          gravity:         0.1,
          layoutAnimation: true,
        },

        emphasis: {
          focus:     'adjacency',
          lineStyle: { width: 3 },
        },

        categories: CATEGORIES,
        data:       layoutNodes,
        links:      edges,
      }],
    }, { replaceMerge: ['series'] });
  });

  const configured = config?.nodeIdCol && config?.edgeSourceCol;

  if (!configured) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#999', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
        Select nodes and edges data sources, then map the required columns.
      </div>
    );
  }

  return <div ref={rootRef} style={{ width: '100%', height: '100vh' }} />;
}
