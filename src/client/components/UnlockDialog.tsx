import { useState } from "react";
import { api, setAdminKey } from "../api";

interface Props {
  onClose: () => void;
  onUnlocked: () => void;
}

/**
 * Replaces the old window.prompt(): some browsers suppress prompts, and it
 * gave no way to explain what the key even is.
 */
export function UnlockDialog({ onClose, onUnlocked }: Props) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setChecking(true);
    setError(null);
    setAdminKey(key.trim());
    try {
      await api.checkAdmin();
      onUnlocked();
      onClose();
    } catch {
      setAdminKey("");
      setError("That key doesn't fit the lock.");
      setChecking(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal frame" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal__head">
          <h2>Cook's entrance</h2>
          <button className="btn" onClick={onClose} aria-label="Close">
            X
          </button>
        </div>

        <p className="muted">
          Anyone can spin the wheel. Adding and removing recipes needs the kitchen key.
        </p>

        <form className="field" onSubmit={submit} style={{ marginTop: 14 }}>
          <input
            className="input"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="kitchen key"
            autoFocus
            autoComplete="current-password"
          />
          <button className="btn btn--primary" disabled={checking || !key.trim()}>
            {checking ? "…" : "UNLOCK"}
          </button>
        </form>

        {error && <div className="notice notice--bad">{error}</div>}
      </div>
    </div>
  );
}
