import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { updateConfig } from '../api';

export default function ConfigPanel({ config, onConfigChange, onClose }) {
  const [localConfig, setLocalConfig] = useState(config);
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const updated = await updateConfig(localConfig);
    onConfigChange(updated);
    setIsSaving(false);
  };

  const updateValue = (key, value) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'keybindings', label: 'Keybindings' },
    { id: 'raw', label: 'Raw Config' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[20000]">
      <div className="bg-surface-2 rounded-lg border border-surface-4 w-[600px] max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-4">
          <h2 className="text-lg font-semibold text-zinc-100">Configuration</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Theme
                </label>
                <select
                  value={localConfig.theme}
                  onChange={(e) => updateValue('theme', e.target.value)}
                  className="w-full bg-surface-3 text-sm px-3 py-2 rounded border border-surface-4 focus:border-accent focus:outline-none"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light (coming soon)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Animation Speed (ms)
                </label>
                <input
                  type="number"
                  value={localConfig.animation_speed}
                  onChange={(e) =>
                    updateValue('animation_speed', parseInt(e.target.value))
                  }
                  className="w-full bg-surface-3 text-sm px-3 py-2 rounded border border-surface-4 focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Tile Gap (px)
                </label>
                <input
                  type="number"
                  value={localConfig.tile_gap}
                  onChange={(e) =>
                    updateValue('tile_gap', parseInt(e.target.value))
                  }
                  className="w-full bg-surface-3 text-sm px-3 py-2 rounded border border-surface-4 focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Default Tile Width (px)
                </label>
                <input
                  type="number"
                  value={localConfig.default_tile_width}
                  onChange={(e) =>
                    updateValue('default_tile_width', parseInt(e.target.value))
                  }
                  className="w-full bg-surface-3 text-sm px-3 py-2 rounded border border-surface-4 focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Default Tile Height (px)
                </label>
                <input
                  type="number"
                  value={localConfig.default_tile_height}
                  onChange={(e) =>
                    updateValue('default_tile_height', parseInt(e.target.value))
                  }
                  className="w-full bg-surface-3 text-sm px-3 py-2 rounded border border-surface-4 focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Accent Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={localConfig.accent_color}
                    onChange={(e) => updateValue('accent_color', e.target.value)}
                    className="w-12 h-10 bg-surface-3 rounded border border-surface-4 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localConfig.accent_color}
                    onChange={(e) => updateValue('accent_color', e.target.value)}
                    className="flex-1 bg-surface-3 text-sm px-3 py-2 rounded border border-surface-4 focus:border-accent focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Font Family
                </label>
                <input
                  type="text"
                  value={localConfig.font_family}
                  onChange={(e) => updateValue('font_family', e.target.value)}
                  className="w-full bg-surface-3 text-sm px-3 py-2 rounded border border-surface-4 focus:border-accent focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Base Font Size (px)
                </label>
                <input
                  type="number"
                  value={localConfig.font_size_base}
                  onChange={(e) =>
                    updateValue('font_size_base', parseInt(e.target.value))
                  }
                  className="w-full bg-surface-3 text-sm px-3 py-2 rounded border border-surface-4 focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'keybindings' && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-500 mb-4">
                Customize keyboard shortcuts (Hyprland-style)
              </p>

              {Object.entries(localConfig.keybindings || {}).map(([action, key]) => (
                <div key={action} className="flex items-center gap-4">
                  <label className="w-32 text-sm text-zinc-400 capitalize">
                    {action.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) =>
                      updateValue('keybindings', {
                        ...localConfig.keybindings,
                        [action]: e.target.value,
                      })
                    }
                    className="flex-1 bg-surface-3 text-sm px-3 py-2 rounded border border-surface-4 focus:border-accent focus:outline-none font-mono"
                    placeholder="e.g., ctrl+s"
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'raw' && (
            <div>
              <p className="text-sm text-zinc-500 mb-4">
                Edit configuration as JSON (advanced)
              </p>
              <textarea
                value={JSON.stringify(localConfig, null, 2)}
                onChange={(e) => {
                  try {
                    setLocalConfig(JSON.parse(e.target.value));
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                className="w-full h-64 bg-surface-3 text-sm px-3 py-2 rounded border border-surface-4 focus:border-accent focus:outline-none font-mono resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-surface-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded"
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
