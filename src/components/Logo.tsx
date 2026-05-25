import { clsx } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  withText?: boolean;
}

export function Logo({ size = 32, className, withText = false }: LogoProps) {
  return (
    <div className={clsx("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {withText && (
        <span
          className="font-semibold tracking-tight text-white"
          style={{ fontSize: size * 0.6 }}
        >
          Carapace
        </span>
      )}
    </div>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="shellGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F7FFF" />
          <stop offset="100%" stopColor="#1652F0" />
        </linearGradient>
        <linearGradient id="accentGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E8923A" />
          <stop offset="100%" stopColor="#C9822A" />
        </linearGradient>
      </defs>

      {/* Outer shell arc — main carapace shape */}
      <path
        d="M32 6 C16 6 6 18 6 32 C6 46 16 54 32 58 C48 54 58 46 58 32 C58 18 48 6 32 6Z"
        fill="url(#shellGrad)"
        opacity="0.15"
      />

      {/* Shell segments — hexagonal pattern */}
      {/* Center hex */}
      <polygon
        points="32,22 39,26.5 39,35.5 32,40 25,35.5 25,26.5"
        fill="url(#shellGrad)"
        opacity="0.9"
      />

      {/* Top hex */}
      <polygon
        points="32,8 39,12.5 39,21.5 32,26 25,21.5 25,12.5"
        fill="url(#shellGrad)"
        opacity="0.5"
      />

      {/* Bottom hex */}
      <polygon
        points="32,40 39,44.5 39,53.5 32,58 25,53.5 25,44.5"
        fill="url(#shellGrad)"
        opacity="0.5"
      />

      {/* Upper-left hex */}
      <polygon
        points="18,15 25,19.5 25,28.5 18,33 11,28.5 11,19.5"
        fill="url(#shellGrad)"
        opacity="0.35"
      />

      {/* Upper-right hex */}
      <polygon
        points="46,15 53,19.5 53,28.5 46,33 39,28.5 39,19.5"
        fill="url(#shellGrad)"
        opacity="0.35"
      />

      {/* Lower-left hex */}
      <polygon
        points="18,33 25,37.5 25,46.5 18,51 11,46.5 11,37.5"
        fill="url(#shellGrad)"
        opacity="0.35"
      />

      {/* Lower-right hex */}
      <polygon
        points="46,33 53,37.5 53,46.5 46,51 39,46.5 39,37.5"
        fill="url(#shellGrad)"
        opacity="0.35"
      />

      {/* Center shield mark — amber accent */}
      <circle cx="32" cy="31" r="4.5" fill="url(#accentGrad)" opacity="0.95" />
    </svg>
  );
}
