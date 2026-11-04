import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/** Signed, private profile photo. Uses <img> because signed URLs expire. */
export function Photo({ src, alt, className, arch }: { src?: string | null; alt: string; className?: string; arch?: boolean }) {
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-travertine text-muted", arch && "arch", className)} aria-label={alt}>
        <UserRound className="size-1/3" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={cn("object-cover", arch && "arch", className)} loading="lazy" decoding="async" />;
}
