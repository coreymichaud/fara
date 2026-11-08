'use client';
import dynamic from 'next/dynamic';
import type { ScoredArea } from '@/lib/domain/planner';
import type { Scenario } from '@/lib/domain/schema';
const MapClient = dynamic(() => import('./map-client'), {
  ssr: false,
  loading: () => (
    <div className="map-loading" role="status">
      Loading map…
    </div>
  ),
});
export type MapProps = {
  areas: ScoredArea[];
  scenario: Scenario;
  included: string[];
  baseline: boolean;
  showRetailers: boolean;
  onSelect: (id: string) => void;
  onMove: (coordinates: [number, number]) => void;
};
export function MapView(props: MapProps) {
  return <MapClient {...props} />;
}
