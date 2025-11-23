import { sql } from '@vercel/postgres';

// Database connection utility
export { sql };

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create api_keys table
    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        key_hash VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP
      )
    `;

    // Create custom_routes table
    await sql`
      CREATE TABLE IF NOT EXISTS custom_routes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        route_name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        system_prompt TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create contexts table
    await sql`
      CREATE TABLE IF NOT EXISTS contexts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id UUID REFERENCES custom_routes(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'file')),
        content TEXT,
        file_url TEXT,
        file_name VARCHAR(255),
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_custom_routes_user_id ON custom_routes(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_custom_routes_route_name ON custom_routes(route_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contexts_route_id ON contexts(route_id)`;

    console.log('Database tables initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// User operations
export async function createUser(email: string) {
  const result = await sql`
    INSERT INTO users (email)
    VALUES (${email})
    RETURNING id, email, created_at
  `;
  return result.rows[0];
}

export async function getUserById(id: string) {
  const result = await sql`
    SELECT id, email, created_at
    FROM users
    WHERE id = ${id}
  `;
  return result.rows[0];
}

export async function getUserByEmail(email: string) {
  const result = await sql`
    SELECT id, email, created_at
    FROM users
    WHERE email = ${email}
  `;
  return result.rows[0];
}

// API Key operations
export async function createApiKey(userId: string, keyHash: string, name: string) {
  const result = await sql`
    INSERT INTO api_keys (user_id, key_hash, name)
    VALUES (${userId}, ${keyHash}, ${name})
    RETURNING id, user_id, name, created_at
  `;
  return result.rows[0];
}

export async function getApiKeyByHash(keyHash: string) {
  const result = await sql`
    SELECT ak.id, ak.user_id, ak.name, ak.created_at, ak.last_used, u.email
    FROM api_keys ak
    JOIN users u ON ak.user_id = u.id
    WHERE ak.key_hash = ${keyHash}
  `;
  return result.rows[0];
}

export async function updateApiKeyLastUsed(keyHash: string) {
  await sql`
    UPDATE api_keys
    SET last_used = CURRENT_TIMESTAMP
    WHERE key_hash = ${keyHash}
  `;
}

export async function listApiKeysByUser(userId: string) {
  const result = await sql`
    SELECT id, name, created_at, last_used
    FROM api_keys
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return result.rows;
}

export async function deleteApiKey(id: string, userId: string) {
  await sql`
    DELETE FROM api_keys
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

// Custom Route operations
export async function createCustomRoute(
  userId: string,
  routeName: string,
  description: string,
  systemPrompt?: string
) {
  const result = await sql`
    INSERT INTO custom_routes (user_id, route_name, description, system_prompt)
    VALUES (${userId}, ${routeName}, ${description}, ${systemPrompt || ''})
    RETURNING id, user_id, route_name, description, system_prompt, created_at, updated_at
  `;
  return result.rows[0];
}

export async function getCustomRouteByName(routeName: string) {
  const result = await sql`
    SELECT id, user_id, route_name, description, system_prompt, created_at, updated_at
    FROM custom_routes
    WHERE route_name = ${routeName}
  `;
  return result.rows[0];
}

export async function getCustomRouteById(id: string) {
  const result = await sql`
    SELECT id, user_id, route_name, description, system_prompt, created_at, updated_at
    FROM custom_routes
    WHERE id = ${id}
  `;
  return result.rows[0];
}

export async function listCustomRoutesByUser(userId: string) {
  const result = await sql`
    SELECT id, route_name, description, system_prompt, created_at, updated_at
    FROM custom_routes
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return result.rows;
}

export async function updateCustomRoute(
  id: string,
  userId: string,
  data: { route_name?: string; description?: string; system_prompt?: string }
) {
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (data.route_name !== undefined) {
    updates.push(`route_name = $${values.length + 1}`);
    values.push(data.route_name);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${values.length + 1}`);
    values.push(data.description);
  }
  if (data.system_prompt !== undefined) {
    updates.push(`system_prompt = $${values.length + 1}`);
    values.push(data.system_prompt);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');

  if (updates.length === 1) return; // Only updated_at, no changes

  const query = `
    UPDATE custom_routes
    SET ${updates.join(', ')}
    WHERE id = $${values.length + 1} AND user_id = $${values.length + 2}
    RETURNING id, route_name, description, system_prompt, created_at, updated_at
  `;

  values.push(id, userId);

  const result = await sql.query(query, values);
  return result.rows[0];
}

export async function deleteCustomRoute(id: string, userId: string) {
  await sql`
    DELETE FROM custom_routes
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

// Context operations
export async function createContext(
  routeId: string,
  type: 'text' | 'file',
  content: string | null,
  fileUrl: string | null,
  fileName: string | null,
  orderIndex: number
) {
  const result = await sql`
    INSERT INTO contexts (route_id, type, content, file_url, file_name, order_index)
    VALUES (${routeId}, ${type}, ${content}, ${fileUrl}, ${fileName}, ${orderIndex})
    RETURNING id, route_id, type, content, file_url, file_name, order_index, created_at
  `;
  return result.rows[0];
}

export async function listContextsByRoute(routeId: string) {
  const result = await sql`
    SELECT id, route_id, type, content, file_url, file_name, order_index, created_at
    FROM contexts
    WHERE route_id = ${routeId}
    ORDER BY order_index ASC, created_at ASC
  `;
  return result.rows;
}

export async function deleteContext(id: string, routeId: string) {
  await sql`
    DELETE FROM contexts
    WHERE id = ${id} AND route_id = ${routeId}
  `;
}

export async function getNextContextOrder(routeId: string): Promise<number> {
  const result = await sql`
    SELECT COALESCE(MAX(order_index), -1) + 1 as next_order
    FROM contexts
    WHERE route_id = ${routeId}
  `;
  return result.rows[0].next_order;
}
