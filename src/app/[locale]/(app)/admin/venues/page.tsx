import { createClient } from "@/lib/supabase/server";
import { VenueAdmin } from "./venue-admin";

export default async function AdminVenues() {
  const supabase = await createClient();
  const [{ data: venues }, { data: neighborhoods }] = await Promise.all([
    supabase.from("venues").select("*").order("name"),
    supabase.from("neighborhoods").select("slug, name").order("name"),
  ]);
  return <VenueAdmin venues={venues ?? []} neighborhoods={neighborhoods ?? []} />;
}
