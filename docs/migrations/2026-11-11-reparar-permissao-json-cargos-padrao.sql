-- Repara role.permissao_json vazio/nulo dos cargos de fábrica.
-- Cargos com qualquer permissão já marcada não são alterados.
-- Espelha src/lib/permissions/seeds.ts (Administrador, Atendente, Advogado).

UPDATE role
SET permissao_json = '{"dashboard":{"ler":true},"atendimentos":{"ler":true,"criar":true,"editar":true,"excluir":true},"debitos":{"ler":true,"criar":true,"editar":true,"excluir":true},"juridico":{"ler":true,"criar":true,"editar":true},"condominios":{"ler":true,"criar":true,"editar":true,"excluir":true},"unidades":{"ler":true,"criar":true,"editar":true,"excluir":true},"relatorios":{"ler":true,"exportar":true},"importacoes":{"ler":true,"criar":true,"editar":true,"excluir":true},"usuarios":{"ler":true,"criar":true,"editar":true,"excluir":true},"cargos":{"ler":true,"criar":true,"editar":true,"excluir":true},"auditoria":{"ler":true}}'
WHERE lower(trim(nome)) = 'administrador'
  AND (
    permissao_json IS NULL
    OR trim(permissao_json) = ''
    OR trim(permissao_json) = '{}'
  );

UPDATE role
SET permissao_json = '{"dashboard":{"ler":true},"atendimentos":{"ler":true,"criar":true,"editar":true},"debitos":{"ler":true}}'
WHERE lower(trim(nome)) = 'atendente'
  AND (
    permissao_json IS NULL
    OR trim(permissao_json) = ''
    OR trim(permissao_json) = '{}'
  );

UPDATE role
SET permissao_json = '{"dashboard":{"ler":true},"debitos":{"ler":true},"juridico":{"ler":true,"editar":true},"condominios":{"ler":true},"unidades":{"ler":true},"relatorios":{"ler":true,"exportar":true}}'
WHERE lower(trim(nome)) = 'advogado'
  AND (
    permissao_json IS NULL
    OR trim(permissao_json) = ''
    OR trim(permissao_json) = '{}'
  );
