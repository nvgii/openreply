/**
 * nadworker wordmarks from Brand Book V1.
 * Ink on paper, paper on near-black. Orange is the punctuation variant.
 * The compact mark is the orange n on a near-black square.
 */

const wordmarks = {
  ink: "/brand/nadworker-wordmark-ink.svg",
  paper: "/brand/nadworker-wordmark-paper.svg",
  orange: "/brand/nadworker-wordmark-orange.svg",
} as const;

export function Wordmark({
  tone = "ink",
  className = "",
  height = 22,
}: {
  tone?: keyof typeof wordmarks;
  className?: string;
  height?: number;
}) {
  return (
    // The master is a vector reconstruction, not a font we re-set in CSS.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={wordmarks[tone]}
      alt="nadworker"
      height={height}
      className={`block w-auto ${className}`}
      style={{ height }}
    />
  );
}

export function Mark({
  className = "",
  size = 36,
  label = "nadworker",
}: {
  className?: string;
  size?: number;
  label?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/nadworker-mark.png"
      alt={label}
      width={size}
      height={size}
      className={`block ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
