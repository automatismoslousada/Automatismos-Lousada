-- Automatismos Lousada — esquema da base de dados (Neon Postgres)
-- Execute uma única vez contra a base de dados Neon, por exemplo com:
--   npm run db:migrate
-- ou colando este ficheiro no SQL Editor do Neon Console.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'operador', 'comercial', 'fabrica');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Idempotente: garante o valor também em bases de dados já migradas antes desta versão.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'fabrica';

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('Pendente', 'Em análise', 'Produção', 'Concluído', 'Cancelado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'operador',
  company TEXT NOT NULL DEFAULT 'Automatismos Lousada',
  orders_access BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  commercial_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotente: garante a coluna também em bases de dados já migradas antes desta versão.
ALTER TABLE users ADD COLUMN IF NOT EXISTS orders_access BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS commercial_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

CREATE SEQUENCE IF NOT EXISTS orders_seq START WITH 1;

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  reference_number TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'encomenda', -- 'encomenda' | 'orcamento'
  client TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_tax_id TEXT,
  width NUMERIC(6, 3) NOT NULL,
  height NUMERIC(6, 3) NOT NULL,
  padding NUMERIC(6, 3) NOT NULL DEFAULT 0,
  left_shade NUMERIC(6, 3) NOT NULL DEFAULT 0,
  right_shade NUMERIC(6, 3) NOT NULL DEFAULT 0,
  width_mm INTEGER NOT NULL,
  height_mm INTEGER NOT NULL,
  padding_mm INTEGER NOT NULL DEFAULT 0,
  left_shade_mm INTEGER NOT NULL DEFAULT 0,
  right_shade_mm INTEGER NOT NULL DEFAULT 0,
  area NUMERIC(8, 3) NOT NULL,
  model TEXT NOT NULL,
  color_code TEXT NOT NULL,
  color_name TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  tube TEXT NOT NULL,
  tube_units INTEGER NOT NULL DEFAULT 2,
  tube_length TEXT,
  tube_left TEXT,
  tube_length_left TEXT,
  tube_width_left TEXT,
  tube_right TEXT,
  tube_length_right TEXT,
  tube_width_right TEXT,
  header TEXT NOT NULL,
  header_units INTEGER NOT NULL DEFAULT 1,
  header_length TEXT,
  header_width TEXT,
  automation TEXT NOT NULL,
  automation_extras JSONB NOT NULL DEFAULT '[]',
  rail TEXT NOT NULL,
  remotes_quantity INTEGER NOT NULL DEFAULT 2,
  service_door BOOLEAN NOT NULL DEFAULT false,
  service_door_position TEXT NOT NULL DEFAULT 'center',
  service_door_type TEXT NOT NULL DEFAULT 'none',
  service_door_panic_bar BOOLEAN NOT NULL DEFAULT false,
  service_door_air_spring BOOLEAN NOT NULL DEFAULT false,
  windows BOOLEAN NOT NULL DEFAULT false,
  windows_quantity INTEGER NOT NULL DEFAULT 0,
  windows_panel INTEGER NOT NULL DEFAULT 1,
  visor_material TEXT,
  rubber_seal BOOLEAN NOT NULL DEFAULT false,
  extras JSONB NOT NULL DEFAULT '[]',
  montagens JSONB NOT NULL DEFAULT '[]',
  production_spring TEXT,
  production_spring_turns NUMERIC(4, 1),
  production_tambor TEXT,
  production_cut_width_mm INTEGER,
  production_fabricada BOOLEAN NOT NULL DEFAULT false,
  doors JSONB NOT NULL DEFAULT '[]',
  estimated_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_overrides JSONB,
  price_total_override NUMERIC(10, 2),
  price_iva_rate_override NUMERIC(5, 4),
  status order_status NOT NULL DEFAULT 'Em análise',
  notes TEXT,
  created_by TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotente: garante as colunas também em bases de dados já migradas antes desta versão.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_door_position TEXT NOT NULL DEFAULT 'center';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_door_type TEXT NOT NULL DEFAULT 'none';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS windows_panel INTEGER NOT NULL DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS windows_panels JSONB NOT NULL DEFAULT '[1]';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_tax_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tube_left TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tube_length_left TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tube_width_left TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tube_right TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tube_length_right TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tube_width_right TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS header_width TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_door_panic_bar BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_door_air_spring BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS doors JSONB NOT NULL DEFAULT '[]';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS automation_extras JSONB NOT NULL DEFAULT '[]';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS montagens JSONB NOT NULL DEFAULT '[]';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'encomenda';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS production_spring TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS production_tambor TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS production_spring_turns NUMERIC(4, 1);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS production_cut_width_mm INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS production_fabricada BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_overrides JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_total_override NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_iva_rate_override NUMERIC(5, 4);

CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);

