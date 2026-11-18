-- Les nouveaux projets Supabase n'accordent plus automatiquement les tables du
-- schéma public au rôle service_role (clé secrète du serveur). Sans ce droit,
-- /sources et le back-office échouent en ligne alors qu'ils marchent en local.
-- Idempotent : déjà appliqué à la main sur la base en ligne le 2026-11-18.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;
