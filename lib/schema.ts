import { boolean, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['admin', 'operador', 'comercial', 'fabrica'])
export const orderStatusEnum = pgEnum('order_status', [
  'Pendente',
  'Em análise',
  'Produção',
  'Concluído',
  'Cancelado',
])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('operador'),
  company: text('company').notNull().default('Automatismos Lousada'),
  ordersAccess: boolean('orders_access').notNull().default(true),
  // Obriga a trocar a password no primeiro login — true para contas novas, false para as já existentes.
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  avatarUrl: text('avatar_url'),
  // Só relevante para utilizadores com role "operador" (Cliente) — o comercial responsável por esse cliente.
  commercialId: uuid('commercial_id').references((): any => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const orders = pgTable(
  'orders',
  {
    id: text('id').primaryKey(),
    referenceNumber: text('reference_number').notNull(),
    kind: text('kind').notNull().default('encomenda'), // 'encomenda' | 'orcamento'
    client: text('client').notNull(),
    clientEmail: text('client_email'),
    clientPhone: text('client_phone'),
    clientAddress: text('client_address'),
    clientTaxId: text('client_tax_id'),
    width: numeric('width', { mode: 'number' }).notNull(),
    height: numeric('height', { mode: 'number' }).notNull(),
    padding: numeric('padding', { mode: 'number' }).notNull(),
    leftShade: numeric('left_shade', { mode: 'number' }).notNull(),
    rightShade: numeric('right_shade', { mode: 'number' }).notNull(),
    widthMm: integer('width_mm').notNull(),
    heightMm: integer('height_mm').notNull(),
    paddingMm: integer('padding_mm').notNull(),
    leftShadeMm: integer('left_shade_mm').notNull(),
    rightShadeMm: integer('right_shade_mm').notNull(),
    area: numeric('area', { mode: 'number' }).notNull(),
    model: text('model').notNull(),
    colorCode: text('color_code').notNull(),
    colorName: text('color_name').notNull(),
    colorHex: text('color_hex').notNull(),
    tube: text('tube').notNull(),
    tubeUnits: integer('tube_units').notNull().default(2),
    tubeLength: text('tube_length'),
    tubeLeft: text('tube_left'),
    tubeLengthLeft: text('tube_length_left'),
    tubeWidthLeft: text('tube_width_left'),
    tubeRight: text('tube_right'),
    tubeLengthRight: text('tube_length_right'),
    tubeWidthRight: text('tube_width_right'),
    header: text('header').notNull(),
    headerUnits: integer('header_units').notNull().default(1),
    headerLength: text('header_length'),
    headerWidth: text('header_width'),
    automation: text('automation').notNull(),
    automationExtras: jsonb('automation_extras').notNull().default([]),
    rail: text('rail').notNull(),
    remotesQuantity: integer('remotes_quantity').notNull().default(2),
    serviceDoor: boolean('service_door').notNull().default(false),
    serviceDoorPosition: text('service_door_position').notNull().default('center'),
    serviceDoorType: text('service_door_type').notNull().default('none'),
    serviceDoorPanicBar: boolean('service_door_panic_bar').notNull().default(false),
    serviceDoorAirSpring: boolean('service_door_air_spring').notNull().default(false),
    windows: boolean('windows').notNull().default(false),
    windowsQuantity: integer('windows_quantity').notNull().default(0),
    windowsPanel: integer('windows_panel').notNull().default(1), // preservado por compatibilidade, usar windowsPanels
    windowsPanels: jsonb('windows_panels').notNull().default([1]),
    visorMaterial: text('visor_material'),
    rubberSeal: boolean('rubber_seal').notNull().default(false),
    extras: jsonb('extras').notNull().default([]),
    montagens: jsonb('montagens').notNull().default([]),
    // Campos exclusivos da fábrica — espelham sempre a porta 1 de "doors" (ver lib/db.ts), tal
    // como as restantes colunas "soltas" fazem para encomendas antigas sem doors[] preenchido.
    productionSpring: text('production_spring'),
    productionSpringTurns: numeric('production_spring_turns', { mode: 'number' }),
    productionTambor: text('production_tambor'),
    productionCutWidthMm: integer('production_cut_width_mm'),
    productionFabricada: boolean('production_fabricada').notNull().default(false),
    doors: jsonb('doors').notNull().default([]),
    estimatedPrice: numeric('estimated_price', { mode: 'number' }).notNull().default(0),
    // undefined/null = nenhuma linha do Resumo de Preços foi editada manualmente.
    priceOverrides: jsonb('price_overrides').$type<{ label: string; lineTotal: number }[]>(),
    // undefined/null = o subtotal continua a ser calculado a partir das linhas.
    priceTotalOverride: numeric('price_total_override', { mode: 'number' }),
    // undefined/null = usa a taxa legal por omissão (IVA_RATE, 23%).
    priceIvaRateOverride: numeric('price_iva_rate_override', { mode: 'number' }),
    status: orderStatusEnum('status').notNull().default('Em análise'),
    notes: text('notes'),
    createdBy: text('created_by'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('orders_status_idx').on(table.status),
    index('orders_created_at_idx').on(table.createdAt),
  ]
)

// Carteira de clientes — cada comercial (ou admin) gere a sua própria lista de clientes, usada
// para pré-preencher o Cliente/Obra ao registar uma encomenda/orçamento em vez de escrever à mão.
export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    address: text('address'),
    taxId: text('tax_id'),
    notes: text('notes'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('clients_owner_id_idx').on(table.ownerId)]
)

// Catálogo de opções do configurador (cores, tubos, portas de serviço, extras, visores,
// montagens, automatismos, calhas...) — gerido pelos administradores em vez de estar fixo no
// código, para ser possível adicionar/editar/remover itens e preços sem alterações de código.
export const catalogItems = pgTable(
  'catalog_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    category: text('category').notNull(),
    // Valor guardado nas encomendas (ex.: o código RAL, ou o nome exato do tubo/motor/extra).
    code: text('code').notNull(),
    name: text('name').notNull(),
    hex: text('hex'), // só para categorias de cor
    unit: text('unit').notNull().default('un'), // 'un' | 'm' | 'm2'
    price: numeric('price', { mode: 'number' }), // null = sob consulta
    // Só usado por 'header_panel': preço para padieira com altura superior a 25cm (price = até 25cm)
    priceAlt: numeric('price_alt', { mode: 'number' }),
    note: text('note'),
    sortOrder: integer('sort_order').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('catalog_items_category_idx').on(table.category)]
)

