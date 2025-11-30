#!/bin/bash

# Create user and database
psql postgres << EOF
CREATE USER microarena WITH PASSWORD 'microarena_password';
CREATE DATABASE microarena OWNER microarena;
GRANT ALL PRIVILEGES ON DATABASE microarena TO microarena;
EOF

echo "✅ Database setup complete"
