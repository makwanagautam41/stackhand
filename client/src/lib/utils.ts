import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type SyncListener = (event: string, data?: any) => void;
const syncListeners = new Set<SyncListener>();

export function onSync(event: string, listener: SyncListener) {
  const wrapper = (e: string, d?: any) => {
    if (e === event || event === "*") listener(e, d);
  };
  syncListeners.add(wrapper);
  return () => syncListeners.delete(wrapper);
}

export function emitSync(event: string, data?: any) {
  syncListeners.forEach((fn) => fn(event, data));
}

export const SYNC_EVENTS = {
  CONTAINERS_CHANGED: "containers:changed",
  IMAGES_CHANGED: "images:changed",
  STACKS_CHANGED: "stacks:changed",
  WORKSPACE_CHANGED: "workspace:changed",
  FILE_CHANGED: "file:changed",
} as const;
