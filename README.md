# GitHub Pages test site

This repository publishes a self-contained test landing page at:

<https://tolu-harman.github.io/tolu-harman/>

## Publishing

The deployment workflow runs whenever changes are pushed to `main`, or when it is
started manually from the Actions tab. If the site is not yet available, open the
repository **Settings** > **Pages** and set the source to **GitHub Actions**.

The workflow packages only the root `index.html`, so no local build is required
to publish this landing page.
