import Config

config :supavisor, Supavisor.Repo,
  pool_size: 5,
  database: "supavisor"

config :supavisor, Supavisor.Crypto,
  vault_enc_key: System.fetch_env!("VAULT_ENC_KEY"),
  secret_key_base: System.fetch_env!("SECRET_KEY_BASE")
