export default function ErrorMessage({ message, onRetry }) {
  return <div className="alert error"><strong>Could not load this section.</strong><span>{message}</span>{onRetry && <button className="text-button" onClick={onRetry}>Retry</button>}</div>;
}