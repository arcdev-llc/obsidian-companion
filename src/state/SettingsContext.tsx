import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import type Companion from "../main";
import type { AcceptSettings } from "../main";
import type { Completer, Model } from "../complete/complete";
import { available } from "../complete/completers";
import { Notice } from "obsidian";

interface SettingsState {
  enable_by_default: boolean;
  streaming_mode: boolean;
  accept_settings: AcceptSettings;
  delay: number;
  keybind: string | null;
  provider: Completer | null;
  providerSettings: string | null;
  model: Model | null;
  modelSettings: string | null;
  available_models: Model[];
  presetsVersion: number;
}

type SettingsAction =
  | { type: "enable_by_default"; payload: boolean }
  | { type: "streaming_mode"; payload: boolean }
  | { type: "accept_settings"; payload: AcceptSettings }
  | { type: "delay"; payload: number }
  | { type: "keybind"; payload: string | null }
  | { type: "provider"; payload: { provider: Completer; providerSettings: string | null } }
  | { type: "providerSettings"; payload: string }
  | { type: "model"; payload: { model: Model | null; modelSettings: string | null } }
  | { type: "modelSettings"; payload: string }
  | { type: "available_models"; payload: Model[] }
  | { type: "presetsVersion_inc" };

function settingsReducer(s: SettingsState, a: SettingsAction): SettingsState {
  switch (a.type) {
    case "enable_by_default":
      return { ...s, enable_by_default: a.payload };
    case "streaming_mode":
      return { ...s, streaming_mode: a.payload };
    case "accept_settings":
      return { ...s, accept_settings: a.payload };
    case "delay":
      return { ...s, delay: a.payload };
    case "keybind":
      return { ...s, keybind: a.payload };
    case "provider":
      return { ...s, provider: a.payload.provider, providerSettings: a.payload.providerSettings };
    case "providerSettings":
      return { ...s, providerSettings: a.payload };
    case "model":
      return { ...s, model: a.payload.model, modelSettings: a.payload.modelSettings };
    case "modelSettings":
      return { ...s, modelSettings: a.payload };
    case "available_models":
      return { ...s, available_models: a.payload };
    case "presetsVersion_inc":
      return { ...s, presetsVersion: s.presetsVersion + 1 };
    default:
      return s;
  }
}

