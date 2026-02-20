import { useSettings } from "../state";
import { SettingsItemSmall } from "../components/SettingsItem";
import AcceptSettingsComponent from "../components/AcceptSettingsComponent";
import ProviderModelChooser from "../components/ProviderModelChooser";

export default function SettingsComponent() {
  const {
    enable_by_default,
    setEnableByDefault,
    streaming_mode,
    setStreamingMode,
  } = useSettings();

  return (
    <>
      <div className="ai-complete-settings-section">
        <div className="ai-complete-section-header">General</div>
        <SettingsItemSmall
          name="Enable by default"
          description={
            <>
              If the plugin isn't enabled by default, use Ctrl+P and search for
              Toggle Completion. You can also add a shortcut to it
            </>
          }
        >
          <div
            className={
              "checkbox-container" + (enable_by_default ? " is-enabled" : "")
            }
            onClick={(_e) => setEnableByDefault(!enable_by_default)}
          />
        </SettingsItemSmall>
        <SettingsItemSmall
          name="Streaming mode (experimental)"
          description={
            <>
              When enabled, the completion will be updated as it comes in, instead
              of waiting for the whole completion to be ready. This is useful for
              completions that take a long time to generate, but may produce
              buggy results in some cases.
            </>
          }
        >
          <div
            className={
              "checkbox-container" + (streaming_mode ? " is-enabled" : "")
            }
            onClick={(_e) => setStreamingMode(!streaming_mode)}
          />
        </SettingsItemSmall>
        <AcceptSettingsComponent />
      </div>
      <ProviderModelChooser />
    </>
  );
}
