-- Alinha permissões de fábrica (negociações) e vínculo da advogada demo nos condomínios de teste.
-- Executar em ambientes que já tinham role/user antes de seeds.ts incluir negociacoes.

UPDATE role
SET permissao_json = '{"dashboard":{"ler":true},"atendimentos":{"ler":true,"criar":true,"editar":true,"excluir":true},"debitos":{"ler":true,"criar":true,"editar":true,"excluir":true},"juridico":{"ler":true,"criar":true,"editar":true},"negociacoes":{"ler":true,"criar":true,"editar":true},"condominios":{"ler":true,"criar":true,"editar":true,"excluir":true},"unidades":{"ler":true,"criar":true,"editar":true,"excluir":true},"relatorios":{"ler":true,"exportar":true},"importacoes":{"ler":true,"criar":true,"editar":true,"excluir":true},"usuarios":{"ler":true,"criar":true,"editar":true,"excluir":true},"cargos":{"ler":true,"criar":true,"editar":true,"excluir":true},"auditoria":{"ler":true}}'
WHERE id = 1 AND lower(trim(nome)) = 'administrador';

UPDATE role
SET permissao_json = '{"dashboard":{"ler":true},"atendimentos":{"ler":true,"criar":true,"editar":true},"negociacoes":{"ler":true,"criar":true},"debitos":{"ler":true},"importacoes":{"ler":true,"criar":true,"editar":true}}'
WHERE id = 2 AND lower(trim(nome)) = 'atendente';

UPDATE role
SET permissao_json = '{"dashboard":{"ler":true},"debitos":{"ler":true},"juridico":{"ler":true,"editar":true},"negociacoes":{"ler":true,"editar":true},"condominios":{"ler":true},"unidades":{"ler":true},"relatorios":{"ler":true,"exportar":true}}'
WHERE id = 3 AND lower(trim(nome)) = 'advogado';

-- Vincula Dra. Adryelle aos condomínios de demonstração (se existirem).
UPDATE condominium
SET advogados_json = CASE
  WHEN advogados_json IS NULL OR trim(advogados_json) IN ('', '[]') THEN '["Dra. Adryelle"]'
  WHEN advogados_json::jsonb @> '["Dra. Adryelle"]'::jsonb THEN advogados_json
  ELSE (advogados_json::jsonb || '"Dra. Adryelle"'::jsonb)::text
END
WHERE nome ILIKE 'Condomínio Teste%';

UPDATE "user"
SET codigo = 'USUARIOTST'
WHERE codigo = '12345' AND cargo_id = 1;
