#!/bin/bash

# Navigate to the Supabase directory
cd ./supabase-core

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "Supabase CLI not found. Please run setup-supabase first."
    exit 1
fi

# Function to generate a random string
generate_random_string() {
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
}

# Generate new secrets
NEW_ANON_KEY=$(generate_random_string)
NEW_SERVICE_ROLE_KEY=$(generate_random_string)

# Update Supabase configuration
supabase secrets set ANON_KEY=$NEW_ANON_KEY
supabase secrets set SERVICE_ROLE_KEY=$NEW_SERVICE_ROLE_KEY

# Restart Supabase to apply new configuration
supabase stop
supabase start

# Get the new URL and update .env file
SUPABASE_URL=$(supabase status | grep URL | awk '{print $4}')

# Update .env file with new secrets
echo "SUPABASE_URL=$SUPABASE_URL" > .env
echo "SUPABASE_ANON_KEY=$NEW_ANON_KEY" >> .env
echo "SUPABASE_SERVICE_ROLE_KEY=$NEW_SERVICE_ROLE_KEY" >> .env
echo "Supabase configuration resynced. New secrets have been saved to .env file."