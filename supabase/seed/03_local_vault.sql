-- Local-only Vault secrets used by the agendo-reminders cron job (non-sensitive dev values).
-- Remote values are created by hand with a random secret (phase 13). Idempotent.
select vault.create_secret('http://host.docker.internal:54321', 'agendo_functions_base_url')
where not exists (select 1 from vault.secrets where name = 'agendo_functions_base_url');
select vault.create_secret('local-dev-cron-secret', 'agendo_reminders_cron_secret')
where not exists (select 1 from vault.secrets where name = 'agendo_reminders_cron_secret');
