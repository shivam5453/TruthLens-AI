import {
  CheckCircle2
} from "lucide-react";

export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="toast-notification-banner" role="alert">
      <CheckCircle2 size={16} className="toast-icon" />
      <span className="toast-message">{message}</span>
    </div>
  );
}
