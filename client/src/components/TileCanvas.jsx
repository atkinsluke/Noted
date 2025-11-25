import React, { useState, useRef } from 'react';
import { Rnd } from 'react-rnd';
import NoteTile from './NoteTile';
import JournalTile from './JournalTile';
import QuickNoteTile from './QuickNoteTile';

export default function TileCanvas({
  tiles,
  onCloseTile,
  onUpdateTile,
  onBringToFront,
  onRefreshSidebar,
  config,
}) {
  const [fullscreenTile, setFullscreenTile] = useState(null);
  const canvasRef = useRef(null);

  const handleDoubleClick = (tile) => {
    if (fullscreenTile?.type === tile.type && fullscreenTile?.id === tile.id) {
      // Exit fullscreen
      setFullscreenTile(null);
    } else {
      // Enter fullscreen
      setFullscreenTile({ type: tile.type, id: tile.id });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && fullscreenTile) {
      setFullscreenTile(null);
    }
  };

  const gap = config?.tile_gap || 12;

  const renderTileContent = (tile) => {
    switch (tile.type) {
      case 'note':
        return (
          <NoteTile
            noteId={tile.id}
            onClose={() => onCloseTile(tile.type, tile.id)}
            onRefreshSidebar={onRefreshSidebar}
          />
        );
      case 'journal':
        return (
          <JournalTile
            date={tile.id}
            onClose={() => onCloseTile(tile.type, tile.id)}
          />
        );
      case 'quick-note':
        return (
          <QuickNoteTile
            quickNote={tile}
            onClose={() => onCloseTile(tile.type, tile.id)}
            onRefreshSidebar={onRefreshSidebar}
          />
        );
      default:
        return <div>Unknown tile type</div>;
    }
  };

  return (
    <div
      ref={canvasRef}
      className="flex-1 h-full bg-surface-0 relative overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #fff 1px, transparent 1px),
            linear-gradient(to bottom, #fff 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Empty state */}
      {tiles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
          <div className="text-center">
            <p className="text-lg mb-2">No tiles open</p>
            <p className="text-sm">Click on items in the sidebar to open them as tiles</p>
          </div>
        </div>
      )}

      {/* Tiles */}
      {tiles.map((tile) => {
        const isFullscreen =
          fullscreenTile?.type === tile.type && fullscreenTile?.id === tile.id;

        if (isFullscreen) {
          return (
            <div
              key={`${tile.type}-${tile.id}`}
              className="absolute inset-0 bg-surface-2 z-[10000] tile-fullscreen"
              onDoubleClick={() => handleDoubleClick(tile)}
            >
              {renderTileContent(tile)}
            </div>
          );
        }

        return (
          <Rnd
            key={`${tile.type}-${tile.id}`}
            size={{ width: tile.width, height: tile.height }}
            position={{ x: tile.x, y: tile.y }}
            onDragStart={() => onBringToFront(tile.type, tile.id)}
            onDragStop={(e, d) => {
              onUpdateTile(tile.type, tile.id, { x: d.x, y: d.y });
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
              onUpdateTile(tile.type, tile.id, {
                width: parseInt(ref.style.width),
                height: parseInt(ref.style.height),
                ...position,
              });
            }}
            minWidth={250}
            minHeight={200}
            bounds="parent"
            dragHandleClassName="tile-drag-handle"
            style={{ zIndex: tile.zIndex }}
            className="tile"
          >
            <div
              className="w-full h-full bg-surface-2 rounded-lg border border-surface-4 overflow-hidden flex flex-col shadow-xl"
              onDoubleClick={(e) => {
                // Only trigger on header double-click
                if (e.target.closest('.tile-drag-handle')) {
                  handleDoubleClick(tile);
                }
              }}
            >
              {renderTileContent(tile)}
            </div>
          </Rnd>
        );
      })}
    </div>
  );
}
