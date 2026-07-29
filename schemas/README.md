# Schemas

Two JSON Schemas live here, and it's important to understand what each one
describes — and what neither of them describes.

## The canonical format is NOT in this folder

The canonical SoulSketch interchange format is the **5-file memory pack
directory** of plain Markdown + JSONL:

```
persona.md
relationship_dynamics.md
technical_domains.md
stylistic_voice.md
runtime_observations.jsonl
```

It is deliberately schema-less prose so it stays human-readable, diffable, and
model-agnostic. Its structure is validated by the CLI
(`soulsketch validate pack <dir>`), fingerprinted by
`soulsketch fingerprint <dir>`, and exemplified in
[`examples/reference_memory_pack/`](../examples/reference_memory_pack).

## What the schemas here describe

| Schema | Describes |
| --- | --- |
| `soulsketch-pack.schema.json` | A **unified JSON export** of a memory pack (identity + memories + metadata) used for programmatic import/export, e.g. the Cipher import flow. It is a serialization of a pack, not a replacement for the 5-file layout. |
| `memory_packet.schema.json` | A single **memory packet**: the envelope used when individual memories move between systems (sync adapters, the reference API). |

If the schemas and the 5-file convention ever appear to disagree, the 5-file
directory layout plus [`README.md`](../README.md) win; please open an issue.
