import { nowLocalIso } from "@/lib/time";
import { getDB } from "@/lib/db/idb";
import type {
  ChecklistTemplate,
  PlantType,
  StoredTemplate,
} from "@/lib/db";

/**
 * Get the checklist template for a plant type.
 *
 * @param plantType the plant type
 */
export async function getTemplate(
  plantType: PlantType,
): Promise<StoredTemplate | undefined> {
  const db = await getDB();
  return db.get("templates", plantType);
}

/**
 * Save a checklist template.
 *
 * @param template the template to store
 */
export async function putTemplate(
  template: ChecklistTemplate,
): Promise<StoredTemplate> {
  const stored: StoredTemplate = { ...template, cachedAt: nowLocalIso() };
  const db = await getDB();
  await db.put("templates", stored);
  return stored;
}
