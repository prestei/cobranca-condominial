-- Decisão de proposta: confirmar, recusar e cancelar (flags em negociacoes no role.permissao_json).
-- Cargos de fábrica: Administrador e Advogado recebem as três ações; Atendente não.
-- Demais cargos: ajuste manual em /cargos.

UPDATE role
SET permissao_json = jsonb_set(
  jsonb_set(
    jsonb_set(
      COALESCE(NULLIF(trim(permissao_json), ''), '{}')::jsonb,
      '{negociacoes,confirmar}',
      'true'::jsonb,
      true
    ),
    '{negociacoes,recusar}',
    'true'::jsonb,
    true
  ),
  '{negociacoes,cancelar}',
  'true'::jsonb,
  true
)::text
WHERE lower(trim(nome)) IN ('administrador', 'advogado');