export function formatUsdc(raw: bigint | undefined, decimals = 2): string {
  if (raw === undefined) return "0.00";
  const value = Number(raw) / 1e6;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPrice(raw: bigint | undefined): string {
  if (!raw || raw === 0n) return "1.000000";
  return (Number(raw) / 1e6).toFixed(6);
}

export function parseUsdc(value: string): bigint {
  const num = parseFloat(value || "0");
  if (isNaN(num) || num < 0) return 0n;
  return BigInt(Math.floor(num * 1e6));
}

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function timeAgo(ts: bigint): string {
  const seconds = Math.floor(Date.now() / 1000) - Number(ts);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function clsx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
