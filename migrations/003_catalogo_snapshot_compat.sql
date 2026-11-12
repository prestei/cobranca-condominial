-- Nome canônico usado por catalogo-snapshot-pg.ts (legado: catalog_snapshot).

CREATE TABLE IF NOT EXISTS catalogo_snapshot (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  state JSONB NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO catalogo_snapshot (id, state, atualizado_em)
SELECT 1, cs.state, COALESCE(cs.gravado_em, NOW())
FROM catalog_snapshot cs
WHERE cs.id = 1
  AND NOT EXISTS (SELECT 1 FROM catalogo_snapshot WHERE id = 1)
ON CONFLICT (id) DO NOTHING;
