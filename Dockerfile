# Use official Node.js LTS image
FROM node:20.17.0

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5001

# Start the application
CMD ["node", "server.js"]
