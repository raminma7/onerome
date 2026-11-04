import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/** Signed, private profile photo. Uses <img> because signed URLs expire. */
export function Photo({ src, alt, className, arch }: { src?: string | null; alt: string; className?: string; arch?: boolean }) {
  if (!src) {
    return (
      <div className={cn("bg-brand-soft flex items-center justify-center text-coral/50", arch && "arch", className)} role="img" aria-label={alt}>
        <UserRound className="size-1/3 max-h-16 max-w-16" strokeWidth={1.4} />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} draggable={false} className={cn("select-none object-cover", arch && "arch", className)} loading="lazy" decoding="async" />;
}
