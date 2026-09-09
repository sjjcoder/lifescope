import { BasicParams, HousingParams, MCParams } from "./calculator";

// localStorage 劇本管理
export interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  params: BasicParams;
  housingParams?: HousingParams;
  mcParams?: MCParams;
  lifeStages?: { endYear: number; familySize: number }[];
}


const STORAGE_KEY = 'lifescope_scenarios';
const MAX_FREE_SCENARIOS = 3;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// localStorage 內容可能被其他分頁、瀏覽器擴充或手動編輯弄壞；載入時只保留形狀正確的劇本，
// 避免 handleLoad 展開 `scenario.params` 時因為 undefined 而讓整頁崩潰。
function isScenario(value: unknown): value is Scenario {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    !!s.params &&
    typeof s.params === 'object' &&
    !Array.isArray(s.params)
  );
}

export function getScenarios(): Scenario[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = data ? JSON.parse(data) : [];
    return Array.isArray(parsed) ? parsed.filter(isScenario) : [];
  } catch {
    return [];
  }
}

export function saveScenario(scenario: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>): Scenario | null {
  const existing = getScenarios();
  if (existing.length >= MAX_FREE_SCENARIOS) {
    return null; // 免費版上限
  }
  const newScenario: Scenario = {
    ...scenario,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, newScenario]));
  return newScenario;
}

export function updateScenario(id: string, updates: Partial<Omit<Scenario, 'id' | 'createdAt'>>): Scenario | null {
  const scenarios = getScenarios();
  const index = scenarios.findIndex(s => s.id === id);
  if (index === -1) return null;
  scenarios[index] = {
    ...scenarios[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  return scenarios[index];
}

export function deleteScenario(id: string): boolean {
  const scenarios = getScenarios();
  const filtered = scenarios.filter(s => s.id !== id);
  if (filtered.length === scenarios.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function canSaveMore(): boolean {
  return getScenarios().length < MAX_FREE_SCENARIOS;
}
