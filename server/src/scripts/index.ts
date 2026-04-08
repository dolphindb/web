import { ScriptType, ScriptConfig, ScriptHandler } from '../types.js';

const scriptRegistry = new Map<ScriptType, ScriptConfig>();

export function registerScript(config: ScriptConfig) {
  scriptRegistry.set(config.function, config);
}

export function getScriptHandler(type: ScriptType): ScriptHandler | undefined {
  return scriptRegistry.get(type)?.handler;
}

export function getAllScripts(): ScriptConfig[] {
  return Array.from(scriptRegistry.values());
}