// Stock de "Outros Artigos" — catálogo simples (sem contagem de unidades) de produtos avulso
// fora do configurador de portões, gerido só pelo admin; os comerciais apenas consultam.
export const stockCategories = pgTable('stock_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  photoUrl: text('photo_url'),
  // Subcategoria quando preenchido (uma só camada de profundidade); null = categoria principal.
  parentId: uuid('parent_id').references((): any => stockCategories.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const stockProducts = pgTable(
  'stock_products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => stockCategories.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    price: numeric('price', { mode: 'number' }), // null = sob consulta
    // 'un' = vendido à unidade (quantidade inteira), 'm' = vendido ao metro (quantidade com casas
    // decimais, preço interpretado como €/m).
    unit: text('unit').notNull().default('un'),
    photoUrl: text('photo_url'),
    // Ficha técnica (PDF) do produto, para o cliente/comercial poder descarregar.
    fileUrl: text('file_url'),
    fileName: text('file_name'),
    sortOrder: integer('sort_order').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('stock_products_category_id_idx').on(table.categoryId)]
)

// Pedidos de "Outros Artigos" — comprados pelo Cliente (role operador) ou por um comercial em seu
// nome. Aparecem junto das encomendas de portas em "Gestão de Encomendas", distinguidos pelo tipo.
export const stockOrders = pgTable(
  'stock_orders',
  {
    id: text('id').primaryKey(),
    referenceNumber: text('reference_number').notNull(),
    client: text('client').notNull(),
    clientEmail: text('client_email'),
    clientPhone: text('client_phone'),
    clientAddress: text('client_address'),
    clientTaxId: text('client_tax_id'),
    notes: text('notes'),
    totalPrice: numeric('total_price', { mode: 'number' }).notNull().default(0),
    status: orderStatusEnum('status').notNull().default('Em análise'),
    createdBy: text('created_by'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('stock_orders_status_idx').on(table.status),
    index('stock_orders_created_at_idx').on(table.createdAt),
  ]
)

export const stockOrderItems = pgTable(
  'stock_order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stockOrderId: text('stock_order_id')
      .notNull()
      .references(() => stockOrders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => stockProducts.id, { onDelete: 'set null' }),
    // Nome, unidade e preço são uma cópia do produto no momento da compra — não mudam se o
    // produto for depois editado ou removido do catálogo.
    productName: text('product_name').notNull(),
    unit: text('unit'), // null em encomendas antigas, tratado como 'un'
    unitPrice: numeric('unit_price', { mode: 'number' }),
    quantity: numeric('quantity', { mode: 'number' }).notNull().default(1),
    // Só para artigos ao metro: comprimento de cada peça (2 tubos de 2m => quantity=2, meters=2).
    meters: numeric('meters', { mode: 'number' }),
    // Só para artigos ao m²: área de cada peça (3 placas de 1.5m² => quantity=3, squareMeters=1.5).
    squareMeters: numeric('square_meters', { mode: 'number' }),
    // Só para artigos ao m²: largura × altura de cada peça (mm), de onde sai square_meters.
    widthMm: integer('width_mm'),
    heightMm: integer('height_mm'),
    lineTotal: numeric('line_total', { mode: 'number' }),
  },
  (table) => [index('stock_order_items_stock_order_id_idx').on(table.stockOrderId)]
)
