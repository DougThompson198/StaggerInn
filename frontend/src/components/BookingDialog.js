import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CABINS } from "@/lib/api";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";

const empty = { guest_name: "", cabin: "Homestead & Bunkie", check_in: "", check_out: "" };

export default function BookingDialog({ open, onOpenChange, booking, onSave, onDelete }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(booking ? { ...booking } : empty);
    }
  }, [open, booking]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.guest_name.trim()) return;
    if (!form.check_in || !form.check_out) return;
    if (form.check_out <= form.check_in) return;
    setSaving(true);
    await onSave({
      guest_name: form.guest_name.trim(),
      cabin: form.cabin,
      check_in: form.check_in,
      check_out: form.check_out,
    });
    setSaving(false);
  };

  const canSubmit =
    form.guest_name.trim() &&
    form.check_in &&
    form.check_out &&
    form.check_out > form.check_in;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="booking-modal" className="sm:max-w-[520px] rounded-2xl" style={{ background: "#FFFFFF" }}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-light" style={{ color: "var(--text-primary)" }}>
            {booking ? "Edit booking" : "Add a booking"}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--text-secondary)" }}>
            {booking ? "Update the guest's stay details." : "Log a new guest stay at the cottage."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 mt-2">
          <div>
            <Label htmlFor="guest_name" className="uppercase-label block mb-2">Guest Name</Label>
            <Input
              id="guest_name"
              data-testid="booking-form-name"
              value={form.guest_name}
              onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))}
              placeholder="e.g. The Murphys"
              className="h-11"
              style={{ background: "#FBF9F5", borderColor: "var(--border-soft)" }}
            />
          </div>

          <div>
            <Label className="uppercase-label block mb-2">Cabin</Label>
            <Select
              value={form.cabin}
              onValueChange={(v) => setForm((f) => ({ ...f, cabin: v }))}
            >
              <SelectTrigger data-testid="booking-form-cabin-select" className="h-11" style={{ background: "#FBF9F5", borderColor: "var(--border-soft)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CABINS.map((c) => (
                  <SelectItem key={c} value={c} data-testid={`booking-form-cabin-option-${c.replace(/\s+/g,"-").replace("&","and").toLowerCase()}`}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DatePickerField
              label="Check-in"
              testid="booking-form-checkin"
              value={form.check_in}
              onChange={(v) => setForm((f) => ({ ...f, check_in: v }))}
            />
            <DatePickerField
              label="Check-out"
              testid="booking-form-checkout"
              value={form.check_out}
              onChange={(v) => setForm((f) => ({ ...f, check_out: v }))}
              min={form.check_in}
            />
          </div>

          {form.check_in && form.check_out && form.check_out <= form.check_in && (
            <p className="text-sm" style={{ color: "#B33A3A" }} data-testid="booking-date-error">
              Check-out must be after check-in.
            </p>
          )}

          <DialogFooter className="flex flex-row gap-2 sm:gap-2 pt-2">
            {booking && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDelete(booking.id)}
                data-testid="booking-form-delete"
                className="mr-auto rounded-full"
                style={{ color: "#B33A3A" }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="booking-form-cancel"
              className="rounded-full"
              style={{ borderColor: "var(--border-soft)" }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || saving}
              data-testid="booking-form-submit"
              className="rounded-full"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {saving ? "Saving…" : booking ? "Save changes" : "Add booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DatePickerField({ label, value, onChange, testid, min }) {
  const selected = value ? parseISO(value) : undefined;
  return (
    <div>
      <Label className="uppercase-label block mb-2">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid={testid}
            className="w-full h-11 inline-flex items-center justify-start gap-2 px-3 rounded-md border text-sm"
            style={{ background: "#FBF9F5", borderColor: "var(--border-soft)", color: value ? "var(--text-primary)" : "var(--text-muted)" }}
          >
            <CalendarIcon className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
            {value ? format(selected, "MMM d, yyyy") : "Pick a date"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (!d) return;
              const iso = format(d, "yyyy-MM-dd");
              onChange(iso);
            }}
            disabled={min ? { before: parseISO(min) } : undefined}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
