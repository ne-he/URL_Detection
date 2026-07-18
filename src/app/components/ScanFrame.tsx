export function ScanFrame() {
  const cornerStyle = (pos: { top?: number; bottom?: number; left?: number; right?: number }) => ({
    position: 'absolute' as const,
    width: '20px',
    height: '20px',
    borderColor: '#00ff9d',
    borderStyle: 'solid',
    borderWidth: '0',
    ...(pos.top !== undefined && { top: pos.top }),
    ...(pos.bottom !== undefined && { bottom: pos.bottom }),
    ...(pos.left !== undefined && { left: pos.left }),
    ...(pos.right !== undefined && { right: pos.right }),
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* Top-left corner */}
      <div style={{ ...cornerStyle({ top: 0, left: 0 }), borderTopWidth: '3px', borderLeftWidth: '3px' }} />
      {/* Top-right corner */}
      <div style={{ ...cornerStyle({ top: 0, right: 0 }), borderTopWidth: '3px', borderRightWidth: '3px' }} />
      {/* Bottom-left corner */}
      <div style={{ ...cornerStyle({ bottom: 0, left: 0 }), borderBottomWidth: '3px', borderLeftWidth: '3px' }} />
      {/* Bottom-right corner */}
      <div style={{ ...cornerStyle({ bottom: 0, right: 0 }), borderBottomWidth: '3px', borderRightWidth: '3px' }} />

      {/* Scan line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '2px',
          background: '#00ff9d',
          boxShadow: '0 0 8px #00ff9d, 0 0 16px #00ff9d',
          animation: 'scanline 2000ms linear infinite',
        }}
      />
    </div>
  );
}
