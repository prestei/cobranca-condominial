-- Repara DEFAULT nextval em tabelas criadas por migrations/001_schema.sql (id INT PRIMARY KEY sem SERIAL).
-- O CREATE TABLE IF NOT EXISTS das migrations posteriores não altera tabelas já existentes.
-- Idempotente: só cria sequence e DEFAULT quando pg_get_serial_sequence('id') ainda é NULL.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT *
    FROM (VALUES
      ('condominium_id_seq', 'condominium'),
      ('unit_id_seq', 'unit'),
      ('responsible_party_id_seq', 'responsible_party'),
      ('unit_responsible_party_id_seq', 'unit_responsible_party'),
      ('debt_id_seq', 'debt'),
      ('import_id_seq', 'import'),
      ('audit_log_id_seq', 'audit_log'),
      ('collection_assignment_id_seq', 'collection_assignment'),
      ('internal_notification_id_seq', 'internal_notification'),
      ('notification_failure_id_seq', 'notification_failure')
    ) AS t(seq_name, table_name)
  LOOP
    IF pg_get_serial_sequence(rec.table_name, 'id') IS NULL THEN
      EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I', rec.seq_name);
      EXECUTE format('ALTER SEQUENCE %I OWNED BY %I.id', rec.seq_name, rec.table_name);
      EXECUTE format(
        'SELECT setval(%L, GREATEST(COALESCE((SELECT MAX(id) FROM %I), 1), 1))',
        rec.seq_name,
        rec.table_name
      );
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN id SET DEFAULT nextval(%L)',
        rec.table_name,
        rec.seq_name
      );
    END IF;
  END LOOP;
END $$;
