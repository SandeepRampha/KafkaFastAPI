# Production stage using Nginx
FROM nginx:stable-alpine

# Copy the build output from the host to the nginx html directory
# Note: This assumes 'npm run build' was run on the host (as per the CI workflow)
COPY dist /usr/share/nginx/html

# Copy our custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
