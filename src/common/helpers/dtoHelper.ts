import { instanceToPlain } from 'class-transformer';
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';
/**
 * Extracts the fields from a DTO class that are decorated with @Expose.
 * This is useful for creating Mongoose select strings to limit the fields returned from queries.
 * @param dto The DTO class to extract fields from.
 * @returns An array of field names that are exposed in the DTO.
 */
export function getDtoSelect<T>(dto: new () => T): string[] {
  const meta = defaultMetadataStorage.getExposedMetadatas(dto);
  return meta.map((m: { propertyName: any; }) => m.propertyName);
}

