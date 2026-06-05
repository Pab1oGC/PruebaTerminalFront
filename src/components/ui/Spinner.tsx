interface SpinnerProps {
  size?:     number;
  className?: string;
  fullPage?:  boolean;
  color?:     string;
}

export function Spinner({ size = 20, className = '', fullPage, color = '#8b5cf6' }: SpinnerProps) {
  const spinner = (
    <svg
      className={`animate-spin ${className}`}
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: 'inline-block', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" stroke={`${color}25`} strokeWidth="3" />
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3"
        strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
    </svg>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        {spinner}
      </div>
    );
  }
  return spinner;
}
