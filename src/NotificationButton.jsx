import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { enablePush, getPushState } from "./push.js";

const HINTS = {
  "needs-install": "To get task notifications on iPhone, add this app to your Home Screen and open it from there.",
  denied: "Notifications are blocked. Allow them for this app in your phone or browser settings.",
};

export default function NotificationButton({ user }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getPushState()
      .then((s) => active && setState(s))
      .catch(() => active && setState("unsupported"));
    return () => {
      active = false;
    };
  }, []);

  if (!state || state === "unsupported") return null;

  if (state === "on") {
    return (
      <span className="notify-status" role="status">
        <BellRing size={18} aria-hidden="true" />
        Notifications on
      </span>
    );
  }

  const turnOn = async () => {
    if (HINTS[state]) {
      setMessage((m) => (m ? "" : HINTS[state]));
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await enablePush(user.email);
      setState("on");
    } catch (err) {
      setMessage(err.message || "Couldn't turn on notifications. Try again.");
      setState(await getPushState().catch(() => "off"));
    }
    setBusy(false);
  };

  const Icon = state === "denied" ? BellOff : Bell;

  return (
    <div className="install-wrap">
      <button
        type="button"
        className="install-btn"
        onClick={turnOn}
        disabled={busy}
        aria-expanded={HINTS[state] ? Boolean(message) : undefined}
      >
        <Icon size={18} aria-hidden="true" />
        {busy ? "Turning on…" : "Task notifications"}
      </button>
      {message && (
        <p className="install-hint" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
