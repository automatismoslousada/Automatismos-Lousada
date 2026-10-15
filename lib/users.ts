import { desc, eq, sql } from 'drizzle-orm'
import { db } from './neon'
import { users as usersTable } from './schema'
import { User, UserRole } from './types'
import { hashPassword, verifyPassword } from './password'

// Dias de inatividade (sem encomenda/orçamento) a partir dos quais uma conta Cliente perde o
// acesso automaticamente — ver revokeInactiveClients.
const CLIENT_INACTIVITY_DAYS = 30

function toUser(row: typeof usersTable.$inferSelect): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as UserRole,
    company: row.company,
    ordersAccess: row.ordersAccess,
    avatarUrl: row.avatarUrl ?? undefined,
    commercialId: row.commercialId ?? undefined,
    mustChangePassword: row.mustChangePassword,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function getAllUsers(): Promise<User[]> {
  const rows = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt))
  return rows.map(toUser)
}

export async function getUserById(id: string): Promise<User | null> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
  return rows[0] ? toUser(rows[0]) : null
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: UserRole
  company?: string
  ordersAccess?: boolean
  avatarUrl?: string
  commercialId?: string
}): Promise<User> {
  const [row] = await db
    .insert(usersTable)
    .values({
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash: hashPassword(data.password),
      role: data.role,
      company: data.company || 'Automatismos Lousada',
      ordersAccess: data.ordersAccess ?? true,
      avatarUrl: data.avatarUrl || null,
      commercialId: data.role === 'operador' ? data.commercialId || null : null,
      // Toda a conta nova é obrigada a trocar a password da primeira vez que entrar.
      mustChangePassword: true,
    })
    .returning()

  return toUser(row)
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string
    role: UserRole
    company: string
    password: string
    ordersAccess: boolean
    commercialId: string | null
    avatarUrl: string | null
  }>
): Promise<User | null> {
  const updates: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() }
  if (data.name !== undefined) updates.name = data.name
  if (data.role !== undefined) updates.role = data.role
  if (data.company !== undefined) updates.company = data.company
  if (data.ordersAccess !== undefined) updates.ordersAccess = data.ordersAccess
  // O admin a definir uma password nova para outra conta também força a trocar no próximo login,
  // já que essa password fica a ser conhecida por mais alguém além do dono da conta.
  if (data.password) {
    updates.passwordHash = hashPassword(data.password)
    updates.mustChangePassword = true
  }
  if (data.commercialId !== undefined) updates.commercialId = data.commercialId
  if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl

  const [row] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning()
  return row ? toUser(row) : null
}

export async function hasOrdersAccess(id: string): Promise<boolean> {
  const rows = await db
    .select({ role: usersTable.role, ordersAccess: usersTable.ordersAccess })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1)
  const row = rows[0]
  if (!row) return false
  return row.role === 'admin' || row.ordersAccess
}

// Troca de password pelo próprio utilizador — exige a password atual (diferente do PATCH do
// admin, que pode redefinir sem a saber) e limpa sempre a obrigatoriedade de troca.
export async function changeOwnPassword(
  id: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true; user: User } | { ok: false; reason: 'not_found' | 'invalid_current' }> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
  const row = rows[0]
  if (!row) return { ok: false, reason: 'not_found' }
  if (!verifyPassword(currentPassword, row.passwordHash)) return { ok: false, reason: 'invalid_current' }

  const [updated] = await db
    .update(usersTable)
    .set({ passwordHash: hashPassword(newPassword), mustChangePassword: false, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning()
  return { ok: true, user: toUser(updated) }
}

export async function deleteUser(id: string): Promise<boolean> {
  const deleted = await db.delete(usersTable).where(eq(usersTable.id, id)).returning({ id: usersTable.id })
  return deleted.length > 0
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ ok: true; user: User } | { ok: false; reason: 'invalid' | 'disabled' }> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1)

  const row = rows[0]
  if (!row) return { ok: false, reason: 'invalid' }
  if (!verifyPassword(password, row.passwordHash)) return { ok: false, reason: 'invalid' }
  if (row.role !== 'admin' && !row.ordersAccess) return { ok: false, reason: 'disabled' }

  return { ok: true, user: toUser(row) }
}

// Desativa automaticamente o acesso de contas Cliente (role "operador") sem nenhuma
// encomenda/orçamento nos últimos CLIENT_INACTIVITY_DAYS dias — a data de referência é a última
// encomenda/orçamento criado por essa conta ou, se nunca criou nenhum, a data de criação da
// própria conta. Chamado pelo cron em app/api/cron/revoke-inactive-clients/route.ts; devolve as
// contas que foram desativadas nesta execução, para o endpoint poder reportar/registar.
export async function revokeInactiveClients(): Promise<Pick<User, 'id' | 'name' | 'email'>[]> {
  const rows = await db.execute<{ id: string; name: string; email: string }>(sql`
    update users
    set orders_access = false, updated_at = now()
    where role = 'operador'
      and orders_access = true
      and coalesce(
        (select max(o.created_at) from orders o where o.created_by_user_id = users.id),
        users.created_at
      ) < now() - interval '1 day' * ${CLIENT_INACTIVITY_DAYS}
    returning id, name, email
  `)
  return rows.rows
}
