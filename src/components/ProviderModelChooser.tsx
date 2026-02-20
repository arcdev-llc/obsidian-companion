import { useSettings } from "../state";
import { SettingsItemSmall } from "./SettingsItem";
import { available } from "../complete/completers";
import Presets from "./Presets";

export default function ProviderModelChooser() {
  const {
    provider,
    setProvider,
    providerSettings,
    setProviderSettings,
    model,
    setModel,
    modelSettings,
    setModelSettings,
    available_models,
  } = useSettings();

  const ProviderSettings = provider?.Settings;
  const ModelSettings = model?.Settings;

  return (
    <>
      <div className="ai-complete-settings-section">
        <div className="ai-complete-section-header">Provider</div>
        <SettingsItemSmall
          name="Provider"
          description={provider ? provider.description : ""}
        >
          <select
            className="dropdown"
            value={provider ? provider.id : ""}
            onChange={(e) => setProvider(e.target.value)}
          >
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </SettingsItemSmall>
        {ProviderSettings && (
          <ProviderSettings
            settings={providerSettings}
            saveSettings={setProviderSettings}
          />
        )}
      </div>
      <div className="ai-complete-settings-section">
        <div className="ai-complete-section-header">Model</div>
        <SettingsItemSmall
          name="Model"
          description={model ? model.description : ""}
        >
          <select
            className="dropdown"
            value={model ? model.id : ""}
            onChange={(e) => setModel(e.target.value)}
          >
            {provider &&
              available_models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </SettingsItemSmall>
        {ModelSettings && (
          <ModelSettings
            settings={modelSettings}
            saveSettings={setModelSettings}
          />
        )}
      </div>
      <Presets />
    </>
  );
}
