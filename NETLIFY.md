# Netlify Deployment Guide for IDLHub

This guide covers deploying IDLHub to Netlify with Qdrant integration for enhanced search capabilities.

## Quick Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/openSVM/idlhub)

## Prerequisites

- Netlify account (free tier works)
- Qdrant instance (local or [Qdrant Cloud](https://cloud.qdrant.io/))
- GitHub account (for automatic deployments)

## Deployment Steps

### 1. Connect Repository to Netlify

1. Log in to [Netlify](https://app.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Select **GitHub** and authorize Netlify
4. Choose the `openSVM/idlhub` repository
5. Configure build settings (Netlify will auto-detect `netlify.toml`)

### 2. Configure Environment Variables

In Netlify dashboard, go to **Site settings** → **Environment variables** and add:

```
QDRANT_URL=https://your-qdrant-instance.qdrant.tech:6333
QDRANT_API_KEY=your_qdrant_api_key_here
NODE_ENV=production
```

**Getting Qdrant credentials:**
- Sign up at [Qdrant Cloud](https://cloud.qdrant.io/)
- Create a new cluster
- Copy the cluster URL and API key

### 3. Deploy

Click **"Deploy site"**. Netlify will:
- Build the site (no build step needed for static files)
- Deploy to CDN
- Set up redirects (configured in `netlify.toml`)

### 4. Initialize Qdrant Database

After deployment, initialize Qdrant with IDL data:

```bash
# Clone the repository locally
git clone https://github.com/openSVM/idlhub.git
cd idlhub

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your Qdrant credentials

# Initialize Qdrant
npm run qdrant:init
```

## Netlify Configuration

The `netlify.toml` file configures:

### Redirects

- `/mcp` → `/install.sh` - Installation script endpoint
- `/install` → `/install.sh` - Alternative endpoint
- `/*` → `/index.html` - SPA fallback

### Headers

- **Content-Type** headers for `.sh` and `.json` files
- **Security headers** (X-Frame-Options, X-XSS-Protection, etc.)
- **Cache-Control** headers for optimal performance

## Custom Domain Setup

1. In Netlify dashboard, go to **Domain settings**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `idlhub.com`)
4. Configure DNS:
   - Add CNAME record: `your-site.netlify.app`
   - Or use Netlify DNS (recommended)

## Qdrant Integration Features

Once Qdrant is initialized, IDLHub gains:

- **Semantic search** for protocols
- **Similar protocol discovery**
- **Fast metadata queries**
- **Search history tracking**

### Qdrant Collections

The following collections are created:

1. **idl_metadata** - Protocol metadata and information
2. **protocol_search** - Optimized search index
3. **user_searches** - User search history
4. **idl_cache** - Cached IDL content

## Testing the Deployment

### Test Installation Script

```bash
curl -fsSL https://your-site.netlify.app/mcp | sh
```

### Test API Endpoints

```bash
# Test main site
curl https://your-site.netlify.app/

# Test index.json
curl https://your-site.netlify.app/index.json

# Test specific IDL
curl https://your-site.netlify.app/IDLs/jupiterIDL.json
```

## Continuous Deployment

Netlify automatically deploys when you push to GitHub:

1. Make changes to your repository
2. Commit and push to main branch
3. Netlify detects changes and redeploys
4. Changes are live in ~1-2 minutes

## Performance Optimization

Netlify provides:

- **Global CDN** - Fast delivery worldwide
- **Automatic HTTPS** - Free SSL certificates
- **Branch deploys** - Preview deployments for PRs
- **Edge functions** - Optional serverless functions

## Monitoring

View deployment logs and analytics:
- **Netlify Dashboard** → Your site → **Deploys**
- **Analytics** tab for traffic insights
- **Functions** tab (if using edge functions)

## Troubleshooting

### Deployment Fails

Check Netlify deploy logs for errors:
- Go to **Deploys** → Click failed deploy → View logs

### Qdrant Connection Issues

1. Verify environment variables are set in Netlify
2. Check Qdrant instance is running
3. Verify API key and URL are correct
4. Check Qdrant firewall allows connections

### Redirects Not Working

1. Verify `netlify.toml` is in repository root
2. Check redirect configuration syntax
3. Clear browser cache
4. Test with curl: `curl -I https://your-site.netlify.app/mcp`

## Local Development

Test Netlify configuration locally:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run local dev server
netlify dev

# Test redirects
curl http://localhost:8888/mcp
```

## Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [IDLHub GitHub](https://github.com/openSVM/idlhub)

## Support

For issues with:
- **Netlify deployment**: [Netlify Support](https://answers.netlify.com/)
- **Qdrant integration**: [Qdrant Discord](https://discord.gg/qdrant)
- **IDLHub**: [GitHub Issues](https://github.com/openSVM/idlhub/issues)
