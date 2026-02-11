-- Create user if not exists
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_user WHERE usename = 'ernur.2006') THEN
      CREATE USER "ernur.2006" WITH PASSWORD 'ernur.2006';
   END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE invest TO "ernur.2006";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "ernur.2006";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "ernur.2006";
GRANT USAGE ON SCHEMA public TO "ernur.2006";