import StatusIndicator from '../StatusIndicator'

export default function StatusIndicatorExample() {
  return (
    <div className="flex flex-wrap gap-2 p-4">
      <StatusIndicator status="studying" />
      <StatusIndicator status="free" />
      <StatusIndicator status="help" />
      <StatusIndicator status="busy" />
      <StatusIndicator status="tired" />
      <StatusIndicator status="social" />
    </div>
  );
}