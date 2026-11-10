-- Seed no banco: concede importações (ler/criar/editar) ao cargo Atendente.
-- Fonte da alteração de permissão: esta migration em role.permissao_json (não o código TS).
-- Não altera cargos Atendente com matriz customizada diferente do seed antigo.

UPDATE role
SET permissao_json = '{"dashboard":{"ler":true},"atendimentos":{"ler":true,"criar":true,"editar":true},"debitos":{"ler":true},"importacoes":{"ler":true,"criar":true,"editar":true}}'
WHERE lower(trim(nome)) = 'atendente'
  AND (
    permissao_json IS NULL
    OR trim(permissao_json) = ''
    OR trim(permissao_json) = '{}'
    OR replace(permissao_json, ' ', '') = '{"dashboard":{"ler":true},"atendimentos":{"ler":true,"criar":true,"editar":true},"debitos":{"ler":true}}'
  );
