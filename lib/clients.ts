import { alias } from 'drizzle-orm/pg-core'
import { desc, eq } from 'drizzle-orm'
import { db } from './neon'
import { clients as clientsTable, users as usersTable } from './schema'
import { Client } from './types'

const ownerUsers = alias(usersTable, 'client_owner_user')

function toClient(row: typeof clientsTable.$inferSelect, ownerName?: string | null): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    taxId: row.taxId ?? undefined,
    notes: row.notes ?? undefined,
    ownerId: row.ownerId,
    ownerName: ownerName ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function getClientsByOwner(ownerId: string): Promise<Client[]> {
  const rows = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.ownerId, ownerId))
    .orderBy(desc(clientsTable.createdAt))
  return rows.map((row) => toClient(row))
}

// Para o admin: todas as carteiras de todos os comerciais, com o nome de quem é dono de cada cliente.
export async function getAllClientsWithOwner(): Promise<Client[]> {
  const rows = await db
    .select({ client: clientsTable, ownerName: ownerUsers.name })
    .from(clientsTable)
    .leftJoin(ownerUsers, eq(clientsTable.ownerId, ownerUsers.id))
    .orderBy(desc(clientsTable.createdAt))
  return rows.map((row) => toClient(row.client, row.ownerName))
}

export async function getClientById(id: string): Promise<Client | null> {
  const rows = await db.select().from(clientsTable).where(eq(clientsTable.id, id)).limit(1)
  return rows[0] ? toClient(rows[0]) : null
}

export async function createClient(data: {
  name: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  notes?: string
  ownerId: string
}): Promise<Client> {
  const [row] = await db
    .insert(clientsTable)
    .values({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      taxId: data.taxId || null,
      notes: data.notes || null,
      ownerId: data.ownerId,
    })
    .returning()
  return toClient(row)
}

export async function updateClient(
  id: string,
  data: Partial<{ name: string; email: string; phone: string; address: string; taxId: string; notes: string }>
): Promise<Client | null> {
  const updates: Partial<typeof clientsTable.$inferInsert> = { updatedAt: new Date() }
  if (data.name !== undefined) updates.name = data.name
  if (data.email !== undefined) updates.email = data.email || null
  if (data.phone !== undefined) updates.phone = data.phone || null
  if (data.address !== undefined) updates.address = data.address || null
  if (data.taxId !== undefined) updates.taxId = data.taxId || null
  if (data.notes !== undefined) updates.notes = data.notes || null

  const [row] = await db.update(clientsTable).set(updates).where(eq(clientsTable.id, id)).returning()
  return row ? toClient(row) : null
}

export async function deleteClient(id: string): Promise<boolean> {
  const deleted = await db.delete(clientsTable).where(eq(clientsTable.id, id)).returning({ id: clientsTable.id })
  return deleted.length > 0
}
