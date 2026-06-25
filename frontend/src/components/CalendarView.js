import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { familyColor, CABIN_TAGS } from "@/lib/api";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(y, m) { return new Date(y, m, 1); }
function fmtIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CalendarView({ bookings, onEdit }) {
  const todayIso = fmtIso(new Date());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const days = useMemo(() => {
    const first = startOfMonth(cursor.y, cursor.m);
    const startWeekday = first.getDay();
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startWeekday);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  const bookingsByDay = (iso) =>
    bookings.filter((b) => b.check_in <= iso && b.check_out >= iso);

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const shift = (delta) => {
    setCursor(({ y, m }) => {
      const nm = m + delta;
      return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });
  };

  return (
    <section className="card-soft animate-in" data-testid="calendar-view">
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b" style={{ borderColor: "var(--border-soft)" }}>
        <div>
          <div className="uppercase-label">View</div>
          <div className="font-display text-2xl font-light">{monthLabel}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shift(-1)} data-testid="calendar-prev" className="rounded-full" style={{ borderColor: "var(--border-soft)" }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }); }} data-testid="calendar-today" className="rounded-full" style={{ borderColor: "var(--border-soft)" }}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => shift(1)} data-testid="calendar-next" className="rounded-full" style={{ borderColor: "var(--border-soft)" }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 px-4 pt-4">
        {WEEKDAYS.map((w) => (
          <div key={w} className="uppercase-label text-center pb-2">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 p-4 pt-0">
        {days.map((d, i) => {
          const iso = fmtIso(d);
          const inMonth = d.getMonth() === cursor.m;
          const isToday = iso === todayIso;
          const dayBookings = bookingsByDay(iso);

          return (
            <div
              key={i}
              data-testid={`calendar-day-${iso}`}
              className="min-h-[100px] rounded-lg p-2 border flex flex-col"
              style={{
                background: inMonth ? "#FFFFFF" : "rgba(235,230,223,0.4)",
                borderColor: isToday ? "var(--accent)" : "var(--border-soft)",
                borderWidth: isToday ? 2 : 1,
                opacity: inMonth ? 1 : 0.6,
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-sm font-medium"
                  style={{ color: isToday ? "var(--accent)" : "var(--text-primary)" }}
                >
                  {d.getDate()}
                </span>
                {dayBookings.length > 0 && (
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    {dayBookings.length}
                  </span>
                )}
              </div>
              <div className="space-y-1 overflow-hidden">
                {dayBookings.slice(0, 3).map((b) => {
                  const fc = familyColor(b.guest_name);
                  const cabinTag = CABIN_TAGS[b.cabin] || b.cabin.slice(0, 3);
                  return (
                    <button
                      key={b.id}
                      onClick={() => onEdit(b)}
                      data-testid={`calendar-booking-${b.id}-${iso}`}
                      className="w-full text-left rounded-md px-1.5 py-0.5 text-[11px] flex items-center gap-1 truncate hover:shadow-sm transition"
                      style={{ background: fc.bg, color: fc.text, border: `1px solid ${fc.border}` }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: fc.dot }} />
                      <span className="truncate font-medium">{b.guest_name}</span>
                      <span className="ml-auto text-[9px] opacity-70 flex-shrink-0">{cabinTag}</span>
                    </button>
                  );
                })}
                {dayBookings.length > 3 && (
                  <div className="text-[10px] px-1" style={{ color: "var(--text-muted)" }}>
                    +{dayBookings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