interface SettingsContextValue {
  plugin: Companion;
  reload_signal: { reload: boolean };
  enable_by_default: boolean;
  setEnableByDefault: (v: boolean) => void;
  streaming_mode: boolean;
  setStreamingMode: (v: boolean) => void;
  accept_settings: AcceptSettings;
  setAcceptSettings: (s: AcceptSettings) => void;
  delay: number;
  setDelay: (n: number) => void;
  keybind: string | null;
  setKeybind: (k: string | null) => void;
  provider: Completer | null;
  setProvider: (id: string) => void;
  providerSettings: string | null;
  setProviderSettings: (s: string) => void;
  model: Model | null;
  setModel: (id: string) => void;
  modelSettings: string | null;
  setModelSettings: (s: string) => void;
  available_models: Model[];
  presetsVersion: number;
  invalidatePresets: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export function SettingsProvider({
  plugin,
  reload_signal,
  children,
}: {
  plugin: Companion;
  reload_signal: { reload: boolean };
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(settingsReducer, {
    enable_by_default: plugin.settings.enable_by_default,
    streaming_mode: plugin.settings.stream,
    accept_settings: plugin.settings.accept,
    delay: plugin.settings.delay_ms,
    keybind: plugin.settings.keybind,
    provider: null,
    providerSettings: null,
    model: null,
    modelSettings: null,
    available_models: [],
    presetsVersion: 0,
  });

  const setEnableByDefault = useCallback(
    (v: boolean) => {
      dispatch({ type: "enable_by_default", payload: v });
      plugin.settings.enable_by_default = v;
      void plugin.saveData(plugin.settings);
    },
    [plugin]
  );

  const setStreamingMode = useCallback(
    (v: boolean) => {
      dispatch({ type: "streaming_mode", payload: v });
      plugin.settings.stream = v;
      void plugin.saveData(plugin.settings);
    },
    [plugin]
  );

  const setAcceptSettings = useCallback(
    (s: AcceptSettings) => {
      dispatch({ type: "accept_settings", payload: s });
      plugin.settings.accept = s;
      for (const m of plugin.models) {
        m.cacher.accept_settings = s;
      }
      void plugin.saveData(plugin.settings);
    },
    [plugin]
  );

  const setDelay = useCallback(
    (n: number) => {
      dispatch({ type: "delay", payload: n });
      plugin.settings.delay_ms = n;
      void plugin.saveData(plugin.settings);
      reload_signal.reload = true;
    },
    [plugin, reload_signal]
  );

  const setKeybind = useCallback(
    (k: string | null) => {
      dispatch({ type: "keybind", payload: k });
      plugin.settings.keybind = k;
      void plugin.saveData(plugin.settings);
      reload_signal.reload = true;
    },
    [plugin, reload_signal]
  );

  const setProvider = useCallback(
    (provider_id: string) => {
      const p = available.find((x) => x.id === provider_id);
      if (p) {
        dispatch({
          type: "provider",
          payload: {
            provider: p,
            providerSettings:
              plugin.settings.provider_settings[provider_id]?.settings ?? null,
          },
        });
      }
      plugin.settings.provider = provider_id;
      void plugin.saveData(plugin.settings);
    },
    [plugin]
  );

  const setProviderSettings = useCallback(
    (s: string) => {
      if (!state.provider) return;
      dispatch({ type: "providerSettings", payload: s });
      plugin.settings.provider_settings[state.provider.id] = {
        settings: s,
        models: plugin.settings.provider_settings[state.provider.id]?.models ?? {},
      };
      plugin.models = [];
      void plugin.saveData(plugin.settings);
    },
    [plugin, state.provider]
  );

  const setModel = useCallback(
    (model_id: string) => {
      if (!state.provider) return;
      const m = state.available_models.find((x) => x.id === model_id);
      if (m) {
        dispatch({
          type: "model",
          payload: {
            model: m,
            modelSettings:
              plugin.settings.provider_settings[state.provider.id]?.models[model_id] ?? null,
          },
        });
      }
      plugin.settings.model = model_id;
      void plugin.saveData(plugin.settings);
    },
    [plugin, state.provider, state.available_models]
  );

  const setModelSettings = useCallback(
    (s: string) => {
      if (!state.provider || !state.model) return;
      dispatch({ type: "modelSettings", payload: s });
      plugin.settings.provider_settings[state.provider.id] = {
        settings: plugin.settings.provider_settings[state.provider.id]?.settings,
        models: {
          ...plugin.settings.provider_settings[state.provider.id]?.models,
          [state.model.id]: s,
        },
      };
      plugin.models = [];
      void plugin.saveData(plugin.settings);
    },
    [plugin, state.provider, state.model]
  );

  const invalidatePresets = useCallback(() => dispatch({ type: "presetsVersion_inc" }), []);

  useEffect(() => {
    const candidates = available.filter(
      (p) => p.id === plugin.settings.provider
    );
    const p = candidates.length > 0 ? candidates[0] : available[0];
    dispatch({
      type: "provider",
      payload: {
        provider: p,
        providerSettings:
          plugin.settings.provider_settings[plugin.settings.provider]?.settings ?? null,
      },
    });
  }, [plugin.settings.provider]);

  useEffect(() => {
    const fetch = async () => {
      if (!state.provider) return;
      dispatch({ type: "available_models", payload: [] });
      dispatch({ type: "model", payload: { model: null, modelSettings: null } });
      try {
        const models = await state.provider.get_models(
          plugin.settings.provider_settings[state.provider.id]?.settings ?? ""
        );
        dispatch({ type: "available_models", payload: models });
        if (!models.length) return;
        const candidates = models.filter((m) => m.id === plugin.settings.model);
        const selected = candidates.length > 0 ? candidates[0] : models[0];
        plugin.settings.model = selected.id;
        dispatch({
          type: "model",
          payload: {
            model: selected,
            modelSettings:
              plugin.settings.provider_settings[state.provider.id]?.models[plugin.settings.model] ?? null,
          },
        });
      } catch (e) {
        new Notice(
          `Failed to load models: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    };
    void fetch();
  }, [plugin.settings.model, state.provider, state.providerSettings]);

  const value: SettingsContextValue = {
    plugin,
    reload_signal,
    enable_by_default: state.enable_by_default,
    setEnableByDefault,
    streaming_mode: state.streaming_mode,
    setStreamingMode,
    accept_settings: state.accept_settings,
    setAcceptSettings,
    delay: state.delay,
    setDelay,
    keybind: state.keybind,
    setKeybind,
    provider: state.provider,
    setProvider,
    providerSettings: state.providerSettings,
    setProviderSettings,
    model: state.model,
    setModel,
    modelSettings: state.modelSettings,
    setModelSettings,
    available_models: state.available_models,
    presetsVersion: state.presetsVersion,
    invalidatePresets,
  };

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}
