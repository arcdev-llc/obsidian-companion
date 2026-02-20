import { useState } from "react";
import { useSettings } from "../state";
import { SettingsItemSmall } from "./SettingsItem";

export default function Presets() {
  const { plugin, reload_signal, setModel, setProvider, invalidatePresets } =
    useSettings();
  const [name, setName] = useState("");

  const savePreset = () => {
    if (!name) return;
    plugin.savePreset(name);
    setName("");
    invalidatePresets();
  };

  return (
    <div className="ai-complete-settings-section">
      <div className="ai-complete-section-header">Presets</div>
      <div className="ai-complete-section-description">
        Quickly switch between different settings.
      </div>
      {plugin.settings.presets.map((preset) => (
        <SettingsItemSmall key={preset.name} name={preset.name}>
          <div className="ai-complete-preset-row">
            <div
              className={
                "checkbox-container" +
                (preset.enable_editor_command ? " is-enabled" : "")
              }
              onClick={(_e) => {
                preset.enable_editor_command = !preset.enable_editor_command;
                void plugin.saveSettings();
                invalidatePresets();
                reload_signal.reload = true;
              }}
            />
            <span>Command</span>
            <button
              onClick={() => {
                plugin.loadPreset(preset.name);
                setProvider(preset.provider);
                setModel(preset.model);
              }}
            >
              Load
            </button>
            <button
              onClick={() => {
                plugin.deletePreset(preset.name);
                invalidatePresets();
              }}
            >
              Delete
            </button>
          </div>
        </SettingsItemSmall>
      ))}
      <SettingsItemSmall
        name="Save preset"
        description="Save the current settings as a preset"
      >
        <div className="ai-complete-save-preset">
          <input
            type="text"
            placeholder="Preset name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={savePreset}>Save preset</button>
        </div>
      </SettingsItemSmall>
      {plugin.settings.presets.length ? (
        <SettingsItemSmall
          name="Fallback"
          description={
            <>
              You can use a preset as the fallback if the current model is not
              available, for example when you are rate limited.
            </>
          }
        >
          <select
            className="dropdown"
            value={plugin.settings.fallback || ""}
            onChange={(e) => {
              plugin.settings.fallback = e.target.value;
              void plugin.saveSettings();
              invalidatePresets();
            }}
          >
            <option value="">Don't use a fallback</option>
            {plugin.settings.presets.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
        </SettingsItemSmall>
      ) : null}
    </div>
  );
}
