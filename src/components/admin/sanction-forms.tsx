import { sanctionUserAction, setGarageHiddenAction, setProfileHiddenAction } from "@/server/actions/admin-moderation";
import { Button } from "@/components/ui/button";

export function SanctionForm({ userId, back, reportId, canBan }: { userId: string; back: string; reportId?: string; canBan: boolean }) {
  return (
    <form action={sanctionUserAction} className="grid gap-3 sm:grid-cols-[10rem_8rem_1fr_auto] sm:items-end">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="back" value={back} />
      {reportId && <input type="hidden" name="report_id" value={reportId} />}
      <label className="text-sm">
        <span className="mb-1 block font-semibold">Sanction</span>
        <select name="kind" className="field">
          <option value="suspension">Suspension</option>
          {canBan && <option value="ban">Bannissement</option>}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-semibold">Durée (heures)</span>
        <input name="hours" type="number" min={1} max={8760} defaultValue={72} className="field" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-semibold">Motif (visible dans l&apos;historique)</span>
        <input name="reason" required minLength={3} maxLength={1000} className="field" />
      </label>
      <Button type="submit" variant="danger">
        Appliquer
      </Button>
    </form>
  );
}

export function HideProfileForm({ userId, hidden, back }: { userId: string; hidden: boolean; back: string }) {
  return (
    <form action={setProfileHiddenAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="hidden" value={hidden ? "false" : "true"} />
      <input type="hidden" name="back" value={back} />
      <label className="min-w-60 flex-1 text-sm">
        <span className="mb-1 block font-semibold">Motif</span>
        <input name="reason" required minLength={3} maxLength={1000} className="field" />
      </label>
      <Button type="submit" variant="secondary">
        {hidden ? "Réafficher le profil" : "Masquer le profil"}
      </Button>
    </form>
  );
}

export function HideGarageForm({ garageId, hidden, back, reportId }: { garageId: string; hidden: boolean; back: string; reportId?: string }) {
  return (
    <form action={setGarageHiddenAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="garage_id" value={garageId} />
      <input type="hidden" name="hidden" value={hidden ? "false" : "true"} />
      <input type="hidden" name="back" value={back} />
      {reportId && <input type="hidden" name="report_id" value={reportId} />}
      <label className="min-w-60 flex-1 text-sm">
        <span className="mb-1 block font-semibold">Motif</span>
        <input name="reason" required minLength={3} maxLength={1000} className="field" />
      </label>
      <Button type="submit" variant="secondary">
        {hidden ? "Réafficher le garage" : "Masquer le garage"}
      </Button>
    </form>
  );
}
