import { useEffect, useRef, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain } from 'lucide-react';
import * as d3 from 'd3';
import { extractFeatures } from './featureExtractor';
import { UrlHeatmap } from './UrlHeatmap';

interface NeuralNetModalProps {
  url: string;
  label: string | null;
  confidence: number | null;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  value: number;
  color: string;
  type: 'input' | 'output';
  x?: number;
  y?: number;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  strength: number;
}

export function NeuralNetModal({ url, label, confidence }: NeuralNetModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const features = useMemo(() => extractFeatures(url), [url]);

  useEffect(() => {
    if (!isOpen || !svgRef.current) return;

    const width = 480;
    const height = 280;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Nodes: feature nodes + output node
    const nodes: D3Node[] = [
      ...features.map((f, i) => ({
        id: `f${i}`,
        label: f.name,
        value: f.value,
        color: f.color,
        type: 'input' as const,
        x: 80,
        y: 40 + i * 50,
      })),
      {
        id: 'output',
        label: label ?? 'RESULT',
        value: (confidence ?? 0) / 100,
        color: label === 'PHISHING' ? '#ff3b3b' : '#00ff9d',
        type: 'output' as const,
        x: width - 80,
        y: height / 2,
      },
    ];

    const links: D3Link[] = features.map((_f, i) => ({
      source: `f${i}`,
      target: 'output',
      strength: features[i].value,
    }));

    // Draw links
    const linkGroup = svg.append('g');
    linkGroup.selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('x1', (d) => (nodes.find(n => n.id === (d.source as string))?.x ?? 0))
      .attr('y1', (d) => (nodes.find(n => n.id === (d.source as string))?.y ?? 0))
      .attr('x2', () => (nodes.find(n => n.id === 'output')?.x ?? 0))
      .attr('y2', () => (nodes.find(n => n.id === 'output')?.y ?? 0))
      .attr('stroke', (d) => {
        const srcNode = nodes.find(n => n.id === (d.source as string));
        return srcNode?.color ?? '#00ff9d';
      })
      .attr('stroke-width', (d) => Math.max(d.strength * 3, 0.5))
      .attr('stroke-opacity', (d) => 0.3 + d.strength * 0.5)
      .attr('stroke-dasharray', (d) => d.strength < 0.3 ? '4,4' : 'none');

    // Draw input nodes
    const inputNodes = nodes.filter(n => n.type === 'input');
    const nodeGroup = svg.append('g');

    inputNodes.forEach(node => {
      const g = nodeGroup.append('g').attr('transform', `translate(${node.x}, ${node.y})`);
      g.append('circle')
        .attr('r', 18 + node.value * 10)
        .attr('fill', `${node.color}22`)
        .attr('stroke', node.color)
        .attr('stroke-width', 1.5);
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', node.color)
        .attr('font-size', '8px')
        .attr('font-family', 'monospace')
        .text(`${(node.value * 100).toFixed(0)}%`);
      g.append('text')
        .attr('text-anchor', 'start')
        .attr('x', 24)
        .attr('dy', '0.35em')
        .attr('fill', 'rgba(224,224,224,0.7)')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text(node.label);
    });

    // Draw output node
    const outputNode = nodes.find(n => n.type === 'output')!;
    const outG = nodeGroup.append('g').attr('transform', `translate(${outputNode.x}, ${outputNode.y})`);
    outG.append('circle')
      .attr('r', 30)
      .attr('fill', `${outputNode.color}22`)
      .attr('stroke', outputNode.color)
      .attr('stroke-width', 2);
    outG.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.3em')
      .attr('fill', outputNode.color)
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text(outputNode.label);
    outG.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .attr('fill', outputNode.color)
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .text(`${(confidence ?? 0).toFixed(1)}%`);

  }, [isOpen, features, label, confidence]);

  if (!label || confidence === null) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(0,255,255,0.06)', border: '1px solid rgba(0,255,255,0.22)',
          color: '#00ffff', fontSize: 12, marginTop: 12,
        }}
      >
        <Brain style={{ width: 14, height: 14 }} />
        Lihat Cara Kerja Model
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9000, backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)',
                width: 560, maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto',
                zIndex: 9001,
                background: 'rgba(5,10,10,0.98)', border: '1px solid var(--cyber-accent)',
                borderRadius: 14, padding: 24,
                boxShadow: '0 0 50px rgba(0,255,157,0.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <p style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--cyber-accent)', margin: 0 }}>NEURAL NETWORK ANALYSIS</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cyber-text)', margin: '4px 0 0 0' }}>Cara Kerja Model</p>
                </div>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(224,224,224,0.5)' }}>
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>

              {/* D3 Graph */}
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 8, marginBottom: 16, overflow: 'hidden' }}>
                <svg ref={svgRef} width="100%" height="280" viewBox="0 0 480 280" />
              </div>

              {/* URL Heatmap */}
              <UrlHeatmap url={url} />

              {/* Feature list */}
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(224,224,224,0.4)', marginBottom: 8 }}>FEATURE ANALYSIS</p>
                {features.map(f => (
                  <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'rgba(224,224,224,0.7)', flex: 1 }}>{f.name}</span>
                    <span style={{ fontSize: 11, color: f.color, fontFamily: 'monospace' }}>{(f.value * 100).toFixed(0)}%</span>
                    <span style={{ fontSize: 10, color: 'rgba(224,224,224,0.4)', flex: 2 }}>{f.description}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
