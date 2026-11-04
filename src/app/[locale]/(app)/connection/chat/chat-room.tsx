"use client";
import { AlertCircle, ArrowLeft, Ban, Check, CheckCheck, Clock, Flag, MoreVertical, SendHorizontal, XCircle } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { DropdownMenu } from "radix-ui";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Countdown } from "@/components/connection/countdown";
import { Photo } from "@/components/photo";
import { BlockDialog, ReportDialog } from "@/components/safety/safety-actions";
import { Notice } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { toErrorCode } from "@/lib/errors";
import { getBrowserClient } from "@/lib/supabase/client";
import { useErrorText } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { EndConnectionButton } from "../end-button";

type Message = { id: string; sender_id: string | null; body: string; client_id: string; created_at: string; status?: "sending" | "failed"; error?: string };

export function ChatRoom(props: {
  connectionId: string;
  meId: string;
  partner: { id: string; name: string; photo: string | null };
  initialMessages: Message[];
  initialPartnerReadAt: string | null;
  initialActive: boolean;
  meSubscribed: boolean;
  partnerSubscribed: boolean;
  deadline: string | null;
  retentionDays: number;
}) {
  const t = useTranslations("chat");
  const nav = useTranslations("nav");
  const s = useTranslations("safety");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const errorText = useErrorText();
  const router = useRouter();
  const supabase = getBrowserClient();

  const [messages, setMessages] = useState<Message[]>(props.initialMessages);
  const [partnerReadAt, setPartnerReadAt] = useState(props.initialPartnerReadAt);
  const [active, setActive] = useState(props.initialActive);
  const [text, setText] = useState("");
  const [hasOlder, setHasOlder] = useState(props.initialMessages.length >= 50);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const canWrite = active && props.meSubscribed && props.partnerSubscribed;

  const markRead = useCallback(() => {
    if (active) void supabase.rpc("mark_connection_read", { p_connection: props.connectionId });
  }, [active, props.connectionId, supabase]);

  // Realtime: new messages, partner read receipts, connection closing.
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${props.connectionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `connection_id=eq.${props.connectionId}` }, (payload) => {
        const m = payload.new as Message;
        setMessages((prev) => {
          if (prev.some((x) => x.id === m.id)) return prev;
          const local = prev.findIndex((x) => x.client_id === m.client_id && x.sender_id === m.sender_id);
          if (local >= 0) return prev.map((x, i) => (i === local ? m : x));
          return [...prev, m];
        });
        if (m.sender_id !== props.meId) markRead();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "connection_participants", filter: `connection_id=eq.${props.connectionId}` }, (payload) => {
        const row = payload.new as { user_id: string; last_read_at: string | null };
        if (row.user_id !== props.meId) setPartnerReadAt(row.last_read_at);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "connections", filter: `id=eq.${props.connectionId}` }, (payload) => {
        if ((payload.new as { status: string }).status === "closed") {
          setActive(false);
          router.refresh();
        }
      })
      .subscribe();
    markRead();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [props.connectionId, props.meId, supabase, markRead, router]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function deliver(message: Message) {
    const { data, error } = await supabase.rpc("send_message", { p_connection: props.connectionId, p_body: message.body, p_client_id: message.client_id });
    setMessages((prev) =>
      prev.map((x) =>
        x.client_id === message.client_id && x.sender_id === props.meId
          ? error ? { ...x, status: "failed", error: errorText(toErrorCode(error)) } : { ...(data as Message) }
          : x,
      ),
    );
    if (error && ["connection_closed"].includes(toErrorCode(error))) setActive(false);
  }

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || !canWrite) return;
    const message: Message = { id: `local-${crypto.randomUUID()}`, sender_id: props.meId, body, client_id: crypto.randomUUID(), created_at: new Date().toISOString(), status: "sending" };
    stickToBottom.current = true;
    setMessages((prev) => [...prev, message]);
    setText("");
    void deliver(message);
  }

  function retry(message: Message) {
    setMessages((prev) => prev.map((x) => (x.client_id === message.client_id ? { ...x, status: "sending", error: undefined } : x)));
    void deliver(message);
  }

  async function loadOlder() {
    const oldest = messages.find((m) => !m.status)?.created_at;
    if (!oldest) return;
    const el = scroller.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const { data } = await supabase.from("messages").select("id, sender_id, body, client_id, created_at")
      .eq("connection_id", props.connectionId).lt("created_at", oldest).order("created_at", { ascending: false }).limit(50);
    const older = (data ?? []).reverse();
    setHasOlder(older.length >= 50);
    stickToBottom.current = false;
    setMessages((prev) => [...older, ...prev]);
    requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevHeight; });
  }

  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const today = now;
    const yesterday = new Date(now.getTime() - 86_400_000);
    if (d.toDateString() === today.toDateString()) return t("today");
    if (d.toDateString() === yesterday.toDateString()) return t("yesterday");
    return format.dateTime(d, { weekday: "long", day: "numeric", month: "long" });
  };

  return (
    <div className="-mx-4 -mb-10 -mt-6 flex h-[calc(100dvh-152px)] flex-col sm:mx-auto sm:max-w-3xl md:-mb-6 md:mt-0 md:h-[calc(100dvh-128px)] md:overflow-hidden md:rounded-[var(--radius-card)] md:border md:border-line/70 md:bg-white/60 md:shadow-soft">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line/70 bg-ivory/90 px-3 py-2.5 backdrop-blur">
        <Link href="/connection" className="rounded-full p-2 text-muted hover:bg-cream" aria-label="Back"><ArrowLeft className="size-5" /></Link>
        <Link href={`/profile/${props.partner.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Photo src={props.partner.photo} alt={props.partner.name} className="size-10 rounded-full" />
          <div className="min-w-0">
            <p className="truncate font-display text-xl leading-tight">{props.partner.name}</p>
            {active && props.deadline && <p className="truncate text-[11px] text-muted"><Countdown deadline={props.deadline} /></p>}
          </div>
        </Link>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="rounded-full p-2 text-muted hover:bg-cream" aria-label={t("menu")}><MoreVertical className="size-5" /></DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-48 rounded-2xl border border-line bg-ivory p-1.5 shadow-lift">
              <DropdownMenu.Item onSelect={() => router.push("/first-date")} className="cursor-pointer rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-cream">{nav("firstDate")}</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => { setReportMessage(null); setReportOpen(true); }} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-cream"><Flag className="size-4" /> {s("reportSubmit")}</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => setBlockOpen(true)} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger outline-none data-[highlighted]:bg-cream"><Ban className="size-4" /> {s("blockConfirm")}</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Messages */}
      <div
        ref={scroller}
        className="flex-1 space-y-1.5 overflow-y-auto bg-travertine-texture px-3 py-4 sm:px-5"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        aria-live="polite"
      >
        {hasOlder && (
          <div className="flex justify-center pb-2">
            <button onClick={loadOlder} className="rounded-full bg-ivory/80 px-4 py-1.5 text-xs text-muted shadow-soft">{t("loadOlder")}</button>
          </div>
        )}
        {messages.length === 0 && <p className="mx-auto mt-10 max-w-xs text-center font-display text-xl text-muted">{t("empty")}</p>}
        {messages.map((m, i) => {
          const mine = m.sender_id === props.meId;
          const showDay = i === 0 || new Date(messages[i - 1].created_at).toDateString() !== new Date(m.created_at).toDateString();
          const read = mine && !m.status && partnerReadAt && new Date(partnerReadAt) >= new Date(m.created_at);
          return (
            <div key={m.id}>
              {showDay && <p className="py-3 text-center text-[11px] uppercase tracking-wider text-muted">{dayLabel(m.created_at)}</p>}
              <div className={cn("group flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("relative max-w-[80%] rounded-3xl px-4 py-2.5 text-[15px] leading-snug shadow-sm",
                  mine ? "rounded-br-lg bg-bordeaux text-ivory" : "rounded-bl-lg bg-white text-ink",
                  m.status === "failed" && "bg-danger/80")}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <div className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", mine ? "text-ivory/70" : "text-muted")}>
                    {format.dateTime(new Date(m.created_at), { hour: "2-digit", minute: "2-digit" })}
                    {mine && (m.status === "sending" ? <Clock className="size-3" aria-label={t("sending")} />
                      : m.status === "failed" ? <AlertCircle className="size-3" aria-label={t("failed")} />
                      : read ? <CheckCheck className="size-3.5 text-gold-soft" aria-label={t("read")} />
                      : <Check className="size-3" aria-label={t("sent")} />)}
                  </div>
                  {!mine && active && (
                    <button onClick={() => { setReportMessage(m.id); setReportOpen(true); }}
                      className="absolute -right-8 top-1/2 hidden -translate-y-1/2 rounded-full p-1.5 text-muted hover:text-danger group-hover:block" aria-label={t("reportMessage")} title={t("reportMessage")}>
                      <Flag className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {m.status === "failed" && (
                <button onClick={() => retry(m)} className="ml-auto mt-1 flex items-center gap-1 text-xs text-danger">
                  <XCircle className="size-3.5" /> {m.error ? `${m.error} · ` : ""}{t("failed")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-line/70 bg-ivory/95 p-3">
        {!active ? (
          <Notice>{t("closed", { days: props.retentionDays })}</Notice>
        ) : !props.meSubscribed ? (
          <Notice tone="warning">{t("subscriptionRequired")} <Link href="/billing" className="font-medium text-bordeaux underline">→</Link></Notice>
        ) : !props.partnerSubscribed ? (
          <Notice tone="warning">{t("partnerSubscriptionInactive", { name: props.partner.name })}</Notice>
        ) : (
          <form onSubmit={send} className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
              rows={1}
              maxLength={2000}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              className="max-h-36 min-h-12 flex-1 resize-none rounded-3xl border border-line bg-white px-4 py-3 text-[15px] focus:border-bordeaux/50 focus:outline-none focus:ring-4 focus:ring-bordeaux/10"
            />
            <button type="submit" disabled={!text.trim()} aria-label={t("send")}
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-bordeaux text-ivory transition active:scale-95 disabled:opacity-40">
              <SendHorizontal className="size-5" />
            </button>
          </form>
        )}
        {active && <div className="mt-2 flex justify-center"><EndConnectionButton connectionId={props.connectionId} /></div>}
      </div>

      {props.partner.id && (
        <>
          <ReportDialog target={props.partner.id} name={props.partner.name} messageId={reportMessage ?? undefined} open={reportOpen} onOpenChange={setReportOpen}
            onDone={() => { setActive(false); router.refresh(); }} />
          <BlockDialog target={props.partner.id} name={props.partner.name} open={blockOpen} onOpenChange={setBlockOpen}
            onDone={() => { router.push("/connection"); router.refresh(); }} />
        </>
      )}
    </div>
  );
}