-- Carteira de clientes — cada comercial (ou admin) gere a sua própria lista de clientes, usada
-- para pré-preencher o Cliente/Obra ao registar uma encomenda/orçamento em vez de escrever à mão.
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  notes TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_owner_id_idx ON clients (owner_id);

-- Stock de "Outros Artigos" — catálogo simples (sem contagem de unidades) de produtos avulso
-- fora do configurador de portões, gerido só pelo admin; os comerciais apenas consultam.
CREATE TABLE IF NOT EXISTS stock_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  photo_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stock_categories ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE stock_categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES stock_categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS stock_categories_parent_id_idx ON stock_categories (parent_id);

CREATE TABLE IF NOT EXISTS stock_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES stock_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  -- 'un' = vendido à unidade (quantidade inteira), 'm' = vendido ao metro (quantidade com
  -- casas decimais, preço interpretado como €/m) — ver app/page.tsx (Outros Artigos).
  unit TEXT NOT NULL DEFAULT 'un',
  photo_url TEXT,
  file_url TEXT,
  file_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE stock_products ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'un';

CREATE INDEX IF NOT EXISTS stock_products_category_id_idx ON stock_products (category_id);

-- Pedidos de "Outros Artigos" — comprados pelo Cliente (role operador) ou por um comercial em seu
-- nome. Aparecem junto das encomendas de portas em "Gestão de Encomendas", distinguidos pelo tipo.
CREATE TABLE IF NOT EXISTS stock_orders (
  id TEXT PRIMARY KEY,
  reference_number TEXT NOT NULL,
  client TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_tax_id TEXT,
  notes TEXT,
  total_price NUMERIC NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'Em análise',
  created_by TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_orders_status_idx ON stock_orders (status);
CREATE INDEX IF NOT EXISTS stock_orders_created_at_idx ON stock_orders (created_at DESC);

CREATE TABLE IF NOT EXISTS stock_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_order_id TEXT NOT NULL REFERENCES stock_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES stock_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  -- Cópia do unit do produto no momento da compra (ver stock_products.unit) — não muda se o
  -- produto for depois editado; null em encomendas antigas, tratado como 'un'.
  unit TEXT,
  unit_price NUMERIC,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  -- Só para artigos vendidos ao metro: comprimento de cada peça (ex: 2 tubos de 2m => quantity=2,
  -- meters=2). null em encomendas antigas e em artigos 'un' — quantity sozinho já é o total.
  meters NUMERIC(10, 2),
  -- Só para artigos vendidos ao m²: área de cada peça (ex: 3 placas de 1.5m² => quantity=3,
  -- square_meters=1.5). null em artigos 'un'/'m'.
  square_meters NUMERIC(10, 2),
  line_total NUMERIC
);

ALTER TABLE stock_order_items ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE stock_order_items ALTER COLUMN quantity TYPE NUMERIC(10, 2);
ALTER TABLE stock_order_items ALTER COLUMN quantity SET DEFAULT 1;
ALTER TABLE stock_order_items ADD COLUMN IF NOT EXISTS meters NUMERIC(10, 2);
ALTER TABLE stock_order_items ADD COLUMN IF NOT EXISTS square_meters NUMERIC(10, 2);

CREATE INDEX IF NOT EXISTS stock_order_items_stock_order_id_idx ON stock_order_items (stock_order_id);

