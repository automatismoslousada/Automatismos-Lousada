import { asc, eq } from 'drizzle-orm'
import { db } from './neon'
import { stockCategories, stockProducts } from './schema'
import { StockCategory, StockProduct, StockProductUnit } from './types'

function toCategory(row: typeof stockCategories.$inferSelect): StockCategory {
  return {
    id: row.id,
    name: row.name,
    photoUrl: row.photoUrl ?? undefined,
    parentId: row.parentId ?? undefined,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
  }
}

function toProduct(row: typeof stockProducts.$inferSelect, categoryName?: string | null): StockProduct {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: categoryName ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    price: row.price != null ? Number(row.price) : undefined,
    unit: (row.unit as StockProductUnit) || 'un',
    photoUrl: row.photoUrl ?? undefined,
    fileUrl: row.fileUrl ?? undefined,
    fileName: row.fileName ?? undefined,
    sortOrder: row.sortOrder,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function getAllStockCategories(): Promise<StockCategory[]> {
  const rows = await db.select().from(stockCategories).orderBy(asc(stockCategories.sortOrder), asc(stockCategories.name))
  return rows.map(toCategory)
}

export async function createStockCategory(data: {
  name: string
  photoUrl?: string
  parentId?: string | null
  sortOrder?: number
}): Promise<StockCategory> {
  const [row] = await db
    .insert(stockCategories)
    .values({
      name: data.name,
      photoUrl: data.photoUrl || null,
      parentId: data.parentId || null,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning()
  return toCategory(row)
}

export async function updateStockCategory(
  id: string,
  data: Partial<{ name: string; photoUrl: string; parentId: string | null; sortOrder: number }>
): Promise<StockCategory | null> {
  const updates: Partial<typeof stockCategories.$inferInsert> = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.photoUrl !== undefined) updates.photoUrl = data.photoUrl || null
  if (data.parentId !== undefined) updates.parentId = data.parentId || null
  if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder
  const [row] = await db.update(stockCategories).set(updates).where(eq(stockCategories.id, id)).returning()
  return row ? toCategory(row) : null
}

export async function deleteStockCategory(id: string): Promise<boolean> {
  const deleted = await db.delete(stockCategories).where(eq(stockCategories.id, id)).returning({ id: stockCategories.id })
  return deleted.length > 0
}

// Devolve todos os produtos (ativos e inativos) já com o nome da categoria — usado tanto na
// consulta dos comerciais (só vêem os ativos, filtrado no handler da API) como na gestão do admin.
export async function getAllStockProducts(): Promise<StockProduct[]> {
  const rows = await db
    .select({ product: stockProducts, categoryName: stockCategories.name })
    .from(stockProducts)
    .leftJoin(stockCategories, eq(stockProducts.categoryId, stockCategories.id))
    .orderBy(asc(stockProducts.sortOrder), asc(stockProducts.name))
  return rows.map((row) => toProduct(row.product, row.categoryName))
}

export async function createStockProduct(data: {
  categoryId: string
  name: string
  description?: string
  price?: number | null
  unit?: StockProductUnit
  photoUrl?: string
  fileUrl?: string
  fileName?: string
  sortOrder?: number
  active?: boolean
}): Promise<StockProduct> {
  const [row] = await db
    .insert(stockProducts)
    .values({
      categoryId: data.categoryId,
      name: data.name,
      description: data.description || null,
      price: data.price ?? null,
      unit: data.unit || 'un',
      photoUrl: data.photoUrl || null,
      fileUrl: data.fileUrl || null,
      fileName: data.fileName || null,
      sortOrder: data.sortOrder ?? 0,
      active: data.active ?? true,
    })
    .returning()
  return toProduct(row)
}

export async function updateStockProduct(
  id: string,
  data: Partial<{
    categoryId: string
    name: string
    description: string
    price: number | null
    unit: StockProductUnit
    photoUrl: string
    fileUrl: string
    fileName: string
    sortOrder: number
    active: boolean
  }>
): Promise<StockProduct | null> {
  const updates: Partial<typeof stockProducts.$inferInsert> = { updatedAt: new Date() }
  if (data.categoryId !== undefined) updates.categoryId = data.categoryId
  if (data.name !== undefined) updates.name = data.name
  if (data.description !== undefined) updates.description = data.description || null
  if (data.price !== undefined) updates.price = data.price
  if (data.unit !== undefined) updates.unit = data.unit
  if (data.photoUrl !== undefined) updates.photoUrl = data.photoUrl || null
  if (data.fileUrl !== undefined) updates.fileUrl = data.fileUrl || null
  if (data.fileName !== undefined) updates.fileName = data.fileName || null
  if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder
  if (data.active !== undefined) updates.active = data.active

  const [row] = await db.update(stockProducts).set(updates).where(eq(stockProducts.id, id)).returning()
  return row ? toProduct(row) : null
}

export async function deleteStockProduct(id: string): Promise<boolean> {
  const deleted = await db.delete(stockProducts).where(eq(stockProducts.id, id)).returning({ id: stockProducts.id })
  return deleted.length > 0
}
