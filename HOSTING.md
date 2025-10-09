# Hosting the Installation Script

This guide explains how to host the `install.sh` script at `https://idlhub.com/mcp` so users can install with:

```bash
curl -fsSL https://idlhub.com/mcp | sh
```

## Overview

The installation script needs to be:
1. **Publicly accessible** via HTTPS
2. **Served with correct content type** (text/plain or application/x-sh)
3. **Always up-to-date** with the latest version from the repository

## Option 1: GitHub Raw Content + Redirect (Recommended)

This is the simplest approach that requires minimal setup.

### Setup

1. **GitHub automatically serves the file** via:
   ```
   https://raw.githubusercontent.com/openSVM/idlhub/main/install.sh
   ```

2. **Configure your web server/CDN** to redirect `/mcp` to the GitHub raw URL:

   **Cloudflare Workers:**
   ```javascript
   addEventListener('fetch', event => {
     event.respondWith(handleRequest(event.request))
   })
   
   async function handleRequest(request) {
     const url = new URL(request.url)
     
     if (url.pathname === '/mcp') {
       const scriptUrl = 'https://raw.githubusercontent.com/openSVM/idlhub/main/install.sh'
       const response = await fetch(scriptUrl)
       return new Response(response.body, {
         headers: {
           'Content-Type': 'text/plain; charset=utf-8',
           'Cache-Control': 'public, max-age=3600',
         }
       })
     }
     
     return fetch(request)
   }
   ```

   **Nginx:**
   ```nginx
   location = /mcp {
       proxy_pass https://raw.githubusercontent.com/openSVM/idlhub/main/install.sh;
       proxy_set_header Host raw.githubusercontent.com;
       proxy_ssl_server_name on;
       add_header Content-Type "text/plain; charset=utf-8";
   }
   ```

   **Apache (.htaccess):**
   ```apache
   RewriteEngine On
   RewriteRule ^mcp$ https://raw.githubusercontent.com/openSVM/idlhub/main/install.sh [P,L]
   ```

### Pros
- ✅ Always up-to-date (pulls from GitHub)
- ✅ No manual deployment needed
- ✅ Free and reliable
- ✅ Minimal configuration

### Cons
- ⚠️ Depends on GitHub's availability
- ⚠️ Slight delay for first request (not cached)

## Option 2: jsDelivr CDN

jsDelivr provides a fast, reliable CDN for GitHub repositories.

### Setup

Point your `/mcp` endpoint to:
```
https://cdn.jsdelivr.net/gh/openSVM/idlhub@main/install.sh
```

**Cloudflare Workers:**
```javascript
if (url.pathname === '/mcp') {
  return Response.redirect(
    'https://cdn.jsdelivr.net/gh/openSVM/idlhub@main/install.sh',
    302
  )
}
```

Or serve directly (better for curl piping):
```javascript
if (url.pathname === '/mcp') {
  const scriptUrl = 'https://cdn.jsdelivr.net/gh/openSVM/idlhub@main/install.sh'
  const response = await fetch(scriptUrl)
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    }
  })
}
```

### Pros
- ✅ Global CDN (fast worldwide)
- ✅ Free
- ✅ Automatic caching
- ✅ Can pin to specific version/commit

### Cons
- ⚠️ CDN cache may delay updates (1-24 hours)
- ⚠️ Third-party dependency

## Option 3: GitHub Pages

If you're already using GitHub Pages for your site:

### Setup

1. **Enable GitHub Pages** for your repository (Settings → Pages)
2. **Choose source**: Deploy from main branch
3. **Configure custom domain** if needed (idlhub.com)

4. **Add redirect** using HTML:
   
   Create `mcp.html`:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <meta http-equiv="refresh" content="0; url=/install.sh">
     <script>window.location.href="/install.sh"</script>
   </head>
   <body>Redirecting...</body>
   </html>
   ```

5. **Configure server redirect** (preferred):
   
   Create `_config.yml`:
   ```yaml
   include:
     - install.sh
   ```

### Pros
- ✅ Integrated with GitHub
- ✅ Free hosting
- ✅ Custom domain support
- ✅ HTTPS included

### Cons
- ⚠️ Requires site rebuild for updates
- ⚠️ May have caching issues

## Option 4: Cloudflare Pages

For full control and fast global deployment:

### Setup

1. **Connect your repository** to Cloudflare Pages
2. **Configure build settings**:
   - Build command: `echo ""`
   - Build output directory: `/`
   - Root directory: `/`

3. **Add redirect rule** in `_redirects` file:
   ```
   /mcp /install.sh 200
   ```

4. **Or use Cloudflare Workers** (see Option 1)

### Pros
- ✅ Very fast (edge network)
- ✅ Free tier generous
- ✅ Automatic deployments on commit
- ✅ Great analytics

### Cons
- ⚠️ Requires Cloudflare account
- ⚠️ More setup than GitHub raw

## Option 5: Self-Hosted Server

If you run your own web server:

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name idlhub.com;

    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Serve install script
    location = /mcp {
        alias /var/www/idlhub/install.sh;
        default_type text/plain;
        add_header Content-Type "text/plain; charset=utf-8";
        add_header Cache-Control "public, max-age=3600";
        add_header X-Content-Type-Options "nosniff";
    }

    # Or proxy to GitHub
    location = /mcp {
        proxy_pass https://raw.githubusercontent.com/openSVM/idlhub/main/install.sh;
        proxy_set_header Host raw.githubusercontent.com;
        proxy_ssl_server_name on;
        add_header Content-Type "text/plain; charset=utf-8";
    }
}
```