-- Garante que a sequência de IDs de encomendas nunca colide com dados já existentes.
-- Usa o maior número de referência já atribuído, não o COUNT(*): encomendas apagadas fariam o
-- COUNT ficar abaixo de referências que já foram usadas, gerando colisões de chave primária na
-- próxima vez que este script fosse reaplicado (ex.: via npm run db:migrate). Tem de reconhecer
-- os 3 prefixos que createOrder() já gerou ao longo do tempo (AL-, e depois ENC-/ORC- quando
-- passou a distinguir encomendas de orçamentos) — só considerar "AL-" fazia este SELECT voltar a
-- atribuir números já usados por referências ENC-/ORC- mais recentes, a cada reaplicação do script.
-- O piso de 20328 foi um pedido explícito do cliente para a numeração de referências arrancar
-- a partir desse valor; mantém-se como piso permanente para não ser pisado por reaplicações
-- futuras deste script enquanto as referências antigas (mais baixas) ainda existirem na tabela.
SELECT setval(
  'orders_seq',
  GREATEST(20328, COALESCE((SELECT MAX((regexp_match(id, '(?:AL|ENC|ORC)-\d{4}-(\d+)'))[1]::int) FROM orders), 0) + 1),
  false
);

-- Catálogo de opções do configurador (cores, tubos, portas de serviço, extras, visores,
-- montagens, automatismos e calhas) — editável pelos administradores no painel "Catálogo",
-- em vez de estar fixo no código. "code" é o valor guardado nas encomendas; "price" nulo
-- significa "sob consulta" (sem preço de catálogo definido, não entra no total do orçamento).
CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  hex TEXT,
  unit TEXT NOT NULL DEFAULT 'un',
  price NUMERIC(10, 2),
  price_alt NUMERIC(10, 2),
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category, code)
);

CREATE INDEX IF NOT EXISTS catalog_items_category_idx ON catalog_items (category);

