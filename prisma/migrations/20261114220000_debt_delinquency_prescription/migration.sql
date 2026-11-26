-- T08: prescrição no nível da inadimplência (debt), não na unidade.

ALTER TABLE debt
  ADD COLUMN situacao_inadimplencia VARCHAR(64) NOT NULL DEFAULT 'Ativa',
  ADD COLUMN usuario_prescricao_id INT,
  ADD COLUMN prescrito_em TIMESTAMP,
  ADD COLUMN justificativa_prescricao TEXT;

UPDATE debt d
SET
  situacao_inadimplencia = 'Inadimplência prescrita',
  prescrito_em = NOW(),
  justificativa_prescricao = 'Migração automática: classificação transferida da situação da unidade (T08).'
FROM unit u
WHERE d.unidade_id = u.id
  AND u.situacao IN ('Unidade prescrita', 'PRESCRITA')
  AND d.status IN ('Pendente', 'Vencido');

UPDATE unit
SET situacao = CASE
  WHEN EXISTS (
    SELECT 1
    FROM debt d
    WHERE d.unidade_id = unit.id
      AND d.status IN ('Pendente', 'Vencido')
      AND d.situacao_inadimplencia = 'Ativa'
  ) THEN 'Em cobrança'
  ELSE 'Sem cobrança'
END
WHERE situacao IN ('Unidade prescrita', 'PRESCRITA');