import { useEffect, useState } from "react";

export function RestoringState() {
  return (
    <div className="p2-center-state" role="status" aria-live="polite">
      <div className="p2-loader" aria-hidden="true"><i /><i /><i /></div>
      <b>Restoring your session…</b>
      <p>Picking up where you left off.</p>
    </div>
  );
}

// Reflects the browser's connection state so people know changes may not have saved.
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const frame = window.requestAnimationFrame(update);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return <div className="p6-offline" role="status">You’re offline. We’ll reconnect automatically; anything that didn’t save can be retried.</div>;
}
