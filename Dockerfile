FROM caddy:2
COPY public /srv
COPY Caddyfile /etc/caddy/Caddyfile