-- Catálogo inicial — réplica exata dos valores que estavam fixos no código antes deste painel,
-- para a migração não alterar preços nem opções já em uso. ON CONFLICT DO NOTHING torna o bloco
-- idempotente: reaplicar este script nunca repõe um item que um admin já tenha editado/apagado.
INSERT INTO catalog_items (category, code, name, hex, unit, price, price_alt, note, sort_order) VALUES
  ('ribbed_color', 'RAL 9010', 'Branco puro', '#f1f0ea', 'm2', 60, NULL, NULL, 0),
  ('ribbed_color', 'RAL 1015', 'Marfim claro', '#eadebd', 'm2', 60, NULL, NULL, 1),
  ('ribbed_color', 'RAL 9006', 'Alumínio branco', '#a5a8a6', 'm2', 60, NULL, NULL, 2),
  ('ribbed_color', 'RAL 7016', 'Cinzento antracite', '#383e42', 'm2', 60, NULL, NULL, 3),
  ('ribbed_color', 'RAL 8014', 'Castanho sépia', '#49392d', 'm2', 60, NULL, NULL, 4),
  ('ribbed_color', 'RAL 6005', 'Verde musgo', '#114232', 'm2', 60, NULL, NULL, 5),
  ('ribbed_color', 'RAL 9007', 'Alumínio cinzento', '#8f8f8c', 'm2', 65, NULL, NULL, 6),
  ('ribbed_color', 'RAL 7012', 'Cinzento basalto', '#575d5e', 'm2', 65, NULL, NULL, 7),
  ('ribbed_color', 'RAL 7011', 'Cinzento ferro', '#51585c', 'm2', 65, NULL, NULL, 8),
  ('ribbed_color', 'RAL 7022', 'Cinzento sombra', '#4b4d46', 'm2', 65, NULL, NULL, 9),
  ('ribbed_color', 'RAL 7021', 'Cinzento preto', '#2f3234', 'm2', 65, NULL, NULL, 10),
  ('ribbed_color', 'RAL 3000', 'Vermelho fogo', '#a52019', 'm2', 65, NULL, NULL, 11),
  ('ribbed_color', 'IMITAÇÃO MADEIRA ESCURA', 'Imitação madeira escura', '#4a2e20', 'm2', 70, NULL, NULL, 12),
  ('ribbed_color', 'IMITAÇÃO MADEIRA CLARA', 'Imitação madeira clara', '#b78857', 'm2', 70, NULL, NULL, 13),

  ('smooth_color', 'RAL 7016', 'Cinzento antracite', '#383e42', 'm2', 75, NULL, NULL, 0),
  ('smooth_color', 'RAL 9010', 'Branco puro', '#f1f0ea', 'm2', 75, NULL, NULL, 1),
  ('smooth_color', 'Texturado RAL 7016', 'Texturado RAL 7016', '#383e42', 'm2', 75, NULL, NULL, 2),
  ('smooth_color', 'Texturado RAL 9005', 'Texturado RAL 9005', '#0a0a0a', 'm2', 75, NULL, NULL, 3),

  ('tube', 'Fixo em painel com remates de alumínio', 'Fixo em painel com remates de alumínio', NULL, 'm', 45, NULL, NULL, 0),
  ('tube', 'Tubo 50×30 de ferro lacado', 'Tubo 50×30 de ferro lacado', NULL, 'm', 15.6, NULL, NULL, 1),
  ('tube', 'Tubo 75×40 de alumínio lacado', 'Tubo 75×40 de alumínio lacado', NULL, 'm', 17.5, NULL, NULL, 2),
  ('tube', 'Tubo 80×40 de ferro lacado', 'Tubo 80×40 de ferro lacado', NULL, 'm', 19, NULL, NULL, 3),
  ('tube', 'Tubo 100×40 de ferro lacado', 'Tubo 100×40 de ferro lacado', NULL, 'm', 26, NULL, NULL, 4),
  ('tube', 'Tubo 80×40 de ferro galvanizado', 'Tubo 80×40 de ferro galvanizado', NULL, 'm', 10, NULL, NULL, 5),
  ('tube', 'Tubo 100×40 de ferro galvanizado', 'Tubo 100×40 de ferro galvanizado', NULL, 'm', 14, NULL, NULL, 6),
  ('tube', 'Tubo 50×30 de ferro galvanizado', 'Tubo 50×30 de ferro galvanizado', NULL, 'm', 6.6, NULL, NULL, 7),

  ('header_panel', 'Padieira falsa em painel com remates de alumínio canelado', 'Padieira falsa em painel com remates de alumínio canelado', NULL, 'm', 25, 35, 'preço até 25cm de altura / preço acima de 25cm', 0),
  ('header_panel', 'Padieira falsa em painel com remates de alumínio total liso', 'Padieira falsa em painel com remates de alumínio total liso', NULL, 'm', 30, 40, 'preço até 25cm de altura / preço acima de 25cm', 1),
  ('header_panel', 'Padieira falsa em malha de rede 50×50 e cantoneira', 'Padieira falsa em malha de rede 50×50 e cantoneira', NULL, 'm', NULL, NULL, NULL, 2),
  ('header_panel', 'Padieira falsa em lâmina Z', 'Padieira falsa em lâmina Z', NULL, 'm', NULL, NULL, NULL, 3),
  ('header_panel', 'Padieira falsa em rede microperfurada', 'Padieira falsa em rede microperfurada', NULL, 'm', NULL, NULL, NULL, 4),

  ('service_door', 'normal', 'Porta de serviço normal', NULL, 'un', 400, NULL, NULL, 0),
  ('service_door', 'normal-soleira', 'Porta de serviço normal com soleira rebaixada', NULL, 'un', 520, NULL, NULL, 1),
  ('service_door', 'idealdoor', 'Porta de serviço IDEALDOOR', NULL, 'un', 700, NULL, NULL, 2),

  ('extra', 'Ferragem elevada', 'Ferragem elevada', NULL, 'un', 60, NULL, NULL, 0),
  ('extra', 'Ferragem inclinada', 'Ferragem inclinada', NULL, 'un', 30, NULL, NULL, 1),
  ('extra', 'Omega', 'Omega', NULL, 'm', 5, NULL, NULL, 2),
  ('extra', 'Omega lacada', 'Omega lacada', NULL, 'm', 11, NULL, NULL, 3),
  ('extra', 'Grelhas de ventilação', 'Grelhas de ventilação', NULL, 'un', 25, NULL, NULL, 4),
  ('extra', 'Desbloqueador externo', 'Desbloqueador externo', NULL, 'un', 20, NULL, NULL, 5),
  ('extra', 'Sistema de click para molas', 'Sistema de click para molas', NULL, 'un', 30, NULL, NULL, 6),
  ('extra', 'Fechadura', 'Fechadura', NULL, 'un', 30, NULL, NULL, 7),

  ('visor', 'vidro', 'Vidro', NULL, 'un', 55, NULL, NULL, 0),
  ('visor', 'acrilico', 'Acrílico', NULL, 'un', 35, NULL, NULL, 1),

  ('montagem', 'Montagem de porta seccionada residencial', 'Montagem de porta seccionada residencial', NULL, 'un', 175, NULL, 'até 30 km de distância', 0),
  ('montagem', 'Montagem de porta seccionada industrial', 'Montagem de porta seccionada industrial', NULL, 'un', 450, NULL, 'até 30 km de distância', 1),
  ('montagem', 'Montagem de motor de teto juntamente com porta seccionada', 'Montagem de motor de teto juntamente com porta seccionada', NULL, 'un', 100, NULL, NULL, 2),
  ('montagem', 'Montagem de motor ataque ao veio juntamente com porta seccionada', 'Montagem de motor ataque ao veio juntamente com porta seccionada', NULL, 'un', 150, NULL, NULL, 3),

  ('automation', 'Motor de teto MOTORLINE ROSSO EVO 60', 'Motor de teto MOTORLINE ROSSO EVO 60', NULL, 'un', 380, NULL, NULL, 0),
  ('automation', 'Motor de teto MOTORLINE ROSSO EVO 100', 'Motor de teto MOTORLINE ROSSO EVO 100', NULL, 'un', 380, NULL, NULL, 1),
  ('automation', 'Motor de teto MOTORLINE ROSSO EVO 120', 'Motor de teto MOTORLINE ROSSO EVO 120', NULL, 'un', 380, NULL, NULL, 2),
  ('automation', 'Motor de teto MATIKGATE PULL 600', 'Motor de teto MATIKGATE PULL 600', NULL, 'un', 380, NULL, NULL, 3),
  ('automation', 'Motor de teto MATIKGATE PULL 800', 'Motor de teto MATIKGATE PULL 800', NULL, 'un', 380, NULL, NULL, 4),
  ('automation', 'Motor de teto MATIKGATE PULL 1000', 'Motor de teto MATIKGATE PULL 1000', NULL, 'un', 380, NULL, NULL, 5),
  ('automation', 'Motor de teto MATIKGATE PULL 1200', 'Motor de teto MATIKGATE PULL 1200', NULL, 'un', 380, NULL, NULL, 6),
  ('automation', 'Motor de teto MATIKGATE LIFT 60', 'Motor de teto MATIKGATE LIFT 60', NULL, 'un', 380, NULL, NULL, 7),
  ('automation', 'Motor de teto MATIKGATE LIFT 100', 'Motor de teto MATIKGATE LIFT 100', NULL, 'un', 380, NULL, NULL, 8),
  ('automation', 'Motor de teto MATIKGATE LIFT 120', 'Motor de teto MATIKGATE LIFT 120', NULL, 'un', 380, NULL, NULL, 9),
  ('automation', 'Motor de teto MATIKGATE LIFT 180', 'Motor de teto MATIKGATE LIFT 180', NULL, 'un', 380, NULL, NULL, 10),
  ('automation', 'Motor ataque ao veio MATIKGATE Loki', 'Motor ataque ao veio MATIKGATE Loki', NULL, 'un', 650, NULL, NULL, 11),
  ('automation', 'Motor ataque ao veio MATIKGATE Falcon 35', 'Motor ataque ao veio MATIKGATE Falcon 35', NULL, 'un', 650, NULL, NULL, 12),
  ('automation', 'Motor ataque ao veio MATIKGATE SPIDER 40', 'Motor ataque ao veio MATIKGATE SPIDER 40', NULL, 'un', 650, NULL, NULL, 13),
  ('automation', 'Motor ataque ao veio MATIKGATE SPIDER 60', 'Motor ataque ao veio MATIKGATE SPIDER 60', NULL, 'un', 650, NULL, NULL, 14),
  ('automation', 'Motor ataque ao veio MATIKGATE SPIDER 90', 'Motor ataque ao veio MATIKGATE SPIDER 90', NULL, 'un', 650, NULL, NULL, 15),
  ('automation', 'Motor ataque ao veio MATIKGATE SPIDER 120', 'Motor ataque ao veio MATIKGATE SPIDER 120', NULL, 'un', 650, NULL, NULL, 16),

  ('rail', 'Calha de motor de teto MOTORLINE ROSSO EVO com 3200', 'Calha de motor de teto MOTORLINE ROSSO EVO com 3200', NULL, 'un', 95, NULL, NULL, 0),
  ('rail', 'Calha de motor de teto MOTORLINE ROSSO EVO com 3600', 'Calha de motor de teto MOTORLINE ROSSO EVO com 3600', NULL, 'un', 95, NULL, NULL, 1),
  ('rail', 'Calha de motor de teto MOTORLINE ROSSO EVO com 4000', 'Calha de motor de teto MOTORLINE ROSSO EVO com 4000', NULL, 'un', 95, NULL, NULL, 2),
  ('rail', 'Calha de motor de teto MATIKGATE LIFT com 3300mm', 'Calha de motor de teto MATIKGATE LIFT com 3300mm', NULL, 'un', 95, NULL, NULL, 3),
  ('rail', 'Calha de motor de teto MATIKGATE LIFT com 3600mm', 'Calha de motor de teto MATIKGATE LIFT com 3600mm', NULL, 'un', 95, NULL, NULL, 4),
  ('rail', 'Calha de motor de teto MATIKGATE LIFT com 3900mm', 'Calha de motor de teto MATIKGATE LIFT com 3900mm', NULL, 'un', 95, NULL, NULL, 5),
  ('rail', 'Calha de motor de teto MATIKGATE PULL com 3300mm', 'Calha de motor de teto MATIKGATE PULL com 3300mm', NULL, 'un', 95, NULL, NULL, 6),
  ('rail', 'Calha de motor de teto MATIKGATE PULL com 3600mm', 'Calha de motor de teto MATIKGATE PULL com 3600mm', NULL, 'un', 95, NULL, NULL, 7),
  ('rail', 'Calha de motor de teto MATIKGATE PULL com 3900mm', 'Calha de motor de teto MATIKGATE PULL com 3900mm', NULL, 'un', 95, NULL, NULL, 8),

  ('misc', 'rubber_seal', 'Vedante Perimetral EPDM', NULL, 'un', 45, NULL, NULL, 0),
  ('misc', 'extra_remote', 'Comando / Emissor adicional', NULL, 'un', 25, NULL, NULL, 1),
  ('misc', 'panic_bar', 'Barra antipânico', NULL, 'un', 90, NULL, NULL, 2),
  ('misc', 'air_spring', 'Mola aérea', NULL, 'un', 35, NULL, NULL, 3),

  ('automation_extra', 'Bateria de emergência', 'Bateria de emergência', NULL, 'un', 45, NULL, NULL, 0),
  ('automation_extra', 'Fotocélulas de segurança', 'Fotocélulas de segurança', NULL, 'un', 35, NULL, NULL, 1),
  ('automation_extra', 'Pisca luminoso', 'Pisca luminoso', NULL, 'un', 25, NULL, NULL, 2),
  ('automation_extra', 'Teclado de código sem fios', 'Teclado de código sem fios', NULL, 'un', 40, NULL, NULL, 3),
  ('automation_extra', 'Leitor biométrico', 'Leitor biométrico', NULL, 'un', 90, NULL, NULL, 4)
ON CONFLICT (category, code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Perfil de administrador inicial
--   Email:        ricardo@automatismoslousada.pt
--   Palavra-passe: admin2026
-- IMPORTANTE: altere esta palavra-passe assim que possível a partir do painel
-- "Utilizadores" (apenas visível para administradores) depois do primeiro login.
-- ---------------------------------------------------------------------------
INSERT INTO users (name, email, password_hash, role, company)
VALUES (
  'Ricardo Costa',
  'ricardo@automatismoslousada.pt',
  'a3de8b1e65ea74505b13964b48c4bfc1:aae4a52f54bec2625965c2602f3591e0a62bc69cfdb098fa9911f8bb643d27e2020fedf6850bc6cf6bf63926759f4732af8814c52a9328d325c1757f4e777f3c',
  'admin',
  'Automatismos Lousada'
)
ON CONFLICT (email) DO NOTHING;
