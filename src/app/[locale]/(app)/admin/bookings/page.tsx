import { getFormatter, getTranslations } from "next-intl/server";
import { Badge, Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { BookingActions } from "../widgets";

export default async function AdminBookings() {
  const t = await getTranslations("admin");
  const fd = await getTranslations("firstDate");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: bookings } = await supabase.rpc("admin_list_bookings", {});
  return (
    <Card className="divide-y divide-line/70 overflow-hidden">
      {!bookings?.length && <p className="p-5 text-sm text-muted">{t("noRows")}</p>}
      {bookings?.map((b) => (
        <div key={b.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
          <div className="flex-1">
            <p className="font-medium">{b.venue_name}</p>
            <p className="text-xs text-muted">{format.dateTime(new Date(b.requested_for), { dateStyle: "full", timeStyle: "short" })} · {b.party_size}p</p>
          </div>
          <Badge>{fd(`booking.${b.status}`)}</Badge>
          {b.status === "requested" && <BookingActions bookingId={b.id} />}
        </div>
      ))}
    </Card>
  );
}
