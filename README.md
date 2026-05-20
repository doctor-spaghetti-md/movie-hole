# Movie Hole

Mobile-first hot-pink film-themed static site with:

- Frick a Flick submission page
- Suggested for the Hole page with search
- Bingo Hole random selector
- Admin-code protected “Mark as Selected”
- Duplicate prevention
- Netlify Functions
- GitHub-backed `data/movies.json`

## Files

```txt
index.html
suggestions.html
bingo-hole.html
assets/styles.css
assets/app.js
data/movies.json
netlify/functions/add-movie.js
netlify/functions/mark-selected.js
netlify.toml
package.json
```

## Local preview

You can open `index.html` directly to preview layout and seeded content.

For Netlify Functions locally:

```bash
npm install
npm run dev
```

## Netlify environment variables

Set these in Netlify:

```txt
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
GITHUB_BRANCH=main
GITHUB_TOKEN=your-github-token
MOVIES_PATH=data/movies.json
MOVIE_HOLE_ADMIN_CODE=your-secret-admin-code
```

## Important

The site has a preview fallback. If Netlify functions are not configured, new submissions may appear temporarily on the current page but will not permanently save.

To permanently save suggestions, deploy to Netlify with the environment variables above.