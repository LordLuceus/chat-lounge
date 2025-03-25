#!/bin/sh

# Run migrations
npm run migrate-prod

# Start the server
exec node build
