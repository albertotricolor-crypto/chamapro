import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({
  value,
  size = 16,
  editable = false,
  onChange,
}: {
  value: number;
  size?: number;
  editable?: boolean;
  onChange?: (value: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  if (!editable) {
    return (
      <span
        className="inline-flex items-center gap-0.5"
        role="img"
        aria-label={`Nota ${value.toFixed(1).replace(".", ",")} de 5`}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = value >= n - 0.25;
          const half = !filled && value >= n - 0.75;
          return (
            <Star
              key={n}
              style={{ width: size, height: size }}
              className={cn(
                filled
                  ? "fill-gold-dark text-gold-dark"
                  : half
                    ? "fill-gold-dark/40 text-gold-dark"
                    : "fill-transparent text-border-input",
              )}
              aria-hidden="true"
            />
          );
        })}
      </span>
    );
  }

  return (
    <span
      role="radiogroup"
      aria-label="Avaliação de 1 a 5 estrelas"
      className="inline-flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = display >= n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
            onClick={() => onChange?.(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(null)}
            className="rounded-sm p-0.5 transition-transform duration-100 hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Star
              style={{ width: 32, height: 32 }}
              className={cn(
                filled
                  ? "fill-gold-dark text-gold-dark"
                  : "fill-transparent text-border-input",
              )}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </span>
  );
}
