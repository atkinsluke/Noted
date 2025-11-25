import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TileCanvas from './components/TileCanvas';
import ConfigPanel from './components/ConfigPanel';
import { fetchConfig, fetchTilePosition, updateTilePosition } from './api';

export default function App() {
  const [config, setConfig] = useState(null);
  // Workspace-based tiles: { "quick-notes": [...], "journal": [...], "project-abc": [...] }
  const [workspaceTiles, setWorkspaceTiles] = useState({});
  const [activeSection, setActiveSection] = useState('quick-notes');
  const [activeWorkspace, setActiveWorkspace] = useState('quick-notes');
  const [showConfig, setShowConfig] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchConfig().then(setConfig).catch(console.error);
  }, []);

  // Calculate Hyprland-style tiling layout
  const calculateTilingLayout = useCallback((numTiles, canvasWidth, canvasHeight, gap = 12) => {
    const layouts = [];
    const workingWidth = canvasWidth - gap * 2;
    const workingHeight = canvasHeight - gap * 2;

    if (numTiles === 0) return layouts;

    if (numTiles === 1) {
      // Single tile: centered, large
      layouts.push({
        x: gap,
        y: gap,
        width: workingWidth,
        height: workingHeight,
      });
    } else if (numTiles === 2) {
      // Two tiles: vertical split 50/50
      const halfWidth = (workingWidth - gap) / 2;
      layouts.push(
        { x: gap, y: gap, width: halfWidth, height: workingHeight },
        { x: gap + halfWidth + gap, y: gap, width: halfWidth, height: workingHeight }
      );
    } else if (numTiles === 3) {
      // Three tiles: master left (50%), stack right (25% each)
      const masterWidth = workingWidth * 0.5;
      const stackWidth = workingWidth - masterWidth - gap;
      const stackHeight = (workingHeight - gap) / 2;

      layouts.push(
        { x: gap, y: gap, width: masterWidth, height: workingHeight },
        { x: gap + masterWidth + gap, y: gap, width: stackWidth, height: stackHeight },
        { x: gap + masterWidth + gap, y: gap + stackHeight + gap, width: stackWidth, height: stackHeight }
      );
    } else if (numTiles === 4) {
      // Four tiles: 2x2 grid
      const halfWidth = (workingWidth - gap) / 2;
      const halfHeight = (workingHeight - gap) / 2;

      layouts.push(
        { x: gap, y: gap, width: halfWidth, height: halfHeight },
        { x: gap + halfWidth + gap, y: gap, width: halfWidth, height: halfHeight },
        { x: gap, y: gap + halfHeight + gap, width: halfWidth, height: halfHeight },
        { x: gap + halfWidth + gap, y: gap + halfHeight + gap, width: halfWidth, height: halfHeight }
      );
    } else {
      // 5+ tiles: balanced grid layout
      // Calculate optimal grid dimensions (prefer more columns than rows)
      const cols = Math.ceil(Math.sqrt(numTiles * 1.5));
      const rows = Math.ceil(numTiles / cols);

      const tileWidth = (workingWidth - gap * (cols - 1)) / cols;
      const tileHeight = (workingHeight - gap * (rows - 1)) / rows;

      for (let i = 0; i < numTiles; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);

        layouts.push({
          x: gap + col * (tileWidth + gap),
          y: gap + row * (tileHeight + gap),
          width: tileWidth,
          height: tileHeight,
        });
      }
    }

    return layouts;
  }, []);

  // Retile all tiles in a workspace using Hyprland-style layout
  const retileWorkspace = useCallback((tiles, canvasWidth = window.innerWidth - 256, canvasHeight = window.innerHeight) => {
    const gap = config?.tile_gap || 12;
    const layouts = calculateTilingLayout(tiles.length, canvasWidth, canvasHeight, gap);

    return tiles.map((tile, index) => ({
      ...tile,
      ...layouts[index],
      zIndex: index + 1,
    }));
  }, [config, calculateTilingLayout]);

  const openTile = useCallback(async (tile, targetWorkspace = null) => {
    const workspace = targetWorkspace || activeWorkspace;

    // Check if already open
    const currentTiles = workspaceTiles[workspace] || [];
    if (currentTiles.some((t) => t.type === tile.type && t.id === tile.id)) {
      return;
    }

    // Try to fetch saved position
    const savedPosition = await fetchTilePosition(tile.type, tile.id).catch(() => null);

    setWorkspaceTiles((prev) => {
      const existingTiles = prev[workspace] || [];

      // Double-check it's not already open (could have changed during async)
      if (existingTiles.some((t) => t.type === tile.type && t.id === tile.id)) {
        return prev;
      }

      if (savedPosition) {
        // Use saved position
        const maxZ = Math.max(...existingTiles.map((t) => t.zIndex || 0), 0);
        const newTile = {
          ...tile,
          x: savedPosition.x,
          y: savedPosition.y,
          width: savedPosition.width,
          height: savedPosition.height,
          zIndex: maxZ + 1,
        };
        return {
          ...prev,
          [workspace]: [...existingTiles, newTile],
        };
      } else {
        // No saved position - use auto-tiling
        const newTiles = [...existingTiles, tile];
        const tiledTiles = retileWorkspace(newTiles);
        return {
          ...prev,
          [workspace]: tiledTiles,
        };
      }
    });
  }, [activeWorkspace, workspaceTiles, retileWorkspace]);

  const closeTile = useCallback((type, id) => {
    setWorkspaceTiles((prev) => {
      const currentTiles = prev[activeWorkspace] || [];
      const filteredTiles = currentTiles.filter((t) => !(t.type === type && t.id === id));
      const tiledTiles = retileWorkspace(filteredTiles);

      return {
        ...prev,
        [activeWorkspace]: tiledTiles,
      };
    });
  }, [activeWorkspace, retileWorkspace]);

  const updateTile = useCallback((type, id, updates) => {
    setWorkspaceTiles((prev) => {
      const currentTiles = prev[activeWorkspace] || [];
      const updatedTiles = currentTiles.map((t) =>
        t.type === type && t.id === id ? { ...t, ...updates } : t
      );

      // Save position to database if position/size changed
      if (updates.x !== undefined || updates.y !== undefined ||
          updates.width !== undefined || updates.height !== undefined) {
        const updatedTile = updatedTiles.find((t) => t.type === type && t.id === id);
        if (updatedTile) {
          updateTilePosition(type, id, {
            x: updatedTile.x,
            y: updatedTile.y,
            width: updatedTile.width,
            height: updatedTile.height,
            z_index: updatedTile.zIndex,
          }).catch(console.error);
        }
      }

      return {
        ...prev,
        [activeWorkspace]: updatedTiles,
      };
    });
  }, [activeWorkspace]);

  const bringToFront = useCallback((type, id) => {
    setWorkspaceTiles((prev) => {
      const currentTiles = prev[activeWorkspace] || [];
      const maxZ = Math.max(...currentTiles.map((t) => t.zIndex), 0);
      return {
        ...prev,
        [activeWorkspace]: currentTiles.map((t) =>
          t.type === type && t.id === id ? { ...t, zIndex: maxZ + 1 } : t
        ),
      };
    });
  }, [activeWorkspace]);

  const refreshSidebar = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  if (!config) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-0">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  // Get current workspace tiles
  const currentTiles = workspaceTiles[activeWorkspace] || [];

  return (
    <div className="h-screen w-screen flex bg-surface-0 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        key={refreshKey}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onWorkspaceChange={setActiveWorkspace}
        onOpenTile={openTile}
        onShowConfig={() => setShowConfig(true)}
        config={config}
      />

      {/* Main Canvas */}
      <TileCanvas
        tiles={currentTiles}
        onCloseTile={closeTile}
        onUpdateTile={updateTile}
        onBringToFront={bringToFront}
        onRefreshSidebar={refreshSidebar}
        config={config}
      />

      {/* Config Panel */}
      {showConfig && (
        <ConfigPanel
          config={config}
          onConfigChange={setConfig}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}
