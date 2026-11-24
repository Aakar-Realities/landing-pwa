import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  if (deferredPrompt) {
    const install = async () => {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    };
    return (
      <button type="button" className="install-btn" onClick={install}>
        <Download size={18} aria-hidden="true" />
        Install app
      </button>
    );
  }

  if (isIOS()) {
    return (
      <div className="install-wrap">
        <button
          type="button"
          className="install-btn"
          aria-expanded={showIOSHint}
          onClick={() => setShowIOSHint((v) => !v)}
        >
          <Download size={18} aria-hidden="true" />
          Install app
        </button>
        {showIOSHint && (
          <p className="install-hint" role="status">
            Tap <Share size={15} aria-label="Share" /> Share, then{" "}
            <strong>Add to Home Screen</strong>.
          </p>
        )}
      </div>
    );
  }

  return null;
}
