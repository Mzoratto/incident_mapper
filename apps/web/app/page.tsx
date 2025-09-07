import { ReportForm } from '../src/components/ReportForm';
import { SyncIndicator } from '../src/components/SyncIndicator';
import { IncidentList } from '../src/components/IncidentList';
import { MapView } from '../src/components/MapView';
import { ConflictBanner } from '../src/components/ConflictBanner';
import { TopBar } from '../src/components/TopBar';
import { ModerationQueue } from '../src/components/ModerationQueue';

export default function Page() {
  return (
    <div className="space-y-6">
      <TopBar />
      <h1 className="text-2xl font-bold">Incident Mapper</h1>
      <SyncIndicator />
      <MapView />
      <ConflictBanner />
      <ReportForm />
      <IncidentList />
      <ModerationQueue />
      <p className="text-sm text-slate-600">This is a starter scaffold. Map and moderation views to come.</p>
    </div>
  );
}
