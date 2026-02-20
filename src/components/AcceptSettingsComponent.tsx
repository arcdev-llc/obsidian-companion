import { useState } from "react";
import { useSettings } from "../state";
import { SettingsItemLarge, SettingsItemSmall } from "./SettingsItem";

function AcceptPresets() {
  const [expanded, setExpanded] = useState(false);
  const { accept_settings, setAcceptSettings } = useSettings();

  return (
    <>
      <SettingsItemLarge
        name="Accept"
        description={
          <div className="ai-complete-accept-description">
            <div>These are presets.</div>
            <span
              className="ai-complete-expand-trigger"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "▾" : "▸"} Advanced controls
            </span>
          </div>
        }
      >
        <div className="ai-complete-accept-presets">
          <button
            onClick={() =>
              setAcceptSettings({
                splitter_regex: " ",
                display_splitter_regex: "[.?!:;]",
                completion_completeness_regex: ".*(?!p{L})[^d]$",
                min_accept_length: 4,
                min_display_length: 50,
                retrigger_threshold: 48,
              })
            }
          >
            One word at a time
          </button>
          <button
            onClick={() =>
              setAcceptSettings({
                splitter_regex: "\\.",
                display_splitter_regex: "[.?!:;]",
                completion_completeness_regex: ".*[^d]$",
                min_accept_length: 4,
                min_display_length: 50,
                retrigger_threshold: 128,
              })
            }
          >
            One sentence at a time
          </button>
          <button
            onClick={() =>
              setAcceptSettings({
                splitter_regex: "\n",
                display_splitter_regex: "\n",
                completion_completeness_regex: ".*$",
                min_accept_length: 4,
                min_display_length: 50,
                retrigger_threshold: 128,
              })
            }
          >
            One line at a time
          </button>
          <button
            onClick={() =>
              setAcceptSettings({
                splitter_regex: "$",
                display_splitter_regex: "$",
                completion_completeness_regex: ".*",
                min_accept_length: 0,
                min_display_length: 0,
                retrigger_threshold: 128,
              })
            }
          >
            Whole completion
          </button>
        </div>
      </SettingsItemLarge>
      {expanded && (
        <div className="ai-complete-advanced-settings">
          <SettingsItemLarge
            name="Splitter regex"
            description="Defines how to split the completion chunks;
						only one chunk is accepted at a time when the completion is triggered"
          >
            <input
              type="text"
              value={accept_settings.splitter_regex}
              onChange={(e) =>
                setAcceptSettings({
                  ...accept_settings,
                  splitter_regex: e.target.value,
                })
              }
            />
          </SettingsItemLarge>
          <SettingsItemLarge
            name="Preview splitter regex"
            description="Defines how to split the preview chunks;
						only one chunk is displayed at a time when the completion is triggered"
          >
            <input
              type="text"
              value={accept_settings.display_splitter_regex}
              onChange={(e) =>
                setAcceptSettings({
                  ...accept_settings,
                  display_splitter_regex: e.target.value,
                })
              }
            />
          </SettingsItemLarge>
          <SettingsItemSmall
            name="Completion completeness regex"
            description="If this is not matched, the last chunk
						(according to the preview splitter regex) is discarded"
          >
            <input
              type="text"
              value={accept_settings.completion_completeness_regex}
              onChange={(e) =>
                setAcceptSettings({
                  ...accept_settings,
                  completion_completeness_regex: e.target.value,
                })
              }
            />
          </SettingsItemSmall>
          <SettingsItemLarge
            name="Minimum completion length"
            description="Will complete the fewest chunks
						that add up to more than this many characters"
          >
            <input
              type="number"
              value={accept_settings.min_accept_length}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setAcceptSettings({
                  ...accept_settings,
                  min_accept_length: Number.isNaN(n)
                    ? accept_settings.min_accept_length
                    : n,
                });
              }}
            />
          </SettingsItemLarge>
          <SettingsItemLarge
            name="Minimum display length"
            description="Will display the fewest preview chunks
						that add up to more than this many characters"
          >
            <input
              type="number"
              value={accept_settings.min_display_length}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setAcceptSettings({
                  ...accept_settings,
                  min_display_length: Number.isNaN(n)
                    ? accept_settings.min_display_length
                    : n,
                });
              }}
            />
          </SettingsItemLarge>
          <SettingsItemSmall
            name="Retrigger threshold"
            description="When this many characters is left,
						the API will be pinged again"
          >
            <input
              type="number"
              value={accept_settings.retrigger_threshold}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setAcceptSettings({
                  ...accept_settings,
                  retrigger_threshold: Number.isNaN(n)
                    ? accept_settings.retrigger_threshold
                    : n,
                });
              }}
            />
          </SettingsItemSmall>
        </div>
      )}
    </>
  )
}

export default function AcceptSettingsComponent() {
  const {
    delay,
    setDelay,
    keybind,
    setKeybind,
  } = useSettings();

  return (
    <div className="ai-complete-settings-section">
      <SettingsItemSmall
        name="Delay"
        description={
          <>
            The plugin will wait this long before getting a completion. The
            lower the delay, the faster the completions, but the more they cost.
          </>
        }
      >
        <input
          type="number"
          value={delay}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (Number.isNaN(n)) return;
            setDelay(n);
          }}
        />
        <span>ms</span>
      </SettingsItemSmall>
      <SettingsItemSmall
        name="Use a CodeMirror Keybind"
        description={
          <>
            Allows you to use simpler keybinds like <code>Tab</code> but might not
            work with other plugins.
          </>
        }
      >
        <div
          className={
            "checkbox-container" + (keybind !== null ? " is-enabled" : "")
          }
          onClick={(_e) => {
            setKeybind(keybind === null ? "Tab" : null);
          }}
        />
      </SettingsItemSmall>
      {keybind === null ? null : (
        <SettingsItemSmall
          name="CodeMirror Keybind"
          description={
            <>
              <a href="https://codemirror.net/docs/ref/#h_key_bindings">
                Keybind format
              </a>
            </>
          }
        >
          <input
            type="text"
            value={keybind || ""}
            onChange={(e) => setKeybind(e.target.value)}
          />
        </SettingsItemSmall>
      )}

      <AcceptPresets />
    </div>
  );
}
