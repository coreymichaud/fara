import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

const point = z.tuple([z.number().finite(), z.number().finite()]);
const polygon = point.array().min(4).array().min(1);
const collection = z.object({
  type: z.literal('FeatureCollection'),
  features: z
    .object({
      type: z.literal('Feature'),
      properties: z.object({ id: z.string().regex(/^12\d{3}$/) }),
      geometry: z.discriminatedUnion('type', [
        z.object({ type: z.literal('Polygon'), coordinates: polygon }),
        z.object({ type: z.literal('MultiPolygon'), coordinates: polygon.array().min(1) }),
      ]),
    })
    .array()
    .min(1),
});

/** Display-only projection for the Central Florida study area; never used for distance analysis. */
export async function loadStudyMap() {
  const data = collection.parse(
    JSON.parse(await readFile(join(process.cwd(), 'public/data/counties.geojson'), 'utf8')),
  );
  return data.features.map(({ properties, geometry }) => ({
    id: properties.id,
    path: (geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat())
      .map(
        (ring) =>
          ring
            .map(
              ([longitude, latitude], index) =>
                `${index === 0 ? 'M' : 'L'}${((longitude + 82.05) * 560).toFixed(2)},${((29.36 - latitude) * 560).toFixed(2)}`,
            )
            .join(' ') + 'Z',
      )
      .join(' '),
  }));
}
