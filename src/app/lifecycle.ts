interface LifecycleHandlers {
  onKeyDown: (event: KeyboardEvent) => void;
  onKeyUp: (event: KeyboardEvent) => void;
  onBlur: () => void;
  onVisibilityChange: (hidden: boolean) => void;
  onBeforeUnload: () => void;
}

export const bindLifecycle = (handlers: LifecycleHandlers) => {
  const keyListenerOptions: AddEventListenerOptions = { capture: true };

  const visibilityHandler = () => {
    handlers.onVisibilityChange(document.hidden);
  };

  window.addEventListener("keydown", handlers.onKeyDown, keyListenerOptions);
  window.addEventListener("keyup", handlers.onKeyUp, keyListenerOptions);
  window.addEventListener("blur", handlers.onBlur);
  document.addEventListener("visibilitychange", visibilityHandler);
  window.addEventListener("beforeunload", handlers.onBeforeUnload);

  return () => {
    window.removeEventListener(
      "keydown",
      handlers.onKeyDown,
      keyListenerOptions,
    );
    window.removeEventListener("keyup", handlers.onKeyUp, keyListenerOptions);
    window.removeEventListener("blur", handlers.onBlur);
    document.removeEventListener("visibilitychange", visibilityHandler);
    window.removeEventListener("beforeunload", handlers.onBeforeUnload);
  };
};