### Apache Configuration

```apache
<VirtualHost *:443>
    ServerName idlhub.com
    
    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem
    
    # Serve install script
    Alias /mcp /var/www/idlhub/install.sh
    <Location /mcp>
        ForceType text/plain
        Header set Content-Type "text/plain; charset=utf-8"
        Header set Cache-Control "public, max-age=3600"
    </Location>
</VirtualHost>
```

### Pros
- ✅ Full control
- ✅ Custom logic possible
- ✅ No third-party dependencies

### Cons
- ⚠️ Requires server maintenance
- ⚠️ Manual deployment needed
- ⚠️ Not automatically updated

## Testing Your Setup

Before announcing the installation method, test it thoroughly:

```bash
# Test with curl
curl -fsSL https://idlhub.com/mcp | head -20

# Test installation in a fresh environment
docker run --rm -it ubuntu:22.04 bash -c "curl -fsSL https://idlhub.com/mcp | sh"

# Test with different shells
curl -fsSL https://idlhub.com/mcp | bash
curl -fsSL https://idlhub.com/mcp | sh
curl -fsSL https://idlhub.com/mcp | zsh

# Test with wget
wget -qO- https://idlhub.com/mcp | sh
```

## Security Considerations

### HTTPS is Required

- ✅ Always use HTTPS for the install script
- ✅ Never serve over HTTP (security risk)
- ✅ Validate SSL certificates

### Content Integrity

Consider adding SHA256 checksum verification:

```bash
# Generate checksum
sha256sum install.sh > install.sh.sha256

# Users can verify
curl -fsSL https://idlhub.com/mcp -o install.sh
curl -fsSL https://idlhub.com/mcp.sha256 | sha256sum -c
./install.sh
```

### Rate Limiting

Implement rate limiting to prevent abuse:

**Cloudflare:**
- Use built-in rate limiting rules
- 10 requests per minute per IP is reasonable

**Nginx:**
```nginx
limit_req_zone $binary_remote_addr zone=install:10m rate=10r/m;

location = /mcp {
    limit_req zone=install burst=5;
    # ... rest of config
}
```

## Monitoring

Track usage to understand adoption:

**Cloudflare Analytics:**
- Page views for `/mcp`
- Geographic distribution
- Error rates

**Custom Logging:**
```nginx
log_format install '$remote_addr - $time_local "$request" $status "$http_user_agent"';
access_log /var/log/nginx/install.log install;
```

**Analyze logs:**
```bash
# Count installations
grep "GET /mcp" /var/log/nginx/install.log | wc -l

# Most common OS/platforms
grep "GET /mcp" /var/log/nginx/install.log | awk '{print $NF}' | sort | uniq -c | sort -rn
```

## Recommended Setup

For most users, we recommend **Option 1** (GitHub Raw + Cloudflare Workers):

1. **Free and reliable**
2. **Always up-to-date** (pulls from GitHub)
3. **Fast globally** (Cloudflare edge network)
4. **Easy to maintain** (no manual deployments)

Complete Cloudflare Workers script:

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url)
    
    // Serve install script
    if (url.pathname === '/mcp') {
      const scriptUrl = 'https://raw.githubusercontent.com/openSVM/idlhub/main/install.sh'
      
      try {
        const response = await fetch(scriptUrl)
        
        if (!response.ok) {
          return new Response('Installation script temporarily unavailable', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          })
        }
        
        return new Response(response.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'X-Content-Type-Options': 'nosniff',
          }
        })
      } catch (error) {
        return new Response('Error fetching installation script', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        })
      }
    }
    
    // Handle other requests
    return fetch(request)
  }
}
```

Deploy this to Cloudflare Workers for your domain and you're done!

## Support

If you need help setting up the installation endpoint:
- **GitHub Issues**: https://github.com/openSVM/idlhub/issues
- **Discussions**: https://github.com/openSVM/idlhub/discussions
