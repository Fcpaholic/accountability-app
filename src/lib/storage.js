const KEY = 'accountability_v1';

const defaultDay = () => ({
  calories: null,
  gymSessions: 0,
  runs: [],
  weight: null,
});

export const getData = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { days: {} };
    return JSON.parse(raw);
  } catch {
    return { days: {} };
  }
};

export const saveData = (data) => {
  localStorage.setItem(KEY, JSON.stringify(data));
};

export const getDayData = (dateStr) => {
  const data = getData();
  return data.days[dateStr] ?? defaultDay();
};

const ensureDay = (data, dateStr) => {
  if (!data.days[dateStr]) data.days[dateStr] = defaultDay();
};

export const setCalories = (dateStr, calories) => {
  const data = getData();
  ensureDay(data, dateStr);
  data.days[dateStr].calories = calories === '' || calories === null ? null : Number(calories);
  saveData(data);
  return getData();
};

export const addGymSession = (dateStr) => {
  const data = getData();
  ensureDay(data, dateStr);
  data.days[dateStr].gymSessions = (data.days[dateStr].gymSessions || 0) + 1;
  saveData(data);
  return getData();
};

export const removeGymSession = (dateStr) => {
  const data = getData();
  ensureDay(data, dateStr);
  const cur = data.days[dateStr].gymSessions || 0;
  data.days[dateStr].gymSessions = Math.max(0, cur - 1);
  saveData(data);
  return getData();
};

export const addRun = (dateStr, km) => {
  const data = getData();
  ensureDay(data, dateStr);
  if (!Array.isArray(data.days[dateStr].runs)) data.days[dateStr].runs = [];
  data.days[dateStr].runs.push(Number(km));
  saveData(data);
  return getData();
};

export const removeRun = (dateStr, index) => {
  const data = getData();
  ensureDay(data, dateStr);
  if (Array.isArray(data.days[dateStr].runs)) {
    data.days[dateStr].runs.splice(index, 1);
  }
  saveData(data);
  return getData();
};

export const setWeight = (dateStr, weight) => {
  const data = getData();
  ensureDay(data, dateStr);
  data.days[dateStr].weight = weight === '' || weight === null ? null : Number(weight);
  saveData(data);
  return getData();
};

export const clearDay = (dateStr) => {
  const data = getData();
  data.days[dateStr] = defaultDay();
  saveData(data);
  return getData();
};
