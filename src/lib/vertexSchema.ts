/**
 * Translate a JSON Schema into the OpenAPI dialect Vertex AI accepts.
 *
 * Vertex constrains generation with an OpenAPI 3 Schema object, not raw JSON
 * Schema. The preflight check found this the hard way:
 *
 *   400 Unknown name "type" at 'generation_config.response_schema.properties[2]'
 *
 * ...because the field was `{ "type": ["string", "null"] }`. OpenAPI has no
 * union types; nullability is a separate `nullable` flag.
 *
 * The strict schema stays the source of truth. The model is *constrained* by
 * this translation, then its output is *validated* against the original — so
 * a lossy translation can never widen what we accept.
 */

type JsonSchema = Record<string, unknown>;

/** Keywords OpenAPI has no equivalent for. Dropped from the constraint only. */
const UNSUPPORTED = new Set([
  "$schema",
  "$id",
  "additionalProperties",
  "const",
  "patternProperties",
  "allOf",
  "oneOf",
  "not",
  "if",
  "then",
  "else",
  "definitions",
  "$defs",
  "default",
  "examples",
  "unevaluatedProperties",
]);

function resolveRef(ref: string, root: JsonSchema): JsonSchema {
  // Only local refs are used here: "#/$defs/finding".
  const parts = ref.replace(/^#\//, "").split("/");
  let node: unknown = root;
  for (const p of parts) {
    node = (node as Record<string, unknown>)?.[p];
    if (node === undefined) throw new Error(`Cannot resolve $ref: ${ref}`);
  }
  return node as JsonSchema;
}

function convert(node: JsonSchema, root: JsonSchema, seen: Set<string>): JsonSchema {
  if (node.$ref) {
    const ref = node.$ref as string;
    if (seen.has(ref)) {
      // Recursive schema — OpenAPI cannot express it; degrade to a free object.
      return { type: "object" };
    }
    return convert(resolveRef(ref, root), root, new Set([...seen, ref]));
  }

  const out: JsonSchema = {};

  for (const [key, value] of Object.entries(node)) {
    if (UNSUPPORTED.has(key)) continue;

    if (key === "type") {
      if (Array.isArray(value)) {
        // ["string","null"] -> type: string + nullable: true
        // ["number","string"] -> no OpenAPI equivalent; widen to string and let
        // validation against the strict schema catch anything wrong.
        const types = value as string[];
        const nonNull = types.filter((t) => t !== "null");
        if (types.includes("null")) out.nullable = true;
        out.type = nonNull.length === 1 ? nonNull[0] : "string";
      } else {
        out.type = value;
      }
      continue;
    }

    if (key === "enum") {
      // OpenAPI enums are string lists; a null member is expressed by nullable.
      const values = (value as unknown[]).filter((v) => v !== null);
      if ((value as unknown[]).includes(null)) out.nullable = true;
      out.enum = values.map(String);
      // An enum without a type is rejected.
      if (!out.type && !node.type) out.type = "string";
      continue;
    }

    if (key === "properties") {
      const props: JsonSchema = {};
      for (const [pk, pv] of Object.entries(value as JsonSchema)) {
        props[pk] = convert(pv as JsonSchema, root, seen);
      }
      out.properties = props;
      continue;
    }

    if (key === "items") {
      out.items = convert(value as JsonSchema, root, seen);
      continue;
    }

    // description, required, minItems, maxItems, minimum, maximum, pattern,
    // format, minLength, maxLength, nullable all pass through unchanged.
    out[key] = value;
  }

  // A const becomes a single-value enum, which OpenAPI does support.
  if (node.const !== undefined) {
    out.type = typeof node.const === "number" ? "number" : "string";
    out.enum = [String(node.const)];
  }

  return out;
}

/** Convert a strict JSON Schema into a Vertex-compatible OpenAPI schema. */
export function toVertexSchema(schema: JsonSchema): JsonSchema {
  return convert(schema, schema, new Set());
}

/**
 * Walk a converted schema and report anything Vertex would still reject.
 * Used by the preflight and by tests, so translation bugs surface locally
 * rather than as a 400 mid-run.
 */
export function findVertexProblems(node: unknown, path = "$"): string[] {
  const problems: string[] = [];
  if (Array.isArray(node)) {
    node.forEach((n, i) => problems.push(...findVertexProblems(n, `${path}[${i}]`)));
    return problems;
  }
  if (!node || typeof node !== "object") return problems;

  const obj = node as JsonSchema;
  if (Array.isArray(obj.type)) problems.push(`${path}.type is a union: ${JSON.stringify(obj.type)}`);
  if (obj.$ref) problems.push(`${path}.$ref was not resolved`);
  for (const key of UNSUPPORTED) {
    if (key in obj && key !== "$defs" && key !== "$schema" && key !== "$id") {
      problems.push(`${path}.${key} is not supported by Vertex`);
    }
  }
  if (Array.isArray(obj.enum) && obj.enum.some((v) => v === null)) {
    problems.push(`${path}.enum contains null`);
  }
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "object" && v !== null) {
      problems.push(...findVertexProblems(v, `${path}.${k}`));
    }
  }
  return problems;
}
