location /ws/ {
  proxy_pass $cyberguardsim_api;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection $connection_upgrade;
  include /etc/nginx/templates/includes/proxy-common.inc;
}

location /auth/ {
  proxy_pass $cyberguardsim_api;
  include /etc/nginx/templates/includes/proxy-common.inc;
}

location /users/ {
  proxy_pass $cyberguardsim_api;
  include /etc/nginx/templates/includes/proxy-common.inc;
}

location /scenarios {
  proxy_pass $cyberguardsim_api;
  include /etc/nginx/templates/includes/proxy-common.inc;
}

location /sessions {
  proxy_pass $cyberguardsim_api;
  include /etc/nginx/templates/includes/proxy-common.inc;
}

location /api/ {
  proxy_pass $cyberguardsim_api;
  include /etc/nginx/templates/includes/proxy-common.inc;
}

location /docs {
  proxy_pass $cyberguardsim_api;
  include /etc/nginx/templates/includes/proxy-common.inc;
}

location /openapi.json {
  proxy_pass $cyberguardsim_api;
  include /etc/nginx/templates/includes/proxy-common.inc;
}

location / {
  proxy_pass $cyberguardsim_web;
  proxy_http_version 1.1;
  include /etc/nginx/templates/includes/proxy-common.inc;
}
