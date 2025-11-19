# Dockerfile for Jam.coop - Ruby on Rails 8 music cooperative platform

FROM ruby:3.3-alpine AS base

# Install dependencies
RUN apk add --no-cache \
    postgresql-dev \
    nodejs \
    npm \
    yarn \
    build-base \
    git \
    curl \
    vips-dev \
    tzdata

WORKDIR /app

# Install gems
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Install node packages
COPY package.json yarn.lock ./
RUN yarn install

# Copy application code
COPY . .

# Precompile assets (for production)
# RUN RAILS_ENV=production bundle exec rails assets:precompile

EXPOSE 3000

# Health check
HEALTHCHECK --interval=15s --timeout=10s --retries=3 --start-period=40s \
  CMD curl -f http://localhost:3000/ || exit 1

# Start rails server
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
