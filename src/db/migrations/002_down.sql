-- 002_down.sql
-- Rollback migration: drops everything in reverse order

DROP TABLE IF EXISTS user_favorites;
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS happy_hour_deals;
DROP TABLE IF EXISTS venues;

DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS postgis;
