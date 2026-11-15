# Rewrite audit

The current architecture is documented in [architecture.md](architecture.md).

- One shared model vocabulary, strict request schemas, and constructor-injected domain/application services.
- Explicit composition modules; adapters and routes cannot import the wrong layer.
- Fresh schema baseline, deterministic trigger capture, canonical table names, and no old migration chain.
- One authenticated browser invalidation connection, query dependency coverage, and no notification/DOM refresh bridge.
- Transactional events, commit-order sequencing, private event isolation, multi-process content/presence synchronization and revocation.
- Shared item header, consistent icons/toolbars/tokens, and protected unsaved drafts.
- Automated schema coverage, dead-code/style checks, unit tests and multi-process integration.

Verification commands and deployment requirements are in README and architecture.md.
