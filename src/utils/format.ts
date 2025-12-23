/**
 * Format utilities for consistent number and currency display
 */

/**
 * Format IDL token amount from base units (9 decimals) to human-readable
 */
export const formatIDL = (value: bigint | number | undefined): string => {
  if (value === undefined) return '...';
  const numValue = typeof value === 'bigint' ? Number(value) : value;
  return (numValue / 1e9).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
};

/**
 * Format wallet address to short form
 */
export const formatWallet = (address: string | { toString: () => string }): string => {
  const str = typeof address === 'string' ? address : address.toString();
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
};

/**
 * Format USD value
 */
export const formatUSD = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(2)}`;
};

/**
 * Format percentage
 */
export const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};
