#!/bin/sh

# Run migrations
npm run migrate

# Start the server
exec node build
