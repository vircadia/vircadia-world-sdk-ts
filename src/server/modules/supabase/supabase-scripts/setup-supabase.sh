#!/bin/bash

# Navigate to the Supabase directory
cd ./supabase-core

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Initialize Supabase project
supabase init

# Start Supabase services
supabase start

# Generate .env file with secrets
echo "SUPABASE_URL=$(supabase status | grep URL | awk '{print $4}')" > .env
echo "SUPABASE_ANON_KEY=$(supabase status | grep anon | awk '{print $5}')" >> .env
echo "SUPABASE_SERVICE_ROLE_KEY=$(supabase status | grep service_role | awk '{print $5}')" >> .env

echo "Supabase setup complete. Secrets have been saved to .env file."