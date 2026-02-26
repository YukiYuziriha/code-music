interface LifecycleHandlers {
  onKeyDown: (event: KeyboardEvent) => void;
  onKeyUp: (event: KeyboardEvent) => void;
  onBlur: () => void;
  onVisibilityChange: (hidden: boolean) => void;
  onBeforeUnload: () => void;
}

export const bindLifecycle = (handlers: LifecycleHandlers) => {
  const visibilityHandler = () => {
    handlers.onVisibilityChange(document.hidden);
  };

  window.addEventListener("keydown", handlers.onKeyDown);
  window.addEventListener("keyup", handlers.onKeyUp);
  window.addEventListener("blur", handlers.onBlur);
  document.addEventListener("visibilitychange", visibilityHandler);
  window.addEventListener("beforeunload", handlers.onBeforeUnload);

  return () => {
    window.removeEventListener("keydown", handlers.onKeyDown);
    window.removeEventListener("keyup", handlers.onKeyUp);
    window.removeEventListener("blur", handlers.onBlur);
    document.removeEventListener("visibilitychange", visibilityHandler);
    window.removeEventListener("beforeunload", handlers.onBeforeUnload);
  };
};
