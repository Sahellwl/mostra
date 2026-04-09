/**
 * Casts a typed Supabase client to `any` to bypass TypeScript's strict
 * inference for complex nested SELECT joins and INSERT/UPDATE operations
 * against our custom Database type.
 *
 * Root cause: @supabase/supabase-js's INSERT/UPDATE types sometimes resolve
 * to `never` with custom Database generics, and nested join return types are
 * not inferred from the select string. Safe to cast here since Supabase
 * validates queries at runtime and our schema is fixed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db<T>(client: T): any {
  return client
}
