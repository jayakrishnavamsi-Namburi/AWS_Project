import { useState, useEffect, useCallback, useRef } from 'react';

export const useBrowserSecurity = ({
  onViolation,
  enabled = true,
  fullscreenRequired = true
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabFocusLost, setTabFocusLost] = useState(false);
  const lastEmitRef = useRef({});

  const emitViolation = useCallback((eventType, severity, metadata = {}) => {
    const now = Date.now();
    const last = lastEmitRef.current[eventType] || 0;
    if (now - last >= 2000) { // 2s debounce
      lastEmitRef.current[eventType] = now;
      if (onViolation) {
        onViolation({ eventType, severity, metadata });
      }
    }
  }, [onViolation]);

  const requestFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request denied or not supported:', err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn('Fullscreen exit error:', err);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Fullscreen Change Listener
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      setIsFullscreen(isCurrentlyFullscreen);

      if (fullscreenRequired && !isCurrentlyFullscreen) {
        emitViolation('fullscreen_exit', 'high', { timestamp: new Date().toISOString() });
      }
    };

    // Visibility Change Listener
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabFocusLost(true);
        emitViolation('page_hidden', 'high', { timestamp: new Date().toISOString() });
      } else {
        setTabFocusLost(false);
      }
    };

    // Window Blur Listener
    const handleWindowBlur = () => {
      setTabFocusLost(true);
      emitViolation('tab_blur', 'medium', { timestamp: new Date().toISOString() });
    };

    const handleWindowFocus = () => {
      setTabFocusLost(false);
    };

    // Keyboard Shortcuts Interception
    const handleKeyDown = (e) => {
      // F12 or Inspect (Ctrl+Shift+I / Ctrl+Shift+J / Cmd+Option+I)
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'j'))
      ) {
        e.preventDefault();
        emitViolation('devtools_open_attempt', 'high', { key: e.key });
        return false;
      }

      // Intercept Copy / Paste Shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        e.preventDefault();
        emitViolation('clipboard_action', 'medium', { action: `Ctrl+${e.key.toUpperCase()}` });
        return false;
      }
    };

    // Context Menu Interception
    const handleContextMenu = (e) => {
      e.preventDefault();
      emitViolation('clipboard_action', 'low', { action: 'context_menu' });
      return false;
    };

    // Copy / Paste / Cut Interception
    const handleClipboardEvent = (e) => {
      e.preventDefault();
      emitViolation('clipboard_action', 'medium', { action: e.type });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleClipboardEvent);
    document.addEventListener('paste', handleClipboardEvent);
    document.addEventListener('cut', handleClipboardEvent);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleClipboardEvent);
      document.removeEventListener('paste', handleClipboardEvent);
      document.removeEventListener('cut', handleClipboardEvent);
    };
  }, [enabled, fullscreenRequired, emitViolation]);

  return {
    isFullscreen,
    tabFocusLost,
    requestFullscreen,
    exitFullscreen
  };
};
