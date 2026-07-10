import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getStoredToken } from "./api";

let socket: Socket | null = null;

function getSocketOrigin() {
  const configured =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    process.env.API_URL;
  if (configured) {
    return configured.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }

  // In the browser, use the current origin so the frontend dev proxy handles
  // Socket.IO upgrades and backend-served frontend stays same-origin.
  if (typeof window !== "undefined") {
    return undefined;
  }

  return "http://127.0.0.1:4000";
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getSocketOrigin(), {
      transports: ["websocket", "polling"],
      auth: { token: getStoredToken() },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000,
    });
    socket.on("connect", () => console.log("[socket] connected"));
    socket.on("disconnect", () => console.log("[socket] disconnected"));
    socket.on("connect_error", (err) => console.error("[socket] error", err.message));
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export interface SocketEventHandlers {
  onLogs?: (data: { stackId: string; line: string }) => void;
  onLogsEnd?: (data: { stackId: string }) => void;
  onContainerLogs?: (data: { containerId: string; line: string }) => void;
  onContainerLogsEnd?: (data: { containerId: string }) => void;
  onComposeProgress?: (data: { stackId: string; line: string }) => void;
  onComposeEnd?: (data: { stackId: string; code: number }) => void;
  onContainerStats?: (data: { containerId: string; stats: any }) => void;
  onContainerStatsEnd?: (data: { containerId: string }) => void;
  onImagePullProgress?: (data: { name: string; event: any }) => void;
  onImagePullEnd?: (data: { name: string }) => void;
  onOllamaToken?: (data: { token: string }) => void;
  onOllamaEnd?: () => void;
  onError?: (data: { message: string }) => void;
}

export function useSocket(handlers: SocketEventHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const s = getSocket();

    const onLogs = (d: any) => handlersRef.current.onLogs?.(d);
    const onLogsEnd = (d: any) => handlersRef.current.onLogsEnd?.(d);
    const onContainerLogs = (d: any) => handlersRef.current.onContainerLogs?.(d);
    const onContainerLogsEnd = (d: any) => handlersRef.current.onContainerLogsEnd?.(d);
    const onCompose = (d: any) => handlersRef.current.onComposeProgress?.(d);
    const onComposeEnd = (d: any) => handlersRef.current.onComposeEnd?.(d);
    const onStats = (d: any) => handlersRef.current.onContainerStats?.(d);
    const onStatsEnd = (d: any) => handlersRef.current.onContainerStatsEnd?.(d);
    const onPull = (d: any) => handlersRef.current.onImagePullProgress?.(d);
    const onPullEnd = (d: any) => handlersRef.current.onImagePullEnd?.(d);
    const onToken = (d: any) => handlersRef.current.onOllamaToken?.(d);
    const onOllamaEnd = () => handlersRef.current.onOllamaEnd?.();
    const onError = (d: any) => handlersRef.current.onError?.(d);

    s.on("stack:logs", onLogs);
    s.on("stack:logs:end", onLogsEnd);
    s.on("container:logs", onContainerLogs);
    s.on("container:logs:end", onContainerLogsEnd);
    s.on("stack:compose-progress", onCompose);
    s.on("stack:compose-end", onComposeEnd);
    s.on("container:stats", onStats);
    s.on("container:stats:end", onStatsEnd);
    s.on("image:pull-progress", onPull);
    s.on("image:pull-end", onPullEnd);
    s.on("ollama:chat-token", onToken);
    s.on("ollama:chat-end", onOllamaEnd);
    s.on("error", onError);

    return () => {
      s.off("stack:logs", onLogs);
      s.off("stack:logs:end", onLogsEnd);
      s.off("stack:compose-progress", onCompose);
      s.off("stack:compose-end", onComposeEnd);
      s.off("container:stats", onStats);
      s.off("container:stats:end", onStatsEnd);
      s.off("image:pull-progress", onPull);
      s.off("image:pull-end", onPullEnd);
      s.off("ollama:chat-token", onToken);
      s.off("ollama:chat-end", onOllamaEnd);
      s.off("error", onError);
    };
  }, []);
}

export function emit(event: string, data: any) {
  getSocket().emit(event, data);
}

export function subscribeToLogs(stackId: string, tail?: number) {
  emit("stack:logs", { stackId, tail });
}

export function stopLogs(stackId: string) {
  emit("stack:logs:stop", { stackId });
}

export function subscribeToCompose(stackId: string, action: "up" | "down") {
  emit("stack:compose-progress", { stackId, action });
}

export function subscribeToContainerLogs(containerId: string, tail?: number) {
  emit("container:logs", { containerId, tail });
}

export function stopContainerLogs(containerId: string) {
  emit("container:logs:stop", { containerId });
}

export function subscribeToContainerStats(containerId: string) {
  emit("container:stats", { containerId });
}

export function stopContainerStats(containerId: string) {
  emit("container:stats:stop", { containerId });
}

export function subscribeToImagePull(name: string) {
  emit("image:pull-progress", { name });
}

export function subscribeToOllamaChat(model: string, messages: { role: string; content: string }[]) {
  emit("ollama:chat-stream", { model, messages });
}
