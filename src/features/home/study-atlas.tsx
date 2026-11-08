import type { Manifest } from '@/lib/domain/schema';
import type { loadStudyMap } from '@/lib/data/study-map';

type StudyAtlasProps = Pick<Manifest, 'geography' | 'areaCount' | 'mode'> & {
  boundaries: Awaited<ReturnType<typeof loadStudyMap>>;
};

export function StudyAtlas({ boundaries, geography, areaCount, mode }: StudyAtlasProps) {
  return (
    <figure className="home-atlas" aria-labelledby="atlas-caption">
      <div className="atlas-heading">
        <span>The study area</span>
        <span aria-hidden="true">N ↑</span>
      </div>
      <svg
        viewBox="0 0 760 1050"
        role="img"
        aria-label="Census boundaries of the Central Florida study area"
      >
        {boundaries.map(({ id, path, outline }) => (
          <g key={id} className="atlas-county" data-county={id}>
            <path className="atlas-land" d={path} fillRule="evenodd" />
            <path className="atlas-outline" d={outline} />
          </g>
        ))}
        <g className="atlas-labels" aria-hidden="true">
          <text x="200" y="300">
            Lake
          </text>
          <text x="465" y="510">
            Orange
          </text>
          <text x="470" y="790">
            Osceola
          </text>
          <text x="460" y="385">
            Seminole
          </text>
        </g>
      </svg>
      <figcaption id="atlas-caption">
        <ul className="atlas-counties" aria-label="Counties in the study area">
          {geography.map((county) => (
            <li key={county} data-county={county}>
              {county}
            </li>
          ))}
        </ul>
        <span className="atlas-meta">
          {areaCount.toLocaleString('en-US')} Census tracts ·{' '}
          {mode === 'illustrative' ? 'Illustrative test data' : '2020 boundaries'}
        </span>
      </figcaption>
    </figure>
  );
}
