import { asc, eq } from 'drizzle-orm'
import { db } from './neon'
import { catalogItems as catalogTable } from './schema'
import { CatalogCategory, CatalogItem } from './types'

function toCatalogItem(row: typeof catalogTable.$inferSelect): CatalogItem {
  return {
    id: row.id,
    category: row.category as CatalogCategory,
    code: row.code,
    name: row.name,
    hex: row.hex ?? undefined,
    unit: (row.unit as CatalogItem['unit']) ?? 'un',
    price: row.price ?? undefined,
    priceAlt: row.priceAlt ?? undefined,
    note: row.note ?? undefined,
    sortOrder: row.sortOrder,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function getAllCatalogItems(filter?: { category?: string; activeOnly?: boolean }): Promise<CatalogItem[]> {
  const rows = await db
    .select()
    .from(catalogTable)
    .orderBy(asc(catalogTable.category), asc(catalogTable.sortOrder), asc(catalogTable.name))

  return rows
    .filter((row) => !filter?.category || row.category === filter.category)
    .filter((row) => !filter?.activeOnly || row.active)
    .map(toCatalogItem)
}

export async function createCatalogItem(data: {
  category: CatalogCategory
  code: string
  name: string
  hex?: string
  unit: CatalogItem['unit']
  price?: number | null
  priceAlt?: number | null
  note?: string
  sortOrder?: number
  active?: boolean
}): Promise<CatalogItem> {
  const [row] = await db
    .insert(catalogTable)
    .values({
      category: data.category,
      code: data.code.trim(),
      name: data.name.trim(),
      hex: data.hex || null,
      unit: data.unit,
      price: data.price ?? null,
      priceAlt: data.priceAlt ?? null,
      note: data.note || null,
      sortOrder: data.sortOrder ?? 0,
      active: data.active ?? true,
    })
    .returning()

  return toCatalogItem(row)
}

export async function updateCatalogItem(
  id: string,
  data: Partial<{
    code: string
    name: string
    hex: string | null
    unit: CatalogItem['unit']
    price: number | null
    priceAlt: number | null
    note: string | null
    sortOrder: number
    active: boolean
  }>
): Promise<CatalogItem | null> {
  const updates: Partial<typeof catalogTable.$inferInsert> = { updatedAt: new Date() }
  if (data.code !== undefined) updates.code = data.code.trim()
  if (data.name !== undefined) updates.name = data.name.trim()
  if (data.hex !== undefined) updates.hex = data.hex
  if (data.unit !== undefined) updates.unit = data.unit
  if (data.price !== undefined) updates.price = data.price
  if (data.priceAlt !== undefined) updates.priceAlt = data.priceAlt
  if (data.note !== undefined) updates.note = data.note
  if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder
  if (data.active !== undefined) updates.active = data.active

  const [row] = await db.update(catalogTable).set(updates).where(eq(catalogTable.id, id)).returning()
  return row ? toCatalogItem(row) : null
}

export async function deleteCatalogItem(id: string): Promise<boolean> {
  const deleted = await db.delete(catalogTable).where(eq(catalogTable.id, id)).returning({ id: catalogTable.id })
  return deleted.length > 0
}
